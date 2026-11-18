import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

const validPartnerId =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PartnerAction = "APPROVE" | "SUSPEND" | "REACTIVATE";

type PartnerStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

const transitions: Record<
  PartnerAction,
  {
    from: PartnerStatus;
    to: "ACTIVE" | "SUSPENDED";
    message: string;
  }
> = {
  APPROVE: {
    from: "PENDING",
    to: "ACTIVE",
    message: "Partner account approved successfully.",
  },
  SUSPEND: {
    from: "ACTIVE",
    to: "SUSPENDED",
    message: "Partner account suspended successfully.",
  },
  REACTIVATE: {
    from: "SUSPENDED",
    to: "ACTIVE",
    message: "Partner account reactivated successfully.",
  },
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");

    const { partnerId } = await params;

    if (!validPartnerId.test(partnerId)) {
      return Response.json(
        { success: false, error: "Invalid partner ID." },
        { status: 400 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: "A valid JSON body is required." },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("action" in body) ||
      typeof body.action !== "string" ||
      !["APPROVE", "SUSPEND", "REACTIVATE"].includes(body.action)
    ) {
      return Response.json(
        { success: false, error: "Select a valid partner action." },
        { status: 400 }
      );
    }

    const action = body.action as PartnerAction;
    const transition = transitions[action];

    const result = await prisma.$transaction(async (tx) => {
      const partner = await tx.partner.findUnique({
        where: { id: partnerId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!partner) {
        return { type: "NOT_FOUND" as const };
      }

      if (partner.status !== transition.from) {
        return {
          type: "INVALID_STATUS" as const,
          currentStatus: partner.status,
        };
      }

      // Only update if the partner still has the expected status.
      // This prevents two simultaneous admin actions from overwriting
      // each other's decisions.
      const updateResult = await tx.partner.updateMany({
        where: {
          id: partnerId,
          status: transition.from,
        },
        data: {
          status: transition.to,
        },
      });

      if (updateResult.count !== 1) {
        const currentPartner = await tx.partner.findUnique({
          where: { id: partnerId },
          select: { status: true },
        });

        if (!currentPartner) {
          return { type: "NOT_FOUND" as const };
        }

        return {
          type: "INVALID_STATUS" as const,
          currentStatus: currentPartner.status,
        };
      }

      const updatedPartner = await tx.partner.findUnique({
        where: { id: partnerId },
        select: {
          id: true,
          businessName: true,
          status: true,
          updatedAt: true,
        },
      });

      if (!updatedPartner) {
        return { type: "NOT_FOUND" as const };
      }

      return {
        type: "UPDATED" as const,
        partner: updatedPartner,
      };
    });

    if (result.type === "NOT_FOUND") {
      return Response.json(
        { success: false, error: "Partner account not found." },
        { status: 404 }
      );
    }

    if (result.type === "INVALID_STATUS") {
      return Response.json(
        {
          success: false,
          error: `This action cannot be performed while the partner status is ${result.currentStatus}.`,
        },
        { status: 409 }
      );
    }

    return Response.json({
      success: true,
      message: transition.message,
      data: result.partner,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}