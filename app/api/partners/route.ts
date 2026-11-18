import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export async function POST(request: Request) {
  try {
    const currentUser = await requireRole("CUSTOMER");
    const body = await request.json();

    const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
    const legalName = typeof body.legalName === "string" ? body.legalName.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const accountEmail = currentUser.authUser.email?.trim().toLowerCase();

    if (!businessName) {
      return Response.json({ success: false, error: "Business name is required." }, { status: 400 });
    }

    if (!accountEmail || !currentUser.authUser.email_confirmed_at) {
      return Response.json({ success: false, error: "Confirm your account email before applying to become a partner." }, { status: 400 });
    }

    const existingPendingApplication = await prisma.partnerMember.findFirst({
      where: {
        profileId: currentUser.profile.id,
        status: "INVITED",
        partner: { is: { status: "PENDING" } },
      },
      select: { id: true },
    });

    if (existingPendingApplication) {
      return Response.json({ success: false, error: "You already have a partner application awaiting review." }, { status: 409 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const partner = await tx.partner.create({
        data: {
          businessName,
          legalName: legalName || null,
          email: accountEmail,
          phone: phone || null,
          status: "PENDING",
        },
      });

      const member = await tx.partnerMember.create({
        data: {
          partnerId: partner.id,
          profileId: currentUser.profile.id,
          status: "INVITED",
        },
      });

      return { partner, member };
    });

    return Response.json(
      {
        success: true,
        message: "Your application has been submitted for review.",
        data: {
          partner: {
            id: result.partner.id,
            businessName: result.partner.businessName,
            status: result.partner.status,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}
