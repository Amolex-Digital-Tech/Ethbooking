import { requireBranchMembership } from "@/lib/auth/require-branch-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { AWAITING_CASH_REFUND_WHERE } from "@/lib/refunds/cash-refund-amount";

export async function GET(request: Request) {
  try {
    const currentUser = await requireBranchMembership("MANAGER", "STAFF");
    const query = new URL(request.url).searchParams.get("q")?.trim() || "";
    const bookings = await prisma.booking.findMany({
      where: {
        ...AWAITING_CASH_REFUND_WHERE,
        ...(query ? { OR: [
          { bookingReference: { contains: query, mode: "insensitive" as const } },
          { customerFirstName: { contains: query, mode: "insensitive" as const } },
          { customerLastName: { contains: query, mode: "insensitive" as const } },
          { customerEmail: { contains: query, mode: "insensitive" as const } },
          { customerPhone: { contains: query, mode: "insensitive" as const } },
        ] } : {}),
      },
      select: {
        id: true, bookingReference: true, customerFirstName: true, customerLastName: true,
        customerEmail: true, customerPhone: true, refundAmount: true, currency: true,
        checkInDate: true, checkOutDate: true, createdAt: true,
        paymentTransactions: { where: { status: "SUCCESS" }, select: { amount: true } },
        cashRefunds: { select: { amount: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return Response.json({
      success: true,
      role: currentUser.branchMembership.role,
      branch: { id: currentUser.branchMembership.branch.id, name: currentUser.branchMembership.branch.name, address: currentUser.branchMembership.branch.address },
      bookings: bookings.map(({ cashRefunds, ...booking }) => {
        const alreadyRefunded = cashRefunds.reduce((sum, cashRefund) => sum.plus(cashRefund.amount), new Prisma.Decimal(0));
        return {
          ...booking,
          // Amount still to hand over: the total owed minus earlier cash refunds.
          refundAmount: booking.refundAmount.minus(alreadyRefunded).toString(),
          paymentTransactions: booking.paymentTransactions.map((p) => ({ amount: p.amount.toString() })),
        };
      }),
    });
  } catch (error) { return handleAuthError(error); }
}
