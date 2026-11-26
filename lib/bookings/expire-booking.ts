import { prisma } from "@/lib/prisma/client";
import { releaseRoomInventory } from "@/lib/availability/release-room-inventory";
import { completeChapaPayment } from "@/lib/payments/chapa/verify-payment";
import { ChapaApiError } from "@/lib/payments/chapa/client";
import {
  isPendingPaymentAbandoned,
  isUnverifiablePaymentAbandoned,
} from "@/lib/payments/payment-attempt-abandonment";

// Mark an unresolved attempt as CANCELLED so it stops holding inventory.
// completeChapaPayment() still accepts CANCELLED -> SUCCESS, so a payment
// that does arrive later is recorded and routed to refund review.
async function abandonPaymentAttempt(transactionReference: string, failureReason: string) {
  await prisma.paymentTransaction.updateMany({
    where: {
      transactionReference,
      status: { in: ["INITIATED", "PENDING"] },
    },
    data: {
      status: "CANCELLED",
      failureReason,
    },
  });
}

export async function expireBooking(bookingId: string) {
  if (!bookingId) {
    throw new Error("Booking ID is required.");
  }

  const candidate = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true, paymentStatus: true, expiresAt: true, bookingReference: true },
  });

  if (
    candidate?.status === "PAYMENT_PENDING" &&
    candidate.paymentStatus === "PENDING" &&
    candidate.expiresAt &&
    candidate.expiresAt <= new Date()
  ) {
    const pendingPayments = await prisma.paymentTransaction.findMany({
      where: {
        bookingId,
        provider: "CHAPA",
        status: { in: ["INITIATED", "PENDING"] },
      },
      select: { transactionReference: true, createdAt: true },
    });

    const now = new Date();

    for (const payment of pendingPayments) {
      try {
        const verification = await completeChapaPayment(payment.transactionReference);
        const status = verification.status?.toLowerCase() ?? "";
        if (verification.completed || ("alreadyCompleted" in verification && verification.alreadyCompleted) || verification.latePayment || status === "success") {
          return {
            success: true,
            expired: false,
            reason: "Chapa verified a successful payment. The booking remains confirmed.",
            bookingId: candidate.id,
            bookingReference: candidate.bookingReference,
          };
        }
        if (status !== "failed" && status !== "cancelled") {
          if (isPendingPaymentAbandoned(payment.createdAt, now)) {
            await abandonPaymentAttempt(
              payment.transactionReference,
              `Chapa still reported this payment as ${status || "pending"} after the booking hold expired. Treated as abandoned.`
            );
            continue;
          }
          return {
            success: true,
            expired: false,
            reason: "Chapa has not returned a final payment result. Inventory remains held while verification is retried.",
            bookingId: candidate.id,
            bookingReference: candidate.bookingReference,
            paymentStatus: status || "PENDING",
          };
        }
      } catch (verificationError) {
        if (verificationError instanceof ChapaApiError) {
          const detail = typeof verificationError.responseData === "string"
            ? verificationError.responseData
            : JSON.stringify(verificationError.responseData ?? {});
          const definitelyMissing = verificationError.statusCode === 404 ||
            (verificationError.statusCode === 400 && /not found|invalid.*(tx_ref|reference)|unknown transaction/i.test(detail));
          if (definitelyMissing) {
            await prisma.paymentTransaction.updateMany({
              where: {
                transactionReference: payment.transactionReference,
                status: { in: ["INITIATED", "PENDING"] },
              },
              data: {
                status: "FAILED",
                failureReason: "Chapa verification confirmed that this transaction reference does not exist.",
              },
            });
            continue;
          }
          // Any other 4xx means Chapa answered and the payment is not
          // successful (for example "payment not paid yet"). Treat it
          // like a pending result.
          const providerSaysNotPaid =
            verificationError.statusCode >= 400 && verificationError.statusCode < 500;
          if (providerSaysNotPaid && isPendingPaymentAbandoned(payment.createdAt, now)) {
            await abandonPaymentAttempt(
              payment.transactionReference,
              `Chapa verification returned HTTP ${verificationError.statusCode} after the booking hold expired. Treated as abandoned.`
            );
            continue;
          }
        }
        if (isUnverifiablePaymentAbandoned(payment.createdAt, now)) {
          console.error("Chapa verification has failed for over 24 hours; releasing the hold:", verificationError);
          await abandonPaymentAttempt(
            payment.transactionReference,
            "Chapa verification could not be completed for over 24 hours after the booking hold expired. Treated as abandoned."
          );
          continue;
        }
        console.error("Chapa expiry verification is temporarily unavailable:", verificationError);
        return {
          success: true,
          expired: false,
          reason: "Chapa could not confirm the payment result. Inventory remains held for a later verification attempt.",
          bookingId: candidate.id,
          bookingReference: candidate.bookingReference,
        };
      }
    }
  }

  return prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.findUnique({
      where: { id: bookingId },
      include: { items: true },
    });

    if (!booking) {
      throw new Error("Booking not found.");
    }

    if (
      booking.status !== "PAYMENT_PENDING" ||
      booking.paymentStatus !== "PENDING"
    ) {
      return {
        success: true,
        expired: false,
        reason: "Booking is no longer pending payment.",
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
      };
    }

    const now = new Date();

    if (!booking.expiresAt || booking.expiresAt > now) {
      return {
        success: true,
        expired: false,
        reason: "Booking has not expired yet.",
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        expiresAt: booking.expiresAt,
      };
    }

    // A Chapa transaction that is still INITIATED or PENDING may have
    // succeeded even if its callback has not reached us yet. Keep the
    // inventory hold in place until Chapa verification resolves it.
    const unresolvedPayment = await transaction.paymentTransaction.findFirst({
      where: {
        bookingId: booking.id,
        provider: "CHAPA",
        status: { in: ["INITIATED", "PENDING"] },
      },
      select: { id: true, status: true },
    });

    if (unresolvedPayment) {
      return {
        success: true,
        expired: false,
        reason: "A Chapa payment is still being verified. Inventory remains held.",
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        paymentTransactionStatus: unresolvedPayment.status,
      };
    }

    const claimed = await transaction.booking.updateMany({
      where: {
        id: booking.id,
        status: "PAYMENT_PENDING",
        paymentStatus: "PENDING",
        expiresAt: { lte: now },
      },
      data: {
        status: "EXPIRED",
        paymentStatus: "FAILED",
      },
    });

    if (claimed.count !== 1) {
      return {
        success: true,
        expired: false,
        reason: "Booking was already processed.",
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
      };
    }

    await releaseRoomInventory(
      transaction,
      booking.checkInDate,
      booking.checkOutDate,
      booking.items.map((item) => ({
        roomTypeId: item.roomTypeId,
        quantity: item.quantity,
      }))
    );

    return {
      success: true,
      expired: true,
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      status: "EXPIRED",
      paymentStatus: "FAILED",
    };
  });
}