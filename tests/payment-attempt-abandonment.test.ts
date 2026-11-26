import { describe, expect, it } from "vitest";
import {
  isPendingPaymentAbandoned,
  isUnverifiablePaymentAbandoned,
} from "@/lib/payments/payment-attempt-abandonment";

const now = new Date("2026-11-26T12:00:00.000Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000);

describe("payment attempt abandonment", () => {
  it("keeps a pending attempt younger than 2 hours", () => {
    expect(isPendingPaymentAbandoned(ago(119), now)).toBe(false);
  });

  it("abandons a pending attempt at 2 hours", () => {
    expect(isPendingPaymentAbandoned(ago(120), now)).toBe(true);
  });

  it("waits 24 hours before abandoning an attempt Chapa cannot verify", () => {
    expect(isUnverifiablePaymentAbandoned(ago(23 * 60), now)).toBe(false);
    expect(isUnverifiablePaymentAbandoned(ago(24 * 60), now)).toBe(true);
  });
});
