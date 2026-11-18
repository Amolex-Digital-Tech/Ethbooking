import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    await requireRole("SUPPORT_AGENT");
    const properties = await prisma.property.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        name: true,
        location: { select: { city: true, region: true } },
        roomTypes: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            maxGuests: true,
            maxAdults: true,
            maxChildren: true,
            totalUnits: true,
            ratePlans: {
              where: { isActive: true, currency: "ETB" },
              select: {
                id: true,
                name: true,
                basePrice: true,
                currency: true,
                mealPlan: true,
                cancellationPolicy: true,
              },
              orderBy: { basePrice: "asc" },
            },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return Response.json({
      success: true,
      data: properties
        .map((property) => ({
          ...property,
          roomTypes: property.roomTypes
            .map((room) => ({
              ...room,
              ratePlans: room.ratePlans.map((rate) => ({
                ...rate,
                basePrice: rate.basePrice.toString(),
              })),
            }))
            .filter((room) => room.ratePlans.length > 0),
        }))
        .filter((property) => property.roomTypes.length > 0),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
