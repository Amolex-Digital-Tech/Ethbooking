import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { NextResponse } from "next/server";

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid registration details." },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;

    const firstName = normalizeText(input.firstName, 80);
    const lastName = normalizeText(input.lastName, 80);
    const businessName = normalizeText(input.businessName, 160);
    const phone = normalizeText(input.phone, 30);
    const email = normalizeText(input.email, 254).toLowerCase();
    const password =
      typeof input.password === "string" ? input.password : "";

    if (
      !firstName ||
      !lastName ||
      !businessName ||
      !email ||
      !password
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Complete all required fields before continuing.",
        },
        { status: 400 }
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254
    ) {
      return NextResponse.json(
        { success: false, error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        {
          success: false,
          error: "Your password must be between 8 and 128 characters.",
        },
        { status: 400 }
      );
    }

    if (phone && !/^[+\d\s().-]{7,30}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid phone number." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          country_code: "+251",
          account_type: "partner",
        },
        emailRedirectTo: new URL(
          "/auth/callback?next=%2Fpartner",
          request.url
        ).toString(),
      },
    });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "We couldn't complete registration with those details. Check your information or try signing in.",
        },
        { status: 400 }
      );
    }

    const user = data.user;

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Registration could not be completed." },
        { status: 400 }
      );
    }

    // Supabase can return an empty identities array for an existing email.
    // Do not create an organization for such a response.
    if (user.identities && user.identities.length === 0) {
      return NextResponse.json({
        success: true,
        requiresEmailConfirmation: true,
        message:
          "If this email can be registered, check your inbox for the next steps.",
      });
    }

    // The existing database trigger creates this profile and CUSTOMER role
    // when Supabase creates the auth user.
    const profile = await prisma.profile.findUnique({
      where: { authUserId: user.id },
      select: { id: true },
    });

    if (!profile) {
      console.error("Partner registration: profile was not created.");
      return NextResponse.json(
        {
          success: false,
          error:
            "Your account was created, but partner setup could not finish. Please contact support before trying again.",
        },
        { status: 500 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const ownerRole = await tx.role.findUnique({
        where: { name: "PARTNER_OWNER" },
        select: { id: true },
      });

      if (!ownerRole) {
        throw new Error("PARTNER_OWNER role is missing from the database.");
      }

      const existingMembership = await tx.partnerMember.findFirst({
        where: {
          profileId: profile.id,
          status: { in: ["ACTIVE", "INVITED"] },
        },
        select: { id: true },
      });

      if (existingMembership) {
        throw new Error("PARTNER_MEMBERSHIP_EXISTS");
      }

      await tx.userRole.upsert({
        where: {
          profileId_roleId: {
            profileId: profile.id,
            roleId: ownerRole.id,
          },
        },
        create: {
          profileId: profile.id,
          roleId: ownerRole.id,
        },
        update: {},
      });

      const partner = await tx.partner.create({
        data: {
          businessName,
          email,
          phone: phone || null,
          status: "PENDING",
        },
        select: {
          id: true,
          businessName: true,
          status: true,
        },
      });

      await tx.partnerMember.create({
        data: {
          partnerId: partner.id,
          profileId: profile.id,
          status: "ACTIVE",
        },
      });

      return partner;
    });

    return NextResponse.json(
      {
        success: true,
        requiresEmailConfirmation: !data.session,
        message: data.session
          ? "Your partner account has been created."
          : "Your registration has been received. Check your email to confirm your account.",
        partner: {
          businessName: result.businessName,
          status: result.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PARTNER_MEMBERSHIP_EXISTS"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This account already belongs to a partner organization. Please sign in instead.",
        },
        { status: 409 }
      );
    }

    console.error("Partner registration failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "We couldn't finish setting up your partner account. If your account was created, contact support before registering again.",
      },
      { status: 500 }
    );
  }
}
