import { Prisma } from "@/lib/generated/prisma/client";

type DecimalLike = Prisma.Decimal;

export type CashRefundAmountResult =
  | { ok: true; amount: DecimalLike; paidAmount: DecimalLike; isFullRefund: boolean }
  | { ok: false; error: string };

// Works out how much cash to hand over for a booking awaiting refund.
//
// The amount due is the booking's recorded refundAmount. It can be the full
// amount paid (late or duplicate payments, admin review) or a partial amount
// (customer cancelled under a policy that keeps a cancellation fee). It must
// be positive and can never exceed what was actually paid.
export function resolveCashRefundAmount(input: {
  refundAmount: DecimalLike;
  successfulPaymentAmounts: DecimalLike[];
}): CashRefundAmountResult {
  if (input.successfulPaymentAmounts.length === 0) {
    return { ok: false, error: "No successful payment exists for this booking." };
  }

  const paidAmount = input.successfulPaymentAmounts.reduce(
    (sum, amount) => sum.plus(amount),
    new Prisma.Decimal(0)
  );
  const refundAmount = new Prisma.Decimal(input.refundAmount);

  if (refundAmount.lessThanOrEqualTo(0)) {
    return { ok: false, error: "No refund amount is due for this booking. Ask an administrator to review it." };
  }

  if (refundAmount.greaterThan(paidAmount)) {
    return {
      ok: false,
      error: "The refund amount is larger than the amount paid for this booking. Ask an administrator to review it.",
    };
  }

  return {
    ok: true,
    amount: refundAmount,
    paidAmount,
    isFullRefund: refundAmount.equals(paidAmount),
  };
}
