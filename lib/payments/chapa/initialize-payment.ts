import { prisma } from "@/lib/prisma/client";
import { chapaRequest, ChapaApiError } from "@/lib/payments/chapa/client";
import { syncPendingChapaPayments } from "@/lib/payments/chapa/sync-pending-payments";

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

export async function initializeChapaPayment(
  bookingId: string,
  customerProfileId: string | null
) {
  if (!bookingId) {
    throw new Error("Booking ID is required.");
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
    throw new Error("Booking not found.");
  }

  // A previous attempt may have been paid without Chapa's callback reaching
  // us. Check first, so we never send the customer back to a checkout that
  // Chapa reports as "already paid".
  if (
    booking.status === "PAYMENT_PENDING" &&
    booking.paymentStatus === "PENDING" &&
    (await syncPendingChapaPayments(booking.id))
  ) {
    throw new Error(
      "This booking has already been paid. Your confirmation is in your bookings and has been emailed to you."
    );
  }

  if (
    booking.status !== "PAYMENT_PENDING" ||
    booking.paymentStatus !== "PENDING"
  ) {
    throw new Error(
      booking.paymentStatus === "PAID"
        ? "This booking has already been paid."
        : "This booking is not available for payment."
    );
  }

  if (
    !booking.expiresAt ||
    booking.expiresAt <= new Date()
  ) {
    throw new Error(
      "This booking has expired and cannot be paid."
    );
  }

  if (booking.currency !== "ETB") {
    throw new Error(
      "Only ETB payments are currently supported."
    );
  }

  if (booking.totalAmount.lessThanOrEqualTo(0)) {
    throw new Error("Booking amount must be greater than zero.");
  }

  // Reuse an existing checkout when one is already pending.
  const existingTransaction =
    await prisma.paymentTransaction.findFirst({
      where: {
        bookingId: booking.id,
        provider: "CHAPA",
        status: "PENDING",
        checkoutUrl: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (existingTransaction?.checkoutUrl) {
    return {
      success: true,
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      transactionId: existingTransaction.id,
      transactionReference:
        existingTransaction.transactionReference,
      checkoutUrl: existingTransaction.checkoutUrl,
    };
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
    throw new Error("A previous Chapa payment attempt is still being verified. Please wait before retrying.");
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
              ? `${baseUrl}/dashboard/bookings/${booking.id}`
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
      throw new Error(
        response.message ||
          "Chapa payment initialization failed."
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
          throw new Error(
            "Booking expired or is no longer available for payment."
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
        failureReason: error instanceof Error ? error.message : "Payment initialization failed.",
      },
    });
  }

  throw error;
}
}