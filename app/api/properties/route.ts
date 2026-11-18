import { requireRole } from "@/lib/auth/require-role";
import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { PropertyType } from "@/lib/generated/prisma/enums";

export async function GET() {
  try {
    const properties = await prisma.property.findMany({
      where: {
        status: "APPROVED",
      },
      include: {
        location: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({
      success: true,
      data: properties,
    });
  } catch (error) {
    console.error("Failed to fetch properties:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to fetch properties",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await requireRole(
      "PARTNER_OWNER",
      "PARTNER_MANAGER",
      "ADMIN"
    );

    const body = await request.json();

    const partnerId =
      typeof body.partnerId === "string"
        ? body.partnerId.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const slug =
      typeof body.slug === "string"
        ? body.slug.trim().toLowerCase()
        : "";

    const propertyType =
      typeof body.propertyType === "string"
        ? body.propertyType.trim()
        : "";

    const city =
      typeof body.city === "string"
        ? body.city.trim()
        : "";

    if (!partnerId) {
      return Response.json(
        {
          success: false,
          error: "Partner ID is required.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return Response.json(
        {
          success: false,
          error: "Property name is required.",
        },
        { status: 400 }
      );
    }

    if (!slug) {
      return Response.json(
        {
          success: false,
          error: "Property slug is required.",
        },
        { status: 400 }
      );
    }

    if (!propertyType) {
      return Response.json(
        {
          success: false,
          error: "Property type is required.",
        },
        { status: 400 }
      );
    }

    if (!city) {
      return Response.json(
        {
          success: false,
          error: "City is required.",
        },
        { status: 400 }
      );
    }

    if (!Object.values(PropertyType).includes(propertyType as PropertyType)) {
      return Response.json(
        {
          success: false,
          error: "Invalid property type.",
        },
        { status: 400 }
      );
    }

    const isAdmin = currentUser.roles.includes("ADMIN");

    if (!isAdmin) {
      await requirePartnerMembership(partnerId);
    }

    const existingProperty = await prisma.property.findUnique({
      where: {
        slug,
      },
    });

    if (existingProperty) {
      return Response.json(
        {
          success: false,
          error: "A property with this slug already exists.",
        },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const location = await tx.location.create({
        data: {
          country:
            typeof body.country === "string" && body.country.trim()
              ? body.country.trim()
              : "Ethiopia",

          region:
            typeof body.region === "string"
              ? body.region.trim() || null
              : null,

          city,

          subCity:
            typeof body.subCity === "string"
              ? body.subCity.trim() || null
              : null,

          neighborhood:
            typeof body.neighborhood === "string"
              ? body.neighborhood.trim() || null
              : null,

          address:
            typeof body.address === "string"
              ? body.address.trim() || null
              : null,

          postalCode:
            typeof body.postalCode === "string"
              ? body.postalCode.trim() || null
              : null,

          latitude:
            typeof body.latitude === "number"
              ? body.latitude
              : null,

          longitude:
            typeof body.longitude === "number"
              ? body.longitude
              : null,
        },
      });

      const property = await tx.property.create({
        data: {
          partnerId,
          locationId: location.id,
          name,
          slug,
          description:
            typeof body.description === "string"
              ? body.description.trim() || null
              : null,

          propertyType: propertyType as PropertyType,

          status: "DRAFT",
          verificationStatus: "NOT_SUBMITTED",

          email:
            typeof body.email === "string"
              ? body.email.trim() || null
              : null,

          phone:
            typeof body.phone === "string"
              ? body.phone.trim() || null
              : null,

          website:
            typeof body.website === "string"
              ? body.website.trim() || null
              : null,

          checkInTime:
            typeof body.checkInTime === "string"
              ? body.checkInTime.trim() || null
              : null,

          checkOutTime:
            typeof body.checkOutTime === "string"
              ? body.checkOutTime.trim() || null
              : null,
        },

        include: {
          location: true,
          partner: true,
        },
      });

      return property;
    });

    return Response.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}