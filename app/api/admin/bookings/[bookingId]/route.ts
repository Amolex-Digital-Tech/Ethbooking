import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma/client";
import { releaseRoomInventory } from "@/lib/availability/release-room-inventory";
import { writeAuditLog } from "@/lib/admin/write-audit-log";

type RouteProps = {
  params: Promise<{ bookingId: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN");
    const { bookingId } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        items: { include: { roomType: { include: { property: true } }, ratePlan: true } },
        guests: true,
        paymentTransactions: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!booking) {
      return Response.json({ success: false, error: "Booking not found." }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: {
        ...booking,
        subtotal: booking.subtotal.toString(),
        discountAmount: booking.discountAmount.toString(),
        taxAmount: booking.taxAmount.toString(),
        totalAmount: booking.totalAmount.toString(),
        platformCommission: booking.platformCommission.toString(),
        paymentFee: booking.paymentFee.toString(),
        partnerAmount: booking.partnerAmount.toString(),
        refundAmount: booking.refundAmount.toString(),
        cancellationFeeAmount: booking.cancellationFeeAmount.toString(),
        items: booking.items.map((item) => ({
          ...item,
          pricePerNight: item.pricePerNight.toString(),
          subtotal: item.subtotal.toString(),
        })),
        paymentTransactions: booking.paymentTransactions.map((transaction) => ({
          ...transaction,
          amount: transaction.amount.toString(),
        })),
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { bookingId } = await params;
    const body = await request.json().catch(() => null);
    const action = body?.action;
    const currentUser = await requireRole("ADMIN", "SUPER_ADMIN");
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!["CANCEL_UNPAID", "FLAG_REFUND_REVIEW", "RECORD_CASH_REFUND"].includes(action)) {
      return Response.json({ success: false, error: "Unsupported booking action." }, { status: 400 });
    }
    if (action !== "RECORD_CASH_REFUND" && (reason.length < 5 || reason.length > 500)) {
      return Response.json({ success: false, error: "Enter a reason between 5 and 500 characters." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { items: true, paymentTransactions: true },
      });

      if (!booking) {
        return { error: "Booking not found.", status: 404 };
      }
      const successfulPayments = booking.paymentTransactions.filter((item) => item.status === "SUCCESS");
      const hasSuccessfulPayment = successfulPayments.length > 0;

      if (action === "RECORD_CASH_REFUND") {
        if (booking.status !== "REFUND_PENDING" || booking.paymentStatus !== "REFUND_PENDING") {
          return { error: "Only bookings awaiting refund review can receive a cash refund.", status: 409 };
        }
        if (!hasSuccessfulPayment) {
          return { error: "No successful payment exists for this booking.", status: 409 };
        }
        const branchName = typeof body?.branchName === "string" ? body.branchName.trim() : "";
        const branchAddress = typeof body?.branchAddress === "string" ? body.branchAddress.trim() : "";
        const recipientName = typeof body?.recipientName === "string" ? body.recipientName.trim() : "";
        const recipientPhone = typeof body?.recipientPhone === "string" ? body.recipientPhone.trim() : "";
        const receiptNumber = typeof body?.receiptNumber === "string" ? body.receiptNumber.trim() : "";
        const note = typeof body?.note === "string" ? body.note.trim() : "";
        const confirmed = body?.confirmed === true;
        if (branchName.length < 2 || branchName.length > 120 ||
            branchAddress.length < 5 || branchAddress.length > 300 ||
            recipientName.length < 2 || recipientName.length > 120 ||
            receiptNumber.length < 3 || receiptNumber.length > 80 ||
            recipientPhone.length > 40 || note.length > 1000) {
          return { error: "Enter valid branch, recipient and receipt details. Branch address must be at least 5 characters.", status: 400 };
        }
        if (!confirmed) {
          return { error: "Confirm that the full cash amount has physically been handed to the recipient.", status: 400 };
        }
        const fullPaidAmount = successfulPayments.reduce(
          (sum, payment) => sum.plus(payment.amount),
          new Prisma.Decimal(0)
        );
        if (!booking.refundAmount.equals(fullPaidAmount)) {
          return { error: "The refund amount does not match the full successful payment amount. Ask an administrator to review this booking.", status: 409 };
        }
        const now = new Date();
        await tx.cashRefund.create({
          data: {
            bookingId: booking.id,
            amount: fullPaidAmount,
            currency: booking.currency,
            branchName,
            branchAddress,
            recipientName,
            recipientPhone: recipientPhone || null,
            receiptNumber,
            handedOverAt: now,
            note: note || null,
            recordedByProfileId: currentUser.profile.id,
          },
        });
        const updated = await tx.booking.updateMany({
          where: { id: booking.id, status: "REFUND_PENDING", paymentStatus: "REFUND_PENDING" },
          data: { status: "REFUNDED", paymentStatus: "REFUNDED" },
        });
        if (updated.count !== 1) {
          throw new Error("Booking changed while the cash refund was being recorded. No refund record was saved.");
        }
        return {
          success: true,
          message: "Full cash refund recorded. Booking marked as refunded. The original payment transaction remains unchanged.",
          refundAmount: fullPaidAmount.toString(),
        };
      }

      if (action === "CANCEL_UNPAID") {
        if (["CANCELLED", "REFUNDED", "COMPLETED", "NO_SHOW", "EXPIRED"].includes(booking.status)) {
          return { error: `This booking cannot be cancelled from status ${booking.status}.`, status: 409 };
        }
        if (hasSuccessfulPayment || booking.paymentStatus === "PAID" || booking.paymentStatus === "PARTIALLY_PAID" || booking.paymentStatus === "REFUND_PENDING" || booking.paymentStatus === "REFUNDED") {
          return { error: "This booking has a successful payment. Use refund review instead; this action cannot cancel or release its inventory.", status: 409 };
        }
        if (!["PAYMENT_PENDING", "PENDING"].includes(booking.status) || !["UNPAID", "PENDING", "FAILED"].includes(booking.paymentStatus)) {
          return { error: "Only unpaid bookings awaiting payment can be cancelled with this action.", status: 409 };
        }

        const claimed = await tx.booking.updateMany({
          where: {
            id: booking.id,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
          },
          data: {
            status: "CANCELLED",
            paymentStatus: booking.paymentStatus === "FAILED" ? "FAILED" : "UNPAID",
            cancellationReason: reason,
            cancelledAt: new Date(),
          },
        });
        if (claimed.count !== 1) {
          return { error: "Booking changed while this action was being processed. Refresh and try again.", status: 409 };
        }

        await releaseRoomInventory(
          tx,
          booking.checkInDate,
          booking.checkOutDate,
          booking.items.map((item) => ({ roomTypeId: item.roomTypeId, quantity: item.quantity }))
        );

        return { success: true, message: "Unpaid booking cancelled and its future reserved inventory released." };
      }

      if (!hasSuccessfulPayment) {
        return { error: "No successful payment exists for this booking. It cannot be sent for refund review.", status: 409 };
      }
      if (booking.status === "REFUND_PENDING" || booking.paymentStatus === "REFUND_PENDING") {
        return { error: "This booking is already awaiting refund review.", status: 409 };
      }
      if (!["CONFIRMED", "CANCELLED", "EXPIRED"].includes(booking.status)) {
        return { error: "This booking is not in a state eligible for refund review.", status: 409 };
      }

      const successfulAmount = successfulPayments.reduce(
        (sum, payment) => sum.plus(payment.amount),
        new Prisma.Decimal(0)
      );

      const claimed = await tx.booking.updateMany({
        where: { id: booking.id, status: booking.status, paymentStatus: booking.paymentStatus },
        data: {
          status: "REFUND_PENDING",
          paymentStatus: "REFUND_PENDING",
          refundAmount: successfulAmount,
          cancellationReason: reason,
        },
      });
      if (claimed.count !== 1) {
        return { error: "Booking changed while this action was being processed. Refresh and try again.", status: 409 };
      }

      return {
        success: true,
        message: "Booking flagged for refund review. No money has been refunded and inventory has not been released.",
        refundAmount: successfulAmount.toString(),
      };
    });

    if ("error" in result) {
      return Response.json({ success: false, error: result.error }, { status: result.status });
    }
    const auditAction = action === "CANCEL_UNPAID" ? "BOOKING_CANCELLED_UNPAID" : action === "FLAG_REFUND_REVIEW" ? "BOOKING_FLAGGED_REFUND_REVIEW" : "CASH_REFUND_RECORDED";
    await writeAuditLog({ actorProfileId: currentUser.profile.id, actorRole: currentUser.roles.join(","), action: auditAction, entityType: "BOOKING", entityId: bookingId, description: action === "CANCEL_UNPAID" ? `Cancelled unpaid booking ${bookingId}.` : action === "FLAG_REFUND_REVIEW" ? `Flagged booking ${bookingId} for cash refund review.` : `Recorded cash refund for booking ${bookingId}.`, metadata: { bookingAction: action, ...("refundAmount" in result ? { refundAmount: result.refundAmount } : {}) } });
    return Response.json(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ success: false, error: "A cash refund already exists for this booking, or this receipt number is already in use." }, { status: 409 });
    }
    return handleAuthError(error);
  }
}
