import { AuthError } from "@/lib/auth/auth-error";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { requireAuth } from "@/lib/auth/require-auth";
import { cancelBooking } from "@/lib/bookings/cancel-booking";

type RouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const currentUser = await requireAuth();

    const { bookingId } = await context.params;

    const normalizedBookingId =
      bookingId.trim();

    if (!normalizedBookingId) {
      return Response.json(
        {
          success: false,
          error: "Booking ID is required.",
        },
        { status: 400 }
      );
    }

    let body: unknown = {};

try {
  body = await request.json();
} catch {
  body = {};
}

const cancellationReason =
  typeof body === "object" &&
  body !== null &&
  "cancellationReason" in body &&
  typeof body.cancellationReason === "string"
    ? body.cancellationReason.trim()
    : undefined;

    const result = await cancelBooking(
  normalizedBookingId,
  currentUser.profile.id,
  cancellationReason
);

    return Response.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }

    if (
      error instanceof Error &&
      error.message === "Booking not found."
    ) {
      return Response.json(
        {
          success: false,
          error: "Booking not found.",
        },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "This booking cannot be cancelled at this stage."
    ) {
      return Response.json(
        {
          success: false,
          error: error.message,
        },
        { status: 409 }
      );
    }

    console.error(
      "Booking cancellation failed:",
      error
    );

    return Response.json(
      {
        success: false,
        error: "Unable to cancel booking.",
      },
      { status: 500 }
    );
  }
}