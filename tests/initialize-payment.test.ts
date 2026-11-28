import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    booking: { findFirst: vi.fn() },
    paymentTransaction: { update: vi.fn() },
  };
  return {
    tx,
    prisma: {
      booking: { findFirst: vi.fn() },
      paymentTransaction: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        updateMany: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
    },
    syncPendingChapaPaymentsDetailed: vi.fn(),
    chapaRequest: vi.fn(),
  };
});

vi.mock("@/lib/prisma/client", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/payments/chapa/sync-pending-payments", () => ({
  syncPendingChapaPaymentsDetailed: mocks.syncPendingChapaPaymentsDetailed,
}));
vi.mock("@/lib/payments/chapa/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/payments/chapa/client")>()),
  chapaRequest: mocks.chapaRequest,
}));

import { initializeChapaPayment } from "@/lib/payments/chapa/initialize-payment";
import { ChapaApiError } from "@/lib/payments/chapa/client";
import { UserFacingError } from "@/lib/http/user-facing-error";

const NOW = new Date("2026-11-28T12:00:00.000Z");
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60 * 1000);

const booking = {
  id: "booking-1",
  bookingReference: "EB-TEST-1",
  customerProfileId: "profile-1",
  status: "PAYMENT_PENDING",
  paymentStatus: "PENDING",
  expiresAt: new Date(NOW.getTime() + 10 * 60 * 1000),
  totalAmount: { lessThanOrEqualTo: () => false, toString: () => "6000.00" },
  currency: "ETB",
  customerFirstName: "Test",
  customerLastName: "Customer",
  customerEmail: "customer@example.com",
  customerPhone: null,
};

function pendingCheckout(reference: string, createdAt: Date) {
  return { id: `id-${reference}`, transactionReference: reference, checkoutUrl: `https://checkout.chapa.co/${reference}`, createdAt };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ethiopianbooking.com");

  mocks.prisma.booking.findFirst.mockResolvedValue(booking);
  mocks.syncPendingChapaPaymentsDetailed.mockResolvedValue({ confirmed: false, unverifiedReferences: [] });
  mocks.prisma.paymentTransaction.findMany.mockResolvedValue([]);
  mocks.prisma.paymentTransaction.findFirst.mockResolvedValue(null);
  mocks.prisma.paymentTransaction.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.paymentTransaction.create.mockResolvedValue({ id: "new-tx" });
  mocks.chapaRequest.mockResolvedValue({ status: "success", message: "ok", data: { checkout_url: "https://checkout.chapa.co/new" } });
  mocks.tx.booking.findFirst.mockResolvedValue({ id: booking.id });
  mocks.tx.paymentTransaction.update.mockResolvedValue({ id: "new-tx", checkoutUrl: "https://checkout.chapa.co/new" });
});

describe("initializeChapaPayment checkout reuse", () => {
  it("reuses a checkout younger than 30 minutes without calling Chapa", async () => {
    mocks.prisma.paymentTransaction.findMany.mockResolvedValue([pendingCheckout("EB-RECENT", minutesAgo(10))]);

    const result = await initializeChapaPayment(booking.id, booking.customerProfileId);

    expect(result.checkoutUrl).toBe("https://checkout.chapa.co/EB-RECENT");
    expect(mocks.chapaRequest).not.toHaveBeenCalled();
    expect(mocks.prisma.paymentTransaction.updateMany).not.toHaveBeenCalled();
  });

  it("cancels a checkout older than 30 minutes and creates a fresh one", async () => {
    mocks.prisma.paymentTransaction.findMany.mockResolvedValue([pendingCheckout("EB-OLD", minutesAgo(45))]);

    const result = await initializeChapaPayment(booking.id, booking.customerProfileId);

    expect(mocks.prisma.paymentTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["id-EB-OLD"] }, status: "PENDING" },
      data: expect.objectContaining({ status: "CANCELLED", failureReason: expect.stringContaining("older than 30 minutes") }),
    });
    expect(mocks.chapaRequest).toHaveBeenCalledWith("/transaction/initialize", expect.anything());
    expect(result.checkoutUrl).toBe("https://checkout.chapa.co/new");
  });

  it("reports an already-paid booking instead of returning a checkout", async () => {
    mocks.syncPendingChapaPaymentsDetailed.mockResolvedValue({ confirmed: true, unverifiedReferences: [] });

    await expect(initializeChapaPayment(booking.id, booking.customerProfileId)).rejects.toThrow("already been paid");
    expect(mocks.chapaRequest).not.toHaveBeenCalled();
  });

  it("does not replace an old checkout whose status Chapa could not confirm", async () => {
    mocks.prisma.paymentTransaction.findMany.mockResolvedValue([pendingCheckout("EB-OLD", minutesAgo(45))]);
    mocks.syncPendingChapaPaymentsDetailed.mockResolvedValue({ confirmed: false, unverifiedReferences: ["EB-OLD"] });

    const attempt = initializeChapaPayment(booking.id, booking.customerProfileId);

    await expect(attempt).rejects.toBeInstanceOf(UserFacingError);
    await expect(attempt).rejects.toThrow("couldn't confirm the status of your previous payment");
    expect(mocks.prisma.paymentTransaction.updateMany).not.toHaveBeenCalled();
    expect(mocks.chapaRequest).not.toHaveBeenCalled();
  });
});

describe("initializeChapaPayment failure reason", () => {
  it("saves Chapa's own error message when Chapa rejects the request", async () => {
    mocks.chapaRequest.mockRejectedValue(
      new ChapaApiError("Chapa API request failed.", 400, { message: { phone_number: ["The phone number format is invalid."] }, status: "failed" })
    );

    await expect(initializeChapaPayment(booking.id, booking.customerProfileId)).rejects.toBeInstanceOf(ChapaApiError);

    expect(mocks.prisma.paymentTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: "new-tx", status: { in: ["INITIATED", "PENDING"] } },
      data: {
        status: "FAILED",
        failureReason: "Chapa rejected the payment request (HTTP 400): phone_number: The phone number format is invalid.",
      },
    });
  });

  it("saves Chapa's message when Chapa answers without a checkout link", async () => {
    mocks.chapaRequest.mockResolvedValue({ status: "failed", message: "Merchant account is not active", data: null });

    await expect(initializeChapaPayment(booking.id, booking.customerProfileId)).rejects.toBeInstanceOf(ChapaApiError);

    expect(mocks.prisma.paymentTransaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "FAILED", failureReason: "Chapa rejected the payment request (HTTP 200): Merchant account is not active" },
      })
    );
  });

  it("keeps the attempt unresolved when Chapa has a server error", async () => {
    mocks.chapaRequest.mockRejectedValue(new ChapaApiError("Chapa API request failed.", 502, { message: "Bad gateway" }));

    await expect(initializeChapaPayment(booking.id, booking.customerProfileId)).rejects.toBeInstanceOf(ChapaApiError);

    expect(mocks.prisma.paymentTransaction.updateMany).not.toHaveBeenCalled();
  });
});
