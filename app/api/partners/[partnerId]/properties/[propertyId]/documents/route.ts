import { PropertyDocumentType } from "@/lib/generated/prisma/client";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

const BUCKET = "property-documents";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
} as const;

const ALLOWED_DOCUMENT_TYPES = [
  "BUSINESS_LICENSE",
  "TOURISM_LICENSE",
  "TAX_DOCUMENT",
  "OWNER_ID",
  "PROPERTY_OWNERSHIP",
  "OTHER",
] as const;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
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
  let uploadedPath: string | null = null;
  let savedDocumentId: string | null = null;

  try {
    const { partnerId, propertyId } = await params;

    if (!isUuid(partnerId) || !isUuid(propertyId)) {
      return NextResponse.json(
        { success: false, error: "Invalid partner or property ID." },
        { status: 400 }
      );
    }

    // ACTIVE and PENDING partners may upload setup documents.
    // SUSPENDED and INACTIVE partners are blocked by the helper.
    await requirePartnerMembership(partnerId);

    const property = await prisma.property.findFirst({
      where: { id: propertyId, partnerId },
      select: { id: true },
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
      console.error("Supabase Storage server configuration is missing.");

      return NextResponse.json(
        {
          success: false,
          error: "Document storage is not configured on the server.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const documentType = formData.get("documentType");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Please select a document." },
        { status: 400 }
      );
    }

    if (
      typeof documentType !== "string" ||
      !ALLOWED_DOCUMENT_TYPES.some((type) => type === documentType)
    ) {
      return NextResponse.json(
        { success: false, error: "Select a valid document type." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "The document must be between 1 byte and 5 MB.",
        },
        { status: 400 }
      );
    }

    if (!Object.hasOwn(ALLOWED_TYPES, file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Only PDF, JPEG, and PNG documents are allowed.",
        },
        { status: 400 }
      );
    }

    const extension =
      ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES];

    const safeFileName = file.name
      .replace(/[/\\]/g, "_")
      .replace(/[^\w.\- ()]/g, "_")
      .slice(-120);

    const storagePath =
      `${partnerId}/${propertyId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Property document upload failed:", uploadError.message);

      return NextResponse.json(
        {
          success: false,
          error:
            "The document could not be uploaded. Check that the private storage bucket exists.",
        },
        { status: 502 }
      );
    }

    uploadedPath = storagePath;

    const document = await prisma.propertyDocument.create({
      data: {
        propertyId,
        documentType: documentType as PropertyDocumentType,
        storagePath,
        documentName: safeFileName || "Property document",
        verificationStatus: "PENDING",
      },
      select: {
        id: true,
        documentType: true,
        documentName: true,
        verificationStatus: true,
        createdAt: true,
      },
    });

    savedDocumentId = document.id;

    return NextResponse.json(
      {
        success: true,
        message: "Document uploaded and submitted for review.",
        data: document,
      },
      { status: 201 }
    );
  } catch (error) {
    if (savedDocumentId) {
      try {
        await prisma.propertyDocument.delete({
          where: { id: savedDocumentId },
        });
      } catch (cleanupError) {
        console.error("Document record cleanup failed:", cleanupError);
      }
    }

    if (uploadedPath && supabaseAdmin) {
      const { error: cleanupError } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([uploadedPath]);

      if (cleanupError) {
        console.error("Uploaded document cleanup failed:", cleanupError);
      }
    }

    return handleAuthError(error);
  }
}