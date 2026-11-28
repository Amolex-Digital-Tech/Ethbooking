import { initializeChapaPayment } from "@/lib/payments/chapa/initialize-payment";
import { requireAuth } from "@/lib/auth/require-auth";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { AuthError } from "@/lib/auth/auth-error";
import { errorResponse } from "@/lib/http/user-facing-error";

export async function POST(request: Request) {
  try {
    const currentUser = await requireAuth();

    const body = await request.json();

    const bookingId =
      typeof body.bookingId === "string"
        ? body.bookingId.trim()
        : "";

    if (!bookingId) {
      return Response.json(
        {
          success: false,
          error: "Booking ID is required.",
        },
        { status: 400 }
      );
    }

    const result =
      await initializeChapaPayment(
        bookingId,
        currentUser.profile.id
      );

    return Response.json(result, {
      status: 200,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }

    return errorResponse("Chapa payment initialization error", error);
  }
}
