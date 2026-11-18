import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { CancellationPolicyType, MealPlan } from "@/lib/generated/prisma/enums";

export async function PATCH(request: Request, { params }: { params: Promise<{ propertyId: string; roomTypeId: string; ratePlanId: string }> }) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");
    const { propertyId, roomTypeId, ratePlanId } = await params;
    const current = await prisma.ratePlan.findFirst({ where: { id: ratePlanId, roomTypeId, roomType: { propertyId } } });
    if (!current) return Response.json({ success: false, error: "Rate plan not found." }, { status: 404 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ success: false, error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if ("isActive" in input) { if (typeof input.isActive !== "boolean") return Response.json({ success: false, error: "isActive must be boolean." }, { status: 400 }); data.isActive = input.isActive; }
    if ("name" in input) { if (typeof input.name !== "string" || !input.name.trim() || input.name.length > 120) return Response.json({ success: false, error: "Rate plan name is invalid." }, { status: 400 }); data.name = input.name.trim(); }
    if ("description" in input) { if (input.description !== null && typeof input.description !== "string") return Response.json({ success: false, error: "Description must be text or null." }, { status: 400 }); data.description = typeof input.description === "string" ? input.description.trim() || null : null; }
    if ("basePrice" in input) { if (typeof input.basePrice !== "number" || !Number.isFinite(input.basePrice) || input.basePrice <= 0) return Response.json({ success: false, error: "Base price must be greater than zero." }, { status: 400 }); data.basePrice = input.basePrice; }
    if ("mealPlan" in input) { if (typeof input.mealPlan !== "string" || !Object.values(MealPlan).includes(input.mealPlan as MealPlan)) return Response.json({ success: false, error: "Invalid meal plan." }, { status: 400 }); data.mealPlan = input.mealPlan; }
    if ("cancellationPolicy" in input) { if (typeof input.cancellationPolicy !== "string" || !Object.values(CancellationPolicyType).includes(input.cancellationPolicy as CancellationPolicyType)) return Response.json({ success: false, error: "Invalid cancellation policy." }, { status: 400 }); data.cancellationPolicy = input.cancellationPolicy; }
    if ("cancellationDeadlineHours" in input) { if (input.cancellationDeadlineHours !== null && (typeof input.cancellationDeadlineHours !== "number" || !Number.isInteger(input.cancellationDeadlineHours) || input.cancellationDeadlineHours < 0)) return Response.json({ success: false, error: "Invalid cancellation deadline." }, { status: 400 }); data.cancellationDeadlineHours = input.cancellationDeadlineHours; }
    if ("cancellationFeePercent" in input) { if (input.cancellationFeePercent !== null && (typeof input.cancellationFeePercent !== "number" || input.cancellationFeePercent < 0 || input.cancellationFeePercent > 100)) return Response.json({ success: false, error: "Cancellation fee must be between 0 and 100." }, { status: 400 }); data.cancellationFeePercent = input.cancellationFeePercent; }
    if ("currency" in input) { if (typeof input.currency !== "string" || !/^[A-Z]{3}$/i.test(input.currency)) return Response.json({ success: false, error: "Currency must be a three-letter code." }, { status: 400 }); data.currency = input.currency.toUpperCase(); }
    if (!Object.keys(data).length) return Response.json({ success: false, error: "No valid fields supplied." }, { status: 400 });
    const updated = await prisma.ratePlan.update({ where: { id: current.id }, data });
    return Response.json({ success: true, data: updated });
  } catch (error) { return handleAuthError(error); }
}
