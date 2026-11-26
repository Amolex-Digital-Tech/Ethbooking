import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  completeChapaPayment: vi.fn(),
  sendConfirmation: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({ prisma: { paymentTransaction: { findMany: mocks.findMany } } }));
vi.mock("@/lib/payments/chapa/verify-payment", () => ({ completeChapaPayment: mocks.completeChapaPayment }));
vi.mock("@/lib/email/send-booking-payment-confirmation", () => ({ sendBookingPaymentConfirmationOnce: mocks.sendConfirmation }));

import { syncPendingChapaPayments } from "@/lib/payments/chapa/sync-pending-payments";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findMany.mockResolvedValue([{ transactionReference: "EB-TX-1" }]);
});

describe("syncPendingChapaPayments", () => {
  it("confirms a payment Chapa reports as paid and sends the receipt", async () => {
    mocks.completeChapaPayment.mockResolvedValue({ success: true, completed: true, latePayment: false, bookingId: "b1" });

    await expect(syncPendingChapaPayments("b1")).resolves.toBe(true);
    expect(mocks.completeChapaPayment).toHaveBeenCalledWith("EB-TX-1");
    expect(mocks.sendConfirmation).toHaveBeenCalledWith("b1");
  });

  it("does nothing when Chapa says the payment is still pending", async () => {
    mocks.completeChapaPayment.mockResolvedValue({ success: false, completed: false, latePayment: false, status: "pending", bookingId: "b1" });

    await expect(syncPendingChapaPayments("b1")).resolves.toBe(false);
    expect(mocks.sendConfirmation).not.toHaveBeenCalled();
  });

  it("does not send a confirmation for a late payment that goes to refund", async () => {
    mocks.completeChapaPayment.mockResolvedValue({ success: true, completed: true, latePayment: true, bookingId: "b1" });

    await expect(syncPendingChapaPayments("b1")).resolves.toBe(true);
    expect(mocks.sendConfirmation).not.toHaveBeenCalled();
  });

  it("ignores Chapa errors so the page still loads", async () => {
    mocks.completeChapaPayment.mockRejectedValue(new Error("Chapa API request failed."));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(syncPendingChapaPayments("b1")).resolves.toBe(false);
  });
});
