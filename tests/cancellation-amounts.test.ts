import { describe, expect, it } from "vitest";
import {
  calculateCancellationAmounts,
  calculateSharesAfterRefund,
  cancellationTermsForItem,
  checkInMoment,
} from "@/lib/bookings/cancellation-amounts";

// Stored as a calendar date at UTC midnight, like booking_items.checkInDate.
const checkInDate = new Date("2026-12-20T00:00:00.000Z");
// 00:00 on 20 Dec in Addis Ababa (UTC+3) is 21:00 UTC on 19 Dec.
const localMidnight = new Date("2026-12-19T21:00:00.000Z");
const hoursBefore = (hours: number, from = localMidnight) => new Date(from.getTime() - hours * 60 * 60 * 1000);

function item(
  subtotal: string,
  cancellationPolicy: string,
  cancellationDeadlineHours: number | null,
  cancellationFeePercent: string | null = null,
  checkInTime: string | null = null
) {
  return {
    subtotal,
    checkInDate,
    terms: { cancellationPolicy, cancellationDeadlineHours, cancellationFeePercent, checkInTime },
  };
}

function booking(items: ReturnType<typeof item>[]) {
  const total = items.reduce((sum, i) => sum + Number(i.subtotal), 0).toFixed(2);
  return { subtotal: total, totalAmount: total, items };
}

describe("checkInMoment", () => {
  it("uses the check-in time in Addis Ababa time", () => {
    expect(checkInMoment(checkInDate, "14:00").toISOString()).toBe("2026-12-20T11:00:00.000Z");
  });

  it("falls back to the start of the check-in day in Addis Ababa", () => {
    expect(checkInMoment(checkInDate, null).toISOString()).toBe(localMidnight.toISOString());
    expect(checkInMoment(checkInDate, "not a time").toISOString()).toBe(localMidnight.toISOString());
    expect(checkInMoment(checkInDate, "25:00").toISOString()).toBe(localMidnight.toISOString());
  });
});

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

  it("measures the deadline from the check-in time, not midnight UTC", () => {
    // Check-in 14:00 local = 11:00 UTC on 20 Dec; 24h deadline = 11:00 UTC on 19 Dec.
    const terms = booking([item("1000.00", "FLEXIBLE", 24, null, "14:00")]);
    expect(calculateCancellationAmounts(terms, new Date("2026-12-19T10:59:00.000Z")).refundAmount).toBe("1000.00");
    expect(calculateCancellationAmounts(terms, new Date("2026-12-19T11:01:00.000Z")).refundAmount).toBe("0.00");
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

describe("cancellationTermsForItem", () => {
  const live = {
    ratePlan: { cancellationPolicy: "NON_REFUNDABLE", cancellationDeadlineHours: null, cancellationFeePercent: null },
    roomType: { checkInTime: null, property: { checkInTime: "15:00" } },
  };

  it("uses the terms stored when the booking was made", () => {
    expect(
      cancellationTermsForItem({
        ...live,
        cancellationPolicy: "FLEXIBLE",
        cancellationDeadlineHours: 24,
        cancellationFeePercent: null,
        checkInTime: "14:00",
      })
    ).toEqual({ cancellationPolicy: "FLEXIBLE", cancellationDeadlineHours: 24, cancellationFeePercent: null, checkInTime: "14:00" });
  });

  it("falls back to the rate plan's current terms for an item without stored terms", () => {
    expect(
      cancellationTermsForItem({
        ...live,
        cancellationPolicy: null,
        cancellationDeadlineHours: null,
        cancellationFeePercent: null,
        checkInTime: null,
      })
    ).toEqual({ cancellationPolicy: "NON_REFUNDABLE", cancellationDeadlineHours: null, cancellationFeePercent: null, checkInTime: "15:00" });
  });
});

describe("calculateSharesAfterRefund", () => {
  // 1500 booking: 150 platform commission, 30 Chapa fee, 1320 to the hotel.
  const paid = { totalAmount: "1500.00", platformCommission: "150.00", paymentFee: "30.00" };

  it("leaves the shares unchanged when nothing is refunded", () => {
    expect(calculateSharesAfterRefund({ ...paid, refundAmount: "0" })).toEqual({
      platformCommission: "150.00",
      partnerAmount: "1320.00",
    });
  });

  it("splits a kept cancellation fee in the booking's proportions", () => {
    // 375 kept: platform 10% = 37.50, hotel 375 - 37.50 - 30 = 307.50.
    expect(calculateSharesAfterRefund({ ...paid, refundAmount: "1125.00" })).toEqual({
      platformCommission: "37.50",
      partnerAmount: "307.50",
    });
  });

  it("leaves the hotel carrying Chapa's fee on a full refund", () => {
    expect(calculateSharesAfterRefund({ ...paid, refundAmount: "1500.00" })).toEqual({
      platformCommission: "0.00",
      partnerAmount: "-30.00",
    });
  });
});
