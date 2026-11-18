import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserRoleType } from "@/lib/generated/prisma/enums";
import { writeAuditLog } from "@/lib/admin/write-audit-log";

type Props = { params: Promise<{ branchId: string }> };
type InviteRole = "MANAGER" | "STAFF" | "SUPPORT_AGENT" | "FINANCE";

export async function POST(request: Request, { params }: Props) {
  let invitedAuthUserId: string | null = null;

  try {
    const actor = await requireRole("ADMIN", "SUPER_ADMIN");
    const { branchId } = await params;
    const body = await request.json().catch(() => null);
    const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const role: InviteRole | null =
      body?.role === "MANAGER" || body?.role === "STAFF" ||
      body?.role === "SUPPORT_AGENT" || body?.role === "FINANCE"
        ? body.role
        : null;
    const isBranchRole = role === "MANAGER" || role === "STAFF";

    if (
      firstName.length < 2 || firstName.length > 80 ||
      lastName.length < 2 || lastName.length > 80 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 160 || phone.length > 40 || !role
    ) {
      return Response.json({ success: false, error: "Enter a valid first name, last name, email, optional phone number, and employee role." }, { status: 400 });
    }

    const branchRecord = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branchRecord) return Response.json({ success: false, error: "Branch not found." }, { status: 404 });
    if (isBranchRole && branchRecord.status !== "ACTIVE") {
      return Response.json({ success: false, error: "Activate this branch before inviting Branch Managers or Branch Staff." }, { status: 409 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const origin = new URL(request.url).origin;
    const isPlatformRole = role === "SUPPORT_AGENT" || role === "FINANCE";
    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name: firstName,
        last_name: lastName,
        phone,
        country_code: "+251",
        account_type: isPlatformRole ? "platform_employee" : "branch_employee",
        staff_role: role,
        ...(isBranchRole ? { branch_id: branchId } : {}),
      },
      redirectTo: `${origin}/auth/callback?next=%2Fstaff%2Faccept-invite`,
    });

    if (inviteError || !invited.user) {
      return Response.json({ success: false, error: inviteError?.message || "Supabase did not return an invited user." }, { status: 409 });
    }
    invitedAuthUserId = invited.user.id;

    const roleName: UserRoleType =
      role === "MANAGER" ? "BRANCH_MANAGER" :
      role === "STAFF" ? "BRANCH_STAFF" :
      role;

    const result = await prisma.$transaction(async (tx) => {
      const existingProfile = await tx.profile.findUnique({ where: { authUserId: invited.user.id } });
      const profile = existingProfile
        ? await tx.profile.update({ where: { id: existingProfile.id }, data: { firstName, lastName, phone: phone || null } })
        : await tx.profile.create({ data: { authUserId: invited.user.id, firstName, lastName, phone: phone || null } });

      const roleRecord = await tx.role.findUnique({ where: { name: roleName } });
      if (!roleRecord) throw new Error(`The ${roleName} role is not seeded. Apply the role-seed migration before inviting this employee.`);

      if (isBranchRole) {
        const existingMembership = await tx.branchMember.findUnique({ where: { profileId: profile.id } });
        if (existingMembership && existingMembership.branchId !== branchId) {
          throw new Error("This employee already belongs to another branch. Remove their previous branch membership before inviting them to this branch.");
        }

        const oppositeRoleName: UserRoleType = role === "MANAGER" ? "BRANCH_STAFF" : "BRANCH_MANAGER";
        const oppositeRole = await tx.role.findUnique({ where: { name: oppositeRoleName } });
        if (oppositeRole) await tx.userRole.deleteMany({ where: { profileId: profile.id, roleId: oppositeRole.id } });

        await tx.userRole.upsert({
          where: { profileId_roleId: { profileId: profile.id, roleId: roleRecord.id } },
          create: { profileId: profile.id, roleId: roleRecord.id },
          update: {},
        });

        const membership = await tx.branchMember.upsert({
          where: { profileId: profile.id },
          create: { branchId, profileId: profile.id, role, status: "ACTIVE" },
          update: { role, status: "ACTIVE" },
        });
        return { profile, membership };
      }

      // Platform-wide roles deliberately have no BranchMember row.
      await tx.userRole.upsert({
        where: { profileId_roleId: { profileId: profile.id, roleId: roleRecord.id } },
        create: { profileId: profile.id, roleId: roleRecord.id },
        update: {},
      });
      return { profile, membership: null };
    });

    await writeAuditLog({
      actorProfileId: actor.profile.id,
      actorRole: actor.roles.join(","),
      action: "EMPLOYEE_INVITED",
      entityType: isPlatformRole ? "PLATFORM_EMPLOYEE" : "BRANCH_MEMBER",
      entityId: result.profile.id,
      description: `Invited ${roleName} employee ${email}.`,
      metadata: { branchId, profileId: result.profile.id, role: roleName, accessScope: isPlatformRole ? "ALL_BRANCHES" : "SINGLE_BRANCH" },
    });

    return Response.json({
      success: true,
      message: isPlatformRole
        ? `Invitation sent to ${email} as ${roleName.replace("_", " ")}. This account has platform-wide access across all branches and is not assigned to this branch.`
        : `Invitation sent to ${email}. The employee must use the email link to set their password before signing in.`,
      employee: { id: result.profile.id, firstName, lastName, email, role: roleName, accessScope: isPlatformRole ? "ALL_BRANCHES" : "SINGLE_BRANCH", status: result.membership?.status ?? "INVITED" },
    }, { status: 201 });
  } catch (error) {
    if (invitedAuthUserId) {
      try {
        const supabaseAdmin = createSupabaseAdminClient();
        await supabaseAdmin.auth.admin.deleteUser(invitedAuthUserId);
      } catch (cleanupError) {
        console.error("Could not clean up incomplete employee invitation:", cleanupError);
      }
    }
    if (error instanceof Error && error.message.includes("already belongs to another branch")) {
      return Response.json({ success: false, error: error.message }, { status: 409 });
    }
    if (error instanceof Error && (error.message.includes("SUPABASE_SERVICE_ROLE_KEY") || error.message.includes("not seeded"))) {
      return Response.json({ success: false, error: error.message }, { status: 503 });
    }
    return handleAuthError(error);
  }
}
