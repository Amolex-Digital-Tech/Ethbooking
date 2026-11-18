import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import {
  CancellationPolicyType,
  MealPlan,
} from "@/lib/generated/prisma/enums";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      partnerId: string;
      propertyId: string;
      roomTypeId: string;
      ratePlanId: string;
    }>;
  }
) {
  try {
    const {
      partnerId,
      propertyId,
      roomTypeId,
      ratePlanId,
    } = await params;

    if (!partnerId || !propertyId || !roomTypeId || !ratePlanId) {
      return Response.json(
        {
          success: false,
          error:
            "Partner ID, property ID, room type ID, and rate plan ID are required.",
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

    const ratePlan = await prisma.ratePlan.findFirst({
      where: {
        id: ratePlanId,
        roomTypeId,
      },
    });

    if (!ratePlan) {
      return Response.json(
        {
          success: false,
          error: "Rate plan not found.",
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    const data: {
      name?: string;
      description?: string | null;
      mealPlan?: MealPlan;
      cancellationPolicy?: CancellationPolicyType;
      cancellationDeadlineHours?: number | null;
      cancellationFeePercent?: number | null;
      basePrice?: number;
      currency?: string;
      isActive?: boolean;
    } = {};

    if ("name" in body) {
      if (
        typeof body.name !== "string" ||
        !body.name.trim()
      ) {
        return Response.json(
          {
            success: false,
            error: "Rate plan name must be a non-empty string.",
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

    if ("mealPlan" in body) {
      if (
        typeof body.mealPlan !== "string" ||
        !Object.values(MealPlan).includes(
          body.mealPlan.trim().toUpperCase() as MealPlan
        )
      ) {
        return Response.json(
          {
            success: false,
            error: "Invalid meal plan.",
          },
          { status: 400 }
        );
      }

      data.mealPlan =
        body.mealPlan.trim().toUpperCase() as MealPlan;
    }

    if ("cancellationPolicy" in body) {
      if (
        typeof body.cancellationPolicy !== "string" ||
        !Object.values(CancellationPolicyType).includes(
          body.cancellationPolicy
            .trim()
            .toUpperCase() as CancellationPolicyType
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

      data.cancellationPolicy =
        body.cancellationPolicy
          .trim()
          .toUpperCase() as CancellationPolicyType;
    }

    if ("cancellationDeadlineHours" in body) {
      if (
        body.cancellationDeadlineHours !== null &&
        (typeof body.cancellationDeadlineHours !== "number" ||
          !Number.isInteger(body.cancellationDeadlineHours) ||
          body.cancellationDeadlineHours < 0)
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

      data.cancellationDeadlineHours =
        body.cancellationDeadlineHours;
    }

    if ("cancellationFeePercent" in body) {
      if (
        body.cancellationFeePercent !== null &&
        (typeof body.cancellationFeePercent !== "number" ||
          body.cancellationFeePercent < 0 ||
          body.cancellationFeePercent > 100)
      ) {
        return Response.json(
          {
            success: false,
            error:
              "Cancellation fee percentage must be between 0 and 100 or null.",
          },
          { status: 400 }
        );
      }

      data.cancellationFeePercent =
        body.cancellationFeePercent;
    }

    if ("basePrice" in body) {
      if (
        typeof body.basePrice !== "number" ||
        body.basePrice <= 0
      ) {
        return Response.json(
          {
            success: false,
            error: "Base price must be greater than zero.",
          },
          { status: 400 }
        );
      }

      data.basePrice = body.basePrice;
    }

    if ("currency" in body) {
      if (
        typeof body.currency !== "string" ||
        !/^[A-Z]{3}$/.test(
          body.currency.trim().toUpperCase()
        )
      ) {
        return Response.json(
          {
            success: false,
            error:
              "Currency must be a valid three-letter currency code.",
          },
          { status: 400 }
        );
      }

      data.currency = body.currency.trim().toUpperCase();
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

    const updatedRatePlan = await prisma.ratePlan.update({
      where: {
        id: ratePlan.id,
      },
      data,
      include: {
        roomType: true,
      },
    });

    return Response.json({
      success: true,
      message: "Rate plan updated successfully.",
      data: updatedRatePlan,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}