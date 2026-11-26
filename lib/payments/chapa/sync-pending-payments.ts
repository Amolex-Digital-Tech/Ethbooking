import { prisma } from "@/lib/prisma/client";
import { completeChapaPayment } from "@/lib/payments/chapa/verify-payment";
import { sendBookingPaymentConfirmationOnce } from "@/lib/email/send-booking-payment-confirmation";

// The customer's browser can return from Chapa before Chapa's callback or
// webhook reaches us (or those may never arrive). Ask Chapa directly about the
// booking's unresolved payment attempts and record any that have succeeded.
//
// Returns true when a payment for this booking is confirmed.
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

  let confirmed = false;

  for (const payment of pendingPayments) {
    try {
      const result = await completeChapaPayment(payment.transactionReference);

      if (result.success && result.completed && !result.latePayment) {
        confirmed = true;
        await sendBookingPaymentConfirmationOnce(bookingId);
      }
    } catch (error) {
      console.error(
        `Chapa payment sync failed for transaction ${payment.transactionReference}:`,
        error
      );
    }
  }

  return confirmed;
}
