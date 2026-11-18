import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");

    const applications = await prisma.partner.findMany({
      where: { status: "PENDING" },
      include: {
        members: {
          where: { status: "INVITED" },
          include: {
            profile: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return Response.json({
      success: true,
      data: applications.map((partner) => ({
        id: partner.id,
        businessName: partner.businessName,
        legalName: partner.legalName,
        email: partner.email,
        phone: partner.phone,
        createdAt: partner.createdAt,
        applicants: partner.members.map((member) => ({
          firstName: member.profile.firstName,
          lastName: member.profile.lastName,
          phone: member.profile.phone,
        })),
      })),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
