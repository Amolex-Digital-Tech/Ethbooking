import { prisma } from "@/lib/prisma/client";
import { sendResendEmail } from "@/lib/email/resend";
function escapeHtml(value: string) {
  return value.replace(/[&<>"\']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"' : "&quot;", "\'": "&#39;",
  })[character] ?? character);
}

export async function sendBookingPaymentFailureOnce(bookingId: string, providerStatus: string) {
  let claimed = false;
  try {
    await prisma.bookingEmailNotification.create({
      data: {
        bookingId,
        notificationType: "PAYMENT_FAILED",
        recipientEmail: "",
        status: "PROCESSING",
      },
    });
    claimed = true;
  } catch (error) {
    if ((error as { code?: string })?.code !== "P2002") throw error;
    const retry = await prisma.bookingEmailNotification.updateMany({
      where: { bookingId, notificationType: "PAYMENT_FAILED", status: "FAILED" },
      data: { status: "PROCESSING", lastError: null },
    });
    claimed = retry.count === 1;
  }
  if (!claimed) return { sent: false, skipped: true };

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        bookingReference: true,
        customerFirstName: true,
        customerEmail: true,
        totalAmount: true,
        currency: true,
      },
    });
    if (!booking) throw new Error("Booking not found for payment failure notification.");

    const safeName = escapeHtml(booking.customerFirstName);
    const safeReference = escapeHtml(booking.bookingReference);
    const safeStatus = escapeHtml(providerStatus);
    const result = await sendResendEmail({
      to: booking.customerEmail,
      idempotencyKey: `booking-${bookingId}-payment-failed`,
      subject: `Payment was not completed — EthiopianBooking ${booking.bookingReference}`,
      text: `Hello ${booking.customerFirstName}, the Chapa payment for booking ${booking.bookingReference} was ${providerStatus}. No successful payment has been confirmed. Please contact EthiopianBooking support if you need help.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#263b2d"><h2>Payment was not completed</h2><p>Hello ${safeName},</p><p>We could not confirm a successful payment for booking <strong>${safeReference}</strong>.</p><p>Payment status: <strong>${safeStatus}</strong><br/>Amount: <strong>${booking.currency} ${booking.totalAmount.toString()}</strong></p><p>Please contact EthiopianBooking support if you need help completing your reservation.</p></div>`,
    });

    await prisma.bookingEmailNotification.updateMany({
      where: { bookingId, notificationType: "PAYMENT_FAILED", status: "PROCESSING" },
      data: result.sent
        ? { status: "SENT", recipientEmail: booking.customerEmail, providerMessageId: result.id, sentAt: new Date(), lastError: null }
        : { status: "FAILED", recipientEmail: booking.customerEmail, lastError: result.reason ?? "Email could not be sent." },
    });
    return result;
  } catch (error) {
    await prisma.bookingEmailNotification.updateMany({
      where: { bookingId, notificationType: "PAYMENT_FAILED", status: "PROCESSING" },
      data: { status: "FAILED", lastError: error instanceof Error ? error.message.slice(0, 1000) : "Email delivery failed." },
    });
    console.error("Booking payment failure email failed:", error);
    return { sent: false, reason: "exception" as const };
  }
}
