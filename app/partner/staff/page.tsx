import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import StaffBookingActions from "./staff-booking-actions";

export const dynamic = "force-dynamic";

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export default async function PartnerFrontDeskPage() {
  const user = await requireRole("PARTNER_STAFF");
  const membership = await prisma.partnerMember.findFirst({
    where: { profileId: user.profile.id, status: "ACTIVE", partner: { status: "ACTIVE" } },
    select: { partnerId: true, partner: { select: { businessName: true } } },
  });
  if (!membership) return <main className="p-8"><h1 className="text-xl font-bold">Partner staff access unavailable</h1><p className="mt-2 text-sm text-gray-600">Your partner membership is not active. Contact your Partner Owner or EthiopianBooking support.</p></main>;

  const bookings = await prisma.booking.findMany({
    where: { items: { some: { roomType: { property: { partnerId: membership.partnerId } } } }, status: { in: ["CONFIRMED", "COMPLETED"] } },
    orderBy: [{ checkInDate: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true, bookingReference: true, status: true, paymentStatus: true,
      checkInDate: true, checkOutDate: true, guestCount: true,
      customerFirstName: true, customerLastName: true, customerPhone: true,
      checkedInAt: true, checkedOutAt: true,
      items: { where: { roomType: { property: { partnerId: membership.partnerId } } }, select: { roomName: true, quantity: true, guests: true, roomType: { select: { property: { select: { name: true } } } } } },
    },
  });
  return <main className="min-h-screen bg-[#F4F3EF] px-4 py-8 sm:px-6 lg:px-10">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-semibold tracking-[0.16em] text-[#75816F]">PARTNER FRONT DESK</p><h1 className="mt-2 text-3xl font-semibold text-[#263B2D]">Guest operations</h1><p className="mt-2 text-sm text-[#77766F]">{membership.partner.businessName} · Bookings, arrivals and departures</p></div>
        <Link href="/partner/bookings/walk-in" className="rounded-xl bg-[#405744] px-5 py-3 text-sm font-semibold text-white">+ New walk-in booking</Link>
      </header>
      <section className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
        <h2 className="font-semibold text-[#263B2D]">Front desk access</h2>
        <p className="mt-2 text-sm leading-6 text-[#77766F]">You can register walk-in guests, check payment status and manage guest arrivals and departures. Payment amounts, partner earnings, property revenue and financial reports are restricted to the Partner Owner and Manager.</p>
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-[#263B2D]">Recent and upcoming stays</h2><span className="text-sm text-[#77766F]">{bookings.length} bookings</span></div>
        {bookings.length === 0 ? <div className="rounded-2xl border border-[#E7E5DF] bg-white p-8 text-center text-sm text-gray-500">No confirmed bookings found.</div> : bookings.map(booking => <article key={booking.id} className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-gray-500">Booking reference</p><p className="mt-1 font-bold text-[#263B2D]">{booking.bookingReference}</p><p className="mt-2 text-sm font-semibold">{booking.customerFirstName} {booking.customerLastName || ""}</p><p className="text-xs text-gray-500">{booking.customerPhone || "No phone provided"}</p></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{booking.status.replaceAll("_", " ")}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${booking.paymentStatus === "PAID" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{booking.paymentStatus.replaceAll("_", " ")}</span></div></div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4"><div><p className="text-xs text-gray-500">Property</p><p className="mt-1 font-medium">{booking.items.map(i => i.roomType.property.name).filter((v,i,a)=>a.indexOf(v)===i).join(", ")}</p></div><div><p className="text-xs text-gray-500">Room</p><p className="mt-1 font-medium">{booking.items.map(i => `${i.roomName} × ${i.quantity}`).join(", ")}</p></div><div><p className="text-xs text-gray-500">Check-in</p><p className="mt-1 font-medium">{dateLabel(booking.checkInDate)}</p></div><div><p className="text-xs text-gray-500">Check-out</p><p className="mt-1 font-medium">{dateLabel(booking.checkOutDate)}</p></div></div>
          <StaffBookingActions partnerId={membership.partnerId} bookingId={booking.id} checkedInAt={booking.checkedInAt} checkedOutAt={booking.checkedOutAt} status={booking.status} paymentStatus={booking.paymentStatus} />
        </article>)}
      </section>
    </div>
  </main>;
}
