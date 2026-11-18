
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma/client";
import { lockRoomTypeInventory } from "@/lib/inventory/lock-room-type-inventory";

type CreateRoomInventoryInput = {
  roomTypeId: string;
  fromDate: Date;
  toDate: Date;
};

type CreateRoomInventoryResult = {
  createdCount: number;
  skippedCount: number;
  createdDates: Date[];
  skippedDates: Date[];
};

function normalizeDate(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}

export async function createRoomInventory(
  input: CreateRoomInventoryInput,
  existingTransaction?: Prisma.TransactionClient
): Promise<CreateRoomInventoryResult> {
  const execute = async (
    transaction: Prisma.TransactionClient
  ): Promise<CreateRoomInventoryResult> => {
    const { roomTypeId, fromDate, toDate } = input;

    if (!roomTypeId) {
      throw new Error("Room type ID is required.");
    }

    if (
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(toDate.getTime())
    ) {
      throw new Error("Invalid inventory date.");
    }

    const startDate = normalizeDate(fromDate);
    const endDate = normalizeDate(toDate);

    if (startDate >= endDate) {
      throw new Error(
        "The inventory end date must be later than the start date."
      );
    }

    await lockRoomTypeInventory(transaction, roomTypeId);

    const roomType = await transaction.roomType.findUnique({
      where: { id: roomTypeId },
      select: {
        id: true,
        totalUnits: true,
      },
    });

    if (!roomType) {
      throw new Error("Room type not found.");
    }

    const existingInventory =
      await transaction.roomInventory.findMany({
        where: {
          roomTypeId,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        select: {
          date: true,
        },
      });

    const existingDateKeys = new Set(
      existingInventory.map((item) =>
        normalizeDate(item.date).getTime()
      )
    );

    const recordsToCreate: {
      roomTypeId: string;
      date: Date;
      totalUnits: number;
      reservedUnits: number;
      blockedUnits: number;
    }[] = [];

    const skippedDates: Date[] = [];

    for (
      let current = new Date(startDate);
      current < endDate;
      current.setUTCDate(current.getUTCDate() + 1)
    ) {
      const date = new Date(current);

      if (existingDateKeys.has(date.getTime())) {
        skippedDates.push(date);
        continue;
      }

      recordsToCreate.push({
        roomTypeId,
        date,
        totalUnits: roomType.totalUnits,
        reservedUnits: 0,
        blockedUnits: 0,
      });
    }

    if (recordsToCreate.length === 0) {
      return {
        createdCount: 0,
        skippedCount: skippedDates.length,
        createdDates: [],
        skippedDates,
      };
    }

    await transaction.roomInventory.createMany({
      data: recordsToCreate,
      skipDuplicates: true,
    });

    // Read the final inventory rows to determine exactly which
    // dates now exist, rather than assuming createMany insertion order.
    const finalInventory =
      await transaction.roomInventory.findMany({
        where: {
          roomTypeId,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        select: {
          date: true,
        },
        orderBy: {
          date: "asc",
        },
      });

    const finalDateKeys = new Set(
      finalInventory.map((item) =>
        normalizeDate(item.date).getTime()
      )
    );

    const createdDates = recordsToCreate
      .filter((item) =>
        finalDateKeys.has(item.date.getTime())
      )
      .map((item) => item.date);

    return {
      createdCount: createdDates.length,
      skippedCount:
        skippedDates.length +
        recordsToCreate.length -
        createdDates.length,
      createdDates,
      skippedDates: [
        ...skippedDates,
        ...recordsToCreate
          .filter(
            (item) =>
              !createdDates.some(
                (date) =>
                  date.getTime() === item.date.getTime()
              )
          )
          .map((item) => item.date),
      ],
    };
  };

  if (existingTransaction) {
    return execute(existingTransaction);
  }

  return prisma.$transaction(execute);
}
