import Link from "next/link";

type Props = {
  searchParams: Promise<{ booking?: string; payment?: string }>;
};

export default async function GuestPaymentReturnPage({ searchParams }: Props) {
  const params = await searchParams;
  const reference = typeof params.booking === "string" ? params.booking.slice(0, 60) : "";
  const payment = params.payment === "success" ? "success" : params.payment === "refund_pending" ? "refund_pending" : params.payment === "failed" ? "failed" : "pending";

  return <main className="flex min-h-screen items-center justify-center bg-[#F5F6F2] px-4 py-10 text-[#263B2D]">
    <section className="w-full max-w-xl rounded-2xl border border-[#E5E8E0] bg-white p-7 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EDF2E8] text-2xl text-[#426044]">{payment === "success" ? "✓" : "…"}</div>
      <p className="mt-5 text-[11px] font-bold tracking-[.18em] text-[#87917F]">ETHIOPIANBOOKING</p>
      <h1 className="mt-2 text-2xl font-semibold">{payment === "success" ? "Payment confirmed" : payment === "refund_pending" ? "Payment requires review" : payment === "failed" ? "Payment was not completed" : "Payment verification in progress"}</h1>
      {reference && <p className="mt-3 text-sm text-[#667260]">Booking reference: <strong>{reference}</strong></p>}
      <p className="mt-4 text-sm leading-6 text-[#77766F]">{payment === "success" ? "Your payment has been verified. We will send your booking confirmation to the email address provided." : payment === "refund_pending" ? "The payment was received after the booking was no longer active. Our support team will contact you about the next steps." : payment === "failed" ? "Chapa reported that the payment was not completed. No booking confirmation has been issued. Please contact support if you need help." : "Please wait while Chapa and EthiopianBooking verify the transaction. We will email you when the payment status is confirmed. You can contact support if you need assistance."}</p>
      <Link href="/" className="mt-6 inline-flex rounded-xl bg-[#294A35] px-5 py-3 text-sm font-semibold text-white">Return to EthiopianBooking</Link>
    </section>
  </main>;
}
