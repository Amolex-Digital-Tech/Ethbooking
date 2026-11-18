import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import { createRoomInventory } from "@/lib/inventory/create-room-inventory";
import AdminInventoryManager from "./inventory-manager";

export const dynamic = "force-dynamic";
const DAYS = 30;
function utcDate(date: Date) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }
function addDays(date: Date, count: number) { const result = new Date(date); result.setUTCDate(result.getUTCDate() + count); return result; }
function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const result = new Date(value + "T00:00:00.000Z");
  return Number.isNaN(result.getTime()) || result.toISOString().slice(0,10) !== value ? null : result;
}
export default async function AdminPropertyInventoryPage({ params, searchParams }: { params: Promise<{ propertyId: string }>; searchParams: Promise<{ from?: string }> }) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { propertyId } = await params;
  const filters = await searchParams;
  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, name: true, location: { select: { city: true, region: true } }, roomTypes: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, totalUnits: true, isActive: true } } } });
  if (!property) notFound();
  const today = utcDate(new Date());
  const requested = validDate(filters.from);
  const fromDate = requested && requested >= today ? requested : today;
  const toDate = addDays(fromDate, DAYS);
  for (const room of [...property.roomTypes].sort((a,b) => a.id.localeCompare(b.id))) await createRoomInventory({ roomTypeId: room.id, fromDate, toDate });
  const rows = property.roomTypes.length ? await prisma.roomInventory.findMany({ where: { roomTypeId: { in: property.roomTypes.map((room) => room.id) }, date: { gte: fromDate, lt: toDate } }, orderBy: [{ date: "asc" }, { roomTypeId: "asc" }] }) : [];
  const inventory = new Map<string, typeof rows>();
  for (const row of rows) inventory.set(row.roomTypeId, [...(inventory.get(row.roomTypeId) ?? []), row]);
  const date = (value: Date) => value.toISOString().slice(0,10);
  const roomData = property.roomTypes.map((room) => ({ ...room, inventory: (inventory.get(room.id) ?? []).map((item) => ({ id: item.id, date: date(item.date), totalUnits: item.totalUnits, reservedUnits: item.reservedUnits, blockedUnits: item.blockedUnits })) }));
  const previous = addDays(fromDate, -DAYS);
  const next = addDays(fromDate, DAYS);
  const previousHref = previous >= today ? `?from=${date(previous)}` : null;
  return <main className="min-h-full bg-[#F5F6F2] px-4 py-7 text-[#20372B] sm:px-7 lg:px-9"><div className="mx-auto max-w-[1440px]">
    <nav className="mb-5 text-xs text-[#879087]"><Link href="/admin/properties" className="hover:underline">Properties</Link> / <Link href={`/admin/properties/${property.id}`} className="hover:underline">{property.name}</Link> / Availability & Inventory</nav>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.18em] text-[#879487]">MARKETPLACE / OPERATIONS</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Availability & inventory</h1><p className="mt-2 text-sm text-[#788279]">{property.name} · {[property.location.city, property.location.region].filter(Boolean).join(", ")}</p><p className="mt-1 text-xs text-[#879087]">30-day room availability and bulk room blocking controls.</p></div><Link href={`/admin/properties/${property.id}`} className="rounded-xl border border-[#DCE5D8] bg-white px-4 py-2.5 text-xs font-semibold text-[#36513C] hover:bg-[#F3F7F0]">← Property details</Link></header>
    <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5E9E1] bg-white p-4"><div><p className="text-sm font-semibold">Calendar range</p><p className="mt-1 text-xs text-[#879087]">{date(fromDate)} through {date(addDays(toDate,-1))}</p></div><div className="flex flex-wrap gap-2">{previousHref ? <Link href={previousHref} className="rounded-lg border border-[#DCE5D8] px-3 py-2 text-xs font-semibold">← Previous 30 days</Link> : null}<form className="flex gap-2"><input type="date" name="from" min={date(today)} defaultValue={date(fromDate)} className="rounded-lg border border-[#DCE5D8] px-3 py-2 text-xs"/><button className="rounded-lg bg-[#294332] px-3 py-2 text-xs font-semibold text-white">View</button></form><Link href={`?from=${date(next)}`} className="rounded-lg border border-[#DCE5D8] px-3 py-2 text-xs font-semibold">Next 30 days →</Link></div></section>
    <AdminInventoryManager propertyId={property.id} rooms={roomData} from={date(fromDate)} to={date(toDate)}/>
  </div></main>;
}
