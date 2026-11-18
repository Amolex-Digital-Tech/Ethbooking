import { AuthError } from "@/lib/auth/auth-error";
import { requireRole } from "@/lib/auth/require-role";
import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";

import {
  createPartnerFinancialReportCsv,
  getPartnerFinancialReport,
} from "@/lib/partner/financial-reports";

export async function GET(request: Request) {
  try {
    // Only partner owners can export financial reports.
    const currentUser = await requireRole("PARTNER_OWNER", "PARTNER_MANAGER");

    // Find an ACTIVE partner membership belonging to an ACTIVE organization.
    const membership = await requirePartnerMembershipForExport(
      currentUser.profile.id
    );

    // Confirm authorization and partner status.
    const authorizedMembership = await requirePartnerMembership(
      membership.partnerId,
      {
        allowedPartnerStatuses: ["ACTIVE"],
      }
    );

    const { searchParams } = new URL(request.url);

    const report = await getPartnerFinancialReport(
      authorizedMembership.partner.id,
      {
        period: searchParams.get("period") || "month",
        from: searchParams.get("from") || undefined,
        to: searchParams.get("to") || undefined,
      }
    );

    const csv = createPartnerFinancialReportCsv(report);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="ethiopianbooking-partner-financial-report.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }

    console.error("Partner financial report export error:", error);

    return Response.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to generate the partner financial report.",
      },
      {
        status: 500,
      }
    );
  }
}

async function requirePartnerMembershipForExport(profileId: string) {
  const { prisma } = await import("@/lib/prisma/client");

  const membership = await prisma.partnerMember.findFirst({
    where: {
      profileId,
      status: "ACTIVE",
      partner: {
        status: "ACTIVE",
      },
    },
    select: {
      partnerId: true,
    },
  });

  if (!membership) {
    throw new AuthError("PARTNER_MEMBERSHIP_REQUIRED");
  }

  return membership;
}