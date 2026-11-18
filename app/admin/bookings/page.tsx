import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    paymentStatus?: string;
    page?: string;
  }>;
};

const bookingStatuses = [
  "PENDING",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
  "EXPIRED",
  "REFUND_PENDING",
  "REFUNDED",
];

const paymentStatuses = [
  "UNPAID",
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "FAILED",
  "REFUND_PENDING",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
];

const PAGE_SIZE = 25;

function formatMoney(amount: { toString(): string }, currency: string) {
  return `${currency} ${Number(amount.toString()).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusStyle(status: string) {
  if (["CONFIRMED", "COMPLETED", "PAID", "SUCCESS"].includes(status)) {
    return "bg-green-100 text-green-800";
  }
  if (["CANCELLED", "FAILED", "EXPIRED", "REFUNDED"].includes(status)) {
    return "bg-red-100 text-red-800";
  }
  if (["PENDING", "PAYMENT_PENDING", "UNPAID", "REFUND_PENDING"].includes(status)) {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-gray-100 text-gray-700";
}

function pageHref(page: number, q: string, status: string, paymentStatus: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (paymentStatus) params.set("paymentStatus", paymentStatus);
  params.set("page", String(page));
  return `/admin/bookings?${params.toString()}`;
}

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const params = await searchParams;
  const q = params.q?.trim() || "";
  const status = bookingStatuses.includes(params.status || "") ? params.status! : "";
  const paymentStatus = paymentStatuses.includes(params.paymentStatus || "") ? params.paymentStatus! : "";
  const requestedPage = Number(params.page || "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(paymentStatus ? { paymentStatus: paymentStatus as never } : {}),
    ...(q
      ? {
          OR: [
            { bookingReference: { contains: q, mode: "insensitive" as const } },
            { customerFirstName: { contains: q, mode: "insensitive" as const } },
            { customerLastName: { contains: q, mode: "insensitive" as const } },
            { customerEmail: { contains: q, mode: "insensitive" as const } },
            { customerPhone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [filteredCount, totalBookings, paidBookings, pendingBookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.count(),
    prisma.booking.count({ where: { paymentStatus: "PAID" } }),
    prisma.booking.count({ where: { paymentStatus: { in: ["UNPAID", "PENDING"] } } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const bookings = await prisma.booking.findMany({
    where,
    include: {
      items: true,
      paymentTransactions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const firstResult = filteredCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastResult = Math.min(currentPage * PAGE_SIZE, filteredCount);

  return (
    <main className="min-h-screen bg-[#F8F8F5] px-4 py-8 text-[#263B2D] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm font-medium text-gray-500 hover:text-[#263B2D]">
              ← Back to Admin Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold">Booking Management</h1>
            <p className="mt-2 text-sm text-gray-500">Search, filter, and review customer bookings and payment information.</p>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Total bookings</p>
            <p className="mt-2 text-3xl font-bold">{totalBookings}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Paid bookings</p>
            <p className="mt-2 text-3xl font-bold text-green-700">{paidBookings}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Unpaid / pending payments</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">{pendingBookings}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <form action="/admin/bookings" method="GET" className="grid gap-3 md:grid-cols-4">
            <input type="search" name="q" defaultValue={q} placeholder="Search reference, guest, email or phone" className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#405744] md:col-span-2" />
            <select name="status" defaultValue={status} className="rounded-xl border border-gray-300 px-4 py-3 text-sm">
              <option value="">All booking statuses</option>
              {bookingStatuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
            </select>
            <select name="paymentStatus" defaultValue={paymentStatus} className="rounded-xl border border-gray-300 px-4 py-3 text-sm">
              <option value="">All payment statuses</option>
              {paymentStatuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
            </select>
            <div className="flex gap-2 md:col-span-4">
              <button type="submit" className="rounded-xl bg-[#263B2D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#405744]">Apply filters</button>
              <Link href="/admin/bookings" className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Clear filters</Link>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold">Bookings</h2>
            <p className="text-sm text-gray-500">Showing {firstResult}–{lastResult} of {filteredCount} matching bookings</p>
          </div>
          {bookings.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold">No bookings found</p>
              <p className="mt-2 text-sm text-gray-500">Try changing your search or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-4">Booking</th><th className="px-5 py-4">Guest</th><th className="px-5 py-4">Stay</th><th className="px-5 py-4">Rooms</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Booking status</th><th className="px-5 py-4">Payment</th><th className="px-5 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4"><p className="font-semibold">{booking.bookingReference}</p><p className="mt-1 text-xs text-gray-500">{formatDate(booking.createdAt)}</p></td>
                      <td className="px-5 py-4"><p className="font-medium">{booking.customerFirstName} {booking.customerLastName}</p><p className="mt-1 text-xs text-gray-500">{booking.customerEmail}</p></td>
                      <td className="px-5 py-4"><p>{formatDate(booking.checkInDate)}</p><p className="mt-1 text-xs text-gray-500">to {formatDate(booking.checkOutDate)}</p></td>
                      <td className="px-5 py-4"><p>{booking.items.length} room item(s)</p><p className="mt-1 text-xs text-gray-500">{booking.guestCount} guest(s)</p></td>
                      <td className="px-5 py-4 font-semibold">{formatMoney(booking.totalAmount, booking.currency)}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(booking.status)}`}>{booking.status.replaceAll("_", " ")}</span></td>
                      <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(booking.paymentStatus)}`}>{booking.paymentStatus.replaceAll("_", " ")}</span></td>
                      <td className="px-5 py-4"><Link href={`/admin/bookings/${booking.id}`} className="font-semibold text-[#405744] hover:underline">View details →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-500">Page {currentPage} of {totalPages} · {PAGE_SIZE} bookings per page</p>
            <div className="flex gap-2">
              {currentPage > 1 ? <Link href={pageHref(currentPage - 1, q, status, paymentStatus)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">← Previous</Link> : <span className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-400">← Previous</span>}
              {currentPage < totalPages ? <Link href={pageHref(currentPage + 1, q, status, paymentStatus)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">Next →</Link> : <span className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-400">Next →</span>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
