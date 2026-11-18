import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    const currentUser = await requireRole(
      "PARTNER_OWNER",
      "PARTNER_MANAGER",
      "PARTNER_STAFF"
    );

    const membership = await prisma.partnerMember.findFirst({
      where: {
        profileId: currentUser.profile.id,
        status: "ACTIVE",
      },
      include: {
        partner: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
      },
    });

    if (!membership) {
      return Response.json(
        {
          success: false,
          error: "You do not have an active partner organization.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: membership.partner,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}