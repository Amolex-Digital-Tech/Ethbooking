import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma/client";
import { chapaRequest } from "@/lib/payments/chapa/client";

type ChapaVerifyResponse = {
  message: string;
  status: string;
  data?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    currency?: string;
    amount?: number;
    charge?: number | null;
    mode?: string;
    method?: string | null;
    type?: string;
    status?: string;
    reference?: string | null;
    tx_ref?: string;
    created_at?: string;
    updated_at?: string;
  } | null;
};

function getPaymentMetadata(payment: {
  chapaStatus: string | null;
  mode: string | null;
  customerEmail: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  chapaCharge: string | null;
  chapaChargeProvided: boolean;
}) {
  return {
    chapaStatus: payment.chapaStatus,
    mode: payment.mode,
    customerEmail: payment.customerEmail,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    chapaCharge: payment.chapaCharge,
    chapaChargeProvided: payment.chapaChargeProvided,
  };
}

export async function verifyChapaPayment(
  transactionReference: string
) {
  if (!transactionReference) {
    throw new Error("Transaction reference is required.");
  }

  const transaction =
    await prisma.paymentTransaction.findUnique({
      where: { transactionReference },
      include: {
        booking: {
          select: {
            id: true,
            bookingReference: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
            currency: true,
          },
        },
      },
    });

  if (!transaction) {
    throw new Error("Payment transaction not found.");
  }

  if (transaction.provider !== "CHAPA") {
    throw new Error("Payment transaction provider is not Chapa.");
  }

  const response =
    await chapaRequest<ChapaVerifyResponse>(
      `/transaction/verify/${encodeURIComponent(
        transactionReference
      )}`
    );

  if (response.status !== "success" || !response.data) {
    throw new Error(
      response.message || "Chapa payment verification failed."
    );
  }

  const chapaPayment = response.data;

  if (
    chapaPayment.tx_ref !== transaction.transactionReference
  ) {
    throw new Error(
      "Chapa transaction reference does not match."
    );
  }

  if (chapaPayment.currency !== transaction.currency) {
    throw new Error(
      "Chapa payment currency does not match."
    );
  }

  if (
    chapaPayment.amount === undefined ||
    chapaPayment.amount !== Number(transaction.amount)
  ) {
    throw new Error(
      "Chapa payment amount does not match."
    );
  }

  // Chapa supplies the actual processing fee in `charge`.
  // If it is absent or null, do not invent a fee.
  const chapaChargeProvided =
    chapaPayment.charge !== undefined &&
    chapaPayment.charge !== null;

  let chapaCharge: string | null = null;

  if (chapaChargeProvided) {
    if (
      typeof chapaPayment.charge !== "number" ||
      !Number.isFinite(chapaPayment.charge) ||
      chapaPayment.charge < 0
    ) {
      throw new Error(
        "Chapa returned an invalid payment processing fee."
      );
    }

    chapaCharge = new Prisma.Decimal(
      chapaPayment.charge
    ).toString();
  }

  return {
    transactionId: transaction.id,
    transactionReference: transaction.transactionReference,
    transactionStatus: transaction.status,

    bookingId: transaction.booking.id,
    bookingReference: transaction.booking.bookingReference,
    bookingStatus: transaction.booking.status,
    bookingPaymentStatus: transaction.booking.paymentStatus,

    amount: transaction.amount.toString(),
    currency: transaction.currency,

    chapaStatus: chapaPayment.status ?? null,
    paymentMethod: chapaPayment.method ?? null,
    providerTransactionId: chapaPayment.reference ?? null,
    mode: chapaPayment.mode ?? null,
    customerEmail: chapaPayment.email ?? null,
    createdAt: chapaPayment.created_at ?? null,
    updatedAt: chapaPayment.updated_at ?? null,

    chapaCharge,
    chapaChargeProvided,
  };
}

