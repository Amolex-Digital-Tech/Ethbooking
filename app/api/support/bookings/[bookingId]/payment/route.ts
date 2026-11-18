import { initializeChapaPayment } from "@/lib/payments/chapa/initialize-payment";
import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { sendResendEmail } from "@/lib/email/resend";
function escapeHtml(value: string) {
  return value.replace(/[&<>"\']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"' : "&quot;", "\'": "&#39;",
  })[character] ?? character);
}

export async function POST(_request: Request, context: { params: Promise<{ bookingId: string }> }) {
  try {
    const agent = await requireRole("SUPPORT_AGENT");
    const { bookingId } = await context.params;
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, customerProfileId: null },
      select: { id: true, bookingReference: true, customerFirstName: true, customerEmail: true, totalAmount: true, currency: true, status: true, paymentStatus: true },
    });
    if (!booking) return Response.json({ success: false, error: "Guest booking not found." }, { status: 404 });
    if (booking.status !== "PAYMENT_PENDING" || booking.paymentStatus !== "PENDING") {
      return Response.json({ success: false, error: "This booking is no longer awaiting payment." }, { status: 409 });
    }

    const payment = await initializeChapaPayment(booking.id, null);
    if (!payment.checkoutUrl) {
      return Response.json(
        { success: false, error: "Chapa did not return a valid checkout URL. Please try again." },
        { status: 502 }
      );
    }

    const safeName = escapeHtml(booking.customerFirstName);
    const safeReference = escapeHtml(booking.bookingReference);
    const safeUrl = escapeHtml(payment.checkoutUrl);
    const email = await sendResendEmail({
      to: booking.customerEmail,
      subject: `Payment required for EthiopianBooking reservation ${booking.bookingReference}`,
      text: `Hello ${booking.customerFirstName}, complete payment for booking ${booking.bookingReference} using this secure Chapa link: ${payment.checkoutUrl}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#263b2d"><h2>Complete your EthiopianBooking payment</h2><p>Hello ${safeName},</p><p>Booking reference: <strong>${safeReference}</strong></p><p>Amount due: <strong>${booking.currency} ${booking.totalAmount.toString()}</strong></p><p><a href="${safeUrl}" style="display:inline-block;background:#294a35;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none">Pay securely with Chapa</a></p></div>`,
    });

    await prisma.auditLog.create({
      data: {
        actorProfileId: agent.profile.id,
        actorRole: "SUPPORT_AGENT",
        action: "SUPPORT_BOOKING_PAYMENT_LINK_REISSUED",
        entityType: "BOOKING",
        entityId: booking.id,
        description: `Support Agent reissued the Chapa payment link for booking ${booking.bookingReference}.`,
        metadata: { bookingReference: booking.bookingReference, transactionReference: payment.transactionReference },
      },
    });

    return Response.json({ success: true, data: { checkoutUrl: payment.checkoutUrl, transactionReference: payment.transactionReference, emailSent: email.sent } });
  } catch (error) {
    return handleAuthError(error);
  }
}
