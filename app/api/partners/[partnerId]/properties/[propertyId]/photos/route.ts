
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

const BUCKET = "property-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PHOTOS_PER_PROPERTY = 50;

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

type RouteContext = {
  params: Promise<{
    partnerId: string;
    propertyId: string;
  }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  const uploadedPaths: string[] = [];

  try {
    const { partnerId, propertyId } = await params;

    if (!isUuid(partnerId) || !isUuid(propertyId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid partner or property ID.",
        },
        { status: 400 }
      );
    }

    await requirePartnerMembership(partnerId);

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        partnerId,
      },
      select: {
        id: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        {
          success: false,
          error: "Property not found for this partner.",
        },
        { status: 404 }
      );
    }

    if (!supabaseAdmin) {
      console.error("Supabase Storage server environment variables are missing.");

      return NextResponse.json(
        {
          success: false,
          error: "Photo storage is not configured on the server.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();

    // Accept the multi-photo form's "files" fields.
    // Also support the original single-photo form's "file" field.
    const filesValue = formData.getAll("files");
    const files =
      filesValue.length > 0
        ? filesValue
        : [formData.get("file")].filter((value) => value !== null);

    if (
      files.length === 0 ||
      files.some((value) => !(value instanceof File))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Please select one or more image files.",
        },
        { status: 400 }
      );
    }

    const imageFiles = files as File[];

    if (imageFiles.length > MAX_PHOTOS_PER_PROPERTY) {
      return NextResponse.json(
        {
          success: false,
          error: `You can upload at most ${MAX_PHOTOS_PER_PROPERTY} photos per request.`,
        },
        { status: 400 }
      );
    }

    // Validate every file before uploading any of them.
    for (const file of imageFiles) {
      if (file.size === 0 || file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `Each image must be between 1 byte and 5 MB. "${file.name}" does not meet this requirement.`,
          },
          { status: 400 }
        );
      }

      if (!Object.hasOwn(ALLOWED_TYPES, file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Only JPEG, PNG, and WebP images are allowed. "${file.name}" has an unsupported type.`,
          },
          { status: 400 }
        );
      }
    }

    const existingPhotos = await prisma.propertyPhoto.findMany({
      where: {
        propertyId,
      },
      select: {
        id: true,
        isCover: true,
        sortOrder: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    if (existingPhotos.length + imageFiles.length > MAX_PHOTOS_PER_PROPERTY) {
      const remaining = Math.max(
        0,
        MAX_PHOTOS_PER_PROPERTY - existingPhotos.length
      );

      return NextResponse.json(
        {
          success: false,
          error:
            remaining === 0
              ? "This property already has the maximum of 50 photos."
              : `You can upload ${remaining} more photo(s) to this property.`,
        },
        { status: 400 }
      );
    }

    const altTextValue = formData.get("altText");
    const altText =
      typeof altTextValue === "string"
        ? altTextValue.trim().slice(0, 250)
        : "";

    const existingCover = existingPhotos.some((photo) => photo.isCover);
    const startingSortOrder =
      existingPhotos.length > 0
        ? Math.max(...existingPhotos.map((photo) => photo.sortOrder)) + 1
        : 0;

    // Upload each file to Supabase Storage.
    const uploadedPhotos: Array<{
      propertyId: string;
      storagePath: string;
      publicUrl: string;
      altText: string | null;
      sortOrder: number;
      isCover: boolean;
    }> = [];

    for (const [index, file] of imageFiles.entries()) {
      const extension =
        ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES];

      const storagePath =
        `${partnerId}/${propertyId}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error(
          "Property photo upload failed:",
          uploadError.message
        );

        throw new Error("An image upload failed. Please try again.");
      }

      uploadedPaths.push(storagePath);

      const { data: publicData } = supabaseAdmin.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      uploadedPhotos.push({
        propertyId,
        storagePath,
        publicUrl: publicData.publicUrl,
        altText: altText || null,
        sortOrder: startingSortOrder + index,
        isCover: !existingCover && index === 0,
      });
    }

    // Save all photo records in one database operation.
    await prisma.propertyPhoto.createMany({
      data: uploadedPhotos,
    });

    const savedPhotos = await prisma.propertyPhoto.findMany({
      where: {
        propertyId,
        storagePath: {
          in: uploadedPaths,
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `${savedPhotos.length} photo(s) uploaded successfully.`,
        data: savedPhotos,
      },
      { status: 201 }
    );
  } catch (error) {
    // If any upload or database operation fails, remove this
    // request's partial database records and uploaded objects.
    if (uploadedPaths.length > 0) {
      try {
        await prisma.propertyPhoto.deleteMany({
          where: {
            storagePath: {
              in: uploadedPaths,
            },
          },
        });
      } catch (cleanupError) {
        console.error(
          "Could not clean up photo database records:",
          cleanupError
        );
      }

      if (supabaseAdmin) {
        const { error: storageCleanupError } = await supabaseAdmin.storage
          .from(BUCKET)
          .remove(uploadedPaths);

        if (storageCleanupError) {
          console.error(
            "Could not clean up uploaded photos:",
            storageCleanupError.message
          );
        }
      }
    }

    if (
      error instanceof Error &&
      error.message === "An image upload failed. Please try again."
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 502 }
      );
    }

    return handleAuthError(error);
  }
}