export async function completeChapaPayment(
  transactionReference: string
) {
  if (!transactionReference) {
    throw new Error("Transaction reference is required.");
  }

  const verifiedPayment =
    await verifyChapaPayment(transactionReference);

  if (verifiedPayment.chapaStatus !== "success") {
    const normalizedStatus = verifiedPayment.chapaStatus?.toLowerCase() ?? "";
    if (normalizedStatus === "failed" || normalizedStatus === "cancelled") {
      await prisma.paymentTransaction.updateMany({
        where: {
          id: verifiedPayment.transactionId,
          status: { in: ["INITIATED", "PENDING"] },
        },
        data: {
          status: normalizedStatus === "failed" ? "FAILED" : "CANCELLED",
          failureReason: `Chapa verification returned ${normalizedStatus}.`,
          verifiedAt: new Date(),
        },
      });
    }
    return {
      success: false,
      completed: false,
      latePayment: false,
      status: verifiedPayment.chapaStatus,
      transactionId: verifiedPayment.transactionId,
      transactionReference: verifiedPayment.transactionReference,
      bookingId: verifiedPayment.bookingId,
      bookingReference: verifiedPayment.bookingReference,
    };
  }

  const chapaCharge = new Prisma.Decimal(
    verifiedPayment.chapaCharge ?? "0"
  );

  const result = await prisma.$transaction(async (tx) => {
    const transaction =
      await tx.paymentTransaction.findUnique({
        where: {
          id: verifiedPayment.transactionId,
        },
        select: {
          id: true,
          bookingId: true,
          amount: true,
          status: true,
        },
      });

    if (!transaction) {
      throw new Error(
        "Payment transaction no longer exists."
      );
    }

    const booking = await tx.booking.findUnique({
      where: {
        id: transaction.bookingId,
      },
      select: {
        id: true,
        bookingReference: true,
        status: true,
        paymentStatus: true,
        partnerAmount: true,
      },
    });

    if (!booking) {
      throw new Error(
        "Booking associated with payment was not found."
      );
    }

    // An already successful transaction must never
    // increase the refund amount or deduct the fee twice.
    if (transaction.status === "SUCCESS") {
      return {
        alreadyCompleted: true,
        latePayment:
          booking.status === "REFUND_PENDING" ||
          booking.status === "REFUNDED" ||
          booking.paymentStatus === "REFUND_PENDING",
        transactionId: transaction.id,
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        bookingStatus: booking.status,
      };
    }

    const allowedTransactionStatuses: Array<
      typeof transaction.status
    > = [
      "INITIATED",
      "PENDING",
      "CANCELLED",
      "FAILED",
    ];

    if (
      !allowedTransactionStatuses.includes(
        transaction.status
      )
    ) {
      throw new Error(
        `Payment transaction cannot be completed from status ${transaction.status}.`
      );
    }

    const paymentMetadata = getPaymentMetadata({
      chapaStatus: verifiedPayment.chapaStatus,
      mode: verifiedPayment.mode,
      customerEmail: verifiedPayment.customerEmail,
      createdAt: verifiedPayment.createdAt,
      updatedAt: verifiedPayment.updatedAt,
      chapaCharge: verifiedPayment.chapaCharge,
      chapaChargeProvided:
        verifiedPayment.chapaChargeProvided,
    });

    // Claim this payment transaction first.
    // Only one callback can successfully transition it
    // from its previous state to SUCCESS.
    const transactionClaim =
      await tx.paymentTransaction.updateMany({
        where: {
          id: transaction.id,
          status: {
            in: allowedTransactionStatuses,
          },
        },
        data: {
          status: "SUCCESS",
          providerTransactionId:
            verifiedPayment.providerTransactionId,
          paymentMethod: verifiedPayment.paymentMethod,
          verifiedAt: new Date(),
          failureReason: null,
          metadata: paymentMetadata,
        },
      });

    if (transactionClaim.count !== 1) {
      const latestTransaction =
        await tx.paymentTransaction.findUnique({
          where: { id: transaction.id },
          select: { status: true },
        });

      if (latestTransaction?.status === "SUCCESS") {
        const latestBooking = await tx.booking.findUnique({
          where: { id: booking.id },
          select: {
            id: true,
            bookingReference: true,
            status: true,
            paymentStatus: true,
          },
        });

        if (!latestBooking) {
          throw new Error("Booking no longer exists.");
        }

        return {
          alreadyCompleted: true,
          latePayment:
            latestBooking.status === "REFUND_PENDING" ||
            latestBooking.status === "REFUNDED" ||
            latestBooking.paymentStatus === "REFUND_PENDING",
          transactionId: transaction.id,
          bookingId: latestBooking.id,
          bookingReference: latestBooking.bookingReference,
          bookingStatus: latestBooking.status,
        };
      }

      throw new Error(
        "Payment transaction changed while verification was being processed. Please retry."
      );
    }

    // Normal payment: confirm a booking that is still
    // awaiting payment and deduct Chapa's actual fee
    // from the partner's earnings.
    if (
      booking.status === "PAYMENT_PENDING" &&
      booking.paymentStatus === "PENDING"
    ) {
      const updatedPartnerAmount =
        booking.partnerAmount.minus(chapaCharge);

      if (updatedPartnerAmount.lessThan(0)) {
        throw new Error(
          "Chapa's processing fee exceeds the partner's available earnings. Payment settlement requires review."
        );
      }

      const claimed = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: "PAYMENT_PENDING",
          paymentStatus: "PENDING",
        },
        data: {
          status: "CONFIRMED",
          paymentStatus: "PAID",
          paymentFee: chapaCharge,
          partnerAmount: updatedPartnerAmount,
        },
      });

      if (claimed.count === 1) {
        return {
          alreadyCompleted: false,
          latePayment: false,
          transactionId: transaction.id,
          bookingId: booking.id,
          bookingReference: booking.bookingReference,
          bookingStatus: "CONFIRMED",
          chapaCharge: chapaCharge.toString(),
          chapaChargeProvided:
            verifiedPayment.chapaChargeProvided,
        };
      }
    }

    // Re-read because cancellation, expiration, or another
    // payment callback may have changed the booking.
    const latestBooking = await tx.booking.findUnique({
      where: {
        id: booking.id,
      },
      select: {
        id: true,
        bookingReference: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (!latestBooking) {
      throw new Error("Booking no longer exists.");
    }

    // Payment arrived after cancellation or expiration.
    // Record the actual payment and add its full amount
    // to the amount awaiting refund.
    if (
      ["CANCELLED", "EXPIRED", "REFUND_PENDING"].includes(
        latestBooking.status
      ) &&
      [
        "UNPAID",
        "FAILED",
        "PAID",
        "REFUND_PENDING",
      ].includes(latestBooking.paymentStatus)
    ) {
      const claimed = await tx.booking.updateMany({
        where: {
          id: latestBooking.id,
          status: latestBooking.status,
          paymentStatus: latestBooking.paymentStatus,
        },
        data: {
          status: "REFUND_PENDING",
          paymentStatus: "REFUND_PENDING",
          refundAmount: {
            increment: transaction.amount,
          },
        },
      });

      if (claimed.count !== 1) {
        throw new Error(
          "Booking changed while processing the late payment. Please retry verification."
        );
      }

      await tx.paymentTransaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          metadata: {
            ...paymentMetadata,
            latePaymentAfterCancellation: true,
          },
        },
      });

      return {
        alreadyCompleted: false,
        latePayment: true,
        transactionId: transaction.id,
        bookingId: latestBooking.id,
        bookingReference: latestBooking.bookingReference,
        bookingStatus: "REFUND_PENDING",
      };
    }

    // A different payment attempt has already confirmed
    // the booking. This payment is an additional charge,
    // so record it as an amount awaiting refund.
    if (
      latestBooking.status === "CONFIRMED" &&
      latestBooking.paymentStatus === "PAID"
    ) {
      const claimed = await tx.booking.updateMany({
        where: {
          id: latestBooking.id,
          status: "CONFIRMED",
          paymentStatus: "PAID",
        },
        data: {
          paymentStatus: "REFUND_PENDING",
          refundAmount: {
            increment: transaction.amount,
          },
        },
      });

      if (claimed.count !== 1) {
        throw new Error(
          "Booking changed while processing the additional payment. Please retry verification."
        );
      }

      await tx.paymentTransaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          metadata: {
            ...paymentMetadata,
            additionalPaymentAwaitingRefund: true,
          },
        },
      });

      return {
        alreadyCompleted: false,
        latePayment: true,
        transactionId: transaction.id,
        bookingId: latestBooking.id,
        bookingReference: latestBooking.bookingReference,
        bookingStatus: "CONFIRMED",
      };
    }

    throw new Error(
      `Booking cannot accept payment from status ${latestBooking.status} / ${latestBooking.paymentStatus}.`
    );
  });

  return {
    success: true,
    completed: true,
    ...result,
  };
}