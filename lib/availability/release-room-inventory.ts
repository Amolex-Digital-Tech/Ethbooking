
import { Prisma } from "@/lib/generated/prisma/client";
import { lockRoomTypeInventory } from "@/lib/inventory/lock-room-type-inventory";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getBookingNights(
  checkIn: Date,
  checkOut: Date
): Date[] {
  const nights: Date[] = [];
  const current = new Date(checkIn);

  while (current < checkOut) {
    nights.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return nights;
}

type Transaction = Prisma.TransactionClient;

type BookingItemForRelease = {
  roomTypeId: string;
  quantity: number;
};

export async function releaseRoomInventory(
  transaction: Transaction,
  checkInDate: Date,
  checkOutDate: Date,
  items: BookingItemForRelease[]
) {
  if (
    Number.isNaN(checkInDate.getTime()) ||
    Number.isNaN(checkOutDate.getTime()) ||
    checkOutDate <= checkInDate
  ) {
    throw new Error("Invalid booking date range.");
  }

  if (!items.length) {
    return;
  }

  for (const item of items) {
    if (!item.roomTypeId) {
      throw new Error("Room type ID is required for inventory release.");
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Invalid room quantity for inventory release.");
    }
  }

  // Acquire all room-type locks in a consistent order.
  // This coordinates releases with reservations and other inventory changes.
  const roomTypeIds = [
    ...new Set(items.map((item) => item.roomTypeId)),
  ].sort();

  for (const roomTypeId of roomTypeIds) {
    await lockRoomTypeInventory(transaction, roomTypeId);
  }

  // Inventory dates are stored as PostgreSQL DATE values.
  // Compare them using UTC date boundaries consistently.
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    )
  );

  const nights = getBookingNights(
    checkInDate,
    checkOutDate
  ).filter((night) => night >= todayUtc);

  for (const item of items) {
    for (const night of nights) {
      const result = await transaction.$executeRaw`
        UPDATE "room_inventory"
        SET
          "reservedUnits" = "reservedUnits" - ${item.quantity},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE
          "roomTypeId" = ${item.roomTypeId}::uuid
          AND "date" = ${night}::date
          AND "reservedUnits" >= ${item.quantity}
      `;

      if (result !== 1) {
        throw new Error(
          `Unable to release inventory for ${formatDate(night)}.`
        );
      }
    }
  }
}
