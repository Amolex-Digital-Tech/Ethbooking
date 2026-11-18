
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const portal = body?.portal;

    if (portal !== "partner" && portal !== "admin" && portal !== "staff") {
      return NextResponse.json(
        { success: false, error: "Invalid portal." },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Please sign in with an account linked to your profile.",
        },
        { status: 401 }
      );
    }

    if (portal === "staff") {
      const staffRole = body?.staffRole;

      // Determine invitation destination from database-backed role assignments.
      if (staffRole === "AUTO") {
        const platformRoles = currentUser.roles.filter(
          (role) => role === "SUPPORT_AGENT" || role === "FINANCE"
        );

        if (platformRoles.length === 1) {
          return NextResponse.json({
            success: true,
            destination: platformRoles[0] === "FINANCE" ? "/finance" : "/support",
          });
        }

        if (platformRoles.length > 1) {
          return NextResponse.json({
            success: false,
            error: "This account has multiple platform staff roles. Contact an administrator to confirm the correct access.",
          }, { status: 403 });
        }

        if (currentUser.roles.includes("PARTNER_STAFF") && !currentUser.roles.some((role) => role === "PARTNER_OWNER" || role === "PARTNER_MANAGER")) {
          const partnerMembership = await prisma.partnerMember.findFirst({
            where: { profileId: currentUser.profile.id, status: "ACTIVE", partner: { status: "ACTIVE" } },
            select: { id: true },
          });
          if (partnerMembership) return NextResponse.json({ success: true, destination: "/partner/staff" });
          return NextResponse.json({ success: false, error: "Your partner staff membership is not active. Contact your Partner Owner." }, { status: 403 });
        }

        const membership = await prisma.branchMember.findUnique({
          where: { profileId: currentUser.profile.id },
          include: { branch: { select: { status: true } } },
        });
        const expectedRole = membership?.role === "MANAGER" ? "BRANCH_MANAGER" : "BRANCH_STAFF";

        if (
          membership &&
          membership.status === "ACTIVE" &&
          membership.branch.status === "ACTIVE" &&
          currentUser.roles.includes(expectedRole)
        ) {
          return NextResponse.json({ success: true, destination: "/branch" });
        }

        return NextResponse.json({
          success: false,
          error: "Your account does not have an active staff role. Contact your administrator.",
        }, { status: 403 });
      }
      if (staffRole === "SUPPORT_AGENT" || staffRole === "FINANCE") {
        if (!currentUser.roles.includes(staffRole)) {
          return NextResponse.json({ success: false, error: `This account does not have ${staffRole === "FINANCE" ? "Finance" : "Support Agent"} access.` }, { status: 403 });
        }
        return NextResponse.json({ success: true, destination: staffRole === "FINANCE" ? "/finance" : "/support" });
      }
      if (staffRole === "BRANCH_MANAGER" || staffRole === "BRANCH_STAFF") {
        const expectedMembershipRole = staffRole === "BRANCH_MANAGER" ? "MANAGER" : "STAFF";
        const membership = await prisma.branchMember.findUnique({
          where: { profileId: currentUser.profile.id },
          include: { branch: { select: { status: true } } },
        });
        if (!membership || membership.status !== "ACTIVE" || membership.branch.status !== "ACTIVE" || membership.role !== expectedMembershipRole) {
          return NextResponse.json({ success: false, error: "This account does not have active access for the selected branch role. Contact your administrator." }, { status: 403 });
        }
        const requiredRole = staffRole;
        if (!currentUser.roles.includes(requiredRole)) {
          return NextResponse.json({ success: false, error: "Your branch role is not fully configured. Contact your administrator." }, { status: 403 });
        }
        return NextResponse.json({ success: true, destination: "/branch" });
      }
      return NextResponse.json({ success: false, error: "Select a valid staff role." }, { status: 400 });
    }

    if (portal === "admin") {
      const isAdmin = currentUser.roles.some(
        (role) => role === "ADMIN" || role === "SUPER_ADMIN"
      );

      if (!isAdmin) {
        return NextResponse.json(
          {
            success: false,
            error: "This account does not have administrator access.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        destination: "/admin",
      });
    }

    const hasPartnerAccess = currentUser.roles.some((role) => ["PARTNER_OWNER", "PARTNER_MANAGER", "PARTNER_STAFF"].includes(role));

    if (!hasPartnerAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "This account does not have property-owner access.",
        },
        { status: 403 }
      );
    }

const membership = await prisma.partnerMember.findFirst({
  where: {
    profileId: currentUser.profile.id,
    status: "ACTIVE",
  },
  select: {
    id: true,
    partner: {
      select: {
        status: true,
      },
    },
  },
});

if (
  !membership ||
  membership.partner.status === "SUSPENDED" ||
  membership.partner.status === "INACTIVE"
) {
  return NextResponse.json(
    {
      success: false,
      error: "Your partner account is not currently active.",
    },
    { status: 403 }
  );
}

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: "No active property-owner membership was found.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      destination: currentUser.roles.includes("PARTNER_STAFF") && !currentUser.roles.some((role) => ["PARTNER_OWNER", "PARTNER_MANAGER"].includes(role)) ? "/partner/staff" : "/partner",
    });
  } catch (error) {
    console.error("Portal access check failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to verify access. Please try again.",
      },
      { status: 500 }
    );
  }
}
