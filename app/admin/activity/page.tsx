import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

const date = (value: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Addis_Ababa" }).format(value);

export default async function AdminActivityPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const [pendingProperties, pendingPartners, unpaidBookings, refundQueue, paymentAttention, recentBookings, recentAudit] = await Promise.all([
    prisma.property.count({ where: { status: { in: ["PENDING_REVIEW", "UNDER_REVIEW"] } } }),
    prisma.partner.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: { in: ["PENDING", "PAYMENT_PENDING"] }, paymentStatus: { in: ["UNPAID", "PENDING"] } } }),
    prisma.booking.count({ where: { OR: [{ status: "REFUND_PENDING" }, { paymentStatus: "REFUND_PENDING" }] } }),
    prisma.paymentTransaction.count({ where: { status: { in: ["INITIATED", "PENDING"] } } }),
    prisma.booking.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, bookingReference: true, customerFirstName: true, customerLastName: true, status: true, paymentStatus: true, createdAt: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { actor: { select: { firstName: true, lastName: true } } } }),
  ]);
  const alerts = [
    { label: "Properties awaiting review", count: pendingProperties, href: "/admin/properties", tone: "amber" },
    { label: "Partner applications pending", count: pendingPartners, href: "/admin/partners", tone: "blue" },
    { label: "Bookings awaiting payment", count: unpaidBookings, href: "/admin/bookings", tone: "slate" },
    { label: "Refunds awaiting action", count: refundQueue, href: "/admin/bookings", tone: "rose" },
    { label: "Payments needing attention", count: paymentAttention, href: "/admin/payments", tone: "violet" },
  ];
  const totalAlerts = alerts.reduce((sum, item) => sum + item.count, 0);
  return <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-7 lg:px-9">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[.18em] text-[#72836F]">WORKSPACE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#20372B]">Activity & alerts</h1><p className="mt-2 text-sm text-[#737B70]">A live operational view of items that may need attention.</p></div><Link href="/admin/audit-logs" className="rounded-xl border border-[#DDE4D9] bg-white px-4 py-2.5 text-sm font-semibold text-[#34513D] hover:bg-[#F8FAF6]">View audit history →</Link></div>
    <section className="mb-7 rounded-2xl border border-[#E4E8DF] bg-white p-5 sm:p-6"><p className="text-sm text-[#758071]">Open operational alerts</p><div className="mt-2 flex items-end gap-3"><span className="text-4xl font-semibold tracking-tight text-[#20372B]">{totalAlerts}</span><span className="pb-1 text-xs text-[#8A9287]">across 5 categories</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{alerts.map((item)=><Link key={item.label} href={item.href} className="rounded-xl border border-[#ECEFE9] p-4 transition hover:border-[#B8CBAF] hover:bg-[#FAFBF8]"><p className="text-xs leading-5 text-[#6F786D]">{item.label}</p><p className="mt-2 text-2xl font-semibold text-[#263B2D]">{item.count}</p><span className="mt-2 inline-block text-[11px] font-semibold text-[#58734F]">Open queue →</span></Link>)}</div></section>
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="overflow-hidden rounded-2xl border border-[#E4E8DF] bg-white"><div className="border-b border-[#EDF0EA] px-5 py-4"><h2 className="font-semibold text-[#263B2D]">Latest bookings</h2><p className="mt-1 text-xs text-[#858D81]">Recent customer activity</p></div>{recentBookings.length ? <div className="divide-y divide-[#EFF1EC]">{recentBookings.map((b)=><Link key={b.id} href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-[#FAFBF8]"><div><p className="text-sm font-semibold text-[#293D30]">{b.bookingReference}</p><p className="mt-1 text-xs text-[#81897F]">{[b.customerFirstName,b.customerLastName].filter(Boolean).join(" ") || "Guest"} · {date(b.createdAt)}</p></div><div className="text-right"><p className="text-xs font-semibold text-[#465C48]">{b.status.replaceAll("_"," ")}</p><p className="mt-1 text-[11px] text-[#879083]">{b.paymentStatus.replaceAll("_"," ")}</p></div></Link>)}</div>:<p className="p-5 text-sm text-[#7C8579]">No bookings yet.</p>}</section>
      <section className="overflow-hidden rounded-2xl border border-[#E4E8DF] bg-white"><div className="flex items-center justify-between border-b border-[#EDF0EA] px-5 py-4"><div><h2 className="font-semibold text-[#263B2D]">Administrative activity</h2><p className="mt-1 text-xs text-[#858D81]">Recent actions recorded in the audit trail</p></div><Link href="/admin/audit-logs" className="text-xs font-semibold text-[#58734F]">See all →</Link></div>{recentAudit.length ? <div className="divide-y divide-[#EFF1EC]">{recentAudit.map((log)=><div key={log.id} className="px-5 py-4"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold text-[#293D30]">{log.description}</p><span className="text-[11px] text-[#899186]">{date(log.createdAt)}</span></div><p className="mt-1 text-xs text-[#81897F]">{[log.actor?.firstName,log.actor?.lastName].filter(Boolean).join(" ") || "System"} · {log.action} · {log.entityType}</p></div>)}</div>:<p className="p-5 text-sm text-[#7C8579]">No audit events have been recorded yet. New instrumented administrative actions will appear here.</p>}</section>
    </div>
  </main>;
}
