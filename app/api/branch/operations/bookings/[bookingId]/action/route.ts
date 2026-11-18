import { requireBranchMembership } from "@/lib/auth/require-branch-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { writeAuditLog } from "@/lib/admin/write-audit-log";

type Props = { params: Promise<{ bookingId: string }> };
const actions = ["CHECK_IN", "CHECK_OUT"] as const;

export async function POST(request: Request, { params }: Props) {
  try {
    const currentUser = await requireBranchMembership("MANAGER", "STAFF");
    const { bookingId } = await params;
    const body = await request.json().catch(() => null);
    const action = body?.action as typeof actions[number];

    if (!actions.includes(action)) {
      return Response.json({ success: false, error: "Unsupported booking action." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { items: true, paymentTransactions: true },
      });
      if (!booking) return { error: "Booking not found.", status: 404 as const };

      if (action === "CHECK_IN") {
        if (booking.paymentStatus !== "PAID") return { error: "Check-in is blocked until payment is fully verified.", status: 409 as const };
        if (booking.status !== "CONFIRMED" || booking.checkedInAt || booking.checkedOutAt) {
          return { error: "Only a confirmed booking that has not already checked in or out can be checked in.", status: 409 as const };
        }
        const changed = await tx.booking.updateMany({
          where: { id: bookingId, status: "CONFIRMED", paymentStatus: "PAID", checkedInAt: null, checkedOutAt: null },
          data: { checkedInAt: new Date(), checkedInByProfileId: currentUser.profile.id },
        });
        if (changed.count !== 1) return { error: "Booking changed while processing. Refresh and try again.", status: 409 as const };
        return { success: true, message: "Guest checked in successfully.", auditAction: "BRANCH_GUEST_CHECKED_IN" };
      }

      if (action === "CHECK_OUT") {
        if (booking.paymentStatus !== "PAID") return { error: "Check-out is blocked until payment is fully verified.", status: 409 as const };
        if (booking.status !== "CONFIRMED" || !booking.checkedInAt || booking.checkedOutAt) {
          return { error: "Only a checked-in guest can be checked out.", status: 409 as const };
        }
        const changed = await tx.booking.updateMany({
          where: { id: bookingId, status: "CONFIRMED", paymentStatus: "PAID", checkedInAt: { not: null }, checkedOutAt: null },
          data: { checkedOutAt: new Date(), checkedOutByProfileId: currentUser.profile.id, status: "COMPLETED" },
        });
        if (changed.count !== 1) return { error: "Booking changed while processing. Refresh and try again.", status: 409 as const };
        return { success: true, message: "Guest checked out successfully. Booking marked completed.", auditAction: "BRANCH_GUEST_CHECKED_OUT" };
      }

      return { error: "Unsupported booking action.", status: 400 as const };

    });

    if ("error" in result) return Response.json({ success: false, error: result.error }, { status: result.status });
    await writeAuditLog({
      actorProfileId: currentUser.profile.id,
      actorRole: currentUser.roles.join(","),
      action: result.auditAction,
      entityType: "BOOKING",
      entityId: bookingId,
      description: result.message,
      metadata: { branchId: currentUser.branchMembership.branchId, branchName: currentUser.branchMembership.branch.name, bookingAction: action },
    });
    return Response.json({ success: true, message: result.message });
  } catch (error) {
    return handleAuthError(error);
  }
}
