import { prisma } from "@/lib/prisma/client";
import { completeChapaPayment } from "@/lib/payments/chapa/verify-payment";
import { sendBookingPaymentConfirmationOnce } from "@/lib/email/send-booking-payment-confirmation";

export type ChapaPaymentSyncResult = {
  // A payment for this booking is confirmed.
  confirmed: boolean;
  // Attempts Chapa could not be asked about (for example Chapa was down),
  // so their real status is unknown.
  unverifiedReferences: string[];
};

// The customer's browser can return from Chapa before Chapa's callback or
// webhook reaches us (or those may never arrive). Ask Chapa directly about the
// booking's unresolved payment attempts and record any that have succeeded.
export async function syncPendingChapaPaymentsDetailed(
  bookingId: string
): Promise<ChapaPaymentSyncResult> {
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
  const unverifiedReferences: string[] = [];

  for (const payment of pendingPayments) {
    let result: Awaited<ReturnType<typeof completeChapaPayment>>;
    try {
      result = await completeChapaPayment(payment.transactionReference);
    } catch (error) {
      unverifiedReferences.push(payment.transactionReference);
      console.error(
        `Chapa payment sync failed for transaction ${payment.transactionReference}:`,
        error
      );
      continue;
    }

    if (result.success && result.completed && !result.latePayment) {
      confirmed = true;
      try {
        await sendBookingPaymentConfirmationOnce(bookingId);
      } catch (error) {
        console.error(
          `Payment confirmation email failed for booking ${bookingId}:`,
          error
        );
      }
    }
  }

  return { confirmed, unverifiedReferences };
}

// Returns true when a payment for this booking is confirmed.
export async function syncPendingChapaPayments(bookingId: string): Promise<boolean> {
  return (await syncPendingChapaPaymentsDetailed(bookingId)).confirmed;
}
