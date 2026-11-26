import { Prisma } from "@/lib/generated/prisma/client";
import { requireBranchMembership } from "@/lib/auth/require-branch-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { isAwaitingCashRefund, resolveCashRefundAmount, statusAfterCashRefund } from "@/lib/refunds/cash-refund-amount";

type Props = { params: Promise<{ bookingId: string }> };
export async function POST(request: Request, { params }: Props) {
  try {
    const currentUser = await requireBranchMembership("MANAGER");
    const { bookingId } = await params;
    const body = await request.json().catch(() => null);
    const recipientName = typeof body?.recipientName === "string" ? body.recipientName.trim() : "";
    const recipientPhone = typeof body?.recipientPhone === "string" ? body.recipientPhone.trim() : "";
    const receiptNumber = typeof body?.receiptNumber === "string" ? body.receiptNumber.trim() : "";
    const note = typeof body?.note === "string" ? body.note.trim() : "";
    if (recipientName.length < 2 || recipientName.length > 120 || receiptNumber.length < 3 || receiptNumber.length > 80 || recipientPhone.length > 40 || note.length > 1000) {
      return Response.json({ success: false, error: "Enter a valid recipient name and official receipt number. Phone and note are optional." }, { status: 400 });
    }
    if (body?.confirmed !== true) return Response.json({ success: false, error: "Confirm that the refund amount has physically been handed to the recipient in cash." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { paymentTransactions: true, cashRefunds: { select: { amount: true } } } });
      if (!booking) return { error: "Booking not found.", status: 404 as const };
      if (!isAwaitingCashRefund(booking.status, booking.paymentStatus)) return { error: "This booking is not awaiting a cash refund.", status: 409 as const };
      const refund = resolveCashRefundAmount({
        refundAmount: booking.refundAmount,
        successfulPaymentAmounts: booking.paymentTransactions.filter((payment) => payment.status === "SUCCESS").map((payment) => payment.amount),
        alreadyRefundedAmounts: booking.cashRefunds.map((cashRefund) => cashRefund.amount),
      });
      if (!refund.ok) return { error: refund.error, status: 409 as const };
      // Claim the booking first so two people cannot record the same refund.
      const updated = await tx.booking.updateMany({
        where: { id: booking.id, status: booking.status, paymentStatus: booking.paymentStatus },
        data: statusAfterCashRefund(booking.status),
      });
      if (updated.count !== 1) throw new Error("Booking changed while recording the refund. No refund was recorded.");
      await tx.cashRefund.create({ data: {
        bookingId: booking.id, amount: refund.amount, currency: booking.currency,
        branchId: currentUser.branchMembership.branchId,
        branchName: currentUser.branchMembership.branch.name,
        branchAddress: currentUser.branchMembership.branch.address,
        recipientName, recipientPhone: recipientPhone || null, receiptNumber,
        handedOverAt: new Date(), note: note || null, recordedByProfileId: currentUser.profile.id,
      } });
      return { success: true, message: `Cash refund of ${booking.currency} ${refund.amount.toFixed(2)} recorded for this branch. The original payment transaction remains unchanged.`, amount: refund.amount.toString() };
    });
    if ("error" in result) return Response.json({ success: false, error: result.error }, { status: result.status });
    return Response.json(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ success: false, error: "This receipt number is already in use." }, { status: 409 });
    return handleAuthError(error);
  }
}
