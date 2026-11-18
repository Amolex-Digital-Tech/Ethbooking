import { requireBranchMembership } from "@/lib/auth/require-branch-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

const bookingStatuses = [
  "PENDING", "PAYMENT_PENDING", "CONFIRMED", "CANCELLED", "COMPLETED",
  "EXPIRED", "NO_SHOW", "REFUND_PENDING", "REFUNDED",
] as const;

export async function GET(request: Request) {
  try {
    const currentUser = await requireBranchMembership("MANAGER", "STAFF");
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const requestedStatus = searchParams.get("status") || "ALL";
    const status = bookingStatuses.includes(requestedStatus as typeof bookingStatuses[number])
      ? requestedStatus
      : "ALL";

    const where = {
      ...(status !== "ALL" ? { status: status as typeof bookingStatuses[number] } : {}),
      ...(query ? {
        OR: [
          { bookingReference: { contains: query, mode: "insensitive" as const } },
          { customerFirstName: { contains: query, mode: "insensitive" as const } },
          { customerLastName: { contains: query, mode: "insensitive" as const } },
          { customerEmail: { contains: query, mode: "insensitive" as const } },
          { customerPhone: { contains: query, mode: "insensitive" as const } },
          { items: { some: { roomType: { property: { name: { contains: query, mode: "insensitive" as const } } } } } },
        ],
      } : {}),
    };

    const [bookings, counts, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        select: {
          id: true,
          bookingReference: true,
          status: true,
          paymentStatus: true,
          customerFirstName: true,
          customerLastName: true,
          customerEmail: true,
          customerPhone: true,
          checkInDate: true,
          checkOutDate: true,
          checkedInAt: true,
          checkedOutAt: true,
          nights: true,
          guestCount: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          items: {
            select: {
              roomName: true,
              quantity: true,
              roomType: { select: { property: { select: { name: true } } } },
            },
          },
          cashRefund: { select: { id: true, amount: true, currency: true, handedOverAt: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.booking.count({ where }),
    ]);

    return Response.json({
      success: true,
      role: currentUser.branchMembership.role,
      branch: {
        id: currentUser.branchMembership.branch.id,
        name: currentUser.branchMembership.branch.name,
      },
      total,
      counts: Object.fromEntries(counts.map((item) => [item.status, item._count._all])),
      bookings: bookings.map((booking) => ({
        ...booking,
        totalAmount: booking.totalAmount.toString(),
        cashRefund: booking.cashRefund ? {
          ...booking.cashRefund,
          amount: booking.cashRefund.amount.toString(),
        } : null,
      })),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
