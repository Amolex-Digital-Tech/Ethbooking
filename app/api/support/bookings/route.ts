import { createBooking } from "@/lib/bookings/create-booking";
import { initializeChapaPayment } from "@/lib/payments/chapa/initialize-payment";
import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { AuthError } from "@/lib/auth/auth-error";
import { prisma } from "@/lib/prisma/client";
import { sendResendEmail } from "@/lib/email/resend";

// Support bookings send the guest a payment link by email, so the guest
// needs longer than the 15-minute online checkout hold to pay.
const SUPPORT_BOOKING_HOLD_MINUTES = 24 * 60;

function htmlEscape(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

export async function POST(request: Request) {
  try {
    const agent = await requireRole("SUPPORT_AGENT");
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ success: false, error: "Invalid booking request." }, { status: 400 });
    }

    const checkInDate = typeof body.checkInDate === "string" ? body.checkInDate.trim() : "";
    const checkOutDate = typeof body.checkOutDate === "string" ? body.checkOutDate.trim() : "";
    const customerFirstName = typeof body.customerFirstName === "string" ? body.customerFirstName.trim() : "";
    const customerLastName = typeof body.customerLastName === "string" ? body.customerLastName.trim() : "";
    const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : "";
    const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
    const customerCountry = typeof body.customerCountry === "string" ? body.customerCountry.trim() : "";
    const adults = body.adults;
    const children = body.children;
    const guests = adults + children;
    const roomItems = Array.isArray(body.roomItems)
      ? body.roomItems.map((item: { roomTypeId?: unknown; ratePlanId?: unknown; quantity?: unknown }) => ({
          roomTypeId: typeof item.roomTypeId === "string" ? item.roomTypeId.trim() : "",
          ratePlanId: typeof item.ratePlanId === "string" ? item.ratePlanId.trim() : "",
          quantity: typeof item.quantity === "number" ? item.quantity : Number.NaN,
        }))
      : [];

    if (!checkInDate || !checkOutDate || !customerFirstName || !customerEmail || !customerCountry) {
      return Response.json({ success: false, error: "Guest name, email, country, check-in and check-out dates are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || customerEmail.length > 254) {
      return Response.json({ success: false, error: "Enter a valid guest email address." }, { status: 400 });
    }
    if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0 || adults + children > 30) {
      return Response.json({ success: false, error: "Enter a valid number of adults and children." }, { status: 400 });
    }
    if (!roomItems.length || roomItems.length > 20 || roomItems.some((item: { roomTypeId: string; ratePlanId: string; quantity: number }) =>
      !item.roomTypeId || !item.ratePlanId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 30
    )) {
      return Response.json({ success: false, error: "Select at least one valid room and rate plan." }, { status: 400 });
    }
    if (!Array.isArray(body.guestDetails) || body.guestDetails.length !== guests) {
      return Response.json({ success: false, error: "Guest details must be provided for every adult and child." }, { status: 400 });
    }

    const guestDetails = body.guestDetails.map((guest: {
      firstName?: unknown; lastName?: unknown; email?: unknown; phone?: unknown; countryCode?: unknown; ageAtBooking?: unknown;
    }) => ({
      firstName: typeof guest.firstName === "string" ? guest.firstName.trim() : "",
      lastName: typeof guest.lastName === "string" ? guest.lastName.trim() : undefined,
      email: typeof guest.email === "string" ? guest.email.trim() : undefined,
      phone: typeof guest.phone === "string" ? guest.phone.trim() : undefined,
      countryCode: typeof guest.countryCode === "string" ? guest.countryCode.trim() : undefined,
      ageAtBooking: typeof guest.ageAtBooking === "number" && Number.isInteger(guest.ageAtBooking) && guest.ageAtBooking >= 0 && guest.ageAtBooking <= 17
        ? guest.ageAtBooking : null,
    }));
    if (guestDetails.some((guest: { firstName: string }) => !guest.firstName)) {
      return Response.json({ success: false, error: "Enter a first name for every guest." }, { status: 400 });
    }
    if (guestDetails.slice(adults).some((guest: { ageAtBooking: number | null }) => guest.ageAtBooking === null)) {
      return Response.json({ success: false, error: "Enter a valid age for every child." }, { status: 400 });
    }

    const result = await createBooking({
      customerProfileId: null,
      holdMinutes: SUPPORT_BOOKING_HOLD_MINUTES,
      roomItems,
      checkInDate,
      checkOutDate,
      guests,
      adults,
      children,
      guestDetails,
      customerFirstName,
      customerLastName: customerLastName || undefined,
      customerEmail,
      customerPhone: customerPhone || undefined,
      customerCountry,
      specialRequests: typeof body.specialRequests === "string" ? body.specialRequests.trim() : undefined,
    });

    try {
      await prisma.auditLog.create({
        data: {
          actorProfileId: agent.profile.id,
          actorRole: "SUPPORT_AGENT",
          action: "SUPPORT_BOOKING_CREATED",
          entityType: "BOOKING",
          entityId: result.bookingId,
          description: `Support Agent created booking ${result.bookingReference} for ${customerEmail}.`,
          metadata: { bookingReference: result.bookingReference, customerEmail },
        },
      });
    } catch (auditError) {
      console.error("Unable to record support booking audit event:", auditError);
    }

    let payment: Awaited<ReturnType<typeof initializeChapaPayment>> | null = null;
    let paymentError: string | null = null;
    try {
      payment = await initializeChapaPayment(result.bookingId, null);
    } catch (error) {
      paymentError = error instanceof Error ? error.message : "Unable to initialize Chapa payment.";
      console.error("Support booking Chapa initialization failed:", error);
    }

    let paymentEmailSent = false;
    if (payment?.checkoutUrl) {
      const safeName = htmlEscape(customerFirstName);
      const safeReference = htmlEscape(result.bookingReference);
      const safeProperty = htmlEscape(result.property.name);
      const safeUrl = htmlEscape(payment.checkoutUrl);
      const emailResult = await sendResendEmail({
        to: customerEmail,
        subject: `Payment required for EthiopianBooking reservation ${result.bookingReference}`,
        text: `Hello ${customerFirstName}, your reservation ${result.bookingReference} at ${result.property.name} has been created. Amount due: ${result.currency} ${result.totalAmount}. Complete payment within 24 hours to keep your rooms, using this secure Chapa link: ${payment.checkoutUrl}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#263b2d"><h2>Complete your EthiopianBooking payment</h2><p>Hello ${safeName},</p><p>Your reservation at <strong>${safeProperty}</strong> has been created.</p><p>Booking reference: <strong>${safeReference}</strong></p><p>Amount due: <strong>${result.currency} ${result.totalAmount}</strong></p><p><a href="${safeUrl}" style="display:inline-block;background:#294a35;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none">Pay securely with Chapa</a></p><p>Please complete payment within 24 hours. After that the rooms are released.</p><p>If you did not request this reservation, please contact EthiopianBooking support.</p></div>`,
      });
      paymentEmailSent = emailResult.sent;
    }

    return Response.json({
      success: true,
      data: {
        ...result,
        payment: payment ? {
          transactionReference: payment.transactionReference,
          checkoutUrl: payment.checkoutUrl,
        } : null,
        paymentError,
        paymentEmailSent,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    console.error("Support booking creation failed:", error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to create the guest booking." },
      { status: 400 }
    );
  }
}
