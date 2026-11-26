import { describe, expect, it } from "vitest";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  isAwaitingCashRefund,
  resolveCashRefundAmount,
  statusAfterCashRefund,
} from "@/lib/refunds/cash-refund-amount";

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

  it("pays a partial refund after a cancellation fee", () => {
    const result = resolveCashRefundAmount({
      refundAmount: d("1125.00"),
      successfulPaymentAmounts: [d("1500.00")],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amount.toFixed(2)).toBe("1125.00");
    expect(result.isFullRefund).toBe(false);
  });

  it("pays back a duplicate payment on a confirmed booking", () => {
    const result = resolveCashRefundAmount({
      refundAmount: d("1500.00"),
      successfulPaymentAmounts: [d("1500.00"), d("1500.00")],
    });
    expect(result.ok && result.amount.toFixed(2)).toBe("1500.00");
  });

  it("subtracts earlier cash refunds from the amount due", () => {
    // Duplicate payment of 1500 refunded earlier; the customer then cancelled
    // with 1125 refundable, so 2625 is owed in total and 1125 is still due.
    const result = resolveCashRefundAmount({
      refundAmount: d("2625.00"),
      successfulPaymentAmounts: [d("1500.00"), d("1500.00")],
      alreadyRefundedAmounts: [d("1500.00")],
    });
    expect(result.ok && result.amount.toFixed(2)).toBe("1125.00");
  });

  it("rejects a booking whose refund has already been paid", () => {
    const result = resolveCashRefundAmount({
      refundAmount: d("1500.00"),
      successfulPaymentAmounts: [d("1500.00")],
      alreadyRefundedAmounts: [d("1500.00")],
    });
    expect(result.ok).toBe(false);
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

describe("cash refund statuses", () => {
  it("accepts cancelled bookings and confirmed bookings with a duplicate payment", () => {
    expect(isAwaitingCashRefund("REFUND_PENDING", "REFUND_PENDING")).toBe(true);
    expect(isAwaitingCashRefund("CONFIRMED", "REFUND_PENDING")).toBe(true);
    expect(isAwaitingCashRefund("CONFIRMED", "PAID")).toBe(false);
    expect(isAwaitingCashRefund("REFUNDED", "REFUNDED")).toBe(false);
  });

  it("keeps a confirmed stay confirmed after refunding a duplicate payment", () => {
    expect(statusAfterCashRefund("CONFIRMED")).toEqual({ status: "CONFIRMED", paymentStatus: "PAID" });
    expect(statusAfterCashRefund("REFUND_PENDING")).toEqual({ status: "REFUNDED", paymentStatus: "REFUNDED" });
  });
});
