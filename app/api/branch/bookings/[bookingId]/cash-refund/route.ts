import { Prisma } from "@/lib/generated/prisma/client";
import { requireBranchMembership } from "@/lib/auth/require-branch-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

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
    if (body?.confirmed !== true) return Response.json({ success: false, error: "Confirm that the full cash amount has physically been handed to the recipient." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { paymentTransactions: true, cashRefund: true } });
      if (!booking) return { error: "Booking not found.", status: 404 as const };
      if (booking.status !== "REFUND_PENDING" || booking.paymentStatus !== "REFUND_PENDING") return { error: "This booking is not awaiting refund review.", status: 409 as const };
      if (booking.cashRefund) return { error: "A cash refund has already been recorded for this booking.", status: 409 as const };
      const successfulPayments = booking.paymentTransactions.filter((payment) => payment.status === "SUCCESS");
      if (successfulPayments.length === 0) return { error: "No successful payment exists for this booking.", status: 409 as const };
      const fullPaidAmount = successfulPayments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
      if (!booking.refundAmount.equals(fullPaidAmount)) return { error: "The refund amount does not match the full successful payment amount. Ask an administrator to review this booking.", status: 409 as const };
      await tx.cashRefund.create({ data: {
        bookingId: booking.id, amount: fullPaidAmount, currency: booking.currency,
        branchId: currentUser.branchMembership.branchId,
        branchName: currentUser.branchMembership.branch.name,
        branchAddress: currentUser.branchMembership.branch.address,
        recipientName, recipientPhone: recipientPhone || null, receiptNumber,
        handedOverAt: new Date(), note: note || null, recordedByProfileId: currentUser.profile.id,
      } });
      const updated = await tx.booking.updateMany({ where: { id: booking.id, status: "REFUND_PENDING", paymentStatus: "REFUND_PENDING" }, data: { status: "REFUNDED", paymentStatus: "REFUNDED" } });
      if (updated.count !== 1) throw new Error("Booking changed while recording the refund. No refund was recorded.");
      return { success: true, message: "Full cash refund recorded for this branch. The original payment transaction remains unchanged.", amount: fullPaidAmount.toString() };
    });
    if ("error" in result) return Response.json({ success: false, error: result.error }, { status: result.status });
    return Response.json(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ success: false, error: "This booking already has a cash refund, or the receipt number is already in use." }, { status: 409 });
    return handleAuthError(error);
  }
}
