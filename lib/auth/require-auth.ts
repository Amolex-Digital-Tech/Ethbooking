import { getCurrentUser } from "@/lib/auth/get-current-user";
import { AuthError } from "@/lib/auth/auth-error";

export async function requireAuth() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new AuthError("UNAUTHENTICATED");
  }

  return currentUser;
}