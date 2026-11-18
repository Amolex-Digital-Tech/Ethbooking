import { createBooking } from "@/lib/bookings/create-booking";
import { requireAuth } from "@/lib/auth/require-auth";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { AuthError } from "@/lib/auth/auth-error";
import { prisma } from "@/lib/prisma/client";

export async function POST(request: Request) {
  try {
    const currentUser = await requireAuth();
    if (!currentUser.roles.includes("CUSTOMER")) {
      return Response.json({ success: false, error: "Only customer accounts can create accommodation bookings." }, { status: 403 });
    }
    const body = await request.json();
    const checkInDate = typeof body.checkInDate === "string" ? body.checkInDate.trim() : "";
    const checkOutDate = typeof body.checkOutDate === "string" ? body.checkOutDate.trim() : "";
    const guests = body.guests;
    const adults = body.adults;
    const children = body.children;
    const customerFirstName = typeof body.customerFirstName === "string" ? body.customerFirstName.trim() : "";
    const customerLastName = typeof body.customerLastName === "string" ? body.customerLastName.trim() : undefined;
    const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
    const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : undefined;
    const customerCountry = typeof body.customerCountry === "string" ? body.customerCountry.trim() : undefined;
    const specialRequests = typeof body.specialRequests === "string" ? body.specialRequests.trim() : undefined;

    const roomItems = Array.isArray(body.roomItems)
      ? body.roomItems.map((item: { roomTypeId?: unknown; ratePlanId?: unknown; quantity?: unknown }) => ({
          roomTypeId: typeof item.roomTypeId === "string" ? item.roomTypeId.trim() : "",
          ratePlanId: typeof item.ratePlanId === "string" ? item.ratePlanId.trim() : "",
          quantity: typeof item.quantity === "number" ? item.quantity : Number.NaN,
        }))
      : undefined;

    const roomTypeId = typeof body.roomTypeId === "string" ? body.roomTypeId.trim() : "";
    const ratePlanId = typeof body.ratePlanId === "string" ? body.ratePlanId.trim() : "";
    const quantity = body.quantity;
    const guestDetails = Array.isArray(body.guestDetails) ? body.guestDetails : [];

    if (!checkInDate || !checkOutDate) return Response.json({ success: false, error: "Check-in and check-out dates are required." }, { status: 400 });
    if (!Number.isInteger(guests) || guests < 1 || guests > 30) return Response.json({ success: false, error: "Guests must be between 1 and 30." }, { status: 400 });
    if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0 || adults + children !== guests) {
      return Response.json({ success: false, error: "Adult and child counts must match the total guest count." }, { status: 400 });
    }
    if (!customerFirstName || !customerEmail) return Response.json({ success: false, error: "Customer first name and email are required." }, { status: 400 });
    if (!customerCountry || customerCountry.length > 80) return Response.json({ success: false, error: "A valid country of residence is required." }, { status: 400 });
    if (children > 0 && guestDetails.slice(adults, adults + children).some((guest: { ageAtBooking?: unknown }) => !Number.isInteger(guest.ageAtBooking) || Number(guest.ageAtBooking) < 0 || Number(guest.ageAtBooking) > 17)) {
      return Response.json({ success: false, error: "Please provide the age of every child." }, { status: 400 });
    }

    const normalizedGuestDetails = guestDetails.map((guest: {
      firstName?: unknown; lastName?: unknown; email?: unknown; phone?: unknown; countryCode?: unknown; ageAtBooking?: unknown;
    }) => ({
      firstName: typeof guest?.firstName === "string" ? guest.firstName.trim() : "",
      lastName: typeof guest?.lastName === "string" ? guest.lastName.trim() : undefined,
      email: typeof guest?.email === "string" ? guest.email.trim() : undefined,
      phone: typeof guest?.phone === "string" ? guest.phone.trim() : undefined,
      countryCode: typeof guest?.countryCode === "string" ? guest.countryCode.trim() : undefined,
      ageAtBooking: typeof guest?.ageAtBooking === "number" && Number.isInteger(guest.ageAtBooking) && guest.ageAtBooking >= 0 && guest.ageAtBooking <= 17 ? guest.ageAtBooking : null,
    }));

    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    if (bookingId) {
      if (normalizedGuestDetails.length !== guests || normalizedGuestDetails.some((guest: { firstName: string }) => !guest.firstName)) {
        return Response.json({ success: false, error: "Enter a first name for every guest." }, { status: 400 });
      }
      if (normalizedGuestDetails.slice(adults).some((guest: { ageAtBooking: number | null }) => guest.ageAtBooking === null)) {
        return Response.json({ success: false, error: "Enter a valid age for every child." }, { status: 400 });
      }
      const result = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({
          where: {
            id: bookingId,
            customerProfileId: currentUser.profile.id,
            status: "PAYMENT_PENDING",
            paymentStatus: "PENDING",
            expiresAt: { gt: new Date() },
          },
          select: {
            id: true,
            guestCount: true,
            checkInDate: true,
            checkOutDate: true,
            items: { select: { roomTypeId: true, ratePlanId: true, quantity: true } },
          },
        });
        if (!booking) throw new Error("Your 15-minute room hold has expired. Return to the property and check availability again.");
        if (
          booking.guestCount !== guests ||
          booking.checkInDate.toISOString().slice(0, 10) !== checkInDate ||
          booking.checkOutDate.toISOString().slice(0, 10) !== checkOutDate
        ) {
          throw new Error("Your dates or guest count no longer match the held booking. Return to the property and start again.");
        }
        if (roomItems?.length) {
          const normalize = (items: { roomTypeId: string; ratePlanId: string; quantity: number }[]) =>
            items.map((item) => `${item.roomTypeId}:${item.ratePlanId}:${item.quantity}`).sort().join("|");
          const heldItems = booking.items.map((item) => ({
            roomTypeId: item.roomTypeId,
            ratePlanId: item.ratePlanId,
            quantity: item.quantity,
          }));
          if (normalize(heldItems) !== normalize(roomItems)) {
            throw new Error("Your selected rooms no longer match the active inventory hold. Return to the property and start again.");
          }
        }
        const paymentAttempt = await tx.paymentTransaction.findFirst({
          where: { bookingId, status: { in: ["INITIATED", "PENDING", "SUCCESS"] } },
          select: { id: true },
        });
        if (paymentAttempt) throw new Error("Payment has already been started for this booking. Refresh your booking details before continuing.");
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            customerFirstName,
            customerLastName: customerLastName || null,
            customerEmail,
            customerPhone: customerPhone || null,
            customerCountry: customerCountry || null,
            specialRequests: specialRequests || null,
          },
        });
        await tx.bookingGuest.deleteMany({ where: { bookingId } });
        await tx.bookingGuest.createMany({
          data: normalizedGuestDetails.map((guest: {
            firstName: string; lastName?: string; email?: string; phone?: string; countryCode?: string; ageAtBooking?: number | null;
          }, index: number) => ({
            bookingId,
            guestType: index === 0 ? "PRIMARY" : "ADDITIONAL",
            firstName: guest.firstName,
            lastName: guest.lastName || null,
            email: guest.email || null,
            phone: guest.phone || null,
            countryCode: guest.countryCode || null,
            ageAtBooking: guest.ageAtBooking ?? null,
          })),
        });
        return { bookingId: booking.id };
      });
      return Response.json({ success: true, data: result }, { status: 200 });
    }

    const result = await createBooking({
      customerProfileId: currentUser.profile.id,
      roomItems,
      roomTypeId: roomItems?.length ? undefined : roomTypeId,
      ratePlanId: roomItems?.length ? undefined : ratePlanId,
      quantity: roomItems?.length ? undefined : quantity,
      checkInDate, checkOutDate, guests, adults, children,
      guestDetails: normalizedGuestDetails,
      customerFirstName, customerLastName, customerEmail, customerPhone, customerCountry, specialRequests,
    });
    return Response.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    console.error("Booking creation failed:", error);
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Unable to create booking." }, { status: 400 });
  }
}
