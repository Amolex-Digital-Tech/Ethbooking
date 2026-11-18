import { requireAuth } from "@/lib/auth/require-auth";
import { AuthError } from "@/lib/auth/auth-error";
import { prisma } from "@/lib/prisma/client";

export async function requireBranchMembership(...allowedRoles: Array<"MANAGER" | "STAFF">) {
  const currentUser = await requireAuth();
  const membership = await prisma.branchMember.findUnique({
    where: { profileId: currentUser.profile.id },
    include: { branch: true },
  });

  if (!membership || membership.status !== "ACTIVE" || membership.branch.status !== "ACTIVE") {
    throw new AuthError("FORBIDDEN");
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
    throw new AuthError("FORBIDDEN");
  }

  return { ...currentUser, branchMembership: membership };
}
