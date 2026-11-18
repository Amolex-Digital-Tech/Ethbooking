import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { createRoomInventory } from "@/lib/inventory/create-room-inventory";
import { lockRoomTypeInventory } from "@/lib/inventory/lock-room-type-inventory";

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== value ? null : date;
}
function addDay(date: Date) { const result = new Date(date); result.setUTCDate(result.getUTCDate()+1); return result; }

export async function PATCH(request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");
    const { propertyId } = await params;
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ success: false, error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const roomTypeId = input.roomTypeId;
    const fromDate = parseDate(input.from);
    const lastDate = parseDate(input.to);
    const blockedUnits = input.blockedUnits;
    if (typeof roomTypeId !== "string" || !roomTypeId) return Response.json({ success: false, error: "Room type is required." }, { status: 400 });
    if (!fromDate || !lastDate || lastDate < fromDate) return Response.json({ success: false, error: "Enter a valid date range." }, { status: 400 });
    const today = new Date(); today.setUTCHours(0,0,0,0);
    if (fromDate < today) return Response.json({ success: false, error: "Past dates cannot be changed through this tool." }, { status: 400 });
    const dayCount = Math.floor((lastDate.getTime()-fromDate.getTime())/86400000)+1;
    if (dayCount > 366) return Response.json({ success: false, error: "A single update can cover at most 366 days." }, { status: 400 });
    if (typeof blockedUnits !== "number" || !Number.isInteger(blockedUnits) || blockedUnits < 0) return Response.json({ success: false, error: "Blocked rooms must be a non-negative whole number." }, { status: 400 });
    const room = await prisma.roomType.findFirst({ where: { id: roomTypeId, propertyId }, select: { id: true, totalUnits: true } });
    if (!room) return Response.json({ success: false, error: "Room type not found for this property." }, { status: 404 });
    if (blockedUnits > room.totalUnits) return Response.json({ success: false, error: "Blocked rooms cannot exceed physical room capacity." }, { status: 400 });
    await createRoomInventory({ roomTypeId, fromDate, toDate: addDay(lastDate) });
    const updatedCount = await prisma.$transaction(async (tx) => {
      await lockRoomTypeInventory(tx, roomTypeId);
      const currentRoom = await tx.roomType.findFirst({ where: { id: roomTypeId, propertyId }, select: { totalUnits: true } });
      if (!currentRoom || blockedUnits > currentRoom.totalUnits) throw new Error("INVENTORY_CAPACITY_CONFLICT");
      const result = await tx.roomInventory.updateMany({
        where: { roomTypeId, date: { gte: fromDate, lt: addDay(lastDate) }, reservedUnits: { lte: currentRoom.totalUnits - blockedUnits } },
        data: { totalUnits: currentRoom.totalUnits, blockedUnits },
      });
      if (result.count !== dayCount) throw new Error("INVENTORY_RANGE_INCOMPLETE");
      return result.count;
    });
    return Response.json({ success: true, data: { updatedCount, roomTypeId, from: input.from, to: input.to, blockedUnits } });
  } catch (error) {
    if (error instanceof Error && error.message === "INVENTORY_CAPACITY_CONFLICT") return Response.json({ success: false, error: "Some dates have reservations that would exceed the available capacity after blocking. No dates were changed." }, { status: 409 });
    if (error instanceof Error && error.message === "INVENTORY_RANGE_INCOMPLETE") return Response.json({ success: false, error: "Some inventory dates are missing. No dates were changed." }, { status: 409 });
    return handleAuthError(error);
  }
}
