import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export async function DELETE(_request: Request, { params }: { params: Promise<{ propertyId: string; roomTypeId: string; ratePlanId: string; periodId: string }> }) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");
    const { propertyId, roomTypeId, ratePlanId, periodId } = await params;
    const result = await prisma.ratePeriod.deleteMany({ where: { id: periodId, ratePlanId, ratePlan: { id: ratePlanId, roomTypeId, roomType: { propertyId } } } });
    if (!result.count) return Response.json({ success: false, error: "Seasonal price period not found." }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) { return handleAuthError(error); }
}
