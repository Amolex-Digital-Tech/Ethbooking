
import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

const validPropertyId =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PropertyAction =
  | "SUSPEND"
  | "REACTIVATE"
  | "ARCHIVE"
  | "RESTORE";

const transitions: Record<
  PropertyAction,
  {
    from: string[];
    to: "APPROVED" | "SUSPENDED" | "ARCHIVED";
    message: string;
  }
> = {
  SUSPEND: {
    from: ["APPROVED"],
    to: "SUSPENDED",
    message: "Property suspended successfully.",
  },

  REACTIVATE: {
    from: ["SUSPENDED"],
    to: "APPROVED",
    message: "Property reactivated successfully.",
  },

  ARCHIVE: {
    from: ["APPROVED", "SUSPENDED"],
    to: "ARCHIVED",
    message: "Property archived successfully.",
  },

  RESTORE: {
    from: ["ARCHIVED"],
    to: "APPROVED",
    message: "Property restored successfully.",
  },
};

function errorResponse(
  error: string,
  status = 400,
  extra?: Record<string, unknown>
) {
  return Response.json(
    {
      success: false,
      error,
      ...extra,
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
    // Only administrators can change property status.
    await requireRole("ADMIN", "SUPER_ADMIN");

    const { propertyId } = await params;

    if (!validPropertyId.test(propertyId)) {
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

    if (!isRecord(body)) {
      return errorResponse(
        "The request body must be an object."
      );
    }

    const action =
      typeof body.action === "string"
        ? body.action.trim().toUpperCase()
        : "";

    const allowedActions: PropertyAction[] = [
      "SUSPEND",
      "REACTIVATE",
      "ARCHIVE",
      "RESTORE",
    ];

    if (
      !allowedActions.includes(action as PropertyAction)
    ) {
      return errorResponse(
        "Select a valid property action."
      );
    }

    const selectedAction = action as PropertyAction;
    const transition = transitions[selectedAction];

    const result = await prisma.$transaction(
      async (tx) => {
        const property = await tx.property.findUnique({
          where: {
            id: propertyId,
          },
          select: {
            id: true,
            name: true,
            status: true,
          },
        });

        if (!property) {
          return {
            type: "NOT_FOUND" as const,
          };
        }

        if (!transition.from.includes(property.status)) {
          return {
            type: "INVALID_STATUS" as const,
            currentStatus: property.status,
          };
        }

        // Conditional update prevents a concurrent request
        // from applying a transition using stale status.
        const updateResult = await tx.property.updateMany({
          where: {
            id: propertyId,
            status: {
              in: transition.from as never[],
            },
          },
          data: {
            status: transition.to,
          },
        });

        if (updateResult.count === 0) {
          const latest = await tx.property.findUnique({
            where: {
              id: propertyId,
            },
            select: {
              status: true,
            },
          });

          if (!latest) {
            return {
              type: "NOT_FOUND" as const,
            };
          }

          return {
            type: "INVALID_STATUS" as const,
            currentStatus: latest.status,
          };
        }

        const updated = await tx.property.findUnique({
          where: {
            id: propertyId,
          },
          select: {
            id: true,
            name: true,
            status: true,
            verificationStatus: true,
            updatedAt: true,
          },
        });

        if (!updated) {
          throw new Error(
            "PROPERTY_RETRIEVAL_FAILED"
          );
        }

        return {
          type: "UPDATED" as const,
          property: updated,
        };
      }
    );

    if (result.type === "NOT_FOUND") {
      return errorResponse(
        "Property not found.",
        404
      );
    }

    if (result.type === "INVALID_STATUS") {
      return errorResponse(
        `Cannot perform ${selectedAction.toLowerCase()} on a property with status ${result.currentStatus}.`,
        409,
        {
          currentStatus: result.currentStatus,
        }
      );
    }

    return Response.json({
      success: true,
      message: transition.message,
      data: result.property,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PROPERTY_RETRIEVAL_FAILED"
    ) {
      return errorResponse(
        "Property status was updated, but the updated property could not be retrieved.",
        500
      );
    }

    return handleAuthError(error);
  }
}
