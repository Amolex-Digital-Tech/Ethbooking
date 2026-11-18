import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export async function POST(request: Request, { params }: { params: Promise<{ propertyId: string; roomTypeId: string; ratePlanId: string }> }) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");
    const { propertyId, roomTypeId, ratePlanId } = await params;
    const plan = await prisma.ratePlan.findFirst({ where: { id: ratePlanId, roomTypeId, roomType: { propertyId } }, select: { id: true } });
    if (!plan) return Response.json({ success: false, error: "Rate plan not found." }, { status: 404 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ success: false, error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const startDate = parseDate(input.startDate), endDate = parseDate(input.endDate);
    const price = input.pricePerNight;
    if (!startDate || !endDate || endDate < startDate) return Response.json({ success: false, error: "Enter a valid date range. The end date must not precede the start date." }, { status: 400 });
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return Response.json({ success: false, error: "Seasonal price must be greater than zero." }, { status: 400 });
    const overlap = await prisma.ratePeriod.findFirst({ where: { ratePlanId, startDate: { lte: endDate }, endDate: { gte: startDate } }, select: { id: true } });
    if (overlap) return Response.json({ success: false, error: "This date range overlaps an existing seasonal price period." }, { status: 409 });
    const period = await prisma.ratePeriod.create({ data: { ratePlanId, startDate, endDate, pricePerNight: price } });
    return Response.json({ success: true, data: period }, { status: 201 });
  } catch (error) { return handleAuthError(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ propertyId: string; roomTypeId: string; ratePlanId: string }> }) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");
    const { propertyId, roomTypeId, ratePlanId } = await params;
    const plan = await prisma.ratePlan.findFirst({ where: { id: ratePlanId, roomTypeId, roomType: { propertyId } }, select: { id: true } });
    if (!plan) return Response.json({ success: false, error: "Rate plan not found." }, { status: 404 });
    const body: unknown = await request.json().catch(() => ({}));
    const periodId = body && typeof body === "object" && "periodId" in body ? body.periodId : null;
    if (typeof periodId !== "string") return Response.json({ success: false, error: "Period ID is required." }, { status: 400 });
    const deleted = await prisma.ratePeriod.deleteMany({ where: { id: periodId, ratePlanId } });
    if (!deleted.count) return Response.json({ success: false, error: "Seasonal period not found." }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) { return handleAuthError(error); }
}
