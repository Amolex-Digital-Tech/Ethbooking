
import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

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

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
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
    // Only administrators can approve or reject properties.
    await requireRole("ADMIN", "SUPER_ADMIN");

    const { propertyId } = await params;

    if (!UUID_REGEX.test(propertyId)) {
      return errorResponse(
        "A valid property ID is required."
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "Invalid JSON request body."
      );
    }

    if (!isRecord(body)) {
      return errorResponse(
        "The request body must be an object."
      );
    }

    const action =
      typeof body.action === "string"
        ? body.action.trim().toUpperCase()
        : "";

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    if (action !== "APPROVE" && action !== "REJECT") {
      return errorResponse(
        "Action must be APPROVE or REJECT."
      );
    }

    if (action === "REJECT" && !reason) {
      return errorResponse(
        "A rejection reason is required."
      );
    }

    if (reason.length > 2000) {
      return errorResponse(
        "The rejection reason cannot exceed 2000 characters."
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Read the property and its approval requirements
        // inside the transaction.
        const property = await tx.property.findUnique({
          where: {
            id: propertyId,
          },
          include: {
            photos: true,
            roomTypes: true,
            documents: true,
          },
        });

        if (!property) {
          return {
            success: false as const,
            error: "Property not found.",
            status: 404,
          };
        }

        const reviewableStatuses = [
          "PENDING_REVIEW",
          "UNDER_REVIEW",
        ] as const;

        if (
          !reviewableStatuses.includes(
            property.status as (typeof reviewableStatuses)[number]
          )
        ) {
          return {
            success: false as const,
            error: `Property cannot be reviewed from ${property.status} status.`,
            status: 409,
          };
        }

        if (action === "APPROVE") {
          const missingRequirements: string[] = [];

          if (!property.description?.trim()) {
            missingRequirements.push(
              "a property description"
            );
          }

          if (property.photos.length === 0) {
            missingRequirements.push(
              "at least one property photo"
            );
          }

          if (property.roomTypes.length === 0) {
            missingRequirements.push(
              "at least one room type"
            );
          }

          if (property.documents.length === 0) {
            missingRequirements.push(
              "at least one submitted property document"
            );
          }

          const unverifiedDocuments =
            property.documents.filter(
              (document) =>
                document.verificationStatus !== "VERIFIED"
            );

          if (unverifiedDocuments.length > 0) {
            missingRequirements.push(
              "verification of all submitted property documents"
            );
          }

          if (missingRequirements.length > 0) {
            return {
              success: false as const,
              error:
                "This property cannot be approved yet. Please ensure it has " +
                missingRequirements.join(", ") +
                ".",
              status: 422,
            };
          }
        }

        // Conditional update prevents two concurrent Admin
        // requests from making conflicting review decisions.
        const updateResult =
          await tx.property.updateMany({
            where: {
              id: propertyId,
              status: {
                in: [...reviewableStatuses],
              },
            },
            data: {
              status:
                action === "APPROVE"
                  ? "APPROVED"
                  : "REJECTED",

              verificationStatus:
                action === "APPROVE"
                  ? "VERIFIED"
                  : "REJECTED",

              rejectionReason:
                action === "REJECT"
                  ? reason
                  : null,
            },
          });

        if (updateResult.count === 0) {
          return {
            success: false as const,
            error:
              "This property has already been reviewed or is no longer awaiting review. Refresh the page to see its current status.",
            status: 409,
          };
        }

        const updatedProperty =
          await tx.property.findUnique({
            where: {
              id: propertyId,
            },
            include: {
              partner: true,
              location: true,
              documents: true,
              photos: true,
              roomTypes: true,
            },
          });

        if (!updatedProperty) {
          throw new Error(
            "PROPERTY_RETRIEVAL_FAILED"
          );
        }

        return {
          success: true as const,
          data: updatedProperty,
        };
      }
    );

    if (!result.success) {
      return errorResponse(
        result.error,
        result.status
      );
    }

    return Response.json({
      success: true,
      message:
        action === "APPROVE"
          ? "Property approved successfully."
          : "Property rejected successfully.",
      data: result.data,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PROPERTY_RETRIEVAL_FAILED"
    ) {
      return errorResponse(
        "The property could not be retrieved after the review decision.",
        500
      );
    }

    return handleAuthError(error);
  }
}
