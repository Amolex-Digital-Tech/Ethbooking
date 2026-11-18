
import { requireAuth } from "@/lib/auth/require-auth";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { AuthError } from "@/lib/auth/auth-error";
import { prisma } from "@/lib/prisma/client";
import { releaseRoomInventory } from "@/lib/availability/release-room-inventory";
import { expireBooking } from "@/lib/bookings/expire-booking";

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

function calculateCancellationAmounts(
  booking: {
    subtotal: { toString(): string };
    totalAmount: { toString(): string };
    items: {
      subtotal: { toString(): string };
      checkInDate: Date;
      ratePlan: {
        cancellationPolicy: string;
        cancellationDeadlineHours: number | null;
        cancellationFeePercent: { toString(): string } | null;
      };
    }[];
  },
  now: Date
) {
  const totalAmount = Number(booking.totalAmount.toString());
  const bookingSubtotal = Number(booking.subtotal.toString());

  if (
    !Number.isFinite(totalAmount) ||
    !Number.isFinite(bookingSubtotal)
  ) {
    throw new Error("Invalid booking amount.");
  }

  const totalCents = Math.max(
    0,
    Math.round(totalAmount * 100)
  );

  if (totalCents === 0 || booking.items.length === 0) {
    return {
      refundAmount: "0.00",
      cancellationFeeAmount: "0.00",
    };
  }

  let allocatedCents = 0;
  let refundCents = 0;

  booking.items.forEach((item, index) => {
    const itemSubtotal = Number(item.subtotal.toString());

    if (!Number.isFinite(itemSubtotal) || itemSubtotal < 0) {
      throw new Error("Invalid booking item amount.");
    }

    // Allocate the booking's total amount across its items.
    // The final item receives any rounding difference.
    const itemBaseCents =
      index === booking.items.length - 1
        ? totalCents - allocatedCents
        : bookingSubtotal > 0
          ? Math.round(
              totalCents * (itemSubtotal / bookingSubtotal)
            )
          : Math.round(totalCents / booking.items.length);

    allocatedCents += itemBaseCents;

    const policy = item.ratePlan.cancellationPolicy;
    const deadlineHours =
      item.ratePlan.cancellationDeadlineHours;

    const deadline =
      deadlineHours === null
        ? null
        : item.checkInDate.getTime() -
          Math.max(0, deadlineHours) * 60 * 60 * 1000;

    const beforeDeadline =
      deadline !== null && now.getTime() < deadline;

    let itemRefundCents = 0;

    if (policy === "FLEXIBLE" && beforeDeadline) {
      itemRefundCents = itemBaseCents;
    }

    if (
      (policy === "MODERATE" || policy === "CUSTOM") &&
      beforeDeadline
    ) {
      // If the fee percentage is missing, use a conservative
      // 100% fee rather than accidentally granting a full refund.
      const configuredFee =
        item.ratePlan.cancellationFeePercent === null
          ? 100
          : Number(
              item.ratePlan.cancellationFeePercent.toString()
            );

      if (!Number.isFinite(configuredFee)) {
        throw new Error(
          "Invalid cancellation fee configuration."
        );
      }

      const feePercent = Math.min(
        100,
        Math.max(0, configuredFee)
      );

      itemRefundCents = Math.round(
        itemBaseCents * (1 - feePercent / 100)
      );
    }

    // NON_REFUNDABLE bookings and cancellations after
    // the deadline receive no refund.
    refundCents += itemRefundCents;
  });

  refundCents = Math.min(
    totalCents,
    Math.max(0, refundCents)
  );

  const cancellationFeeCents = totalCents - refundCents;

  return {
    refundAmount: (refundCents / 100).toFixed(2),
    cancellationFeeAmount: (
      cancellationFeeCents / 100
    ).toFixed(2),
  };
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

    const expirationCandidate = await prisma.booking.findFirst({
      where: { id: normalizedBookingId, customerProfileId: currentUser.profile.id },
      select: { status: true, paymentStatus: true, expiresAt: true },
    });

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

    return Response.json({
      success: true,
      data: booking,
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
              ratePlan: {
                select: {
                  cancellationPolicy: true,
                  cancellationDeadlineHours: true,
                  cancellationFeePercent: true,
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
        ? calculateCancellationAmounts(booking, now)
        : {
            refundAmount: "0.00",
            cancellationFeeAmount: "0.00",
          };

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
          refundAmount: amounts.refundAmount,
          cancellationFeeAmount:
            amounts.cancellationFeeAmount,
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

    console.error("Booking cancellation failed:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to cancel booking.",
      },
      { status: 500 }
    );
  }
}
