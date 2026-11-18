import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

const bookingStatuses = [
  "PENDING",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
  "EXPIRED",
  "REFUND_PENDING",
  "REFUNDED",
];

const paymentStatuses = [
  "UNPAID",
  "PENDING",
  "PAID",
  "FAILED",
  "REFUND_PENDING",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
];

export async function GET(request: Request) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");

    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() || "";
    const requestedStatus = searchParams.get("status") || "";
    const requestedPaymentStatus =
      searchParams.get("paymentStatus") || "";

    const status = bookingStatuses.includes(requestedStatus)
      ? requestedStatus
      : "";

    const paymentStatus = paymentStatuses.includes(
      requestedPaymentStatus
    )
      ? requestedPaymentStatus
      : "";

    const bookings = await prisma.booking.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(paymentStatus
          ? { paymentStatus: paymentStatus as never }
          : {}),
        ...(q
          ? {
              OR: [
                {
                  bookingReference: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  customerFirstName: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  customerLastName: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  customerEmail: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  customerPhone: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        items: true,
        paymentTransactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return Response.json({
      success: true,
      count: bookings.length,
      data: bookings.map((booking) => ({
        ...booking,
        subtotal: booking.subtotal.toString(),
        discountAmount: booking.discountAmount.toString(),
        taxAmount: booking.taxAmount.toString(),
        totalAmount: booking.totalAmount.toString(),
        platformCommission: booking.platformCommission.toString(),
        paymentFee: booking.paymentFee.toString(),
        partnerAmount: booking.partnerAmount.toString(),
        items: booking.items.map((item) => ({
          ...item,
          pricePerNight: item.pricePerNight.toString(),
          subtotal: item.subtotal.toString(),
        })),
        paymentTransactions: booking.paymentTransactions.map(
          (transaction) => ({
            ...transaction,
            amount: transaction.amount.toString(),
          })
        ),
      })),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}