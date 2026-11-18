import { requireAuth } from "@/lib/auth/require-auth";
import { AuthError } from "@/lib/auth/auth-error";
import type { UserRoleType } from "@/lib/generated/prisma/enums";

export async function requireRole(...allowedRoles: UserRoleType[]) {
  const currentUser = await requireAuth();

  const hasRequiredRole = currentUser.roles.some((role) =>
    allowedRoles.includes(role)
  );

  if (!hasRequiredRole) {
    throw new AuthError("FORBIDDEN");
  }

  return currentUser;
}