
import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { lockRoomTypeInventory } from "@/lib/inventory/lock-room-type-inventory";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      partnerId: string;
      propertyId: string;
      roomTypeId: string;
      inventoryId: string;
    }>;
  }
) {
  try {
    const {
      partnerId,
      propertyId,
      roomTypeId,
      inventoryId,
    } = await params;

    if (
      !partnerId ||
      !propertyId ||
      !roomTypeId ||
      !inventoryId
    ) {
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

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        {
          success: false,
          error: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return Response.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    // Only blockedUnits can be changed through this endpoint.
    // Physical capacity is managed through room type settings.
    const allowedKeys = ["blockedUnits"];

    if (
      Object.keys(data).length !== 1 ||
      !Object.keys(data).every((key) => allowedKeys.includes(key))
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Only blockedUnits can be updated through this endpoint. Physical room capacity is managed in room type settings.",
        },
        { status: 400 }
      );
    }

    const blockedUnits = data.blockedUnits;

    if (
      typeof blockedUnits !== "number" ||
      !Number.isInteger(blockedUnits) ||
      blockedUnits < 0
    ) {
      return Response.json(
        {
          success: false,
          error: "Blocked units must be a non-negative whole number.",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(
      async (transaction) => {
        // Use the same lock as booking and capacity updates.
        await lockRoomTypeInventory(transaction, roomTypeId);

        const roomType = await transaction.roomType.findFirst({
          where: {
            id: roomTypeId,
            propertyId,
          },
          select: {
            id: true,
            totalUnits: true,
          },
        });

        if (!roomType) {
          throw new Error("ROOM_NOT_FOUND");
        }

        const inventory =
          await transaction.roomInventory.findFirst({
            where: {
              id: inventoryId,
              roomTypeId,
            },
            select: {
              id: true,
              reservedUnits: true,
              blockedUnits: true,
            },
          });

        if (!inventory) {
          throw new Error("INVENTORY_NOT_FOUND");
        }

        // RoomType.totalUnits is the authoritative physical capacity.
        if (blockedUnits > roomType.totalUnits) {
          throw new Error("INVENTORY_CAPACITY_CONFLICT");
        }

        // Keep the inventory row synchronized with the physical
        // room count while checking the latest reservation count.
        const maximumReservedUnits =
          roomType.totalUnits - blockedUnits;

        const result = await transaction.roomInventory.updateMany({
          where: {
            id: inventoryId,
            roomTypeId,
            reservedUnits: {
              lte: maximumReservedUnits,
            },
          },
          data: {
            totalUnits: roomType.totalUnits,
            blockedUnits,
          },
        });

        if (result.count !== 1) {
          throw new Error("INVENTORY_CAPACITY_CONFLICT");
        }

        return transaction.roomInventory.findUniqueOrThrow({
          where: {
            id: inventoryId,
          },
          select: {
            id: true,
            roomTypeId: true,
            date: true,
            totalUnits: true,
            reservedUnits: true,
            blockedUnits: true,
          },
        });
      }
    );

    return Response.json({
      success: true,
      message: "Room blocking updated successfully.",
      data: {
        ...updated,
        date: updated.date.toISOString().slice(0, 10),
        availableUnits:
          updated.totalUnits -
          updated.reservedUnits -
          updated.blockedUnits,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ROOM_NOT_FOUND") {
        return Response.json(
          {
            success: false,
            error: "Room type not found.",
          },
          { status: 404 }
        );
      }

      if (error.message === "INVENTORY_NOT_FOUND") {
        return Response.json(
          {
            success: false,
            error: "Inventory record not found.",
          },
          { status: 404 }
        );
      }

      if (error.message === "INVENTORY_CAPACITY_CONFLICT") {
        return Response.json(
          {
            success: false,
            error:
              "You cannot block that many rooms because some rooms are already reserved or the requested blocked capacity exceeds the physical room count.",
          },
          { status: 409 }
        );
      }
    }

    return handleAuthError(error);
  }
}
