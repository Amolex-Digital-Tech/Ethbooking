import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ propertyId: string; documentId: string }> },
) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");

    const { propertyId, documentId } = await params;

    if (!UUID_PATTERN.test(propertyId) || !UUID_PATTERN.test(documentId)) {
      return NextResponse.json(
        { error: "Invalid property or document ID." },
        { status: 400 },
      );
    }

    const document = await prisma.propertyDocument.findFirst({
      where: { id: documentId, propertyId },
      select: { storagePath: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase server configuration for document access.");
      return NextResponse.json(
        { error: "Document storage is not configured." },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.storage
      .from("property-documents")
      .createSignedUrl(document.storagePath, 60);

    if (error || !data?.signedUrl) {
      console.error("Could not create signed document URL:", error?.message);
      return NextResponse.json(
        { error: "Unable to open this document." },
        { status: 500 },
      );
    }

    return NextResponse.redirect(data.signedUrl, { status: 302 });
  } catch (error) {
    return handleAuthError(error);
  }
}
