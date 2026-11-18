import { requireAuth } from "@/lib/auth/require-auth";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    const currentUser = await requireAuth();
    const membership = await prisma.branchMember.findUnique({
      where: { profileId: currentUser.profile.id },
      include: { branch: { select: { status: true } } },
    });
    const destination = membership?.status === "ACTIVE" && membership.branch.status === "ACTIVE" ? "/branch" : "/";
    return Response.json({ success: true, destination });
  } catch (error) { return handleAuthError(error); }
}
