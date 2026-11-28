import { prisma } from "@/lib/prisma/client";
import { chapaRequest, ChapaApiError, describeChapaError } from "@/lib/payments/chapa/client";
import { syncPendingChapaPaymentsDetailed } from "@/lib/payments/chapa/sync-pending-payments";
import { UserFacingError } from "@/lib/http/user-facing-error";

const ALREADY_PAID_MESSAGE =
  "This booking has already been paid. Refresh the page to see your confirmed booking.";

// Chapa checkout sessions expire, so an older link only shows the customer
// "Session expired". Older attempts are replaced with a fresh checkout.
export const CHECKOUT_REUSE_WINDOW_MS = 30 * 60 * 1000;

type ChapaInitializeResponse = {
  message: string;
  status: string;
  data?: {
    checkout_url?: string;
  } | null;
};

function generateTransactionReference() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

  return `EB-${timestamp}-${random}`;
}

// What to record when initialization fails: Chapa's own reason when Chapa
// rejected the request, otherwise the error message.
function initializationFailureReason(error: unknown) {
  if (error instanceof ChapaApiError) {
    return `Chapa rejected the payment request (HTTP ${error.statusCode}): ${describeChapaError(error.responseData)}`;
  }
  return error instanceof Error ? error.message : "Payment initialization failed.";
}

export async function initializeChapaPayment(
  bookingId: string,
  customerProfileId: string | null
) {
  if (!bookingId) {
    throw new UserFacingError("Booking ID is required.");
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      customerProfileId,
    },
    select: {
      id: true,
      bookingReference: true,
      customerProfileId: true,
      status: true,
      paymentStatus: true,
      expiresAt: true,
      totalAmount: true,
      currency: true,
      customerFirstName: true,
      customerLastName: true,
      customerEmail: true,
      customerPhone: true,
    },
  });

  if (!booking) {
    throw new UserFacingError("Booking not found.", 404);
  }

  // Ask Chapa about every unresolved attempt first: one may already be paid,
  // and its checkout link would then only show "already paid".
  let unverifiedReferences = new Set<string>();
  if (booking.status === "PAYMENT_PENDING" && booking.paymentStatus === "PENDING") {
    const sync = await syncPendingChapaPaymentsDetailed(booking.id);
    if (sync.confirmed) {
      throw new UserFacingError(ALREADY_PAID_MESSAGE, 409);
    }
    unverifiedReferences = new Set(sync.unverifiedReferences);
  }

  if (booking.status === "CONFIRMED" && booking.paymentStatus === "PAID") {
    throw new UserFacingError(ALREADY_PAID_MESSAGE, 409);
  }

  if (
    booking.status !== "PAYMENT_PENDING" ||
    booking.paymentStatus !== "PENDING"
  ) {
    throw new UserFacingError(
      "This booking is not available for payment.",
      409
    );
  }

  if (
    !booking.expiresAt ||
    booking.expiresAt <= new Date()
  ) {
    throw new UserFacingError(
      "This booking has expired and cannot be paid.",
      409
    );
  }

  if (booking.currency !== "ETB") {
    throw new UserFacingError(
      "Only ETB payments are currently supported."
    );
  }

  if (booking.totalAmount.lessThanOrEqualTo(0)) {
    throw new UserFacingError("Booking amount must be greater than zero.");
  }

  // Reuse a recent checkout (Chapa did not report it paid above). Older
  // checkouts are cancelled and replaced; a late payment on a cancelled
  // attempt is still recorded by completeChapaPayment and sent for refund.
  const pendingCheckouts = await prisma.paymentTransaction.findMany({
    where: {
      bookingId: booking.id,
      provider: "CHAPA",
      status: "PENDING",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      transactionReference: true,
      checkoutUrl: true,
      createdAt: true,
    },
  });

  const reuseCutoff = new Date(Date.now() - CHECKOUT_REUSE_WINDOW_MS);
  const reusableCheckout = pendingCheckouts.find(
    (checkout) => checkout.checkoutUrl && checkout.createdAt > reuseCutoff
  );

  if (reusableCheckout?.checkoutUrl) {
    return {
      success: true,
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      transactionId: reusableCheckout.id,
      transactionReference: reusableCheckout.transactionReference,
      checkoutUrl: reusableCheckout.checkoutUrl,
    };
  }

  // Never replace a checkout whose real status Chapa could not tell us: the
  // customer may have paid it, and a new checkout could charge them twice.
  if (pendingCheckouts.some((checkout) => unverifiedReferences.has(checkout.transactionReference))) {
    throw new UserFacingError(
      "We couldn't confirm the status of your previous payment with Chapa. Please try again in a minute.",
      503
    );
  }

  if (pendingCheckouts.length) {
    await prisma.paymentTransaction.updateMany({
      where: {
        id: { in: pendingCheckouts.map((checkout) => checkout.id) },
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
        failureReason:
          "Checkout link was older than 30 minutes and unpaid; replaced by a new checkout.",
      },
    });
  }

  const unresolvedTransaction = await prisma.paymentTransaction.findFirst({
    where: {
      bookingId: booking.id,
      provider: "CHAPA",
      status: "INITIATED",
    },
    select: { id: true },
  });
  if (unresolvedTransaction) {
    throw new UserFacingError(
      "A previous Chapa payment attempt is still being verified. Please wait before retrying.",
      409
    );
  }

  const transactionReference =
    generateTransactionReference();

  const transaction =
    await prisma.paymentTransaction.create({
      data: {
        bookingId: booking.id,
        provider: "CHAPA",
        transactionReference,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: "INITIATED",
      },
    });

  let responseReceived = false;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");

