
import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { PropertyType } from "@/lib/generated/prisma/enums";

const propertyTypes = Object.values(PropertyType);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function errorResponse(
  error: string,
  status = 400
) {
  return Response.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

function readText(
  value: unknown,
  field: string,
  maxLength: number,
  optional = true
): string | null {
  if (value === null || value === undefined) {
    if (optional) return null;

    throw new ValidationError(
      `${field} is required.`
    );
  }

  if (typeof value !== "string") {
    throw new ValidationError(
      `${field} must be text.`
    );
  }

  const result = value.trim();

  if (!result && optional) return null;

  if (!result) {
    throw new ValidationError(
      `${field} is required.`
    );
  }

  if (result.length > maxLength) {
    throw new ValidationError(
      `${field} cannot exceed ${maxLength} characters.`
    );
  }

  return result;
}

function readCoordinate(
  value: unknown,
  field: string,
  min: number,
  max: number
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (
    !Number.isFinite(numberValue) ||
    numberValue < min ||
    numberValue > max
  ) {
    throw new ValidationError(
      `${field} must be between ${min} and ${max}.`
    );
  }

  return numberValue;
}

function validatePropertyId(propertyId: string) {
  return UUID_PATTERN.test(propertyId);
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      propertyId: string;
    }>;
  }
) {
  try {
    // Only administrators can edit property details.
    await requireRole("ADMIN", "SUPER_ADMIN");

    const { propertyId } = await params;

    if (!validatePropertyId(propertyId)) {
      return errorResponse(
        "Invalid property ID."
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "A valid JSON body is required."
      );
    }

    if (
      !isRecord(body) ||
      !isRecord(body.location)
    ) {
      return errorResponse(
        "Property and location details are required."
      );
    }

    const name = readText(
      body.name,
      "Property name",
      150,
      false
    )!;

    if (name.length < 2) {
      throw new ValidationError(
        "Property name must contain at least 2 characters."
      );
    }

    if (
      typeof body.propertyType !== "string" ||
      !propertyTypes.includes(
        body.propertyType as PropertyType
      )
    ) {
      throw new ValidationError(
        "Select a valid property type."
      );
    }

    const description = readText(
      body.description,
      "Description",
      5000
    );

    if (
      description &&
      description.length < 30
    ) {
      throw new ValidationError(
        "Description must contain at least 30 characters."
      );
    }

    const email = readText(
      body.email,
      "Email",
      254
    );

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new ValidationError(
        "Enter a valid email address."
      );
    }

    const phone = readText(
      body.phone,
      "Phone",
      40
    );

    const website = readText(
      body.website,
      "Website",
      500
    );

    if (website) {
      try {
        const parsedUrl = new URL(website);

        if (
          parsedUrl.protocol !== "http:" &&
          parsedUrl.protocol !== "https:"
        ) {
          throw new Error();
        }
      } catch {
        throw new ValidationError(
          "Website must be a valid URL beginning with https:// or http://."
        );
      }
    }

    const checkInTime = readText(
      body.checkInTime,
      "Check-in time",
      5
    );

    const checkOutTime = readText(
      body.checkOutTime,
      "Check-out time",
      5
    );

    for (const [label, value] of [
      ["Check-in time", checkInTime],
      ["Check-out time", checkOutTime],
    ] as const) {
      if (
        value &&
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)
      ) {
        throw new ValidationError(
          `${label} must use the HH:mm format.`
        );
      }
    }

    const location = body.location;

    const country = readText(
      location.country,
      "Country",
      100,
      false
    )!;

    const region = readText(
      location.region,
      "Region",
      150
    );

    const city = readText(
      location.city,
      "City",
      150,
      false
    )!;

    const subCity = readText(
      location.subCity,
      "Sub-city",
      150
    );

    const neighborhood = readText(
      location.neighborhood,
      "Neighborhood",
      150
    );

    const address = readText(
      location.address,
      "Street address",
      500
    );

    const postalCode = readText(
      location.postalCode,
      "Postal code",
      30
    );

    const latitude = readCoordinate(
      location.latitude,
      "Latitude",
      -90,
      90
    );

    const longitude = readCoordinate(
      location.longitude,
      "Longitude",
      -180,
      180
    );

    const locationData = {
      country,
      region,
      city,
      subCity,
      neighborhood,
      address,
      postalCode,
      latitude,
      longitude,
    };

    const updated = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.property.findUnique({
          where: {
            id: propertyId,
          },
          select: {
            id: true,
            locationId: true,
          },
        });

        if (!existing) {
          return null;
        }

        // Check whether another property shares this location.
        const propertiesUsingLocation =
          await tx.property.count({
            where: {
              locationId: existing.locationId,
            },
          });

        let locationId = existing.locationId;

        if (propertiesUsingLocation > 1) {
          // Give this property its own location so editing
          // its address does not change another property's address.
          const newLocation = await tx.location.create({
            data: locationData,
            select: {
              id: true,
            },
          });

          locationId = newLocation.id;
        } else {
          await tx.location.update({
            where: {
              id: existing.locationId,
            },
            data: locationData,
          });
        }

        return tx.property.update({
          where: {
            id: propertyId,
          },
          data: {
            name,
            propertyType:
              body.propertyType as PropertyType,
            description,
            email,
            phone,
            website,
            checkInTime,
            checkOutTime,
            locationId,
          },
          select: {
            id: true,
            name: true,
            status: true,
            verificationStatus: true,
            updatedAt: true,
            location: {
              select: {
                country: true,
                region: true,
                city: true,
                subCity: true,
                neighborhood: true,
                address: true,
                postalCode: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        });
      }
    );

    if (!updated) {
      return errorResponse(
        "Property not found.",
        404
      );
    }

    return Response.json({
      success: true,
      message:
        "Property details updated successfully.",
      data: updated,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error.message, 400);
    }

    return handleAuthError(error);
  }
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      propertyId: string;
    }>;
  }
) {
  try {
    // Only administrators can permanently delete properties.
    await requireRole("ADMIN", "SUPER_ADMIN");

    const { propertyId } = await params;

    if (!validatePropertyId(propertyId)) {
      return errorResponse(
        "A valid property ID is required."
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const property = await tx.property.findUnique({
          where: {
            id: propertyId,
          },
          select: {
            id: true,
            name: true,
            locationId: true,
          },
        });

        if (!property) {
          return {
            type: "NOT_FOUND" as const,
          };
        }

        // Preserve booking history.
        const bookingCount =
          await tx.bookingItem.count({
            where: {
              roomType: {
                is: {
                  propertyId,
                },
              },
            },
          });

        if (bookingCount > 0) {
          return {
            type: "HAS_BOOKINGS" as const,
            bookingCount,
          };
        }

        // Delete the property and its cascading related records.
        await tx.property.delete({
          where: {
            id: propertyId,
          },
        });

        // Remove the location only when no other properties use it.
        const remainingProperties =
          await tx.property.count({
            where: {
              locationId: property.locationId,
            },
          });

        if (remainingProperties === 0) {
          await tx.location.delete({
            where: {
              id: property.locationId,
            },
          });
        }

        return {
          type: "DELETED" as const,
          propertyName: property.name,
        };
      }
    );

    if (result.type === "NOT_FOUND") {
      return errorResponse(
        "Property not found.",
        404
      );
    }

    if (result.type === "HAS_BOOKINGS") {
      return errorResponse(
        `This property cannot be permanently deleted because it has ${result.bookingCount} booking record(s). Suspend or archive it instead.`,
        409
      );
    }

    return Response.json({
      success: true,
      message:
        `${result.propertyName} was deleted successfully.`,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2003"
    ) {
      return errorResponse(
        "This property has related records and cannot be deleted. Please archive or suspend it instead.",
        409
      );
    }

    return handleAuthError(error);
  }
}
