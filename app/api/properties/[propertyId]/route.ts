import { prisma } from "@/lib/prisma/client";

type RouteContext = {
  params: Promise<{
    propertyId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { propertyId } = await context.params;

    const normalizedPropertyId = propertyId.trim();

    if (!normalizedPropertyId) {
      return Response.json(
        {
          success: false,
          error: "Property ID is required.",
        },
        { status: 400 }
      );
    }

    const isUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    normalizedPropertyId
  );

const property = await prisma.property.findFirst({
  where: {
    ...(isUuid
      ? { id: normalizedPropertyId }
      : { slug: normalizedPropertyId }),
    status: "APPROVED",
  },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        propertyType: true,
        email: true,
        phone: true,
        website: true,
        checkInTime: true,
        checkOutTime: true,

        location: {
          select: {
            country: true,
            region: true,
            city: true,
            subCity: true,
            neighborhood: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },

        photos: {
          orderBy: [
            {
              isCover: "desc",
            },
            {
              sortOrder: "asc",
            },
          ],
          select: {
            id: true,
            publicUrl: true,
            altText: true,
            sortOrder: true,
            isCover: true,
          },
        },

        roomTypes: {
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            name: true,
            description: true,
            maxGuests: true,
            totalUnits: true,
            maxAdults: true,
            maxChildren: true,
            bedType: true,
            bedCount: true,
            sizeSquareMeters: true,

            photos: {
              orderBy: [
                {
                  isCover: "desc",
                },
                {
                  sortOrder: "asc",
                },
              ],
              select: {
                id: true,
                publicUrl: true,
                altText: true,
                sortOrder: true,
                isCover: true,
              },
            },

            ratePlans: {
              where: {
                isActive: true,
              },
              orderBy: {
                basePrice: "asc",
              },
              select: {
                id: true,
                name: true,
                description: true,
                mealPlan: true,
                cancellationPolicy: true,
                cancellationDeadlineHours: true,
                cancellationFeePercent: true,
                basePrice: true,
                currency: true,
                ratePeriods: {
                  orderBy: { startDate: "asc" },
                  select: { startDate: true, endDate: true, pricePerNight: true },
                },
              },
            },
          },
        },
      },
    });

    if (!property) {
      return Response.json(
        {
          success: false,
          error: "Property not found.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error(
      "Failed to fetch customer property:",
      error
    );

    return Response.json(
      {
        success: false,
        error: "Unable to fetch property.",
      },
      { status: 500 }
    );
  }
}
