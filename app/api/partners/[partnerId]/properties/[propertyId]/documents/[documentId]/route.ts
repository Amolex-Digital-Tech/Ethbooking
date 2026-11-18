import { createClient } from "@supabase/supabase-js";
import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BUCKET = "property-documents";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

type RouteContext = {
  params: Promise<{
    partnerId: string;
    propertyId: string;
    documentId: string;
  }>;
};

export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { partnerId, propertyId, documentId } = await params;

    await requirePartnerMembership(partnerId);

    const property = await prisma.property.findFirst({
      where: { id: propertyId, partnerId },
      select: { id: true },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Property not found for this partner." },
        { status: 404 }
      );
    }

    const document = await prisma.propertyDocument.findFirst({
      where: {
        id: documentId,
        propertyId,
        verificationStatus: "REJECTED",
      },
      select: { id: true, storagePath: true },
    });

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: "Only rejected documents belonging to this property can be replaced.",
        },
        { status: 404 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Document storage is not configured." },
        { status: 500 }
      );
    }

    const { error: storageError } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([document.storagePath]);

    if (storageError) {
      console.error("Rejected property document removal failed:", storageError.message);
      return NextResponse.json(
        { success: false, error: "The rejected document could not be removed. Please try again." },
        { status: 502 }
      );
    }

    await prisma.propertyDocument.delete({
      where: { id: document.id },
    });

    return NextResponse.json({
      success: true,
      message: "Rejected document removed. You can now upload the corrected document.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
