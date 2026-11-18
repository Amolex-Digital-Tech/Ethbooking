import { Prisma } from "@/lib/generated/prisma/client";
import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { writeAuditLog } from "@/lib/admin/write-audit-log";

const methods = ["CASH", "BANK_TRANSFER", "POS_CARD", "MOBILE_MONEY", "OTHER"] as const;

export async function POST(request: Request, { params }: { params: Promise<{ partnerId: string; bookingId: string }> }) {
  try {
    const { partnerId, bookingId } = await params;
    const { currentUser } = await requirePartnerMembership(partnerId, { allowedPartnerStatuses: ["ACTIVE"] });
    const body = await request.json().catch(() => null);
    const amount = Number(body?.amount);
    const method = String(body?.method ?? "");
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount * 100)) return Response.json({ success: false, error: "Enter a payment amount greater than zero with no more than two decimal places." }, { status: 400 });
    if (!methods.includes(method as (typeof methods)[number])) return Response.json({ success: false, error: "Select a valid payment method." }, { status: 400 });
    const methodDetails = typeof body?.methodDetails === "string" ? body.methodDetails.trim() : "";
    if (method === "OTHER" && !methodDetails) return Response.json({ success: false, error: "Describe the payment method." }, { status: 400 });
    const paidAt = body?.paidAt ? new Date(String(body.paidAt)) : new Date();
    if (Number.isNaN(paidAt.getTime()) || paidAt.getTime() > Date.now()) return Response.json({ success: false, error: "Enter a valid payment date that is not in the future." }, { status: 400 });
    const reference = typeof body?.reference === "string" ? body.reference.trim().slice(0, 120) : "";
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, items: { some: { roomType: { property: { partnerId } } } } },
        include: {
          items: { select: { roomType: { select: { property: { select: { partnerId: true } } } } } },
          offlinePayments: { select: { amount: true } },
          paymentTransactions: { where: { status: "SUCCESS" }, select: { amount: true } },
        },
      });
      if (!booking) throw new Error("BOOKING_NOT_FOUND");
      if (booking.items.some((item) => item.roomType.property.partnerId !== partnerId)) throw new Error("MULTI_PARTNER_BOOKING");
      if (booking.status !== "CONFIRMED") throw new Error("BOOKING_NOT_PAYABLE");
      if (booking.paymentStatus === "PAID") throw new Error("BOOKING_ALREADY_PAID");
      if (!["UNPAID", "PARTIALLY_PAID"].includes(booking.paymentStatus)) throw new Error("BOOKING_NOT_PAYABLE");
      const offlineTotal = booking.offlinePayments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
      const onlineTotal = booking.paymentTransactions.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
      const alreadyPaid = offlineTotal.plus(onlineTotal);
      const remaining = new Prisma.Decimal(booking.totalAmount).minus(alreadyPaid);
      const received = new Prisma.Decimal(amount);
      if (received.greaterThan(remaining)) throw new Error("PAYMENT_EXCEEDS_BALANCE");
      const totalPaid = alreadyPaid.plus(received);
      const paymentStatus = totalPaid.greaterThanOrEqualTo(booking.totalAmount) ? "PAID" : "PARTIALLY_PAID";
      await tx.offlinePayment.create({
        data: {
          bookingId, method: method as (typeof methods)[number], methodDetails: methodDetails || null,
          amount: received, currency: booking.currency, reference: reference || null, note: note || null,
          paidAt, recordedByProfileId: currentUser.profile.id,
        },
      });
      await tx.booking.update({ where: { id: bookingId }, data: { paymentStatus } });
      return { paymentStatus, remainingBalance: new Prisma.Decimal(booking.totalAmount).minus(totalPaid).toString() };
    });
    await writeAuditLog({ actorProfileId: currentUser.profile.id, actorRole: currentUser.roles.join(","), action: "PARTNER_OFFLINE_PAYMENT_RECORDED", entityType: "BOOKING", entityId: bookingId, description: "Partner management recorded an offline guest payment.", metadata: { partnerId, amount, method } });
    return Response.json({ success: true, message: "Payment recorded successfully.", data: result });
  } catch (error) {
    if (error instanceof Error) {
      const errors: Record<string, [string, number]> = {
        BOOKING_NOT_FOUND: ["Booking not found for this partner.", 404],
        MULTI_PARTNER_BOOKING: ["This booking includes another partner's property. Contact EthiopianBooking support to record the payment.", 409],
        BOOKING_NOT_PAYABLE: ["Only confirmed bookings can receive an offline payment.", 409],
        BOOKING_ALREADY_PAID: ["This booking is already fully paid.", 409],
        PAYMENT_EXCEEDS_BALANCE: ["The payment amount cannot exceed the outstanding balance.", 409],
      };
      const match = errors[error.message];
      if (match) return Response.json({ success: false, error: match[0] }, { status: match[1] });
    }
    return handleAuthError(error);
  }
}
