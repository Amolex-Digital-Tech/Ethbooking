import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");

    const properties = await prisma.property.findMany({
      include: {
        partner: true,
        location: true,
        documents: true,
        photos: true,
        roomTypes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({
      success: true,
      data: properties,
      count: properties.length,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
