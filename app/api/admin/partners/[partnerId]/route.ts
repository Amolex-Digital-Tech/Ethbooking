import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

const validPartnerId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");
    const { partnerId } = await params;
    if (!validPartnerId.test(partnerId)) {
      return Response.json({ success: false, error: "Invalid partner ID." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ success: false, error: "A valid JSON body is required." }, { status: 400 });
    }

    if (typeof body !== "object" || body === null || !("businessName" in body) || typeof body.businessName !== "string") {
      return Response.json({ success: false, error: "Business name is required." }, { status: 400 });
    }

    const businessName = body.businessName.trim();
    if (!businessName || businessName.length > 160) {
      return Response.json({ success: false, error: "Business name must be between 1 and 160 characters." }, { status: 400 });
    }

    const legalName = optionalText("legalName" in body ? body.legalName : undefined, 160);
    const email = optionalText("email" in body ? body.email : undefined, 254);
    const phone = optionalText("phone" in body ? body.phone : undefined, 40);

    if (legalName === undefined || email === undefined || phone === undefined) {
      return Response.json({ success: false, error: "Invalid partner details. Check the field values." }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ success: false, error: "Enter a valid business email address." }, { status: 400 });
    }

    const existing = await prisma.partner.findUnique({ where: { id: partnerId }, select: { id: true } });
    if (!existing) {
      return Response.json({ success: false, error: "Partner account not found." }, { status: 404 });
    }

    const partner = await prisma.partner.update({
      where: { id: partnerId },
      data: { businessName, legalName, email, phone },
      select: { id: true, businessName: true, legalName: true, email: true, phone: true, updatedAt: true },
    });

    return Response.json({ success: true, data: partner });
  } catch (error) {
    return handleAuthError(error);
  }
}
