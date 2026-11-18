
import { VerificationStatus } from "@/lib/generated/prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      propertyId: string;
      documentId: string;
    }>;
  }
) {
  try {
    // Only administrators can review property documents.
    await requireRole("ADMIN", "SUPER_ADMIN");

    const { propertyId, documentId } = await params;

    if (
      !UUID_PATTERN.test(propertyId) ||
      !UUID_PATTERN.test(documentId)
    ) {
      return errorResponse(
        "Valid property and document IDs are required."
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

    if (action !== "VERIFY" && action !== "REJECT") {
      return errorResponse(
        "Action must be VERIFY or REJECT."
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
        // Confirm that the document belongs to this property.
        const document =
          await tx.propertyDocument.findFirst({
            where: {
              id: documentId,
              propertyId,
            },
            select: {
              id: true,
              verificationStatus: true,
            },
          });

        if (!document) {
          return {
            success: false as const,
            error: "Document not found for this property.",
            status: 404,
          };
        }

        // Update the document review decision.
        const updated = await tx.propertyDocument.updateMany({
          where: {
            id: documentId,
            propertyId,
            verificationStatus: {
              in: [
                VerificationStatus.PENDING,
                VerificationStatus.VERIFIED,
                VerificationStatus.REJECTED,
              ],
            },
          },
          data: {
            verificationStatus:
              action === "VERIFY"
                ? VerificationStatus.VERIFIED
                : VerificationStatus.REJECTED,

            rejectionReason:
              action === "REJECT"
                ? reason
                : null,

            verifiedAt:
              action === "VERIFY"
                ? new Date()
                : null,
          },
        });

        if (updated.count === 0) {
          return {
            success: false as const,
            error:
              "Document could not be updated. Refresh and try again.",
            status: 409,
          };
        }

        // Recalculate the property's overall document
        // verification status using every submitted document.
        const documents =
          await tx.propertyDocument.findMany({
            where: {
              propertyId,
            },
            select: {
              verificationStatus: true,
            },
          });

        let propertyVerificationStatus:
          VerificationStatus;

        if (
          documents.some(
            (item) =>
              item.verificationStatus ===
              VerificationStatus.REJECTED
          )
        ) {
          propertyVerificationStatus =
            VerificationStatus.REJECTED;
        } else if (
          documents.length > 0 &&
          documents.every(
            (item) =>
              item.verificationStatus ===
              VerificationStatus.VERIFIED
          )
        ) {
          propertyVerificationStatus =
            VerificationStatus.VERIFIED;
        } else {
          propertyVerificationStatus =
            VerificationStatus.PENDING;
        }

        // Keep the property's overall verification status
        // synchronized with its submitted documents.
        await tx.property.update({
          where: {
            id: propertyId,
          },
          data: {
            verificationStatus:
              propertyVerificationStatus,
          },
        });

        const updatedDocument =
          await tx.propertyDocument.findFirst({
            where: {
              id: documentId,
              propertyId,
            },
            select: {
              id: true,
              documentType: true,
              documentName: true,
              verificationStatus: true,
              rejectionReason: true,
              verifiedAt: true,
              updatedAt: true,
            },
          });

        if (!updatedDocument) {
          throw new Error(
            "DOCUMENT_RETRIEVAL_FAILED"
          );
        }

        return {
          success: true as const,
          data: updatedDocument,
          propertyVerificationStatus,
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
        action === "VERIFY"
          ? "Document verified successfully."
          : "Document rejected successfully.",
      data: result.data,
      propertyVerificationStatus:
        result.propertyVerificationStatus,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "DOCUMENT_RETRIEVAL_FAILED"
    ) {
      return errorResponse(
        "The document review was completed, but the updated document could not be retrieved.",
        500
      );
    }

    return handleAuthError(error);
  }
}
