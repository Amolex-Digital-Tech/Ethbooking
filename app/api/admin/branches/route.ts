import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { writeAuditLog } from "@/lib/admin/write-audit-log";

export async function GET() {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");
    const branches = await prisma.branch.findMany({
      orderBy: [{ city: "asc" }, { name: "asc" }],
      include: { _count: { select: { members: true, cashRefunds: true } } },
    });
    return Response.json({ success: true, branches });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole("ADMIN", "SUPER_ADMIN");
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (name.length < 2 || name.length > 120 || !/^[A-Z0-9-]{2,20}$/.test(code) ||
        address.length < 5 || address.length > 300 || city.length < 2 || city.length > 100 ||
        phone.length > 40 || email.length > 160) {
      return Response.json({ success: false, error: "Enter a valid branch name, code, address and city. Branch code must be 2–20 letters, numbers or hyphens." }, { status: 400 });
    }

    const branch = await prisma.branch.create({
      data: { name, code, address, city, phone: phone || null, email: email || null },
    });
    await writeAuditLog({ actorProfileId: actor.profile.id, actorRole: actor.roles.join(","), action: "BRANCH_CREATED", entityType: "BRANCH", entityId: branch.id, description: `Created branch ${branch.name} (${branch.code}).`, metadata: { city: branch.city } });
    return Response.json({ success: true, branch, message: "Branch created successfully." }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return Response.json({ success: false, error: "That branch code is already in use." }, { status: 409 });
    }
    return handleAuthError(error);
  }
}
