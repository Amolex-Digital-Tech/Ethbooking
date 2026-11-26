import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  expireBooking: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({ prisma: { booking: { findMany: mocks.findMany } } }));
vi.mock("@/lib/bookings/expire-booking", () => ({ expireBooking: mocks.expireBooking }));

import { expireExpiredBookings } from "@/lib/bookings/expire-expired-bookings";

const rows = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}`, bookingReference: `${prefix}-${i}` }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("expireExpiredBookings", () => {
  it("processes plain expired bookings even when many are waiting on Chapa", async () => {
    mocks.findMany.mockImplementation(async (args: { where: { paymentTransactions: object } }) =>
      "none" in args.where.paymentTransactions ? rows("plain", 3) : rows("waiting", 25)
    );
    mocks.expireBooking.mockImplementation(async (id: string) => ({ expired: id.startsWith("plain") }));

    const result = await expireExpiredBookings();

    expect(mocks.findMany).toHaveBeenCalledTimes(2);
    const takes = mocks.findMany.mock.calls.map(([args]) => args.take).sort((a, b) => a - b);
    expect(takes).toEqual([25, 50]);
    expect(result.processed).toBe(28);
    expect(result.expired).toBe(3);
    for (const row of rows("plain", 3)) {
      expect(mocks.expireBooking).toHaveBeenCalledWith(row.id);
    }
  });

  it("keeps going when one booking fails", async () => {
    mocks.findMany.mockImplementation(async (args: { where: { paymentTransactions: object } }) =>
      "none" in args.where.paymentTransactions ? rows("plain", 2) : []
    );
    mocks.expireBooking
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ expired: true });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await expireExpiredBookings();

    expect(result.failed).toBe(1);
    expect(result.expired).toBe(1);
    expect(result.success).toBe(false);
  });
});
