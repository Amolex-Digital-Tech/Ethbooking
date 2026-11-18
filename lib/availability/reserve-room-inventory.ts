import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma/client";
import { lockRoomTypeInventory } from "@/lib/inventory/lock-room-type-inventory";

type ReserveRoomInventoryInput = {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  units: number;
};

type ReservedNight = {
  date: string;
  reservedUnits: number;
  availableUnits: number;
};

type ReserveRoomInventoryResult = {
  success: true;
  roomTypeId: string;
  units: number;
  nights: ReservedNight[];
};

type TransactionClient = Prisma.TransactionClient;

function parseDate(date: string, fieldName: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format.`);
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return parsedDate;
}

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

export async function reserveRoomInventoryInTransaction(
  transaction: TransactionClient,
  input: ReserveRoomInventoryInput
): Promise<ReserveRoomInventoryResult> {
  const { roomTypeId, checkIn, checkOut, units } = input;

  if (!roomTypeId) {
    throw new Error("Room type ID is required.");
  }

  if (!Number.isInteger(units) || units <= 0) {
    throw new Error("Units must be a positive whole number.");
  }

  const checkInDate = parseDate(checkIn, "Check-in date");
  const checkOutDate = parseDate(checkOut, "Check-out date");

  if (checkInDate >= checkOutDate) {
    throw new Error(
      "Check-out date must be later than check-in date."
    );
  }

  await lockRoomTypeInventory(transaction, roomTypeId);

  const roomType = await transaction.roomType.findUnique({
    where: { id: roomTypeId },
    select: { id: true, totalUnits: true },
  });

  if (!roomType) {
    throw new Error("Room type not found.");
  }

  const nights = getBookingNights(checkInDate, checkOutDate);
  const reservedNights: ReservedNight[] = [];

  for (const night of nights) {
    const result = await transaction.$executeRaw`
      UPDATE "room_inventory"
      SET
        "reservedUnits" = "reservedUnits" + ${units},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE
        "roomTypeId" = ${roomTypeId}::uuid
        AND "date" = ${night}::date
        AND "totalUnits" = ${roomType.totalUnits}
        AND (
          "totalUnits" -
          "reservedUnits" -
          "blockedUnits"
        ) >= ${units}
    `;

    if (result !== 1) {
      throw new Error(
        `Insufficient inventory for ${formatDate(night)}.`
      );
    }

    const inventory =
      await transaction.roomInventory.findUnique({
        where: {
          roomTypeId_date: {
            roomTypeId,
            date: night,
          },
        },
      });

    if (!inventory) {
      throw new Error(
        `Inventory record not found for ${formatDate(night)}.`
      );
    }

    reservedNights.push({
      date: formatDate(night),
      reservedUnits: inventory.reservedUnits,
      availableUnits:
        inventory.totalUnits -
        inventory.reservedUnits -
        inventory.blockedUnits,
    });
  }

  return {
    success: true,
    roomTypeId,
    units,
    nights: reservedNights,
  };
}

export async function reserveRoomInventory(
  input: ReserveRoomInventoryInput
): Promise<ReserveRoomInventoryResult> {
  return prisma.$transaction(async (transaction) => {
    return reserveRoomInventoryInTransaction(
      transaction,
      input
    );
  });
}