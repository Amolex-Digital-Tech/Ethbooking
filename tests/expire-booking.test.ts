import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    booking: { findUnique: vi.fn(), updateMany: vi.fn() },
    paymentTransaction: { findFirst: vi.fn() },
  };
  return {
    tx,
    prisma: {
      booking: { findUnique: vi.fn() },
      paymentTransaction: { findMany: vi.fn(), updateMany: vi.fn() },
      $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
    },
    completeChapaPayment: vi.fn(),
    releaseRoomInventory: vi.fn(),
  };
});

vi.mock("@/lib/prisma/client", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/payments/chapa/verify-payment", () => ({ completeChapaPayment: mocks.completeChapaPayment }));
vi.mock("@/lib/availability/release-room-inventory", () => ({ releaseRoomInventory: mocks.releaseRoomInventory }));

import { expireBooking } from "@/lib/bookings/expire-booking";
import { ChapaApiError } from "@/lib/payments/chapa/client";

const NOW = new Date("2026-11-26T12:00:00.000Z");
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60 * 1000);

const expiredBooking = {
  id: "booking-1",
  bookingReference: "EB-TEST-1",
  status: "PAYMENT_PENDING",
  paymentStatus: "PENDING",
  expiresAt: minutesAgo(5),
};

// Simulates the database: paymentTransaction.updateMany marks the attempt
// as resolved, so the in-transaction "unresolved payment" check sees it.
let unresolvedAttemptRemains: boolean;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  unresolvedAttemptRemains = true;

  mocks.prisma.booking.findUnique.mockResolvedValue(expiredBooking);
  mocks.prisma.paymentTransaction.updateMany.mockImplementation(async () => {
    unresolvedAttemptRemains = false;
    return { count: 1 };
  });
  mocks.tx.booking.findUnique.mockResolvedValue({
    ...expiredBooking,
    checkInDate: new Date("2026-12-20T00:00:00.000Z"),
    checkOutDate: new Date("2026-12-22T00:00:00.000Z"),
    items: [{ roomTypeId: "room-1", quantity: 2 }],
  });
  mocks.tx.paymentTransaction.findFirst.mockImplementation(async () =>
    unresolvedAttemptRemains ? { id: "tx-1", status: "PENDING" } : null
  );
  mocks.tx.booking.updateMany.mockResolvedValue({ count: 1 });
});

function attempt(createdAt: Date) {
  mocks.prisma.paymentTransaction.findMany.mockResolvedValue([
    { transactionReference: "EB-TX-1", createdAt },
  ]);
}

function chapaSays(status: string) {
  mocks.completeChapaPayment.mockResolvedValue({
    success: false,
    completed: false,
    latePayment: false,
    status,
  });
}

describe("expireBooking with an unresolved Chapa attempt", () => {
  it("keeps the hold while a recent attempt is still pending", async () => {
    attempt(minutesAgo(30));
    chapaSays("pending");

    const result = await expireBooking("booking-1");

    expect(result.expired).toBe(false);
    expect(mocks.prisma.paymentTransaction.updateMany).not.toHaveBeenCalled();
    expect(mocks.releaseRoomInventory).not.toHaveBeenCalled();
  });

  it("abandons an attempt still pending after 2 hours and releases the rooms", async () => {
    attempt(minutesAgo(121));
    chapaSays("pending");

    const result = await expireBooking("booking-1");

    expect(mocks.prisma.paymentTransaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ transactionReference: "EB-TX-1" }),
        data: expect.objectContaining({ status: "CANCELLED" }),
      })
    );
    expect(result.expired).toBe(true);
    expect(mocks.releaseRoomInventory).toHaveBeenCalledWith(
      mocks.tx,
      expect.any(Date),
      expect.any(Date),
      [{ roomTypeId: "room-1", quantity: 2 }]
    );
  });

  it("treats a Chapa 4xx 'not paid' answer like pending", async () => {
    attempt(minutesAgo(121));
    mocks.completeChapaPayment.mockRejectedValue(
      new ChapaApiError("Chapa API request failed.", 400, { message: "Payment not paid yet" })
    );

    const result = await expireBooking("booking-1");

    expect(result.expired).toBe(true);
  });

  it("keeps the hold during a Chapa outage for up to 24 hours", async () => {
    attempt(minutesAgo(180));
    mocks.completeChapaPayment.mockRejectedValue(new ChapaApiError("Chapa API request failed.", 503, {}));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await expireBooking("booking-1");

    expect(result.expired).toBe(false);
    expect(mocks.releaseRoomInventory).not.toHaveBeenCalled();
  });

  it("releases the hold after 24 hours of failed verification", async () => {
    attempt(minutesAgo(24 * 60 + 1));
    mocks.completeChapaPayment.mockRejectedValue(new Error("network down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await expireBooking("booking-1");

    expect(result.expired).toBe(true);
  });

  it("never expires a booking Chapa reports as paid", async () => {
    attempt(minutesAgo(500));
    mocks.completeChapaPayment.mockResolvedValue({
      success: true,
      completed: true,
      latePayment: false,
      status: undefined,
    });

    const result = await expireBooking("booking-1");

    expect(result.expired).toBe(false);
    expect(mocks.prisma.paymentTransaction.updateMany).not.toHaveBeenCalled();
    expect(mocks.releaseRoomInventory).not.toHaveBeenCalled();
  });
});
