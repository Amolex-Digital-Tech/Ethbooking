
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma/client";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

async function createAvatarUrl(path: string | null | undefined) {
  if (!path) return "";

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.storage
    .from("profile-photos")
    .createSignedUrl(path, 300);

  if (error) {
    console.error("PROFILE_PHOTO_SIGNED_URL_ERROR:", error);
    return "";
  }

  return data.signedUrl;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    const avatarUrl = await createAvatarUrl(
      currentUser.profile.avatarUrl
    );

    return NextResponse.json({
      success: true,
      data: {
        firstName: currentUser.profile.firstName ?? "",
        lastName: currentUser.profile.lastName ?? "",
        phone: currentUser.profile.phone ?? "",
        countryCode: currentUser.profile.countryCode ?? "",
        avatarUrl,
        email: currentUser.authUser.email ?? "",
      },
    });
  } catch (error) {
    console.error("CUSTOMER_PROFILE_GET_ERROR:", error);

    return NextResponse.json(
      { error: "Unable to load customer profile." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const firstName =
      typeof body.firstName === "string"
        ? body.firstName.trim()
        : undefined;

    const lastName =
      typeof body.lastName === "string"
        ? body.lastName.trim()
        : undefined;

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : undefined;

    const countryCode =
      typeof body.countryCode === "string"
        ? body.countryCode.trim()
        : undefined;

    // This value is a storage path, not a public or signed URL.
    const avatarUrl =
      typeof body.avatarUrl === "string"
        ? body.avatarUrl.trim()
        : undefined;

    const isUpdatingPersonalInformation =
      firstName !== undefined ||
      lastName !== undefined ||
      phone !== undefined ||
      countryCode !== undefined;

    if (isUpdatingPersonalInformation && !firstName) {
      return NextResponse.json(
        { error: "First name is required." },
        { status: 400 }
      );
    }

    if (avatarUrl) {
      const expectedPrefix = `${currentUser.authUser.id}/`;

      const validPathPattern =
        /^[0-9a-f-]+\/profile-\d+\.(jpg|png|webp)$/i;

      if (
        !avatarUrl.startsWith(expectedPrefix) ||
        !validPathPattern.test(avatarUrl)
      ) {
        return NextResponse.json(
          { error: "Invalid profile photo path." },
          { status: 400 }
        );
      }
    }

    const profile = await prisma.profile.update({
      where: {
        id: currentUser.profile.id,
      },
      data: {
        ...(firstName !== undefined
          ? { firstName: firstName || null }
          : {}),
        ...(lastName !== undefined
          ? { lastName: lastName || null }
          : {}),
        ...(phone !== undefined
          ? { phone: phone || null }
          : {}),
        ...(countryCode !== undefined
          ? { countryCode: countryCode || null }
          : {}),
        ...(avatarUrl !== undefined
          ? { avatarUrl: avatarUrl || null }
          : {}),
      },
    });

    const signedAvatarUrl = await createAvatarUrl(
      profile.avatarUrl
    );

    return NextResponse.json({
      success: true,
      data: {
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        phone: profile.phone ?? "",
        countryCode: profile.countryCode ?? "",
        avatarUrl: signedAvatarUrl,
        email: currentUser.authUser.email ?? "",
      },
    });
  } catch (error) {
    console.error("CUSTOMER_PROFILE_UPDATE_ERROR:", error);

    return NextResponse.json(
      { error: "Unable to update customer profile." },
      { status: 500 }
    );
  }
}
