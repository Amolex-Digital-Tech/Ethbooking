import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export async function POST(
  _request: Request,
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

    if (property.status !== "DRAFT") {
      return Response.json(
        {
          success: false,
          error: `Property cannot be submitted from ${property.status} status.`,
        },
        { status: 409 }
      );
    }

    const updatedProperty = await prisma.property.update({
      where: {
        id: property.id,
      },
      data: {
        status: "PENDING_REVIEW",
        verificationStatus: "PENDING",
        rejectionReason: null,
      },
      include: {
        location: true,
        partner: true,
      },
    });

    return Response.json({
      success: true,
      message: "Property submitted for review.",
      data: updatedProperty,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}