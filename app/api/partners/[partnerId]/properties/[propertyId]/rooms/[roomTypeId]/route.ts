import { lockRoomTypeInventory } from "@/lib/inventory/lock-room-type-inventory";
import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { BedType } from "@/lib/generated/prisma/enums";

export async function PATCH(
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
          error: "Partner ID, property ID, and room type ID are required.",
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

    const data: {
      name?: string;
      description?: string | null;
      maxGuests?: number;
      maxAdults?: number | null;
      maxChildren?: number | null;
      bedType?: BedType;
      bedCount?: number;
      sizeSquareMeters?: number | null;
      totalUnits?: number;
      isActive?: boolean;
    } = {};

    if ("name" in body) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return Response.json(
          {
            success: false,
            error: "Room type name must be a non-empty string.",
          },
          { status: 400 }
        );
      }

      data.name = body.name.trim();
    }

    if ("description" in body) {
      if (
        body.description !== null &&
        typeof body.description !== "string"
      ) {
        return Response.json(
          {
            success: false,
            error: "Description must be a string or null.",
          },
          { status: 400 }
        );
      }

      data.description =
        typeof body.description === "string"
          ? body.description.trim() || null
          : null;
    }

    if ("maxGuests" in body) {
      if (
        typeof body.maxGuests !== "number" ||
        !Number.isInteger(body.maxGuests) ||
        body.maxGuests < 1
      ) {
        return Response.json(
          {
            success: false,
            error: "Maximum guests must be a positive whole number.",
          },
          { status: 400 }
        );
      }

      data.maxGuests = body.maxGuests;
    }

    if ("maxAdults" in body) {
      if (
        body.maxAdults !== null &&
        (typeof body.maxAdults !== "number" ||
          !Number.isInteger(body.maxAdults) ||
          body.maxAdults < 0)
      ) {
        return Response.json(
          {
            success: false,
            error: "Maximum adults must be a non-negative whole number or null.",
          },
          { status: 400 }
        );
      }

      data.maxAdults = body.maxAdults;
    }

    if ("maxChildren" in body) {
      if (
        body.maxChildren !== null &&
        (typeof body.maxChildren !== "number" ||
          !Number.isInteger(body.maxChildren) ||
          body.maxChildren < 0)
      ) {
        return Response.json(
          {
            success: false,
            error:
              "Maximum children must be a non-negative whole number or null.",
          },
          { status: 400 }
        );
      }

      data.maxChildren = body.maxChildren;
    }

    if ("bedType" in body) {
      if (
        typeof body.bedType !== "string" ||
        !Object.values(BedType).includes(
          body.bedType.trim().toUpperCase() as BedType
        )
      ) {
        return Response.json(
          {
            success: false,
            error: "Invalid bed type.",
          },
          { status: 400 }
        );
      }

      data.bedType = body.bedType.trim().toUpperCase() as BedType;
    }

    if ("bedCount" in body) {
      if (
        typeof body.bedCount !== "number" ||
        !Number.isInteger(body.bedCount) ||
        body.bedCount < 1
      ) {
        return Response.json(
          {
            success: false,
            error: "Bed count must be a positive whole number.",
          },
          { status: 400 }
        );
      }

      data.bedCount = body.bedCount;
    }

    if ("sizeSquareMeters" in body) {
      if (
        body.sizeSquareMeters !== null &&
        (typeof body.sizeSquareMeters !== "number" ||
          body.sizeSquareMeters <= 0)
      ) {
        return Response.json(
          {
            success: false,
            error: "Room size must be greater than zero or null.",
          },
          { status: 400 }
        );
      }

      data.sizeSquareMeters = body.sizeSquareMeters;
    }

    if ("totalUnits" in body) {
      if (
        typeof body.totalUnits !== "number" ||
        !Number.isInteger(body.totalUnits) ||
        body.totalUnits < 1
      ) {
        return Response.json(
          {
            success: false,
            error: "Total units must be a positive whole number.",
          },
          { status: 400 }
        );
      }

      data.totalUnits = body.totalUnits;
    }

    if ("isActive" in body) {
      if (typeof body.isActive !== "boolean") {
        return Response.json(
          {
            success: false,
            error: "isActive must be a boolean.",
          },
          { status: 400 }
        );
      }

      data.isActive = body.isActive;
    }

    if (Object.keys(data).length === 0) {
      return Response.json(
        {
          success: false,
          error: "No valid fields were provided for update.",
        },
        { status: 400 }
      );
    }

    const finalMaxGuests = data.maxGuests ?? roomType.maxGuests;
    const finalMaxAdults =
      data.maxAdults !== undefined
        ? data.maxAdults
        : roomType.maxAdults;
    const finalMaxChildren =
      data.maxChildren !== undefined
        ? data.maxChildren
        : roomType.maxChildren;

    if (
      finalMaxAdults !== null &&
      finalMaxChildren !== null &&
      finalMaxAdults + finalMaxChildren > finalMaxGuests
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Maximum adults and children cannot exceed maximum guests.",
        },
        { status: 400 }
      );
    }

const updatedRoomType = await prisma.$transaction(
  async (transaction) => {
    await lockRoomTypeInventory(transaction, roomType.id);

    const current = await transaction.roomType.findFirst({
      where: {
        id: roomTypeId,
        propertyId,
      },
    });

    if (!current) {
      throw new Error("ROOM_NOT_FOUND");
    }

    const finalTotalUnits = data.totalUnits ?? current.totalUnits;

    if (finalTotalUnits !== current.totalUnits) {
      const inventory =
        await transaction.roomInventory.findMany({
          where: { roomTypeId },
          select: {
            reservedUnits: true,
            blockedUnits: true,
          },
        });

      const conflict = inventory.some(
        (item) =>
          finalTotalUnits <
          item.reservedUnits + item.blockedUnits
      );

      if (conflict) {
        throw new Error("INVENTORY_CONFLICT");
      }

      await transaction.roomInventory.updateMany({
        where: { roomTypeId },
        data: {
          totalUnits: finalTotalUnits,
        },
      });
    }

    return transaction.roomType.update({
      where: { id: roomTypeId },
      data,
      include: {
        property: true,
        photos: true,
        ratePlans: true,
        inventory: true,
      },
    });
  }
);

    return Response.json({
      success: true,
      message: "Room type updated successfully.",
      data: updatedRoomType,
    });
  } catch (error) {
  if (error instanceof Error) {
    if (error.message === "ROOM_NOT_FOUND") {
      return Response.json(
        {
          success: false,
          error: "Room type no longer exists.",
        },
        { status: 404 }
      );
    }

    if (error.message === "INVENTORY_CONFLICT") {
      return Response.json(
        {
          success: false,
          error:
            "You cannot reduce physical room capacity below the number of reserved and blocked rooms for an existing date.",
        },
        { status: 409 }
      );
    }
  }

  return handleAuthError(error);
}
}