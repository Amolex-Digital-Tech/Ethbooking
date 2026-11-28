
import { requireAuth } from "@/lib/auth/require-auth";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { AuthError } from "@/lib/auth/auth-error";
import { prisma } from "@/lib/prisma/client";
import { releaseRoomInventory } from "@/lib/availability/release-room-inventory";
import { expireBooking } from "@/lib/bookings/expire-booking";
import { syncPendingChapaPayments } from "@/lib/payments/chapa/sync-pending-payments";
import { errorResponse } from "@/lib/http/user-facing-error";
import {
  calculateCancellationAmounts,
  calculateSharesAfterRefund,
  cancellationTermsForItem,
} from "@/lib/bookings/cancellation-amounts";

type RouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

class BookingCancellationError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "BookingCancellationError";
  }
}

// GET: Retrieve the customer's booking.
export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const currentUser = await requireAuth();

    const { bookingId } = await context.params;
    const normalizedBookingId = bookingId.trim();

    if (!normalizedBookingId) {
      return Response.json(
        {
          success: false,
          error: "Booking ID is required.",
        },
        { status: 400 }
      );
    }

    let expirationCandidate = await prisma.booking.findFirst({
      where: { id: normalizedBookingId, customerProfileId: currentUser.profile.id },
      select: { status: true, paymentStatus: true, expiresAt: true },
    });

    // The customer may be back from Chapa before its callback or webhook has
    // reached us, so ask Chapa directly whether the payment went through.
    if (expirationCandidate?.status === "PAYMENT_PENDING" && expirationCandidate.paymentStatus === "PENDING") {
      try {
        if (await syncPendingChapaPayments(normalizedBookingId)) {
          expirationCandidate = null;
        }
      } catch (syncError) {
        console.error("Chapa payment sync failed during booking retrieval:", syncError);
      }
    }

    if (expirationCandidate?.status === "PAYMENT_PENDING" && expirationCandidate.paymentStatus === "PENDING" && expirationCandidate.expiresAt && expirationCandidate.expiresAt <= new Date()) {
      try {
        await expireBooking(normalizedBookingId);
      } catch (expirationError) {
        console.error("Booking expiry check failed during retrieval:", expirationError);
      }
    }
    const booking = await prisma.booking.findFirst({
      where: {
        id: normalizedBookingId,
        customerProfileId: currentUser.profile.id,
      },
      include: {
        items: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            roomTypeId: true,
            ratePlanId: true,
            roomName: true,
            ratePlanName: true,
            roomType: {
              select: {
                additionalRules: true,
                childPolicy: true,
                smokingPolicy: true,
                property: {
                  select: {
                    id: true,
                    name: true,
                    checkInTime: true,
                    checkOutTime: true,
                  },
                },
              },
            },
            checkInDate: true,
            checkOutDate: true,
            nights: true,
            quantity: true,
            guests: true,
            pricePerNight: true,
            subtotal: true,
            currency: true,
            cancellationPolicy: true,
            cancellationDeadlineHours: true,
            cancellationFeePercent: true,
            ratePlan: {
              select: {
                cancellationPolicy: true,
                cancellationDeadlineHours: true,
                cancellationFeePercent: true,
              },
            },
          },
        },
        guests: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            guestType: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            countryCode: true,
            dateOfBirth: true,
            ageAtBooking: true,
          },
        },
      },
    });

    if (!booking) {
      return Response.json(
        {
          success: false,
          error: "Booking not found.",
        },
        { status: 404 }
      );
    }

    // Show the cancellation terms the booking was made under, not the rate
    // plan's current terms.
    const { items, ...bookingFields } = booking;
    return Response.json({
      success: true,
      data: {
        ...bookingFields,
        items: items.map(({ cancellationPolicy, cancellationDeadlineHours, cancellationFeePercent, ratePlan, ...item }) => ({
          ...item,
          ratePlan: cancellationPolicy === null
            ? ratePlan
            : { cancellationPolicy, cancellationDeadlineHours, cancellationFeePercent },
        })),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }

    console.error("Booking retrieval failed:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to retrieve booking.",
      },
      { status: 500 }
    );
  }
}

