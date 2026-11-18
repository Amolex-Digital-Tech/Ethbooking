import { requirePartnerMembership } from "@/lib/auth/require-partner-membership";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";
import { writeAuditLog } from "@/lib/admin/write-audit-log";

export async function POST(_request: Request, { params }: { params: Promise<{ partnerId: string; bookingId: string }> }) {
  try {
    const { partnerId, bookingId } = await params;
    const { currentUser } = await requirePartnerMembership(partnerId, { allowedPartnerStatuses: ["ACTIVE"], allowStaff: true });
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, items: { some: { roomType: { property: { partnerId } } } } }, select: { id: true, status: true, paymentStatus: true, checkedInAt: true, checkedOutAt: true } });
    if (!booking) return Response.json({ success: false, error: "Booking not found for this partner." }, { status: 404 });
    if (booking.paymentStatus !== "PAID") return Response.json({ success: false, error: "Check-out is blocked because payment is not fully verified. Contact the Partner Owner or Manager." }, { status: 409 });
    if (booking.status !== "CONFIRMED" || !booking.checkedInAt || booking.checkedOutAt) return Response.json({ success: false, error: "Only a checked-in guest can be checked out." }, { status: 409 });
    const updated = await prisma.booking.updateMany({ where: { id: bookingId, status: "CONFIRMED", paymentStatus: "PAID", checkedInAt: { not: null }, checkedOutAt: null }, data: { checkedOutAt: new Date(), checkedOutByProfileId: currentUser.profile.id, status: "COMPLETED" } });
    if (updated.count !== 1) return Response.json({ success: false, error: "Booking changed while processing. Refresh and try again." }, { status: 409 });
    await writeAuditLog({ actorProfileId: currentUser.profile.id, actorRole: currentUser.roles.join(","), action: "PARTNER_GUEST_CHECKED_OUT", entityType: "BOOKING", entityId: bookingId, description: "Partner front desk checked out a guest.", metadata: { partnerId } });
    return Response.json({ success: true, message: "Guest checked out successfully." });
  } catch (error) { return handleAuthError(error); }
}
