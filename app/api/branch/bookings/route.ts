import { requireBranchMembership } from "@/lib/auth/require-branch-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export async function GET(request: Request) {
  try {
    const currentUser = await requireBranchMembership("MANAGER", "STAFF");
    const query = new URL(request.url).searchParams.get("q")?.trim() || "";
    const bookings = await prisma.booking.findMany({
      where: {
        status: "REFUND_PENDING",
        paymentStatus: "REFUND_PENDING",
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
        cashRefund: { select: { id: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return Response.json({
      success: true,
      role: currentUser.branchMembership.role,
      branch: { id: currentUser.branchMembership.branch.id, name: currentUser.branchMembership.branch.name, address: currentUser.branchMembership.branch.address },
      bookings: bookings.map((booking) => ({ ...booking, refundAmount: booking.refundAmount.toString(), paymentTransactions: booking.paymentTransactions.map((p) => ({ amount: p.amount.toString() })) })),
    });
  } catch (error) { return handleAuthError(error); }
}
