
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma/client";
import type {
  PartnerMemberStatus,
  PartnerStatus,
} from "@/lib/generated/prisma/enums";
import { AuthError } from "@/lib/auth/auth-error";

type PartnerMembershipOptions = {
  allowedMembershipStatuses?: PartnerMemberStatus[];
  allowedPartnerStatuses?: PartnerStatus[];
  allowStaff?: boolean;
};

export async function requirePartnerMembership(
  partnerId: string,
  options: PartnerMembershipOptions = {}
) {
  const currentUser = await requireAuth();

  const {
    allowedMembershipStatuses = ["ACTIVE"],
    allowedPartnerStatuses = ["ACTIVE", "PENDING"],
    allowStaff = false,
  } = options;

  const hasManagementRole = currentUser.roles.some((role) =>
    ["PARTNER_OWNER", "PARTNER_MANAGER"].includes(role)
  );
  const isStaffOnly = currentUser.roles.includes("PARTNER_STAFF") && !hasManagementRole;
  if (!hasManagementRole && !(allowStaff && isStaffOnly)) {
    throw new AuthError("FORBIDDEN");
  }

  const membership = await prisma.partnerMember.findFirst({
    where: {
      partnerId,
      profileId: currentUser.profile.id,
      status: {
        in: allowedMembershipStatuses,
      },
    },
    include: {
      partner: true,
    },
  });

  if (
    !membership ||
    !allowedPartnerStatuses.includes(membership.partner.status)
  ) {
    throw new AuthError("PARTNER_MEMBERSHIP_REQUIRED");
  }

  return {
    currentUser,
    membership,
    partner: membership.partner,
  };
}
