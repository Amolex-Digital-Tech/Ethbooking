import { AuthError } from "@/lib/auth/auth-error";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireRole } from "@/lib/auth/require-role";
import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { prisma } from "@/lib/prisma/client";
import { cancelPartnerBooking } from "@/lib/bookings/cancel-partner-booking";

type RouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const currentUser = await requireRole(
      "PARTNER_OWNER",
      "PARTNER_MANAGER"
    );

    const { bookingId } = await context.params;
    const normalizedBookingId = bookingId.trim();

    if (!normalizedBookingId) {
      return Response.json(
        { success: false, error: "Booking ID is required." },
        { status: 400 }
      );
    }

    // Only ACTIVE memberships belonging to ACTIVE organizations
    // can cancel bookings.
    const membership = await prisma.partnerMember.findFirst({
      where: {
        profileId: currentUser.profile.id,
        status: "ACTIVE",
        partner: {
          status: "ACTIVE",
        },
      },
      select: {
        partnerId: true,
      },
    });

    if (!membership) {
      return Response.json(
        {
          success: false,
          error: "You do not have an active partner membership.",
        },
        { status: 403 }
      );
    }

    const authorizedMembership = await requirePartnerMembership(
      membership.partnerId,
      {
        allowedPartnerStatuses: ["ACTIVE"],
      }
    );

    let body: unknown = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const cancellationReason =
      typeof body === "object" &&
      body !== null &&
      "cancellationReason" in body &&
      typeof body.cancellationReason === "string"
        ? body.cancellationReason.trim()
        : undefined;

    const result = await cancelPartnerBooking(
      normalizedBookingId,
      authorizedMembership.partner.id,
      cancellationReason
    );

    return Response.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }

    if (error instanceof Error) {
      const message = error.message;

      if (message === "Booking not found.") {
        return Response.json(
          { success: false, error: message },
          { status: 404 }
        );
      }

      if (
        message.includes("cannot be cancelled") ||
        message.includes("administrator") ||
        message.includes("another partner") ||
        message.includes("has changed")
      ) {
        return Response.json(
          { success: false, error: message },
          { status: 409 }
        );
      }
    }

    console.error("Partner booking cancellation failed:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to cancel this booking.",
      },
      { status: 500 }
    );
  }
}