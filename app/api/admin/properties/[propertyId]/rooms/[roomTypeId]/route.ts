
import { lockRoomTypeInventory } from "@/lib/inventory/lock-room-type-inventory";
import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { BedType, SmokingPolicy } from "@/lib/generated/prisma/enums";

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function errorResponse(message: string, status = 400) {
  return Response.json(
    { success: false, error: message },
    { status }
  );
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      propertyId: string;
      roomTypeId: string;
    }>;
  }
) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");

    const { propertyId, roomTypeId } = await params;

    if (
      !UUID_REGEX.test(propertyId) ||
      !UUID_REGEX.test(roomTypeId)
    ) {
      return errorResponse("Invalid property or room ID.");
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("A valid JSON request body is required.");
    }

    if (!isRecord(body)) {
      return errorResponse("The request body must be an object.");
    }

    const data: Record<string, unknown> = {};

    if ("name" in body) {
      if (
        typeof body.name !== "string" ||
        !body.name.trim()
      ) {
        return errorResponse("Room name is required.");
      }

      if (body.name.trim().length > 150) {
        return errorResponse(
          "Room name cannot exceed 150 characters."
        );
      }

      data.name = body.name.trim();
    }

    if ("description" in body) {
      if (
        body.description !== null &&
        typeof body.description !== "string"
      ) {
        return errorResponse(
          "Description must be text or null."
        );
      }

      data.description =
        typeof body.description === "string"
          ? body.description.trim() || null
          : null;
    }

    for (const field of [
      "maxGuests",
      "bedCount",
      "totalUnits",
    ] as const) {
      if (field in body) {
        const value = body[field];

        if (
          typeof value !== "number" ||
          !Number.isInteger(value) ||
          value < 1
        ) {
          return errorResponse(
            `${field} must be a positive whole number.`
          );
        }

        data[field] = value;
      }
    }

    for (const field of [
      "maxAdults",
      "maxChildren",
    ] as const) {
      if (field in body) {
        const value = body[field];

        if (
          value !== null &&
          (
            typeof value !== "number" ||
            !Number.isInteger(value) ||
            value < 0
          )
        ) {
          return errorResponse(
            `${field} must be a non-negative whole number or null.`
          );
        }

        data[field] = value;
      }
    }

    if ("bedType" in body) {
      if (
        typeof body.bedType !== "string" ||
        !Object.values(BedType).includes(
          body.bedType as BedType
        )
      ) {
        return errorResponse("Select a valid bed type.");
      }

      data.bedType = body.bedType;
    }

    if ("sizeSquareMeters" in body) {
      const value = body.sizeSquareMeters;

      if (
        value !== null &&
        (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value <= 0
        )
      ) {
        return errorResponse(
          "Room size must be greater than zero or null."
        );
      }

      data.sizeSquareMeters = value;
    }

    for (const field of [
      "hasWifi",
      "hasAirConditioning",
      "hasTv",
      "hasPrivateBathroom",
      "extraBedAvailable",
      "isActive",
    ] as const) {
      if (field in body) {
        const value = body[field];

        if (typeof value !== "boolean") {
          return errorResponse(
            `${field} must be true or false.`
          );
        }

        data[field] = value;
      }
    }

    if ("smokingPolicy" in body) {
      const value = body.smokingPolicy;

      if (
        value !== null &&
        (
          typeof value !== "string" ||
          !Object.values(SmokingPolicy).includes(
            value as SmokingPolicy
          )
        )
      ) {
        return errorResponse(
          "Select a valid smoking policy."
        );
      }

      data.smokingPolicy = value;
    }

    if ("extraBedPrice" in body) {
      const value = body.extraBedPrice;

      if (
        value !== null &&
        (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < 0
        )
      ) {
        return errorResponse(
          "Extra bed price must be zero or greater, or null."
        );
      }

      data.extraBedPrice = value;
    }

    for (const field of [
      "childPolicy",
      "checkInTime",
      "checkOutTime",
      "additionalRules",
      "otherAmenities",
    ] as const) {
      if (field in body) {
        const value = body[field];

        if (
          value !== null &&
          typeof value !== "string"
        ) {
          return errorResponse(
            `${field} must be text or null.`
          );
        }

        if (
          typeof value === "string" &&
          value.length > 5000
        ) {
          return errorResponse(
            `${field} cannot exceed 5000 characters.`
          );
        }

        data[field] =
          typeof value === "string"
            ? value.trim() || null
            : null;
      }
    }

    if (Object.keys(data).length === 0) {
      return errorResponse(
        "No valid fields were provided for update."
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await lockRoomTypeInventory(tx, roomTypeId);

      const current = await tx.roomType.findFirst({
        where: {
          id: roomTypeId,
          propertyId,
        },
      });

      if (!current) {
        throw new Error("ROOM_NOT_FOUND");
      }

      const finalMaxGuests =
        (data.maxGuests as number | undefined) ??
        current.maxGuests;

      const finalMaxAdults =
        data.maxAdults !== undefined
          ? (data.maxAdults as number | null)
          : current.maxAdults;

      const finalMaxChildren =
        data.maxChildren !== undefined
          ? (data.maxChildren as number | null)
          : current.maxChildren;

      if (
        finalMaxAdults !== null &&
        finalMaxChildren !== null &&
        finalMaxAdults + finalMaxChildren >
          finalMaxGuests
      ) {
        throw new Error("CAPACITY_CONFLICT");
      }

      const finalTotalUnits =
        (data.totalUnits as number | undefined) ??
        current.totalUnits;

      if (finalTotalUnits !== current.totalUnits) {
        const inventory = await tx.roomInventory.findMany({
          where: {
            roomTypeId,
          },
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

        await tx.roomInventory.updateMany({
          where: {
            roomTypeId,
          },
          data: {
            totalUnits: finalTotalUnits,
          },
        });
      }

      return tx.roomType.update({
        where: {
          id: roomTypeId,
        },
        data: data as never,
      });
    });

    return Response.json({
      success: true,
      message: "Room type updated successfully.",
      data: updated,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ROOM_NOT_FOUND") {
        return errorResponse(
          "Room type no longer exists.",
          404
        );
      }

      if (error.message === "CAPACITY_CONFLICT") {
        return errorResponse(
          "Maximum adults and children cannot exceed maximum guests."
        );
      }

      if (error.message === "INVENTORY_CONFLICT") {
        return errorResponse(
          "Total units cannot be lower than reserved plus blocked units for any date."
        );
      }
    }

    return handleAuthError(error);
  }
}
