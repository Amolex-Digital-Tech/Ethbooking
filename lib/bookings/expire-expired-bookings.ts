import { prisma } from "@/lib/prisma/client";
import { expireBooking } from "@/lib/bookings/expire-booking";

const BATCH_SIZE = 50;
// Bookings with an unresolved Chapa attempt need a provider call each and
// may legitimately stay held for a while, so they get their own smaller
// batch. Keeping them separate stops a backlog of them from filling the
// main batch and blocking every other expired booking.
const UNRESOLVED_PAYMENT_BATCH_SIZE = 25;

const UNRESOLVED_PAYMENT_STATUSES = ["INITIATED", "PENDING"] as const;

export async function expireExpiredBookings() {
  const now = new Date();
  const expiredPendingBooking = {
    status: "PAYMENT_PENDING" as const,
    paymentStatus: "PENDING" as const,
    expiresAt: {
      lte: now,
    },
  };

  const [withoutUnresolvedPayments, withUnresolvedPayments] = await Promise.all([
    prisma.booking.findMany({
      where: {
        ...expiredPendingBooking,
        paymentTransactions: {
          none: { status: { in: [...UNRESOLVED_PAYMENT_STATUSES] } },
        },
      },
      select: {
        id: true,
        bookingReference: true,
      },
      orderBy: {
        expiresAt: "asc",
      },
      take: BATCH_SIZE,
    }),
    prisma.booking.findMany({
      where: {
        ...expiredPendingBooking,
        paymentTransactions: {
          some: { status: { in: [...UNRESOLVED_PAYMENT_STATUSES] } },
        },
      },
      select: {
        id: true,
        bookingReference: true,
      },
      orderBy: {
        expiresAt: "asc",
      },
      take: UNRESOLVED_PAYMENT_BATCH_SIZE,
    }),
  ]);

  const bookings = [...withoutUnresolvedPayments, ...withUnresolvedPayments];

  let expiredCount = 0;
  let failedCount = 0;

  const results: Array<{
    bookingId: string;
    bookingReference: string;
    expired: boolean;
    error?: string;
  }> = [];

  for (const booking of bookings) {
    try {
      const result = await expireBooking(booking.id);

      if (result.expired) {
        expiredCount++;
      }

      results.push({
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        expired: result.expired,
      });
    } catch (error) {
      failedCount++;

      results.push({
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        expired: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to expire booking.",
      });

      console.error(
        `Failed to expire booking ${booking.bookingReference}:`,
        error
      );
    }
  }

  return {
    success: failedCount === 0,
    processed: bookings.length,
    expired: expiredCount,
    failed: failedCount,
    results,
  };
}