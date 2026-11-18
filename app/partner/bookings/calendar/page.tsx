import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};

function getMonthValue(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);

    if (month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  const now = new Date();
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
  };
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatMonth(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export default async function PartnerBookingCalendarPage({
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
    select: {
      partnerId: true,
      partner: {
        select: {
          businessName: true,
          status: true,
        },
      },
    },
  });

  if (!membership) {
    return (
      <main className="min-h-screen bg-[#F8F8F5] px-4 py-10 text-[#263B2D]">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8">
          <h1 className="text-xl font-bold">Partner account not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            You need an active partner membership to view the booking calendar.
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

  // Only ACTIVE partners can access booking information.
  if (membership.partner.status !== "ACTIVE") {
    return (
      <main className="min-h-screen bg-[#F8F8F5] px-4 py-10 text-[#263B2D]">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8">
          <h1 className="text-xl font-bold">
            Booking calendar unavailable
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Your partner account is currently{" "}
            {membership.partner.status.toLowerCase()}. Booking calendar access
            is available only to active partner accounts.
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
  const { year, month } = getMonthValue(params.month);

  const monthStart = new Date(Date.UTC(year, month - 1, 1));

  // Start the calendar on Monday.
  const firstWeekday = (monthStart.getUTCDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setUTCDate(gridStart.getUTCDate() - firstWeekday);

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    return date;
  });

  const gridEnd = new Date(gridStart);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + 42);

  const bookings = await prisma.booking.findMany({
    where: {
      items: {
        some: {
          roomType: {
            property: {
              partnerId: membership.partnerId,
            },
          },
          checkInDate: {
            lt: gridEnd,
          },
          checkOutDate: {
            gt: gridStart,
          },
        },
      },
    },
    select: {
      id: true,
      bookingReference: true,
      customerFirstName: true,
      customerLastName: true,
      status: true,
      paymentStatus: true,
      items: {
        where: {
          roomType: {
            property: {
              partnerId: membership.partnerId,
            },
          },
          checkInDate: {
            lt: gridEnd,
          },
          checkOutDate: {
            gt: gridStart,
          },
        },
        select: {
          checkInDate: true,
          checkOutDate: true,
          quantity: true,
          roomName: true,
          roomType: {
            select: {
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
      checkInDate: "asc",
    },
  });

  const previousMonth = new Date(Date.UTC(year, month - 2, 1));
  const nextMonth = new Date(Date.UTC(year, month, 1));

  const previousValue = `${previousMonth.getUTCFullYear()}-${String(
    previousMonth.getUTCMonth() + 1
  ).padStart(2, "0")}`;

  const nextValue = `${nextMonth.getUTCFullYear()}-${String(
    nextMonth.getUTCMonth() + 1
  ).padStart(2, "0")}`;

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <main className="min-h-screen bg-[#F8F8F5] px-3 py-7 text-[#263B2D] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/partner/bookings"
              className="text-sm font-medium text-gray-500 hover:text-[#263B2D]"
            >
              ← Back to Booking Management
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              Booking Calendar
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Reservations for {membership.partner.businessName}
            </p>
          </div>

          <Link
            href="/partner/bookings"
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-gray-50"
          >
            List View
          </Link>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              {formatMonth(year, month)}
            </h2>

            <div className="flex gap-2">
              <Link
                href={`/partner/bookings/calendar?month=${previousValue}`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                ← Previous
              </Link>

              <Link
                href="/partner/bookings/calendar"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Today
              </Link>

              <Link
                href={`/partner/bookings/calendar?month=${nextValue}`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Next →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-gray-200">
            {weekdays.map((day) => (
              <div
                key={day}
                className="px-1 py-3 text-center text-xs font-bold uppercase text-gray-500 sm:text-sm"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = dateKey(day);
              const isCurrentMonth =
                day.getUTCMonth() === month - 1;
              const isToday = key === dateKey(new Date());

              const dayBookings = bookings.filter((booking) =>
                booking.items.some(
                  (item) =>
                    dateKey(item.checkInDate) <= key &&
                    dateKey(item.checkOutDate) > key
                )
              );

              return (
                <div
                  key={key}
                  className={`min-h-28 border-b border-r border-gray-100 p-1 sm:min-h-36 sm:p-2 ${
                    isCurrentMonth ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <div className="mb-2 flex justify-between">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday
                          ? "bg-[#263B2D] text-white"
                          : isCurrentMonth
                            ? "text-gray-700"
                            : "text-gray-300"
                      }`}
                    >
                      {day.getUTCDate()}
                    </span>

                    {dayBookings.length > 0 && (
                      <span className="text-[10px] text-gray-400">
                        {dayBookings.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayBookings.map((booking) => {
                      const matchingItems = booking.items.filter(
                        (item) =>
                          dateKey(item.checkInDate) <= key &&
                          dateKey(item.checkOutDate) > key
                      );

                      const firstItem = matchingItems[0];

                      return (
                        <Link
                          key={booking.id}
                          href={`/partner/bookings/${booking.id}`}
                          title={`${booking.bookingReference} - ${booking.customerFirstName} ${booking.customerLastName}`}
                          className={`block overflow-hidden rounded-md border px-1.5 py-1 text-[10px] leading-tight hover:opacity-80 sm:px-2 sm:text-xs ${
                            booking.status === "CANCELLED"
                              ? "border-red-200 bg-red-50 text-red-800"
                              : booking.paymentStatus === "PAID"
                                ? "border-green-200 bg-green-50 text-green-800"
                                : "border-amber-200 bg-amber-50 text-amber-900"
                          }`}
                        >
                          <p className="truncate font-bold">
                            {booking.bookingReference}
                          </p>
                          <p className="truncate">
                            {booking.customerFirstName}{" "}
                            {booking.customerLastName}
                          </p>
                          <p className="hidden truncate sm:block">
                            {firstItem?.roomType.property.name}
                          </p>
                          <p className="truncate">
                            {matchingItems.reduce(
                              (sum, item) => sum + item.quantity,
                              0
                            )}{" "}
                            room(s)
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-green-100 ring-1 ring-green-200" />
              Paid
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-200" />
              Unpaid / pending
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-red-100 ring-1 ring-red-200" />
              Cancelled
            </span>
          </div>
        </section>

        <p className="text-xs text-gray-500">
          Select any booking on the calendar to view its details.
          Check-out dates are not counted as occupied nights.
        </p>
      </div>
    </main>
  );
}