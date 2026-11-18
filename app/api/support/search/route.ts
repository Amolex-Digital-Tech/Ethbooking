import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

export async function GET(request: Request) {
  try {
    await requireRole("SUPPORT_AGENT");
    const q = new URL(request.url).searchParams.get("q")?.trim() || "";
    if (q.length < 2) return Response.json({ success: true, data: [] });
    const bookings = await prisma.booking.findMany({
      where: { OR: [
        { bookingReference: { contains: q, mode: "insensitive" } },
        { customerFirstName: { contains: q, mode: "insensitive" } },
        { customerLastName: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q, mode: "insensitive" } },
      ] },
      select: {
        id: true, bookingReference: true, status: true, paymentStatus: true,
        customerFirstName: true, customerLastName: true, customerEmail: true, customerPhone: true,
        checkInDate: true, checkOutDate: true, totalAmount: true, currency: true,
        items: { select: { roomName: true, roomType: { select: { property: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: "desc" }, take: 20,
    });
    return Response.json({ success: true, data: bookings.map(b => ({ ...b, totalAmount: b.totalAmount.toString() })) });
  } catch (error) { return handleAuthError(error); }
}
