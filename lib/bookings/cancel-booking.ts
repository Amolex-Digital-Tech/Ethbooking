import { prisma } from "@/lib/prisma/client";
import { releaseRoomInventory } from "@/lib/availability/release-room-inventory";

export async function cancelBooking(
  bookingId: string,
  customerProfileId: string,
  cancellationReason?: string
) {
  if (!bookingId) {
    throw new Error("Booking ID is required.");
  }

  if (!customerProfileId) {
    throw new Error("Customer profile ID is required.");
  }

  return prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.findFirst({
      where: {
        id: bookingId,
        customerProfileId,
      },
      include: {
        items: true,
      },
    });

    if (!booking) {
      throw new Error("Booking not found.");
    }

    const claimed = await transaction.booking.updateMany({
      where: {
        id: booking.id,
        customerProfileId,
        status: "PAYMENT_PENDING",
        paymentStatus: "PENDING",
      },
      data: {
        status: "CANCELLED",
        paymentStatus: "FAILED",
        cancellationReason: cancellationReason?.trim() || null,
        cancelledAt: new Date(),
      },
    });

    if (claimed.count !== 1) {
      throw new Error(
        "This booking cannot be cancelled at this stage."
      );
    }

    await releaseRoomInventory(
      transaction,
      booking.checkInDate,
      booking.checkOutDate,
      booking.items.map((item) => ({
        roomTypeId: item.roomTypeId,
        quantity: item.quantity,
      }))
    );

    return {
      success: true,
      cancelled: true,
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      status: "CANCELLED",
      paymentStatus: "FAILED",
      cancellationReason: cancellationReason?.trim() || null,
      cancelledAt: new Date(),
    };
  });
}