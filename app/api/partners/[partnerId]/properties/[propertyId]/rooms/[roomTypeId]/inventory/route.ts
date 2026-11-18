
import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { createRoomInventory } from "@/lib/inventory/create-room-inventory";
import { lockRoomTypeInventory } from "@/lib/inventory/lock-room-type-inventory";

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      partnerId: string;
      propertyId: string;
      roomTypeId: string;
    }>;
  }
) {
  try {
    const { partnerId, propertyId, roomTypeId } = await params;

    if (!partnerId || !propertyId || !roomTypeId) {
      return Response.json(
        {
          success: false,
          error: "Required IDs are missing.",
        },
        { status: 400 }
      );
    }

    await requirePartnerMembership(partnerId);

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        partnerId,
      },
      select: {
        id: true,
      },
    });

    if (!property) {
      return Response.json(
        {
          success: false,
          error: "Property not found.",
        },
        { status: 404 }
      );
    }

    const roomType = await prisma.roomType.findFirst({
      where: {
        id: roomTypeId,
        propertyId,
      },
      select: {
        id: true,
      },
    });

    if (!roomType) {
      return Response.json(
        {
          success: false,
          error: "Room type not found.",
        },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);

    const today = new Date();

    const defaultFrom = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate()
      )
    );

    const defaultTo = new Date(defaultFrom);
    defaultTo.setUTCDate(defaultTo.getUTCDate() + 30);

    const fromValue = searchParams.get("from");
    const toValue = searchParams.get("to");

    const fromDate = fromValue
      ? parseDate(fromValue)
      : defaultFrom;

    const toDate = toValue
      ? parseDate(toValue)
      : defaultTo;

    if (!fromDate) {
      return Response.json(
        {
          success: false,
          error: "From date is invalid. Use YYYY-MM-DD format.",
        },
        { status: 400 }
      );
    }

    if (!toDate) {
      return Response.json(
        {
          success: false,
          error: "To date is invalid. Use YYYY-MM-DD format.",
        },
        { status: 400 }
      );
    }

    if (fromDate >= toDate) {
      return Response.json(
        {
          success: false,
          error: "The checkout date must be later than the check-in date.",
        },
        { status: 400 }
      );
    }

    const numberOfDays =
      (toDate.getTime() - fromDate.getTime()) /
      (24 * 60 * 60 * 1000);

    if (numberOfDays > 366) {
      return Response.json(
        {
          success: false,
          error: "You can view a maximum of 366 nights at once.",
        },
        { status: 400 }
      );
    }

    const inventory = await prisma.$transaction(
      async (transaction) => {
        // Serialize inventory creation with bookings,
        // capacity changes, and room blocking.
        await lockRoomTypeInventory(transaction, roomTypeId);

        await createRoomInventory(
          {
            roomTypeId,
            fromDate,
            toDate,
          },
          transaction
        );

        return transaction.roomInventory.findMany({
          where: {
            roomTypeId,
            date: {
              gte: fromDate,
              lt: toDate,
            },
          },
          orderBy: {
            date: "asc",
          },
        });
      }
    );

    const data = inventory.map((item) => ({
      ...item,
      date: formatDate(item.date),
      availableUnits:
        item.totalUnits -
        item.reservedUnits -
        item.blockedUnits,
    }));

    return Response.json({
      success: true,
      data,
      count: data.length,
      filters: {
        from: formatDate(fromDate),
        to: formatDate(toDate),
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// Manual inventory creation is no longer supported.
export async function POST() {
  return Response.json(
    {
      success: false,
      error:
        "Manual inventory creation is disabled. Room availability is generated automatically.",
    },
    { status: 410 }
  );
}
