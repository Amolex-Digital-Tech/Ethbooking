import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

type LoginRole = "CUSTOMER" | "PARTNER_OWNER" | "ADMIN";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function destinationFor(role: LoginRole, roles: string[], partnerId?: string) {
  if (roles.length > 1) {
    return partnerId
      ? `/workspace?partnerId=${encodeURIComponent(partnerId)}`
      : "/workspace";
  }

  if (role === "PARTNER_OWNER" && partnerId) {
    return `/partner?partnerId=${encodeURIComponent(partnerId)}`;
  }

  if (role === "ADMIN") return "/admin/properties";
  return "/";
}

function invalidCredentials() {
  return Response.json(
    {
      success: false,
      error: "We couldn't sign you in with those details or access the selected workspace. Check your details, role, and partner approval status.",
    },
    { status: 401 }
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const role = body.role as LoginRole;
    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!["CUSTOMER", "PARTNER_OWNER", "ADMIN"].includes(role)) {
      return Response.json({ success: false, error: "Choose a valid sign-in type." }, { status: 400 });
    }

    if (!identifier || !password) {
      return Response.json({ success: false, error: "Enter your sign-in ID and password." }, { status: 400 });
    }

    let email = identifier.toLowerCase();
    let selectedPartnerId: string | undefined;

    if (role === "PARTNER_OWNER") {
      if (!UUID_PATTERN.test(identifier)) return invalidCredentials();

      const partner = await prisma.partner.findUnique({
        where: { id: identifier },
        select: { id: true, email: true, status: true },
      });

      if (!partner || partner.status !== "ACTIVE" || !partner.email) {
        return invalidCredentials();
      }

      email = partner.email.trim().toLowerCase();
      selectedPartnerId = partner.id;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ success: false, error: "Enter a valid email address." }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) return invalidCredentials();

    const profile = await prisma.profile.findUnique({
      where: { authUserId: data.user.id },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (!profile) {
      await supabase.auth.signOut();
      return invalidCredentials();
    }

    const roles = profile.userRoles.map((userRole) => userRole.role.name);
    let authorized = false;

    if (role === "CUSTOMER") authorized = roles.includes("CUSTOMER");
    if (role === "ADMIN") authorized = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");

    if (role === "PARTNER_OWNER" && selectedPartnerId) {
      authorized =
        roles.includes("PARTNER_OWNER") &&
        Boolean(await prisma.partnerMember.findFirst({
          where: {
            partnerId: selectedPartnerId,
            profileId: profile.id,
            status: "ACTIVE",
            partner: { is: { status: "ACTIVE" } },
          },
          select: { id: true },
        }));
    }

    if (!authorized) {
      await supabase.auth.signOut();
      return invalidCredentials();
    }

    return Response.json({
      success: true,
      redirectTo: destinationFor(role, roles, selectedPartnerId),
    });
  } catch (error) {
    console.error("Role-aware login failed:", error);
    await supabase.auth.signOut().catch(() => undefined);
    return Response.json({ success: false, error: "Unable to sign in right now. Please try again." }, { status: 500 });
  }
}
