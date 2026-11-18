import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

type RouteContext = {
  params: Promise<{
    partnerId: string;
    propertyId: string;
  }>;
};

export async function POST(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { partnerId, propertyId } = await params;

    if (!partnerId || !propertyId) {
      return Response.json(
        { success: false, error: "Partner ID and property ID are required." },
        { status: 400 }
      );
    }

    await requirePartnerMembership(partnerId);

    const property = await prisma.property.findFirst({
      where: { id: propertyId, partnerId },
      include: {
        photos: { select: { id: true } },
        roomTypes: { select: { id: true } },
        documents: { select: { id: true } },
      },
    });

    if (!property) {
      return Response.json(
        { success: false, error: "Property not found for this partner." },
        { status: 404 }
      );
    }

    if (property.status !== "DRAFT" && property.status !== "REJECTED") {
      return Response.json(
        {
          success: false,
          error: `This property cannot be submitted from its current ${property.status.replaceAll("_", " ").toLowerCase()} status.`,
        },
        { status: 409 }
      );
    }

    const missingRequirements: string[] = [];

    if (!property.description?.trim() || property.description.trim().length < 30) {
      missingRequirements.push("a property description of at least 30 characters");
    }
    if (property.photos.length === 0) {
      missingRequirements.push("at least one property photo");
    }
    if (property.roomTypes.length === 0) {
      missingRequirements.push("at least one room type");
    }
    if (property.documents.length === 0) {
      missingRequirements.push("at least one verification document");
    }

    if (missingRequirements.length > 0) {
      return Response.json(
        {
          success: false,
          error: "Complete the following before submitting: " + missingRequirements.join(", ") + ".",
        },
        { status: 422 }
      );
    }

    const updated = await prisma.property.updateMany({
      where: {
        id: propertyId,
        partnerId,
        status: { in: ["DRAFT", "REJECTED"] },
      },
      data: {
        status: "PENDING_REVIEW",
        verificationStatus: "PENDING",
        rejectionReason: null,
      },
    });

    if (updated.count === 0) {
      return Response.json(
        { success: false, error: "The property status changed. Refresh the page and try again." },
        { status: 409 }
      );
    }

    return Response.json({
      success: true,
      message: "Property submitted for admin verification.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
