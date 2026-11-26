import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    paymentTransaction: { findMany: vi.fn() },
  },
  completeChapaPayment: vi.fn(),
  sendBookingPaymentConfirmationOnce: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/payments/chapa/verify-payment", () => ({ completeChapaPayment: mocks.completeChapaPayment }));
vi.mock("@/lib/email/send-booking-payment-confirmation", () => ({
  sendBookingPaymentConfirmationOnce: mocks.sendBookingPaymentConfirmationOnce,
}));

import { syncPendingChapaPayments } from "@/lib/payments/chapa/sync-pending-payments";

const BOOKING_ID = "booking-1";

// Shapes returned by completeChapaPayment.
const paid = { success: true, completed: true, alreadyCompleted: false, latePayment: false, bookingId: BOOKING_ID };
const stillPending = { success: false, completed: false, latePayment: false, status: "pending", bookingId: BOOKING_ID };
const latePayment = { success: true, completed: true, alreadyCompleted: false, latePayment: true, bookingId: BOOKING_ID };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.prisma.paymentTransaction.findMany.mockResolvedValue([{ transactionReference: "EB-TX-1" }]);
  mocks.sendBookingPaymentConfirmationOnce.mockResolvedValue({ sent: true });
});

describe("syncPendingChapaPayments", () => {
  it("looks up only the booking's unresolved Chapa attempts", async () => {
    mocks.completeChapaPayment.mockResolvedValue(stillPending);

    await syncPendingChapaPayments(BOOKING_ID);

    expect(mocks.prisma.paymentTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookingId: BOOKING_ID, provider: "CHAPA", status: { in: ["INITIATED", "PENDING"] } },
      })
    );
  });

  it("confirms a paid booking and sends the confirmation email once", async () => {
    mocks.completeChapaPayment.mockResolvedValue(paid);

    await expect(syncPendingChapaPayments(BOOKING_ID)).resolves.toBe(true);

    expect(mocks.completeChapaPayment).toHaveBeenCalledWith("EB-TX-1");
    expect(mocks.sendBookingPaymentConfirmationOnce).toHaveBeenCalledTimes(1);
    expect(mocks.sendBookingPaymentConfirmationOnce).toHaveBeenCalledWith(BOOKING_ID);
  });

  it("does nothing while Chapa still reports the payment as pending", async () => {
    mocks.completeChapaPayment.mockResolvedValue(stillPending);

    await expect(syncPendingChapaPayments(BOOKING_ID)).resolves.toBe(false);

    expect(mocks.sendBookingPaymentConfirmationOnce).not.toHaveBeenCalled();
  });

  it("does not send a confirmation email for a late payment", async () => {
    mocks.completeChapaPayment.mockResolvedValue(latePayment);

    await expect(syncPendingChapaPayments(BOOKING_ID)).resolves.toBe(false);

    expect(mocks.sendBookingPaymentConfirmationOnce).not.toHaveBeenCalled();
  });

  it("returns false and logs when Chapa verification fails", async () => {
    mocks.completeChapaPayment.mockRejectedValue(new Error("Chapa is unavailable"));

    await expect(syncPendingChapaPayments(BOOKING_ID)).resolves.toBe(false);

    expect(mocks.sendBookingPaymentConfirmationOnce).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("checks every unresolved attempt, even after one fails", async () => {
    mocks.prisma.paymentTransaction.findMany.mockResolvedValue([
      { transactionReference: "EB-TX-2" },
      { transactionReference: "EB-TX-1" },
    ]);
    mocks.completeChapaPayment
      .mockRejectedValueOnce(new Error("Chapa is unavailable"))
      .mockResolvedValueOnce(paid);

    await expect(syncPendingChapaPayments(BOOKING_ID)).resolves.toBe(true);

    expect(mocks.completeChapaPayment).toHaveBeenCalledTimes(2);
    expect(mocks.sendBookingPaymentConfirmationOnce).toHaveBeenCalledTimes(1);
  });
});
