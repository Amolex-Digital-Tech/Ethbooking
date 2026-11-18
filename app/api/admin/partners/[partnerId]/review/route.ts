import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");
    const { partnerId } = await params;
    const body = await request.json();
    const decision = body.decision;

    if (decision !== "APPROVE" && decision !== "REJECT") {
      return Response.json({ success: false, error: "Choose approve or reject." }, { status: 400 });
    }

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: { members: { where: { status: "INVITED" } } },
    });

    if (!partner || partner.status !== "PENDING") {
      return Response.json({ success: false, error: "This partner application is not awaiting review." }, { status: 404 });
    }

    if (decision === "APPROVE" && (!partner.email || partner.members.length === 0)) {
      return Response.json({ success: false, error: "This application is missing an account email or applicant membership." }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      if (decision === "REJECT") {
        await tx.partner.update({
          where: { id: partnerId },
          data: { status: "INACTIVE" },
        });
        await tx.partnerMember.updateMany({
          where: { partnerId, status: "INVITED" },
          data: { status: "REMOVED" },
        });
        return;
      }

      const ownerRole = await tx.role.findUnique({ where: { name: "PARTNER_OWNER" } });
      if (!ownerRole) throw new Error("PARTNER_OWNER role has not been seeded.");

      await tx.partner.update({
        where: { id: partnerId },
        data: { status: "ACTIVE" },
      });

      for (const member of partner.members) {
        await tx.userRole.upsert({
          where: {
            profileId_roleId: { profileId: member.profileId, roleId: ownerRole.id },
          },
          update: {},
          create: { profileId: member.profileId, roleId: ownerRole.id },
        });
      }

      await tx.partnerMember.updateMany({
        where: { partnerId, status: "INVITED" },
        data: { status: "ACTIVE" },
      });
    });

    return Response.json({
      success: true,
      message: decision === "APPROVE"
        ? "Partner application approved. The applicant can now sign in using the partner ID."
        : "Partner application rejected.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
