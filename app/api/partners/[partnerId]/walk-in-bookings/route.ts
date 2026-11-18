import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { AuthError } from "@/lib/auth/auth-error";
import { createWalkInBooking } from "@/lib/bookings/create-walk-in-booking";

const paymentMethods = [
  "CASH",
  "BANK_TRANSFER",
  "POS_CARD",
  "MOBILE_MONEY",
  "OTHER",
] as const;

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ partnerId: string }>;
  }
) {
  try {
    const { partnerId } = await params;

    const { currentUser } =
      await requirePartnerMembership(partnerId, {
  allowedPartnerStatuses: ["ACTIVE"],
        allowStaff: true,
      });

    const body = await request.json();

    const isStaffOnly = currentUser.roles.includes("PARTNER_STAFF") && !currentUser.roles.some((role) => ["PARTNER_OWNER", "PARTNER_MANAGER"].includes(role));
    if (isStaffOnly && (Number(body.amountPaid ?? 0) > 0 || body.paymentMethod || body.paymentReference || body.paymentNote)) {
      return Response.json({ success: false, error: "Partner Staff cannot record or amend payments. Please ask the Partner Owner or Manager." }, { status: 403 });
    }
    const amountPaid = isStaffOnly ? 0 : Number(body.amountPaid ?? 0);

    if (!Number.isFinite(amountPaid) || amountPaid < 0) {
      return Response.json(
        {
          success: false,
          error: "Enter a valid amount paid.",
        },
        { status: 400 }
      );
    }

    const paymentMethod = body.paymentMethod
      ? String(body.paymentMethod)
      : undefined;

    if (
      paymentMethod &&
      !paymentMethods.includes(
        paymentMethod as (typeof paymentMethods)[number]
      )
    ) {
      return Response.json(
        {
          success: false,
          error: "Invalid offline payment method.",
        },
        { status: 400 }
      );
    }

    if (amountPaid > 0 && !paymentMethod) {
      return Response.json(
        {
          success: false,
          error: "Select a payment method.",
        },
        { status: 400 }
      );
    }

    const result = await createWalkInBooking({
      partnerId,
      recordedByProfileId: currentUser.profile.id,

      roomTypeId: String(body.roomTypeId ?? ""),
      ratePlanId: String(body.ratePlanId ?? ""),

      checkInDate: String(body.checkInDate ?? ""),
      checkOutDate: String(body.checkOutDate ?? ""),

      quantity: Number(body.quantity),
      guests: Number(body.guests),

      firstName: String(body.firstName ?? ""),
      lastName: String(body.lastName ?? ""),
      email: String(body.email ?? ""),
      phone: String(body.phone ?? ""),
      specialRequests: String(body.specialRequests ?? ""),

      amountPaid,

      paymentMethod: paymentMethod as
        | (typeof paymentMethods)[number]
        | undefined,

      paymentMethodDetails: String(
        body.paymentMethodDetails ?? ""
      ),

      paymentReference: String(
        body.paymentReference ?? ""
      ),

      paymentNote: String(body.paymentNote ?? ""),
      paidAt: body.paidAt
        ? String(body.paidAt)
        : undefined,
    });

    return Response.json(
      {
        success: true,
        message: "Walk-in booking created successfully.",
        data: isStaffOnly ? { bookingId: result.bookingId, bookingReference: result.bookingReference, status: result.status, paymentStatus: result.paymentStatus, propertyName: result.propertyName, roomName: result.roomName, ratePlanName: result.ratePlanName, nights: result.nights, quantity: result.quantity, guests: result.guests } : result,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }

    console.error("Walk-in booking creation failed:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create walk-in booking.",
      },
      { status: 400 }
    );
  }
}