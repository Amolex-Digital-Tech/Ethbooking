
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma/client";
import { releaseRoomInventory } from "@/lib/availability/release-room-inventory";

export async function cancelPartnerBooking(
  bookingId: string,
  partnerId: string,
  cancellationReason?: string
) {
  if (!bookingId || !partnerId) {
    throw new Error("Booking and partner IDs are required.");
  }

  return prisma.$transaction(
    async (transaction) => {
      const booking = await transaction.booking.findFirst({
        where: {
          id: bookingId,
          items: {
            some: {
              roomType: {
                property: {
                  partnerId,
                },
              },
            },
          },
        },
        include: {
          items: {
            include: {
              roomType: {
                include: {
                  property: {
                    select: {
                      partnerId: true,
                    },
                  },
                },
              },
            },
          },
          paymentTransactions: {
            select: {
              status: true,
            },
          },
        },
      });

      if (!booking) {
        throw new Error("Booking not found.");
      }

      // A partner must not cancel a booking containing another
      // partner's rooms because the booking has one shared status.
      const containsOtherPartnerItems = booking.items.some(
        (item) => item.roomType.property.partnerId !== partnerId
      );

      if (containsOtherPartnerItems) {
        throw new Error(
          "This booking includes rooms from another partner. Please contact an administrator."
        );
      }

      // Paid and partially paid bookings must be handled by an admin.
      if (
        booking.paymentStatus === "PAID" ||
        booking.paymentStatus === "PARTIALLY_PAID" ||
        booking.paymentStatus === "REFUND_PENDING" ||
        booking.paymentStatus === "PARTIALLY_REFUNDED" ||
        booking.paymentStatus === "REFUNDED"
      ) {
        throw new Error(
          "Paid or partially paid bookings must be handled by an administrator."
        );
      }

      // Do not cancel if Chapa has already recorded a successful payment.
      if (
        booking.paymentTransactions.some(
          (payment) => payment.status === "SUCCESS"
        )
      ) {
        throw new Error(
          "A successful payment exists for this booking. Please contact an administrator."
        );
      }

      // Only unpaid bookings in these active states can be cancelled.
      if (
        !["PENDING", "PAYMENT_PENDING", "CONFIRMED"].includes(
          booking.status
        ) ||
        !["UNPAID", "PENDING"].includes(booking.paymentStatus)
      ) {
        throw new Error(
          "This booking cannot be cancelled at this stage."
        );
      }

      const normalizedReason =
        cancellationReason?.trim() || "Cancelled by partner";

      // Atomic claim: only one cancellation request can succeed.
      const claimed = await transaction.booking.updateMany({
        where: {
          id: booking.id,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          items: {
            some: {
              roomType: {
                property: {
                  partnerId,
                },
              },
            },
          },
          paymentTransactions: {
            none: {
              status: "SUCCESS",
            },
          },
        },
        data: {
          status: "CANCELLED",
          paymentStatus:
            booking.paymentStatus === "PENDING" ? "FAILED" : "UNPAID",
          cancellationReason: normalizedReason,
          cancelledAt: new Date(),
        },
      });

      if (claimed.count !== 1) {
        throw new Error(
          "This booking has changed and can no longer be cancelled. Refresh the page and try again."
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
        paymentStatus:
          booking.paymentStatus === "PENDING" ? "FAILED" : "UNPAID",
        cancellationReason: normalizedReason,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}
