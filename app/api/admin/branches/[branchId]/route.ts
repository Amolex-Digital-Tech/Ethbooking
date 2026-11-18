import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { writeAuditLog } from "@/lib/admin/write-audit-log";

type Props = { params: Promise<{ branchId: string }> };

export async function PATCH(request: Request, { params }: Props) {
  try {
    const actor = await requireRole("ADMIN", "SUPER_ADMIN");
    const { branchId } = await params;
    const body = await request.json();
    const current = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!current) return Response.json({ success: false, error: "Branch not found." }, { status: 404 });

    const data: {
      name?: string; code?: string; address?: string; city?: string;
      phone?: string | null; email?: string | null; status?: "ACTIVE" | "INACTIVE";
    } = {};

    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.code === "string") data.code = body.code.trim().toUpperCase();
    if (typeof body.address === "string") data.address = body.address.trim();
    if (typeof body.city === "string") data.city = body.city.trim();
    if (typeof body.phone === "string") data.phone = body.phone.trim() || null;
    if (typeof body.email === "string") data.email = body.email.trim().toLowerCase() || null;
    if (body.status === "ACTIVE" || body.status === "INACTIVE") data.status = body.status;

    if ((data.name !== undefined && (data.name.length < 2 || data.name.length > 120)) ||
        (data.code !== undefined && !/^[A-Z0-9-]{2,20}$/.test(data.code)) ||
        (data.address !== undefined && (data.address.length < 5 || data.address.length > 300)) ||
        (data.city !== undefined && (data.city.length < 2 || data.city.length > 100))) {
      return Response.json({ success: false, error: "One or more branch fields are invalid." }, { status: 400 });
    }

    const branch = await prisma.branch.update({ where: { id: branchId }, data });
    await writeAuditLog({ actorProfileId: actor.profile.id, actorRole: actor.roles.join(","), action: "BRANCH_UPDATED", entityType: "BRANCH", entityId: branch.id, description: `Updated branch ${branch.name}.`, metadata: { changedFields: Object.keys(data), status: branch.status } });
    return Response.json({ success: true, branch, message: "Branch updated successfully." });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return Response.json({ success: false, error: "That branch code is already in use." }, { status: 409 });
    }
    return handleAuthError(error);
  }
}