if (!baseUrl) {
  throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
}
    const response =
      await chapaRequest<ChapaInitializeResponse>(
        "/transaction/initialize",
        {
          method: "POST",
          body: JSON.stringify({
            amount: booking.totalAmount.toString(),
            currency: booking.currency,
            email: booking.customerEmail,
            first_name: booking.customerFirstName,
            last_name:
              booking.customerLastName ?? "",
            phone_number:
              booking.customerPhone ?? undefined,
            tx_ref: transactionReference,
            callback_url: `${baseUrl}/api/payments/chapa/callback`,
            return_url: booking.customerProfileId
              ? `${baseUrl}/dashboard/bookings/${booking.id}?payment=return`
              : `${baseUrl}/booking/payment-return?booking=${encodeURIComponent(booking.bookingReference)}`,
            customization: {
              title: "EthiopianBooking",
              description:
                `Payment for booking ${booking.bookingReference}`,
            },
          }),
        }
      );
    responseReceived = true;

    if (
      response.status !== "success" ||
      !response.data?.checkout_url
    ) {
      // Chapa answered (HTTP 200) but did not create a checkout.
      throw new ChapaApiError(
        response.message || "Chapa payment initialization failed.",
        200,
        response
      );
    }

    // Check that the booking is still payable before saving
    // the checkout URL. This does not cancel a request already
    // sent to Chapa if the booking expires concurrently.
    const updatedTransaction =
      await prisma.$transaction(async (tx) => {
        const currentBooking =
          await tx.booking.findFirst({
            where: {
              id: booking.id,
              customerProfileId,
              status: "PAYMENT_PENDING",
              paymentStatus: "PENDING",
              expiresAt: {
                gt: new Date(),
              },
            },
            select: {
              id: true,
            },
          });

        if (!currentBooking) {
          throw new UserFacingError(
            "Booking expired or is no longer available for payment.",
            409
          );
        }

        return tx.paymentTransaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            status: "PENDING",
            checkoutUrl:
              response.data!.checkout_url!,
          },
        });
      });

    return {
      success: true,
      bookingId: booking.id,
      bookingReference:
        booking.bookingReference,
      transactionId: updatedTransaction.id,
      transactionReference,
      checkoutUrl:
        updatedTransaction.checkoutUrl,
    };
} catch (error) {
  // If the request timed out or Chapa returned a server error,
  // the provider may have created the payment session. Keep the
  // transaction unresolved so expiry performs provider verification.
  const providerRejectedRequest =
    error instanceof ChapaApiError &&
    error.statusCode >= 400 &&
    error.statusCode < 500;
  const uncertainProviderResult =
    (!responseReceived && !providerRejectedRequest) ||
    (error instanceof ChapaApiError && error.statusCode >= 500);

  if (!uncertainProviderResult) {
    await prisma.paymentTransaction.updateMany({
      where: {
        id: transaction.id,
        status: { in: ["INITIATED", "PENDING"] },
      },
      data: {
        status: "FAILED",
        failureReason: initializationFailureReason(error),
      },
    });
  }

  throw error;
}
}