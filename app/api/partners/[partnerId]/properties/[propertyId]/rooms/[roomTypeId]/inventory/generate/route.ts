import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { createRoomInventory } from "@/lib/inventory/create-room-inventory";

export async function POST(
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
          error:
            "Partner ID, property ID, and room type ID are required.",
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

    const body = await request.json();

    const from =
      typeof body.from === "string"
        ? body.from.trim()
        : "";

    const to =
      typeof body.to === "string"
        ? body.to.trim()
        : "";

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!from || !to) {
      return Response.json(
        {
          success: false,
          error: "Both 'from' and 'to' dates are required.",
        },
        { status: 400 }
      );
    }

    if (!datePattern.test(from) || !datePattern.test(to)) {
      return Response.json(
        {
          success: false,
          error: "Dates must use YYYY-MM-DD format.",
        },
        { status: 400 }
      );
    }

    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T00:00:00.000Z`);

    if (Number.isNaN(fromDate.getTime())) {
      return Response.json(
        {
          success: false,
          error: "Invalid 'from' date.",
        },
        { status: 400 }
      );
    }

    if (Number.isNaN(toDate.getTime())) {
      return Response.json(
        {
          success: false,
          error: "Invalid 'to' date.",
        },
        { status: 400 }
      );
    }

    if (fromDate > toDate) {
      return Response.json(
        {
          success: false,
          error: "The 'from' date cannot be later than the 'to' date.",
        },
        { status: 400 }
      );
    }

    const result = await createRoomInventory({
      roomTypeId,
      fromDate,
      toDate,
    });

    return Response.json({
      success: true,
      message: "Room availability generated successfully.",
      data: result,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}