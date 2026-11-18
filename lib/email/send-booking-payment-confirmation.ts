import { prisma } from "@/lib/prisma/client";
import { sendResendEmail } from "@/lib/email/resend";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

export async function sendBookingPaymentConfirmationOnce(bookingId: string) {
  let claimed = false;

  try {
    await prisma.bookingEmailNotification.create({
      data: {
        bookingId,
        notificationType: "PAYMENT_CONFIRMED",
        recipientEmail: "",
        status: "PROCESSING",
      },
    });
    claimed = true;
  } catch (error) {
    if ((error as { code?: string })?.code !== "P2002") throw error;
    const retry = await prisma.bookingEmailNotification.updateMany({
      where: {
        bookingId,
        notificationType: "PAYMENT_CONFIRMED",
        status: "FAILED",
      },
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
        status: true,
        paymentStatus: true,
        customerFirstName: true,
        customerEmail: true,
        totalAmount: true,
        currency: true,
        checkInDate: true,
        checkOutDate: true,
        items: {
          select: {
            roomName: true,
            quantity: true,
            roomType: { select: { property: { select: { name: true } } } },
          },
        },
      },
    });

    if (!booking || booking.paymentStatus !== "PAID" || booking.status !== "CONFIRMED") {
      await prisma.bookingEmailNotification.updateMany({
        where: { bookingId, notificationType: "PAYMENT_CONFIRMED", status: "PROCESSING" },
        data: { status: "FAILED", lastError: "Booking is not in a confirmed and paid state." },
      });
      return { sent: false, skipped: true };
    }

    const propertyName = booking.items[0]?.roomType.property.name ?? "your selected property";
    const safeName = escapeHtml(booking.customerFirstName);
    const safeReference = escapeHtml(booking.bookingReference);
    const safeProperty = escapeHtml(propertyName);
    const checkIn = booking.checkInDate.toISOString().slice(0, 10);
    const checkOut = booking.checkOutDate.toISOString().slice(0, 10);
    const email = await sendResendEmail({
      to: booking.customerEmail,
      idempotencyKey: `booking-${bookingId}-payment-confirmed`,
      subject: `Payment confirmed — EthiopianBooking ${booking.bookingReference}`,
      text: `Hello ${booking.customerFirstName}, your payment for booking ${booking.bookingReference} has been confirmed. Property: ${propertyName}. Stay: ${checkIn} to ${checkOut}. Paid: ${booking.currency} ${booking.totalAmount.toString()}.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#263b2d"><h2>Your payment is confirmed</h2><p>Hello ${safeName},</p><p>We have successfully verified your payment and confirmed your reservation.</p><p><strong>Booking reference:</strong> ${safeReference}<br/><strong>Property:</strong> ${safeProperty}<br/><strong>Check-in:</strong> ${checkIn}<br/><strong>Check-out:</strong> ${checkOut}<br/><strong>Paid:</strong> ${booking.currency} ${booking.totalAmount.toString()}</p><p>Thank you for booking with EthiopianBooking.</p></div>`,
    });

    await prisma.bookingEmailNotification.updateMany({
      where: { bookingId, notificationType: "PAYMENT_CONFIRMED", status: "PROCESSING" },
      data: email.sent
        ? { status: "SENT", recipientEmail: booking.customerEmail, providerMessageId: email.id, sentAt: new Date(), lastError: null }
        : { status: "FAILED", recipientEmail: booking.customerEmail, lastError: email.reason ?? "Email could not be sent." },
    });
    return email;
  } catch (error) {
    await prisma.bookingEmailNotification.updateMany({
      where: { bookingId, notificationType: "PAYMENT_CONFIRMED", status: "PROCESSING" },
      data: { status: "FAILED", lastError: error instanceof Error ? error.message.slice(0, 1000) : "Email delivery failed." },
    });
    console.error("Booking payment confirmation email failed:", error);
    return { sent: false, reason: "exception" as const };
  }
}
