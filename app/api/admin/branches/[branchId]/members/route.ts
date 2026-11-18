import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import type { UserRoleType } from "@/lib/generated/prisma/enums";
import { writeAuditLog } from "@/lib/admin/write-audit-log";

type Props = { params: Promise<{ branchId: string }> };

export async function GET(_request: Request, { params }: Props) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");
    const { branchId } = await params;
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        members: {
          orderBy: { createdAt: "desc" },
          include: { profile: { select: { id: true, firstName: true, lastName: true, phone: true } } },
        },
      },
    });
    if (!branch) return Response.json({ success: false, error: "Branch not found." }, { status: 404 });

    const profiles = await prisma.profile.findMany({
      where: { branchMemberships: { none: { branchId, status: "ACTIVE" } } },
      select: { id: true, firstName: true, lastName: true, phone: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 200,
    });
    return Response.json({ success: true, branch, profiles });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request, { params }: Props) {
  try {
    const actor = await requireRole("ADMIN", "SUPER_ADMIN");
    const { branchId } = await params;
    const body = await request.json();
    const profileId = typeof body.profileId === "string" ? body.profileId : "";
    const role = body.role === "MANAGER" ? "MANAGER" : body.role === "STAFF" ? "STAFF" : null;
    if (!profileId || !role) {
      return Response.json({ success: false, error: "Select an existing user and a branch role." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findUnique({ where: { id: branchId } });
      if (!branch) return { error: "Branch not found.", status: 404 as const };
      if (branch.status !== "ACTIVE") return { error: "Activate this branch before assigning employees.", status: 409 as const };
      const profile = await tx.profile.findUnique({ where: { id: profileId } });
      if (!profile) return { error: "Selected user profile was not found.", status: 404 as const };

      const existingMembership = await tx.branchMember.findUnique({ where: { profileId } });
      if (existingMembership && existingMembership.branchId !== branchId) {
        return { error: "This employee already belongs to another branch. Remove their previous branch membership before reassigning them.", status: 409 as const };
      }
      const roleName: UserRoleType = role === "MANAGER" ? "BRANCH_MANAGER" : "BRANCH_STAFF";
      const oppositeRoleName: UserRoleType = role === "MANAGER" ? "BRANCH_STAFF" : "BRANCH_MANAGER";
      const oppositeRole = await tx.role.findUnique({ where: { name: oppositeRoleName } });
      if (oppositeRole) await tx.userRole.deleteMany({ where: { profileId, roleId: oppositeRole.id } });
      const roleRecord = await tx.role.findUnique({ where: { name: roleName } });
      if (!roleRecord) throw new Error("Branch roles are not seeded. Apply the branch management migration first.");

      await tx.userRole.upsert({
        where: { profileId_roleId: { profileId, roleId: roleRecord.id } },
        create: { profileId, roleId: roleRecord.id },
        update: {},
      });
      const membership = await tx.branchMember.upsert({
        where: { profileId },
        create: { branchId, profileId, role, status: "ACTIVE" },
        update: { role, status: "ACTIVE" },
        include: { profile: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      });
      return { membership };
    });

    if ("error" in result) return Response.json({ success: false, error: result.error }, { status: result.status });
    await writeAuditLog({ actorProfileId: actor.profile.id, actorRole: actor.roles.join(","), action: "BRANCH_MEMBER_ASSIGNED", entityType: "BRANCH_MEMBER", entityId: result.membership.id, description: `Assigned ${result.membership.role.toLowerCase()} to branch ${branchId}.`, metadata: { branchId, profileId, role: result.membership.role } });
    return Response.json({ success: true, membership: result.membership, message: "Employee assigned to branch." }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(request: Request, { params }: Props) {
  try {
    const actor = await requireRole("ADMIN", "SUPER_ADMIN");
    const { branchId } = await params;
    const body = await request.json();
    const memberId = typeof body.memberId === "string" ? body.memberId : "";
    const status = body.status === "ACTIVE" || body.status === "SUSPENDED" ? body.status : null;
    if (!memberId || !status) return Response.json({ success: false, error: "Select a member and valid status." }, { status: 400 });

    const member = await prisma.branchMember.findFirst({ where: { id: memberId, branchId } });
    if (!member) return Response.json({ success: false, error: "Branch employee not found." }, { status: 404 });
    const updated = await prisma.branchMember.update({ where: { id: memberId }, data: { status } });
    await writeAuditLog({ actorProfileId: actor.profile.id, actorRole: actor.roles.join(","), action: status === "ACTIVE" ? "BRANCH_MEMBER_REACTIVATED" : "BRANCH_MEMBER_SUSPENDED", entityType: "BRANCH_MEMBER", entityId: updated.id, description: `${status === "ACTIVE" ? "Reactivated" : "Suspended"} branch employee access.`, metadata: { branchId, profileId: updated.profileId } });
    return Response.json({ success: true, membership: updated, message: status === "ACTIVE" ? "Employee access reactivated." : "Employee access suspended." });
  } catch (error) {
    return handleAuthError(error);
  }
}
