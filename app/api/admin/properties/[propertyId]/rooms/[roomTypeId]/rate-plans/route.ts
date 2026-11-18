import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { CancellationPolicyType, MealPlan } from "@/lib/generated/prisma/enums";

export async function POST(request: Request, { params }: { params: Promise<{ propertyId: string; roomTypeId: string }> }) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");
    const { propertyId, roomTypeId } = await params;
    const room = await prisma.roomType.findFirst({ where: { id: roomTypeId, propertyId }, select: { id: true } });
    if (!room) return Response.json({ success: false, error: "Room type not found for this property." }, { status: 404 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ success: false, error: "Invalid request body." }, { status: 400 });
    const data = body as Record<string, unknown>;
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const mealPlan = typeof data.mealPlan === "string" ? data.mealPlan.toUpperCase() : "ROOM_ONLY";
    const policy = typeof data.cancellationPolicy === "string" ? data.cancellationPolicy.toUpperCase() : "";
    const price = data.basePrice;
    const currency = typeof data.currency === "string" ? data.currency.toUpperCase() : "ETB";
    const deadline = data.cancellationDeadlineHours ?? null;
    const fee = data.cancellationFeePercent ?? null;
    if (!name || name.length > 120) return Response.json({ success: false, error: "Rate plan name is required (maximum 120 characters)." }, { status: 400 });
    if (!Object.values(MealPlan).includes(mealPlan as MealPlan)) return Response.json({ success: false, error: "Invalid meal plan." }, { status: 400 });
    if (!Object.values(CancellationPolicyType).includes(policy as CancellationPolicyType)) return Response.json({ success: false, error: "Invalid cancellation policy." }, { status: 400 });
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return Response.json({ success: false, error: "Base price must be greater than zero." }, { status: 400 });
    if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) return Response.json({ success: false, error: "Currency must be a three-letter code." }, { status: 400 });
    if (deadline !== null && (typeof deadline !== "number" || !Number.isInteger(deadline) || deadline < 0)) return Response.json({ success: false, error: "Cancellation deadline must be a non-negative whole number or null." }, { status: 400 });
    if (fee !== null && (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0 || fee > 100)) return Response.json({ success: false, error: "Cancellation fee must be between 0 and 100." }, { status: 400 });
    const plan = await prisma.ratePlan.create({ data: { roomTypeId, name, description: typeof data.description === "string" ? data.description.trim() || null : null, mealPlan: mealPlan as MealPlan, cancellationPolicy: policy as CancellationPolicyType, cancellationDeadlineHours: deadline as number | null, cancellationFeePercent: fee as number | null, basePrice: price, currency, isActive: true } });
    return Response.json({ success: true, data: plan }, { status: 201 });
  } catch (error) { return handleAuthError(error); }
}
