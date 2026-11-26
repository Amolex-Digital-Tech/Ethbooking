import { describe, expect, it } from "vitest";
import { calculateCancellationAmounts } from "@/lib/bookings/cancellation-amounts";

const checkIn = new Date("2026-12-20T00:00:00.000Z");
const hoursBefore = (hours: number) => new Date(checkIn.getTime() - hours * 60 * 60 * 1000);

function item(
  subtotal: string,
  cancellationPolicy: string,
  cancellationDeadlineHours: number | null,
  cancellationFeePercent: string | null = null
) {
  return {
    subtotal,
    checkInDate: checkIn,
    ratePlan: { cancellationPolicy, cancellationDeadlineHours, cancellationFeePercent },
  };
}

function booking(items: ReturnType<typeof item>[]) {
  const total = items.reduce((sum, i) => sum + Number(i.subtotal), 0).toFixed(2);
  return { subtotal: total, totalAmount: total, items };
}

describe("calculateCancellationAmounts", () => {
  it("refunds everything for a flexible rate before the deadline", () => {
    expect(calculateCancellationAmounts(booking([item("1000.00", "FLEXIBLE", 24)]), hoursBefore(48))).toEqual({
      refundAmount: "1000.00",
      cancellationFeeAmount: "0.00",
    });
  });

  it("refunds nothing for a flexible rate after the deadline", () => {
    expect(calculateCancellationAmounts(booking([item("1000.00", "FLEXIBLE", 24)]), hoursBefore(2))).toEqual({
      refundAmount: "0.00",
      cancellationFeeAmount: "1000.00",
    });
  });

  it("keeps the configured fee for a moderate rate (partial refund)", () => {
    expect(calculateCancellationAmounts(booking([item("1500.00", "MODERATE", 48, "25")]), hoursBefore(72))).toEqual({
      refundAmount: "1125.00",
      cancellationFeeAmount: "375.00",
    });
  });

  it("treats a missing fee percentage as a 100% fee", () => {
    expect(calculateCancellationAmounts(booking([item("800.00", "CUSTOM", 48, null)]), hoursBefore(72))).toEqual({
      refundAmount: "0.00",
      cancellationFeeAmount: "800.00",
    });
  });

  it("never refunds a non-refundable rate", () => {
    expect(calculateCancellationAmounts(booking([item("900.00", "NON_REFUNDABLE", 48)]), hoursBefore(500))).toEqual({
      refundAmount: "0.00",
      cancellationFeeAmount: "900.00",
    });
  });

  it("applies each item's own policy in a mixed booking", () => {
    const result = calculateCancellationAmounts(
      booking([item("1000.00", "FLEXIBLE", 24), item("500.00", "NON_REFUNDABLE", null)]),
      hoursBefore(48)
    );
    expect(result).toEqual({ refundAmount: "1000.00", cancellationFeeAmount: "500.00" });
  });

  it("refund plus fee always equals the total, even with rounding", () => {
    const result = calculateCancellationAmounts(
      booking([item("333.33", "MODERATE", 24, "33.3"), item("333.33", "FLEXIBLE", 24), item("333.34", "MODERATE", 24, "10")]),
      hoursBefore(48)
    );
    const sum = Math.round((Number(result.refundAmount) + Number(result.cancellationFeeAmount)) * 100);
    expect(sum).toBe(100000);
  });
});
