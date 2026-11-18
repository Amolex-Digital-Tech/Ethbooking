import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { writeAuditLog } from "@/lib/admin/write-audit-log";
import type { UserRoleType } from "@/lib/generated/prisma/enums";

type Props = { params: Promise<{ profileId: string }> };
const MANAGED_ROLES: UserRoleType[] = ["SUPPORT_AGENT", "FINANCE", "CONTENT_MANAGER", "ADMIN", "SUPER_ADMIN"];

export async function POST(request: Request, { params }: Props) {
  try {
    const actor = await requireRole("SUPER_ADMIN");
    const { profileId } = await params;
    const body = await request.json().catch(() => null);
    const role = typeof body?.role === "string" ? body.role as UserRoleType : null;
    if (!role || !MANAGED_ROLES.includes(role)) {
      return Response.json({ success: false, error: "Choose a supported platform role. Branch roles are managed from the branch directory." }, { status: 400 });
    }
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) return Response.json({ success: false, error: "User profile not found." }, { status: 404 });
    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) return Response.json({ success: false, error: "Role definition is missing from the database." }, { status: 409 });
    await prisma.userRole.upsert({
      where: { profileId_roleId: { profileId, roleId: roleRecord.id } },
      create: { profileId, roleId: roleRecord.id },
      update: {},
    });
    await writeAuditLog({ actorProfileId: actor.profile.id, actorRole: actor.roles.join(","), action: "USER_ROLE_ASSIGNED", entityType: "USER", entityId: profileId, description: `Assigned platform role ${role} to user.`, metadata: { role } });
    return Response.json({ success: true, message: `Assigned ${role.replaceAll("_"," ")} role.` });
  } catch (error) { return handleAuthError(error); }
}

export async function DELETE(request: Request, { params }: Props) {
  try {
    const actor = await requireRole("SUPER_ADMIN");
    const { profileId } = await params;
    const body = await request.json().catch(() => null);
    const role = typeof body?.role === "string" ? body.role as UserRoleType : null;
    if (!role || !MANAGED_ROLES.includes(role)) return Response.json({ success: false, error: "Choose a supported platform role." }, { status: 400 });
    if (role === "SUPER_ADMIN") {
      const count = await prisma.userRole.count({ where: { role: { name: "SUPER_ADMIN" } } });
      const assigned = await prisma.userRole.findFirst({ where: { profileId, role: { name: "SUPER_ADMIN" } } });
      if (assigned && count <= 1) return Response.json({ success: false, error: "The last Super Admin role cannot be removed." }, { status: 409 });
      if (profileId === actor.profile.id) return Response.json({ success: false, error: "You cannot remove your own Super Admin role." }, { status: 409 });
    }
    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) return Response.json({ success: false, error: "Role definition not found." }, { status: 404 });
    await prisma.userRole.deleteMany({ where: { profileId, roleId: roleRecord.id } });
    await writeAuditLog({ actorProfileId: actor.profile.id, actorRole: actor.roles.join(","), action: "USER_ROLE_REMOVED", entityType: "USER", entityId: profileId, description: `Removed platform role ${role} from user.`, metadata: { role } });
    return Response.json({ success: true, message: `Removed ${role.replaceAll("_"," ")} role.` });
  } catch (error) { return handleAuthError(error); }
}
