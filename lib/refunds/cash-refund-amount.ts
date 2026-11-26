import { Prisma } from "@/lib/generated/prisma/client";
import type { BookingStatus, PaymentStatus } from "@/lib/generated/prisma/enums";

type DecimalLike = Prisma.Decimal;

// A booking's refundAmount is the total owed back to the customer over the
// booking's life. It grows when a duplicate or late payment arrives and when
// the customer cancels with a refund. Each cash refund pays part of it, so the
// amount still due is refundAmount minus the cash refunds already recorded.

export type CashRefundAmountResult =
  | {
      ok: true;
      // Cash to hand over now.
      amount: DecimalLike;
      paidAmount: DecimalLike;
      // True when, after this refund, everything the customer paid is back.
      isFullRefund: boolean;
    }
  | { ok: false; error: string };

export function resolveCashRefundAmount(input: {
  refundAmount: DecimalLike;
  successfulPaymentAmounts: DecimalLike[];
  alreadyRefundedAmounts?: DecimalLike[];
}): CashRefundAmountResult {
  if (input.successfulPaymentAmounts.length === 0) {
    return { ok: false, error: "No successful payment exists for this booking." };
  }

  const sum = (amounts: DecimalLike[]) =>
    amounts.reduce((total, amount) => total.plus(amount), new Prisma.Decimal(0));

  const paidAmount = sum(input.successfulPaymentAmounts);
  const alreadyRefunded = sum(input.alreadyRefundedAmounts ?? []);
  const refundAmount = new Prisma.Decimal(input.refundAmount);

  if (refundAmount.greaterThan(paidAmount)) {
    return {
      ok: false,
      error: "The refund amount is larger than the amount paid for this booking. Ask an administrator to review it.",
    };
  }

  const amount = refundAmount.minus(alreadyRefunded);
  if (amount.lessThanOrEqualTo(0)) {
    return { ok: false, error: "No refund amount is still due for this booking." };
  }

  return {
    ok: true,
    amount,
    paidAmount,
    isFullRefund: refundAmount.equals(paidAmount),
  };
}

// Bookings that have money waiting to be handed back in cash:
// - REFUND_PENDING / REFUND_PENDING: cancelled (or flagged) with a refund due.
// - CONFIRMED / REFUND_PENDING: the stay goes ahead, but a duplicate payment
//   arrived and must be returned.
export function isAwaitingCashRefund(status: BookingStatus, paymentStatus: PaymentStatus) {
  return paymentStatus === "REFUND_PENDING" && (status === "REFUND_PENDING" || status === "CONFIRMED");
}

export const AWAITING_CASH_REFUND_WHERE = {
  paymentStatus: "REFUND_PENDING" as const,
  status: { in: ["REFUND_PENDING", "CONFIRMED"] as BookingStatus[] },
};

// Statuses after the refund has been handed over. A confirmed stay stays
// confirmed and goes back to fully paid.
export function statusAfterCashRefund(status: BookingStatus): {
  status: BookingStatus;
  paymentStatus: PaymentStatus;
} {
  return status === "CONFIRMED"
    ? { status: "CONFIRMED", paymentStatus: "PAID" }
    : { status: "REFUNDED", paymentStatus: "REFUNDED" };
}
