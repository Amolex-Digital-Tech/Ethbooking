import { prisma } from "@/lib/prisma/client";
import { createRoomInventory } from "@/lib/inventory/create-room-inventory";
import { lockRoomTypeInventory } from "@/lib/inventory/lock-room-type-inventory";

type CheckRoomAvailabilityInput = {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  units: number;
};

type NightAvailability = {
  date: string;
  totalUnits: number;
  reservedUnits: number;
  blockedUnits: number;
  availableUnits: number;
};

type CheckRoomAvailabilityResult = {
  available: boolean;
  requestedUnits: number;
  nights: NightAvailability[];
  missingDates: string[];
};

function parseDate(date: string, fieldName: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return parsed;
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

export async function checkRoomAvailability(
  input: CheckRoomAvailabilityInput
): Promise<CheckRoomAvailabilityResult> {
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

  return prisma.$transaction(async (transaction) => {
    await lockRoomTypeInventory(transaction, roomTypeId);

    const roomType = await transaction.roomType.findUnique({
      where: { id: roomTypeId },
      select: {
        id: true,
        totalUnits: true,
        isActive: true,
      },
    });

    if (!roomType) {
      throw new Error("Room type not found.");
    }

    if (!roomType.isActive) {
      throw new Error("This room type is not available.");
    }

    await createRoomInventory(
      {
        roomTypeId,
        fromDate: checkInDate,
        toDate: checkOutDate,
      },
      transaction
    );

    const inventory =
      await transaction.roomInventory.findMany({
        where: {
          roomTypeId,
          date: {
            gte: checkInDate,
            lt: checkOutDate,
          },
        },
        orderBy: { date: "asc" },
      });

    const inventoryByDate = new Map(
      inventory.map((item) => [formatDate(item.date), item])
    );

    const nights: NightAvailability[] = [];

    for (const night of getBookingNights(
      checkInDate,
      checkOutDate
    )) {
      const date = formatDate(night);
      const item = inventoryByDate.get(date);

      // Never assume a missing record has full availability.
      if (!item) {
        throw new Error(
          `Availability could not be established for ${date}.`
        );
      }

      nights.push({
        date,
        totalUnits: item.totalUnits,
        reservedUnits: item.reservedUnits,
        blockedUnits: item.blockedUnits,
        availableUnits:
          item.totalUnits -
          item.reservedUnits -
          item.blockedUnits,
      });
    }

    return {
      available:
        nights.length > 0 &&
        nights.every((night) => night.availableUnits >= units),
      requestedUnits: units,
      nights,
      missingDates: [],
    };
  });
}