// PATCH: Cancel the customer's booking.
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const currentUser = await requireAuth();

    const { bookingId } = await context.params;
    const normalizedBookingId = bookingId.trim();

    if (!normalizedBookingId) {
      return Response.json(
        {
          success: false,
          error: "Booking ID is required.",
        },
        { status: 400 }
      );
    }

    let body: Record<string, unknown> = {};

    try {
      const parsed = await request.json();

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      return Response.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    // Accept both property names so the API works with
    // the existing customer cancellation component.
    const suppliedReason =
      typeof body.reason === "string"
        ? body.reason.trim().slice(0, 500)
        : typeof body.cancellationReason === "string"
          ? body.cancellationReason.trim().slice(0, 500)
          : "";

    const cancellationReason =
      suppliedReason || "Cancelled by customer.";

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          id: normalizedBookingId,
          customerProfileId: currentUser.profile.id,
        },
        include: {
          items: {
            select: {
              id: true,
              roomTypeId: true,
              quantity: true,
              subtotal: true,
              checkInDate: true,
              cancellationPolicy: true,
              cancellationDeadlineHours: true,
              cancellationFeePercent: true,
              checkInTime: true,
              ratePlan: {
                select: {
                  cancellationPolicy: true,
                  cancellationDeadlineHours: true,
                  cancellationFeePercent: true,
                },
              },
              roomType: {
                select: {
                  checkInTime: true,
                  property: { select: { checkInTime: true } },
                },
              },
            },
          },
        },
      });

      if (!booking) {
        throw new BookingCancellationError(
          "Booking not found.",
          404
        );
      }

      const isUnpaidPending =
        booking.status === "PAYMENT_PENDING" &&
        booking.paymentStatus === "PENDING";

      const isPaidConfirmed =
        booking.status === "CONFIRMED" &&
        booking.paymentStatus === "PAID";

      if (!isUnpaidPending && !isPaidConfirmed) {
        throw new BookingCancellationError(
          "This booking can no longer be cancelled.",
          409
        );
      }

      const now = new Date();

      const amounts = isPaidConfirmed
        ? calculateCancellationAmounts(
            {
              subtotal: booking.subtotal,
              totalAmount: booking.totalAmount,
              items: booking.items.map((item) => ({
                subtotal: item.subtotal,
                checkInDate: item.checkInDate,
                terms: cancellationTermsForItem(item),
              })),
            },
            now
          )
        : {
            refundAmount: "0.00",
            cancellationFeeAmount: "0.00",
          };

      // A paid booking's platform and hotel shares are reduced to what is
      // kept after the refund.
      const shares = isPaidConfirmed
        ? calculateSharesAfterRefund({
            totalAmount: booking.totalAmount,
            platformCommission: booking.platformCommission,
            paymentFee: booking.paymentFee,
            refundAmount: amounts.refundAmount,
          })
        : null;

      // refundAmount is the total owed over the booking's life, so add to it:
      // a duplicate payment may already have been refunded.
      const totalRefundAmount = booking.refundAmount.plus(amounts.refundAmount);

      const hasRefund = Number(amounts.refundAmount) > 0;

      const newBookingStatus = hasRefund
        ? "REFUND_PENDING"
        : "CANCELLED";

      const newPaymentStatus = isUnpaidPending
        ? "UNPAID"
        : hasRefund
          ? "REFUND_PENDING"
          : "PAID";

      // Claim the booking so concurrent cancellation requests
      // cannot release the same inventory more than once.
      const claimed = await tx.booking.updateMany({
        where: {
          id: booking.id,
          customerProfileId: currentUser.profile.id,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
        },
        data: {
          status: newBookingStatus,
          paymentStatus: newPaymentStatus,
          cancellationReason,
          cancelledAt: now,
          refundAmount: totalRefundAmount,
          cancellationFeeAmount:
            amounts.cancellationFeeAmount,
          ...(shares ?? {}),
        },
      });

      if (claimed.count !== 1) {
        throw new BookingCancellationError(
          "The booking changed while cancellation was being processed. Refresh the page and try again.",
          409
        );
      }

      // Cancel outstanding payment attempts.
      // A later verified Chapa payment must be handled
      // separately and must never reconfirm this booking.
      await tx.paymentTransaction.updateMany({
        where: {
          bookingId: booking.id,
          status: {
            in: ["INITIATED", "PENDING"],
          },
        },
        data: {
          status: "CANCELLED",
          failureReason: "Booking cancelled by customer.",
        },
      });

      // Release reserved inventory only after successfully
      // claiming the booking cancellation.
      await releaseRoomInventory(
        tx,
        booking.checkInDate,
        booking.checkOutDate,
        booking.items.map((item) => ({
          roomTypeId: item.roomTypeId,
          quantity: item.quantity,
        }))
      );

      return {
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        status: newBookingStatus,
        paymentStatus: newPaymentStatus,
        refundAmount: amounts.refundAmount,
        cancellationFeeAmount:
          amounts.cancellationFeeAmount,
        cancelledAt: now,
      };
    });

    return Response.json({
      success: true,
      message: "Booking cancelled successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }

    if (error instanceof BookingCancellationError) {
      return Response.json(
        {
          success: false,
          error: error.message,
        },
        { status: error.statusCode }
      );
    }

    return errorResponse("Booking cancellation failed", error);
  }
}
