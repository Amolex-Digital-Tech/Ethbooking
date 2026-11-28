import { createBooking } from "@/lib/bookings/create-booking";
import { requireAuth } from "@/lib/auth/require-auth";
import { AuthError } from "@/lib/auth/auth-error";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { errorResponse } from "@/lib/http/user-facing-error";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (!user.roles.includes("CUSTOMER")) {
      return Response.json({ success: false, error: "Only customer accounts can place accommodation bookings." }, { status: 403 });
    }
    const body = await request.json();
    const roomItems = Array.isArray(body.roomItems) ? body.roomItems : [];
    const checkInDate = typeof body.checkInDate === "string" ? body.checkInDate : "";
    const checkOutDate = typeof body.checkOutDate === "string" ? body.checkOutDate : "";
    const guests = Number(body.guests);
    const adults = Number(body.adults);
    const children = Number(body.children);
    const childAges = Array.isArray(body.childAges) ? body.childAges : [];

    if (!roomItems.length || !checkInDate || !checkOutDate ||
      !Number.isInteger(guests) || guests < 1 || guests > 30 ||
      !Number.isInteger(adults) || adults < 1 ||
      !Number.isInteger(children) || children < 0 || adults + children !== guests ||
      childAges.length !== children ||
      childAges.some((age: unknown) => !Number.isInteger(age) || Number(age) < 0 || Number(age) > 17)) {
      return Response.json({ success: false, error: "Your room, date or guest selection is invalid. Please review it and try again." }, { status: 400 });
    }

    const profile = user.profile;
    const email = user.authUser.email ?? "";
    if (!email) {
      return Response.json({ success: false, error: "Your account needs a verified email address before booking." }, { status: 400 });
    }

    const guestDetails = Array.from({ length: guests }, (_, index) => ({
      firstName: index < adults ? `Guest ${index + 1}` : `Child ${index - adults + 1}`,
      ageAtBooking: index >= adults ? Number(childAges[index - adults]) : null,
    }));

    const booking = await createBooking({
      customerProfileId: profile.id,
      roomItems,
      checkInDate,
      checkOutDate,
      guests,
      adults,
      children,
      guestDetails,
      customerFirstName: profile.firstName?.trim() || "Guest",
      customerLastName: profile.lastName ?? undefined,
      customerEmail: email,
      customerPhone: profile.phone ?? undefined,
    });

    return Response.json({ success: true, data: booking }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return errorResponse("Booking hold creation failed", error);
  }
}
