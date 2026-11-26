import { prisma } from "@/lib/prisma/client";
import { completeChapaPayment } from "@/lib/payments/chapa/verify-payment";
import { sendBookingPaymentConfirmationOnce } from "@/lib/email/send-booking-payment-confirmation";

// Asks Chapa about a booking's unresolved payment attempts and records any
// that were paid.
//
// Normally Chapa tells us through the callback and webhook. If those never
// arrive (wrong URL, network problem), the booking would stay unpaid, no
// receipt would be sent, and a retry would reopen the already-paid Chapa
// checkout ("Session expired / Payment already paid"). Calling this when the
// customer returns or retries closes that gap.
//
// Returns true when a payment was confirmed for this booking.
export async function syncPendingChapaPayments(bookingId: string): Promise<boolean> {
  const pendingPayments = await prisma.paymentTransaction.findMany({
    where: {
      bookingId,
      provider: "CHAPA",
      status: { in: ["INITIATED", "PENDING"] },
    },
    select: { transactionReference: true },
    orderBy: { createdAt: "desc" },
  });

  let paid = false;

  for (const payment of pendingPayments) {
    try {
      const result = await completeChapaPayment(payment.transactionReference);
      if (result.success && result.completed) {
        paid = true;
        if (!result.latePayment && result.bookingId) {
          await sendBookingPaymentConfirmationOnce(result.bookingId);
        }
      }
    } catch (error) {
      // Not paid yet, or Chapa unreachable: leave it for the callback,
      // webhook or expiry job.
      console.warn("Chapa payment sync skipped:", error instanceof Error ? error.message : error);
    }
  }

  return paid;
}
