
import { completeChapaPayment } from "@/lib/payments/chapa/verify-payment";
import { sendBookingPaymentConfirmationOnce } from "@/lib/email/send-booking-payment-confirmation";
import { sendBookingPaymentFailureOnce } from "@/lib/email/send-booking-payment-failure";
import { prisma } from "@/lib/prisma/client";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const transactionReference = (
    url.searchParams.get("trx_ref") ??
    url.searchParams.get("tx_ref") ??
    ""
  ).trim();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");

  if (!siteUrl) {
    return Response.json(
      {
        success: false,
        error: "Site URL is not configured.",
      },
      { status: 500 }
    );
  }

  if (!transactionReference) {
    return Response.json(
      {
        success: false,
        error:
          "Chapa callback did not include a transaction reference.",
      },
      { status: 400 }
    );
  }

  try {
    const result =
      await completeChapaPayment(transactionReference);

    if (result.success && result.completed && !result.latePayment && result.bookingId) {
      await sendBookingPaymentConfirmationOnce(result.bookingId);
    } else if (!result.success && result.bookingId && ["failed", "cancelled"].includes(String(result.status).toLowerCase())) {
      await sendBookingPaymentFailureOnce(result.bookingId, String(result.status));
    }

    const bookingId = result.bookingId;

    if (!bookingId) {
      return Response.json(
        {
          success: false,
          error:
            "The booking could not be identified for this transaction.",
        },
        { status: 404 }
      );
    }

    const paymentStatus = result.latePayment
      ? "refund_pending"
      : result.success && result.completed
        ? "success"
        : ["failed", "cancelled"].includes(String(result.status).toLowerCase())
          ? "failed"
          : "pending";

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { customerProfileId: true, bookingReference: true },
    });
    if (!booking) {
      return Response.json({ success: false, error: "Booking could not be found." }, { status: 404 });
    }

    const destination = booking.customerProfileId
      ? `/dashboard/bookings/${encodeURIComponent(bookingId)}?payment=${paymentStatus}`
      : `/booking/payment-return?booking=${encodeURIComponent(booking.bookingReference)}&payment=${paymentStatus}`;

    return Response.redirect(new URL(destination, siteUrl), 303);
  } catch (error) {
    console.error(
      "Chapa callback processing error:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          "Payment verification failed. Please check your booking status.",
      },
      { status: 500 }
    );
  }
}
