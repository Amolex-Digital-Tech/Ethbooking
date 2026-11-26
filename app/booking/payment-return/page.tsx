import Link from "next/link";

import { prisma } from "@/lib/prisma/client";
import { syncPendingChapaPayments } from "@/lib/payments/chapa/sync-pending-payments";
import RefreshWhilePending from "./refresh-while-pending";

type Props = {
  searchParams: Promise<{ booking?: string; payment?: string }>;
};

type PaymentState = "success" | "refund_pending" | "failed" | "pending";

function stateFromParam(payment: string | undefined): PaymentState {
  return payment === "success" ? "success" : payment === "refund_pending" ? "refund_pending" : payment === "failed" ? "failed" : "pending";
}

// Guests return here from Chapa, possibly before Chapa's callback or webhook
// has reached us, so ask Chapa directly and show the booking's real state.
async function confirmGuestPayment(reference: string, payment: string | undefined): Promise<PaymentState> {
  const findBooking = () =>
    prisma.booking.findFirst({
      where: { bookingReference: reference, customerProfileId: null },
      select: { id: true, status: true, paymentStatus: true },
    });

  let booking = await findBooking();
  if (!booking) return stateFromParam(payment);

  if (booking.status === "PAYMENT_PENDING" && booking.paymentStatus === "PENDING") {
    try {
      await syncPendingChapaPayments(booking.id);
      // Re-read even if nothing was confirmed here: the webhook may have
      // confirmed it in the meantime.
      booking = (await findBooking()) ?? booking;
    } catch (error) {
      console.error("Chapa payment sync failed on the guest payment return page:", error);
    }
  }

  if (booking.status === "CONFIRMED" && booking.paymentStatus === "PAID") return "success";
  if (booking.paymentStatus === "REFUND_PENDING") return "refund_pending";
  if (booking.status === "PAYMENT_PENDING" && booking.paymentStatus === "PENDING") {
    const latestAttempt = await prisma.paymentTransaction.findFirst({
      where: { bookingId: booking.id, provider: "CHAPA" },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    });
    return latestAttempt?.status === "FAILED" || latestAttempt?.status === "CANCELLED" ? "failed" : "pending";
  }
  return stateFromParam(payment);
}

export default async function GuestPaymentReturnPage({ searchParams }: Props) {
  const params = await searchParams;
  const reference = typeof params.booking === "string" ? params.booking.trim().slice(0, 60) : "";
  const payment = reference ? await confirmGuestPayment(reference, params.payment) : stateFromParam(params.payment);

  return <main className="flex min-h-screen items-center justify-center bg-[#F5F6F2] px-4 py-10 text-[#263B2D]">
    {payment === "pending" && reference && <RefreshWhilePending />}
    <section className="w-full max-w-xl rounded-2xl border border-[#E5E8E0] bg-white p-7 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EDF2E8] text-2xl text-[#426044]">{payment === "success" ? "✓" : "…"}</div>
      <p className="mt-5 text-[11px] font-bold tracking-[.18em] text-[#87917F]">ETHIOPIANBOOKING</p>
      <h1 className="mt-2 text-2xl font-semibold">{payment === "success" ? "Payment confirmed" : payment === "refund_pending" ? "Payment requires review" : payment === "failed" ? "Payment was not completed" : "Confirming your payment…"}</h1>
      {reference && <p className="mt-3 text-sm text-[#667260]">Booking reference: <strong>{reference}</strong></p>}
      <p className="mt-4 text-sm leading-6 text-[#77766F]">{payment === "success" ? "Your payment has been verified. We will send your booking confirmation to the email address provided." : payment === "refund_pending" ? "The payment was received after the booking was no longer active. Our support team will contact you about the next steps." : payment === "failed" ? "Chapa reported that the payment was not completed. No booking confirmation has been issued. Please contact support if you need help." : "Please wait while Chapa and EthiopianBooking verify the transaction. This page updates automatically, and we will email you when the payment status is confirmed. You can contact support if you need assistance."}</p>
      <Link href="/" className="mt-6 inline-flex rounded-xl bg-[#294A35] px-5 py-3 text-sm font-semibold text-white">Return to EthiopianBooking</Link>
    </section>
  </main>;
}
