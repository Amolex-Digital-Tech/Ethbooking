import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(
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
          error: "A valid JSON request body is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("description" in body) ||
      typeof body.description !== "string"
    ) {
      return Response.json(
        {
          success: false,
          error: "A property description is required.",
        },
        { status: 400 }
      );
    }

    const description = body.description.trim();

    if (description.length < 30) {
      return Response.json(
        {
          success: false,
          error: "Description must contain at least 30 characters.",
        },
        { status: 400 }
      );
    }

    if (description.length > 5000) {
      return Response.json(
        {
          success: false,
          error: "Description cannot exceed 5,000 characters.",
        },
        { status: 400 }
      );
    }

    const updatedProperty = await prisma.property.update({
      where: {
        id: property.id,
      },
      data: {
        description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        verificationStatus: true,
      },
    });

    return Response.json({
      success: true,
      message: "Property description saved successfully.",
      data: updatedProperty,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
