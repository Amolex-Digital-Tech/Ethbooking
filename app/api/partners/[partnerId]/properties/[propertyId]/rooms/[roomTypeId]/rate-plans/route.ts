import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import {
  CancellationPolicyType,
  MealPlan,
} from "@/lib/generated/prisma/enums";

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

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const mealPlan =
      typeof body.mealPlan === "string"
        ? body.mealPlan.trim().toUpperCase()
        : "ROOM_ONLY";

    const cancellationPolicy =
      typeof body.cancellationPolicy === "string"
        ? body.cancellationPolicy.trim().toUpperCase()
        : "";

    const cancellationDeadlineHours =
      typeof body.cancellationDeadlineHours === "number"
        ? body.cancellationDeadlineHours
        : null;

    const cancellationFeePercent =
      typeof body.cancellationFeePercent === "number"
        ? body.cancellationFeePercent
        : null;

    const basePrice =
      typeof body.basePrice === "number"
        ? body.basePrice
        : 0;

    const currency =
      typeof body.currency === "string"
        ? body.currency.trim().toUpperCase()
        : "ETB";

    if (!name) {
      return Response.json(
        {
          success: false,
          error: "Rate plan name is required.",
        },
        { status: 400 }
      );
    }

    if (!Object.values(MealPlan).includes(mealPlan as MealPlan)) {
      return Response.json(
        {
          success: false,
          error: "Invalid meal plan.",
        },
        { status: 400 }
      );
    }

    if (
      !Object.values(CancellationPolicyType).includes(
        cancellationPolicy as CancellationPolicyType
      )
    ) {
      return Response.json(
        {
          success: false,
          error: "Invalid cancellation policy.",
        },
        { status: 400 }
      );
    }

    if (basePrice <= 0) {
      return Response.json(
        {
          success: false,
          error: "Base price must be greater than zero.",
        },
        { status: 400 }
      );
    }

    if (
      cancellationDeadlineHours !== null &&
      (!Number.isInteger(cancellationDeadlineHours) ||
        cancellationDeadlineHours < 0)
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Cancellation deadline must be a non-negative whole number or null.",
        },
        { status: 400 }
      );
    }

    if (
      cancellationFeePercent !== null &&
      (cancellationFeePercent < 0 ||
        cancellationFeePercent > 100)
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Cancellation fee percentage must be between 0 and 100.",
        },
        { status: 400 }
      );
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      return Response.json(
        {
          success: false,
          error:
            "Currency must be a valid three-letter currency code.",
        },
        { status: 400 }
      );
    }

    const ratePlan = await prisma.ratePlan.create({
      data: {
        roomTypeId: roomType.id,
        name,
        description: description || null,
        mealPlan: mealPlan as MealPlan,
        cancellationPolicy:
          cancellationPolicy as CancellationPolicyType,
        cancellationDeadlineHours,
        cancellationFeePercent,
        basePrice,
        currency,
        isActive: true,
      },
      include: {
        roomType: true,
      },
    });

    return Response.json(
      {
        success: true,
        message: "Rate plan created successfully.",
        data: ratePlan,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}