import { describe, expect, it } from "vitest";
import { Prisma } from "@/lib/generated/prisma/client";
import { resolveCashRefundAmount } from "@/lib/refunds/cash-refund-amount";

const d = (value: string) => new Prisma.Decimal(value);

describe("resolveCashRefundAmount", () => {
  it("pays the full amount when the whole payment is refundable", () => {
    const result = resolveCashRefundAmount({
      refundAmount: d("1500.00"),
      successfulPaymentAmounts: [d("1500.00")],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amount.toFixed(2)).toBe("1500.00");
    expect(result.isFullRefund).toBe(true);
  });

  it("pays a partial refund after a cancellation fee (previously rejected)", () => {
    const result = resolveCashRefundAmount({
      refundAmount: d("1125.00"),
      successfulPaymentAmounts: [d("1500.00")],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amount.toFixed(2)).toBe("1125.00");
    expect(result.paidAmount.toFixed(2)).toBe("1500.00");
    expect(result.isFullRefund).toBe(false);
  });

  it("sums several successful payments (e.g. a duplicate late payment)", () => {
    const result = resolveCashRefundAmount({
      refundAmount: d("3000.00"),
      successfulPaymentAmounts: [d("1500.00"), d("1500.00")],
    });
    expect(result.ok && result.isFullRefund).toBe(true);
  });

  it("rejects a refund larger than what was paid", () => {
    const result = resolveCashRefundAmount({
      refundAmount: d("1500.01"),
      successfulPaymentAmounts: [d("1500.00")],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a zero refund", () => {
    const result = resolveCashRefundAmount({
      refundAmount: d("0"),
      successfulPaymentAmounts: [d("1500.00")],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a booking with no successful payment", () => {
    const result = resolveCashRefundAmount({
      refundAmount: d("100.00"),
      successfulPaymentAmounts: [],
    });
    expect(result.ok).toBe(false);
  });
});
