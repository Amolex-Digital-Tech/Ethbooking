import { prisma } from "@/lib/prisma/client";
import { requireAuth } from "@/lib/auth/require-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { AuthError } from "@/lib/auth/auth-error";
import { writeAuditLog } from "@/lib/admin/write-audit-log";

type Context = { params: Promise<{ partnerId: string }> };

async function authorize(partnerId: string) {
  const user = await requireAuth();
  const admin = user.roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN");
  if (!admin) {
    if (!user.roles.some((role) => ["PARTNER_OWNER", "PARTNER_MANAGER"].includes(role))) throw new AuthError("FORBIDDEN");
    const membership = await prisma.partnerMember.findFirst({ where: { partnerId, profileId: user.profile.id, status: "ACTIVE", partner: { status: "ACTIVE" } }, select: { id: true } });
    if (!membership) throw new AuthError("PARTNER_MEMBERSHIP_REQUIRED");
  }
  return user;
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { partnerId } = await params;
    await authorize(partnerId);
    const members = await prisma.partnerMember.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
      include: { profile: { select: { id: true, firstName: true, lastName: true, phone: true, userRoles: { include: { role: { select: { name: true } } } } } } },
    });
    return Response.json({ success: true, members: members.map((m) => ({
      id: m.id, status: m.status, createdAt: m.createdAt,
      profile: { id: m.profile.id, firstName: m.profile.firstName, lastName: m.profile.lastName, phone: m.profile.phone },
      roles: m.profile.userRoles.map((r) => r.role.name),
    })) });
  } catch (error) { return handleAuthError(error); }
}

export async function POST(request: Request, { params }: Context) {
  let invitedAuthUserId: string | null = null;
  let staffSetupCompleted = false;
  try {
    const { partnerId } = await params;
    const actor = await authorize(partnerId);
    const partner = await prisma.partner.findUnique({ where: { id: partnerId }, select: { id: true, businessName: true, status: true } });
    if (!partner) return Response.json({ success: false, error: "Partner not found." }, { status: 404 });
    if (partner.status !== "ACTIVE") return Response.json({ success: false, error: "Only active partners can invite staff." }, { status: 409 });
    const body = await request.json().catch(() => null);
    const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    if (firstName.length < 2 || firstName.length > 80 || lastName.length < 2 || lastName.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160 || phone.length > 40) {
      return Response.json({ success: false, error: "Enter a valid first name, last name and email. Phone is optional." }, { status: 400 });
    }
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { first_name: firstName, last_name: lastName, phone, account_type: "partner_staff", partner_id: partnerId, staff_role: "PARTNER_STAFF" },
      redirectTo: `${new URL(request.url).origin}/auth/callback?next=%2Fpartner%2Fstaff%2Faccept-invite`,
    });
    if (inviteError || !invited.user) return Response.json({ success: false, error: inviteError?.message || "Unable to send invitation. The email may already have an account." }, { status: 409 });
    invitedAuthUserId = invited.user.id;
    const role = await prisma.role.findUnique({ where: { name: "PARTNER_STAFF" } });
    if (!role) throw new Error("PARTNER_STAFF role is not seeded. Run the role seed migration first.");

    // Supabase's auth.users trigger may already have created this profile.
    // Upsert by authUserId so the invitation flow works with either trigger timing.
    const profile = await prisma.$transaction(async (tx) => {
      const savedProfile = await tx.profile.upsert({
        where: { authUserId: invited.user.id },
        create: { authUserId: invited.user.id, firstName, lastName, phone: phone || null },
        update: { firstName, lastName, phone: phone || null },
      });
      await tx.userRole.upsert({
        where: { profileId_roleId: { profileId: savedProfile.id, roleId: role.id } },
        create: { profileId: savedProfile.id, roleId: role.id },
        update: {},
      });
      const member = await tx.partnerMember.upsert({
        where: { partnerId_profileId: { partnerId, profileId: savedProfile.id } },
        create: { partnerId, profileId: savedProfile.id, status: "ACTIVE" },
        update: { status: "ACTIVE" },
      });
      return { profile: savedProfile, member };
    });
    // From this point the database setup is complete; a later audit-log
    // failure must not delete the invited Auth user and orphan these records.
    staffSetupCompleted = true;
    await writeAuditLog({ actorProfileId: actor.profile.id, actorRole: actor.roles.join(","), action: "PARTNER_STAFF_INVITED", entityType: "PARTNER_MEMBER", entityId: profile.member.id, description: `Invited ${email} as front desk staff for ${partner.businessName}.`, metadata: { partnerId, email } });
    return Response.json({ success: true, message: `Invitation sent to ${email}. They will have front-desk access only.` }, { status: 201 });
  } catch (error) {
    if (invitedAuthUserId && !staffSetupCompleted) { try { await createSupabaseAdminClient().auth.admin.deleteUser(invitedAuthUserId); } catch (cleanupError) { console.error("Partner staff invite cleanup failed", cleanupError); } }
    if (error instanceof Error && error.message.includes("PARTNER_STAFF role is not seeded")) return Response.json({ success: false, error: error.message }, { status: 503 });
    return handleAuthError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { partnerId } = await params;
    const actor = await authorize(partnerId);
    const body = await request.json().catch(() => null);
    if (typeof body?.memberId !== "string" || !["ACTIVE", "SUSPENDED", "REMOVED"].includes(body.status)) return Response.json({ success: false, error: "Select a valid staff member and status." }, { status: 400 });
    const member = await prisma.partnerMember.findFirst({ where: { id: body.memberId, partnerId }, select: { id: true, profileId: true } });
    if (!member) return Response.json({ success: false, error: "Staff member not found." }, { status: 404 });
    const updated = await prisma.partnerMember.update({ where: { id: member.id }, data: { status: body.status } });
    await writeAuditLog({ actorProfileId: actor.profile.id, actorRole: actor.roles.join(","), action: "PARTNER_STAFF_STATUS_CHANGED", entityType: "PARTNER_MEMBER", entityId: member.id, description: `Changed partner staff membership to ${body.status}.`, metadata: { partnerId, status: body.status } });
    return Response.json({ success: true, status: updated.status, message: `Staff access ${body.status.toLowerCase()}.` });
  } catch (error) { return handleAuthError(error); }
}
