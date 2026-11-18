import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { randomBytes } from "node:crypto";

export async function GET(request: Request) {
  try {
    await requireRole("SUPPORT_AGENT");
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const q = searchParams.get("q")?.trim() || "";
    const allowed = ["OPEN","IN_PROGRESS","WAITING_CUSTOMER","RESOLVED","CLOSED"];
    const cases = await prisma.supportCase.findMany({
      where: {
        ...(allowed.includes(status) ? { status: status as never } : {}),
        ...(q ? { OR: [
          { caseNumber: { contains: q, mode: "insensitive" } },
          { subject: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
          { customerEmail: { contains: q, mode: "insensitive" } },
          { customerPhone: { contains: q, mode: "insensitive" } },
        ] } : {}),
      },
      include: {
        booking: { select: { bookingReference: true, status: true, paymentStatus: true, totalAmount: true, currency: true } },
        _count: { select: { notes: true } },
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });
    const counts = await prisma.supportCase.groupBy({ by: ["status"], _count: { _all: true } });
    return Response.json({
      success: true,
      data: cases.map(c => ({ ...c, booking: c.booking ? { ...c.booking, totalAmount: c.booking.totalAmount.toString() } : null })),
      counts: Object.fromEntries(counts.map(c => [c.status, c._count._all])),
    });
  } catch (error) { return handleAuthError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("SUPPORT_AGENT");
    const body = await request.json().catch(() => null);
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    if (subject.length < 4 || subject.length > 160 || description.length < 10 || description.length > 5000) {
      return Response.json({ success: false, error: "Enter a subject (4–160 characters) and description (10–5,000 characters)." }, { status: 400 });
    }
    const categories = ["GENERAL","BOOKING","PAYMENT","CANCELLATION","REFUND","PROPERTY","ACCOUNT","COMPLAINT"];
    const priorities = ["LOW","NORMAL","HIGH","URGENT"];
    const category = categories.includes(body?.category) ? body.category : "GENERAL";
    const priority = priorities.includes(body?.priority) ? body.priority : "NORMAL";
    const bookingId = typeof body?.bookingId === "string" && body.bookingId ? body.bookingId : null;
    if (bookingId && !await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true } })) {
      return Response.json({ success: false, error: "The linked booking could not be found." }, { status: 404 });
    }
    const customerName = typeof body?.customerName === "string" ? body.customerName.trim().slice(0,160) : "";
    const customerEmail = typeof body?.customerEmail === "string" ? body.customerEmail.trim().slice(0,254) : "";
    const customerPhone = typeof body?.customerPhone === "string" ? body.customerPhone.trim().slice(0,40) : "";
    const created = await prisma.supportCase.create({ data: {
      caseNumber: "SUP-" + Date.now().toString(36).toUpperCase() + randomBytes(2).toString("hex").toUpperCase(),
      subject, description, category, priority, bookingId,
      customerName: customerName || null, customerEmail: customerEmail || null, customerPhone: customerPhone || null,
      createdByProfileId: user.profile.id,
    } });
    return Response.json({ success: true, data: created }, { status: 201 });
  } catch (error) { return handleAuthError(error); }
}
