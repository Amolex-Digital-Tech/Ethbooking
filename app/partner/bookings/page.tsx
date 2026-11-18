import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    paymentStatus?: string;
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

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function statusStyle(status: string) {
  if (["CONFIRMED", "COMPLETED", "PAID", "SUCCESS"].includes(status)) {
    return "bg-green-100 text-green-800";
  }

  if (["CANCELLED", "FAILED", "EXPIRED", "REFUNDED"].includes(status)) {
    return "bg-red-100 text-red-800";
  }

  if (
    [
      "PENDING",
      "PAYMENT_PENDING",
      "UNPAID",
      "REFUND_PENDING",
      "PARTIALLY_PAID",
    ].includes(status)
  ) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-gray-100 text-gray-700";
}

export default async function PartnerBookingsPage({
  searchParams,
}: PageProps) {
  const currentUser = await requireRole(
    "PARTNER_OWNER",
    "PARTNER_MANAGER"
  );

  const membership = await prisma.partnerMember.findFirst({
    where: {
      profileId: currentUser.profile.id,
      status: "ACTIVE",
    },
    include: {
      partner: true,
    },
  });

  if (!membership) {
    return (
      <main className="min-h-screen bg-[#F8F8F5] px-4 py-10 text-[#263B2D]">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8">
          <h1 className="text-xl font-bold">Partner account not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            You need an active partner membership to view bookings.
          </p>
          <Link
            href="/partner"
            className="mt-5 inline-block font-semibold text-[#405744] hover:underline"
          >
            Back to Partner Dashboard
          </Link>
        </div>
      </main>
    );
  }

  // Only ACTIVE partners can access booking management.
  if (membership.partner.status !== "ACTIVE") {
    return (
      <main className="min-h-screen bg-[#F8F8F5] px-4 py-10 text-[#263B2D]">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8">
          <h1 className="text-xl font-bold">
            Booking management unavailable
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Your partner account is currently{" "}
            {membership.partner.status.toLowerCase()}. Booking management is
            available only to active partner accounts.
          </p>
          <Link
            href="/partner"
            className="mt-5 inline-block font-semibold text-[#405744] hover:underline"
          >
            Back to Partner Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const params = await searchParams;
  const q = params.q?.trim() || "";

  const status = bookingStatuses.includes(params.status || "")
    ? params.status
    : "";

  const paymentStatus = paymentStatuses.includes(params.paymentStatus || "")
    ? params.paymentStatus
    : "";

  const partnerItemWhere = {
    roomType: {
      property: {
        partnerId: membership.partnerId,
      },
    },
  };

  const partnerBookingWhere = {
    items: {
      some: partnerItemWhere,
    },
  };

  const where = {
    ...partnerBookingWhere,
    ...(status ? { status: status as never } : {}),
    ...(paymentStatus ? { paymentStatus: paymentStatus as never } : {}),
    ...(q
      ? {
          OR: [
            {
              bookingReference: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              customerFirstName: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              customerLastName: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              customerEmail: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              customerPhone: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [
    bookings,
    totalBookings,
    paidBookings,
    partiallyPaidBookings,
    pendingBookings,
  ] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        items: {
          where: partnerItemWhere,
          include: {
            roomType: {
              include: {
                property: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    }),

    prisma.booking.count({
      where: partnerBookingWhere,
    }),

    prisma.booking.count({
      where: {
        ...partnerBookingWhere,
        paymentStatus: "PAID",
      },
    }),

    prisma.booking.count({
      where: {
        ...partnerBookingWhere,
        paymentStatus: "PARTIALLY_PAID",
      },
    }),

    prisma.booking.count({
      where: {
        ...partnerBookingWhere,
        paymentStatus: {
          in: ["UNPAID", "PENDING"],
        },
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-[#F8F8F5] px-4 py-8 text-[#263B2D] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/partner"
              className="text-sm font-medium text-gray-500 hover:text-[#263B2D]"
            >
              ← Back to Partner Dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              Booking Management
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              View bookings for properties managed by{" "}
              <span className="font-semibold text-[#263B2D]">
                {membership.partner.businessName}
              </span>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/partner/bookings/calendar"
              className="rounded-xl bg-[#263B2D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#405744]"
            >
              Booking Calendar
            </Link>

            <Link
              href="/partner"
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-gray-50"
            >
              Partner Dashboard
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Total bookings</p>
            <p className="mt-2 text-3xl font-bold">{totalBookings}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Paid bookings</p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {paidBookings}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Partially paid</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {partiallyPaidBookings}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">
              Unpaid / pending payments
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {pendingBookings}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <form
            action="/partner/bookings"
            method="GET"
            className="grid gap-3 md:grid-cols-4"
          >
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search reference, guest, email or phone"
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#405744] md:col-span-2"
            />

            <select
              name="status"
              defaultValue={status}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            >
              <option value="">All booking statuses</option>
              {bookingStatuses.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <select
              name="paymentStatus"
              defaultValue={paymentStatus}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            >
              <option value="">All payment statuses</option>
              {paymentStatuses.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <div className="flex gap-2 md:col-span-4">
              <button
                type="submit"
                className="rounded-xl bg-[#263B2D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#405744]"
              >
                Apply filters
              </button>

              <Link
                href="/partner/bookings"
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Clear filters
              </Link>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold">Your property bookings</h2>
            <p className="text-sm text-gray-500">
              Showing {bookings.length} bookings (maximum 100)
            </p>
          </div>

          {bookings.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold">No bookings found</p>
              <p className="mt-2 text-sm text-gray-500">
                There are no bookings matching your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1350px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-4">Booking</th>
                    <th className="px-5 py-4">Guest</th>
                    <th className="px-5 py-4">Stay</th>
                    <th className="px-5 py-4">Your property / rooms</th>
                    <th className="px-5 py-4">Your room subtotal</th>
                    <th className="px-5 py-4">Booking status</th>
                    <th className="px-5 py-4">Payment</th>
                    <th className="px-5 py-4">Details</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {bookings.map((booking) => {
                    const partnerRoomSubtotal = booking.items.reduce(
                      (total, item) =>
                        total + Number(item.subtotal.toString()),
                      0
                    );

                    return (
                      <tr
                        key={booking.id}
                        className="align-top hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold">
                            {booking.bookingReference}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Created {formatDate(booking.createdAt)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {booking.customerFirstName}{" "}
                            {booking.customerLastName}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {booking.customerEmail}
                          </p>
                          {booking.customerPhone && (
                            <p className="mt-1 text-xs text-gray-500">
                              {booking.customerPhone}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p>{formatDate(booking.checkInDate)}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            to {formatDate(booking.checkOutDate)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {booking.nights} night(s) · {booking.guestCount} guest(s)
                          </p>
                        </td>

                        <td className="max-w-xs px-5 py-4">
                          <div className="space-y-3">
                            {booking.items.map((item) => (
                              <div key={item.id}>
                                <p className="font-semibold">
                                  {item.roomType.property.name}
                                </p>
                                <p className="mt-1 text-gray-600">
                                  {item.roomName}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {item.ratePlanName} · {item.quantity} room(s)
                                </p>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {formatMoney(
                            partnerRoomSubtotal,
                            booking.currency
                          )}
                          <p className="mt-1 text-xs font-normal text-gray-500">
                            Your room-item subtotal only
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                              booking.status
                            )}`}
                          >
                            {booking.status.replaceAll("_", " ")}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                              booking.paymentStatus
                            )}`}
                          >
                            {booking.paymentStatus.replaceAll("_", " ")}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/partner/bookings/${booking.id}`}
                            className="inline-block rounded-lg border border-[#405744] px-3 py-2 text-xs font-bold text-[#405744] hover:bg-[#EAF0E5]"
                          >
                            View details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}