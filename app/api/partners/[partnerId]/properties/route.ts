import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    const { partnerId } = await params;

    if (!partnerId) {
      return Response.json(
        {
          success: false,
          error: "Partner ID is required.",
        },
        { status: 400 }
      );
    }

    await requirePartnerMembership(partnerId);

    const properties = await prisma.property.findMany({
      where: {
        partnerId,
      },
      include: {
        location: true,
        roomTypes: true,
        photos: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({
      success: true,
      data: properties,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}