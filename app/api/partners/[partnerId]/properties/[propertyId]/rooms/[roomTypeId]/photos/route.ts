import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

const BUCKET = "property-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PHOTOS_PER_ROOM = 50;
const MAX_FILES_PER_REQUEST = 10;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase Storage server configuration is missing.");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type RouteContext = {
  params: Promise<{
    partnerId: string;
    propertyId: string;
    roomTypeId: string;
  }>;
};

async function getAuthorizedRoom(
  partnerId: string,
  propertyId: string,
  roomTypeId: string,
) {
  await requirePartnerMembership(partnerId);

  return prisma.roomType.findFirst({
    where: {
      id: roomTypeId,
      propertyId,
      property: { id: propertyId, partnerId },
    },
    select: { id: true },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { partnerId, propertyId, roomTypeId } = await params;
    const room = await getAuthorizedRoom(partnerId, propertyId, roomTypeId);

    if (!room) {
      return NextResponse.json({ error: "Room not found or access denied." }, { status: 404 });
    }

    const photos = await prisma.roomPhoto.findMany({
      where: { roomTypeId },
      orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ photos });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
) {
  const uploadedPaths: string[] = [];
  const createdPhotoIds: string[] = [];

  try {
    const { partnerId, propertyId, roomTypeId } = await params;
    const room = await getAuthorizedRoom(partnerId, propertyId, roomTypeId);

    if (!room) {
      return NextResponse.json({ error: "Room not found or access denied." }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter(
      (value): value is File => value instanceof File,
    );

    if (files.length === 0) {
      return NextResponse.json({ error: "Select at least one image." }, { status: 400 });
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Upload at most ${MAX_FILES_PER_REQUEST} images at a time.` },
        { status: 400 },
      );
    }

    for (const file of files) {
      if (!ALLOWED_TYPES[file.type]) {
        return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed." }, { status: 400 });
      }
      if (file.size === 0 || file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "Each image must be smaller than 5 MB and not empty." }, { status: 400 });
      }
    }

    const existingPhotos = await prisma.roomPhoto.findMany({
      where: { roomTypeId },
      select: { sortOrder: true, isCover: true },
    });

    if (existingPhotos.length + files.length > MAX_PHOTOS_PER_ROOM) {
      return NextResponse.json(
        { error: `A room can have at most ${MAX_PHOTOS_PER_ROOM} photos.` },
        { status: 400 },
      );
    }

    const storage = getStorageClient();
    const startingSortOrder = existingPhotos.length
      ? Math.max(...existingPhotos.map((photo) => photo.sortOrder)) + 1
      : 0;
    const hasCover = existingPhotos.some((photo) => photo.isCover);

    try {
      for (const [index, file] of files.entries()) {
        const extension = ALLOWED_TYPES[file.type];
        const storagePath =
          `${partnerId}/${propertyId}/rooms/${roomTypeId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await storage.storage
          .from(BUCKET)
          .upload(storagePath, file, { contentType: file.type, upsert: false });

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }
        uploadedPaths.push(storagePath);

        const { data: publicData } = storage.storage.from(BUCKET).getPublicUrl(storagePath);
        const photo = await prisma.roomPhoto.create({
          data: {
            roomTypeId,
            storagePath,
            publicUrl: publicData.publicUrl,
            altText: file.name.replace(/\.[^.]+$/, "").slice(0, 250),
            sortOrder: startingSortOrder + index,
            isCover: !hasCover && index === 0,
          },
        });
        createdPhotoIds.push(photo.id);
      }
    } catch (uploadError) {
      if (createdPhotoIds.length) {
        await prisma.roomPhoto.deleteMany({ where: { id: { in: createdPhotoIds } } });
      }
      if (uploadedPaths.length) {
        const { error: cleanupError } = await storage.storage.from(BUCKET).remove(uploadedPaths);
        if (cleanupError) console.error("Room photo cleanup failed:", cleanupError);
      }
      throw uploadError;
    }

    const photos = await prisma.roomPhoto.findMany({
      where: { roomTypeId, storagePath: { in: uploadedPaths } },
      orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json({ photos }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Image upload failed:")) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { partnerId, propertyId, roomTypeId } = await params;
    const room = await getAuthorizedRoom(partnerId, propertyId, roomTypeId);

    if (!room) {
      return NextResponse.json({ error: "Room not found or access denied." }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const photoId = body && typeof body.photoId === "string" ? body.photoId : null;

    if (!photoId) {
      return NextResponse.json({ error: "A photoId is required." }, { status: 400 });
    }

    const photo = await prisma.roomPhoto.findFirst({
      where: { id: photoId, roomTypeId },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found." }, { status: 404 });
    }

    const storage = getStorageClient();
    const { error: storageError } = await storage.storage.from(BUCKET).remove([photo.storagePath]);

    if (storageError) {
      console.error("Room photo storage deletion failed:", storageError);
      return NextResponse.json({ error: "Could not delete the image from storage." }, { status: 502 });
    }

    await prisma.roomPhoto.delete({ where: { id: photo.id } });
    return NextResponse.json({ success: true, deletedPhotoId: photo.id });
  } catch (error) {
    return handleAuthError(error);
  }
}
