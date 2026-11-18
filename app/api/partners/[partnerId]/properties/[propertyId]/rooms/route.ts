import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { BedType } from "@/lib/generated/prisma/enums";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      partnerId: string;
      propertyId: string;
    }>;
  }
) {
  try {
    const { partnerId, propertyId } = await params;

    if (!partnerId || !propertyId) {
      return Response.json(
        {
          success: false,
          error: "Partner ID and property ID are required.",
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

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const maxGuests =
      typeof body.maxGuests === "number"
        ? body.maxGuests
        : 0;

    const maxAdults =
      typeof body.maxAdults === "number"
        ? body.maxAdults
        : null;

    const maxChildren =
      typeof body.maxChildren === "number"
        ? body.maxChildren
        : null;

    const bedType =
      typeof body.bedType === "string"
        ? body.bedType.trim().toUpperCase()
        : "";

    const bedCount =
      typeof body.bedCount === "number"
        ? body.bedCount
        : 1;

    const sizeSquareMeters =
      typeof body.sizeSquareMeters === "number"
        ? body.sizeSquareMeters
        : null;

    const totalUnits =
      typeof body.totalUnits === "number"
        ? body.totalUnits
        : 0;

    if (!name) {
      return Response.json(
        {
          success: false,
          error: "Room type name is required.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(maxGuests) || maxGuests < 1) {
      return Response.json(
        {
          success: false,
          error: "Maximum guests must be a positive whole number.",
        },
        { status: 400 }
      );
    }

    if (!Object.values(BedType).includes(bedType as BedType)) {
      return Response.json(
        {
          success: false,
          error: "Invalid bed type.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(bedCount) || bedCount < 1) {
      return Response.json(
        {
          success: false,
          error: "Bed count must be a positive whole number.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(totalUnits) || totalUnits < 1) {
      return Response.json(
        {
          success: false,
          error: "Total units must be a positive whole number.",
        },
        { status: 400 }
      );
    }

    if (
      maxAdults !== null &&
      (!Number.isInteger(maxAdults) || maxAdults < 0)
    ) {
      return Response.json(
        {
          success: false,
          error: "Maximum adults must be a non-negative whole number.",
        },
        { status: 400 }
      );
    }

    if (
      maxChildren !== null &&
      (!Number.isInteger(maxChildren) || maxChildren < 0)
    ) {
      return Response.json(
        {
          success: false,
          error: "Maximum children must be a non-negative whole number.",
        },
        { status: 400 }
      );
    }

    if (
      sizeSquareMeters !== null &&
      (typeof sizeSquareMeters !== "number" ||
        sizeSquareMeters <= 0)
    ) {
      return Response.json(
        {
          success: false,
          error: "Room size must be greater than zero.",
        },
        { status: 400 }
      );
    }

    if (
      maxAdults !== null &&
      maxChildren !== null &&
      maxAdults + maxChildren > maxGuests
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
    
    const optionalBoolean = (value: unknown): boolean | null => {
      return typeof value === "boolean" ? value : null;
    };

    const optionalText = (value: unknown): string | null => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const hasWifi = optionalBoolean(body.hasWifi);
    const hasAirConditioning = optionalBoolean(body.hasAirConditioning);
    const hasTv = optionalBoolean(body.hasTv);
    const hasPrivateBathroom = optionalBoolean(body.hasPrivateBathroom);
    const extraBedAvailable = optionalBoolean(body.extraBedAvailable);

    const smokingPolicy =
      body.smokingPolicy === "SMOKING_ALLOWED" ||
      body.smokingPolicy === "NON_SMOKING" ||
      body.smokingPolicy === "DESIGNATED_AREAS"
        ? body.smokingPolicy
        : null;

    const extraBedPrice =
      typeof body.extraBedPrice === "number" &&
      Number.isFinite(body.extraBedPrice) &&
      body.extraBedPrice >= 0
        ? body.extraBedPrice
        : null;

    const childPolicy = optionalText(body.childPolicy);
    const checkInTime = optionalText(body.checkInTime);
    const checkOutTime = optionalText(body.checkOutTime);
    const additionalRules = optionalText(body.additionalRules);
    const otherAmenities = optionalText(body.otherAmenities);

    if (
      body.extraBedPrice !== undefined &&
      body.extraBedPrice !== null &&
      extraBedPrice === null
    ) {
      return Response.json(
        {
          success: false,
          error: "Extra bed price must be a valid non-negative number.",
        },
        { status: 400 }
      );
    }

    const roomType = await prisma.roomType.create({
      data: {
        propertyId: property.id,
        name,
        description: description || null,
        maxGuests,
        maxAdults,
        maxChildren,
        bedType: bedType as BedType,
        bedCount,
        sizeSquareMeters,
        totalUnits,
        hasWifi,
        hasAirConditioning,
        hasTv,
        hasPrivateBathroom,
        smokingPolicy,
        extraBedAvailable,
        extraBedPrice,
        childPolicy,
        checkInTime,
        checkOutTime,
        additionalRules,
        otherAmenities,
        isActive: true,
      },
      include: {
        property: true,
        photos: true,
        ratePlans: true,
        inventory: true,
      },
    });

    return Response.json(
      {
        success: true,
        message: "Room type created successfully.",
        data: roomType,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}