import { prisma } from "@/lib/prisma/client";
import { expireBooking } from "@/lib/bookings/expire-booking";

const BATCH_SIZE = 50;

export async function expireExpiredBookings() {
  const now = new Date();

  const bookings = await prisma.booking.findMany({
    where: {
      status: "PAYMENT_PENDING",
      paymentStatus: "PENDING",
      expiresAt: {
        lte: now,
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
  });

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