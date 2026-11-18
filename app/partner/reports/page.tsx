import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { getPartnerFinancialReport } from "@/lib/partner/financial-reports";
import type { ReportFilters } from "@/lib/admin/financial-reports";

type SearchParams = {
  period?: string;
  from?: string;
  to?: string;
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00+03:00`).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Addis_Ababa",
    }
  );
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>

      <p className="mt-3 break-words text-2xl font-semibold tracking-tight text-gray-900">
        {value}
      </p>

      {description && (
        <p className="mt-2 text-xs leading-5 text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
}

export default async function PartnerReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const currentUser = await requireRole("PARTNER_OWNER", "PARTNER_MANAGER");

  const membership = await prisma.partnerMember.findFirst({
    where: {
      profileId: currentUser.profile.id,
      status: "ACTIVE",
    },
    include: {
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
          <h1 className="text-xl font-bold">
            Partner account not found
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            You need an active partner membership to view financial reports.
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

  if (membership.partner.status !== "ACTIVE") {
    return (
      <main className="min-h-screen bg-[#F8F8F5] px-4 py-10 text-[#263B2D]">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8">
          <h1 className="text-xl font-bold">
            Financial reports unavailable
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Your partner account is currently{" "}
            {membership.partner.status.toLowerCase()}. Financial reports
            are available only to active partner accounts.
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

  const filters: ReportFilters = {
    period: params.period || "month",
    from: params.from,
    to: params.to,
  };

  let report;

  try {
    report = await getPartnerFinancialReport(
      membership.partnerId,
      filters
    );
  } catch {
    return (
      <main className="min-h-screen bg-[#F8F8F5] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/partner"
            className="text-sm font-medium text-[#405744] hover:underline"
          >
            ← Back to Partner Dashboard
          </Link>

          <div className="mt-6 rounded-2xl border border-red-200 bg-white p-6">
            <h1 className="text-xl font-semibold text-gray-900">
              Invalid report date range
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Please select valid dates. The start date must not be after
              the end date.
            </p>

            <Link
              href="/partner/reports"
              className="mt-4 inline-block rounded-xl bg-[#263B2D] px-4 py-2 text-sm font-semibold text-white"
            >
              Return to reports
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { dateRange, summaries, bookingRows } = report;

  const exportParams = new URLSearchParams({
    period: dateRange.period,
  });

  if (dateRange.period === "custom") {
    exportParams.set("from", dateRange.from);
    exportParams.set("to", dateRange.to);
  }

  const exportUrl =
    `/api/partner/reports/export?${exportParams.toString()}`;

  return (
    <main className="min-h-screen bg-[#F8F8F5] px-4 py-8 text-[#263B2D] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Link
              href="/partner"
              className="text-sm font-medium text-gray-500 hover:text-[#263B2D]"
            >
              ← Back to Partner Dashboard
            </Link>

            <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-[#405744]">
              Partner Finance
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Earnings & Financial Reports
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Financial performance for properties managed by{" "}
              <span className="font-semibold text-[#263B2D]">
                {membership.partner.businessName}
              </span>
              .
            </p>
          </div>

          <a
            href={exportUrl}
            className="inline-flex items-center justify-center rounded-xl bg-[#263B2D] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#405744]"
          >
            Export CSV
          </a>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Report period
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Dates are interpreted using Ethiopia time (UTC+3).
            </p>
          </div>

          <form
            action="/partner/reports"
            method="GET"
            className="flex flex-col gap-4 lg:flex-row lg:items-end"
          >
            <div className="w-full lg:max-w-xs">
              <label
                htmlFor="period"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Date filter
              </label>

              <select
                id="period"
                name="period"
                defaultValue={dateRange.period}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900"
              >
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="custom">Custom date range</option>
              </select>
            </div>

            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-xl">
              <div>
                <label
                  htmlFor="from"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  From
                </label>

                <input
                  id="from"
                  name="from"
                  type="date"
                  defaultValue={dateRange.from}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900"
                />
              </div>

              <div>
                <label
                  htmlFor="to"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  To
                </label>

                <input
                  id="to"
                  name="to"
                  type="date"
                  defaultValue={dateRange.to}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900"
                />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              Apply filter
            </button>
          </form>

          <p className="mt-4 text-sm text-gray-500">
            Showing {dateLabel(dateRange.from)} – {dateLabel(dateRange.to)}
          </p>
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Financial overview
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Only bookings containing your properties are included.
              </p>
            </div>

            <p className="text-sm text-gray-500">
              {bookingRows.length} paid booking(s) ·{" "}
              {report.successfulTransactionCount} successful transaction(s)
            </p>
          </div>

          {summaries.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <p className="font-medium text-gray-900">
                No successful payments found for this period.
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Try another date range.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {summaries.map((summary) => (
                <div
                  key={summary.currency}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="mb-5 font-semibold text-gray-900">
                    {summary.currency} financial totals
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <MetricCard
                      title="Your room subtotal"
                      value={money(
                        summary.roomSubtotal,
                        summary.currency
                      )}
                      description="Subtotal of room items belonging to your properties."
                    />

                    <MetricCard
                      title="Allocated booking revenue"
                      value={money(
                        summary.bookingRevenue,
                        summary.currency
                      )}
                      description="Your proportional share of paid booking totals."
                    />

                    <MetricCard
                      title="Platform commission"
                      value={money(
                        summary.platformCommission,
                        summary.currency
                      )}
                      description="Your allocated share of EthiopianBooking's 10% commission."
                    />

                    <MetricCard
                      title="Chapa payment fees"
                      value={money(
                        summary.paymentFees,
                        summary.currency
                      )}
                      description="Your allocated share of actual recorded Chapa fees."
                    />

                    <MetricCard
                      title="Net partner earnings"
                      value={money(
                        summary.partnerEarnings,
                        summary.currency
                      )}
                      description="Your recorded partner amount after commission and applicable Chapa fees."
                    />

                    <MetricCard
                      title="Successful transaction value"
                      value={money(
                        summary.successfulTransactionValue,
                        summary.currency
                      )}
                      description={`${summary.successfulTransactionCount} successful transaction(s), allocated proportionally.`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Booking-level earnings
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Financial breakdown for bookings containing your properties.
            </p>
          </div>

          {bookingRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No paid bookings found for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-4">Booking</th>
                    <th className="px-4 py-4">Guest</th>
                    <th className="px-4 py-4">
                      Your properties / rooms
                    </th>
                    <th className="px-4 py-4 text-right">
                      Room subtotal
                    </th>
                    <th className="px-4 py-4 text-right">
                      Revenue
                    </th>
                    <th className="px-4 py-4 text-right">
                      Commission
                    </th>
                    <th className="px-4 py-4 text-right">
                      Chapa fee
                    </th>
                    <th className="px-4 py-4 text-right">
                      Net earnings
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {bookingRows.map((booking) => (
                    <tr
                      key={booking.id}
                      className="align-top hover:bg-gray-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900">
                          {booking.bookingReference}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {dateLabel(
                            booking.checkInDate.toISOString().slice(0, 10)
                          )}{" "}
                          –{" "}
                          {dateLabel(
                            booking.checkOutDate.toISOString().slice(0, 10)
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-800">
                          {booking.customerName || "—"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {booking.customerEmail}
                        </p>
                      </td>

                      <td className="max-w-xs px-4 py-4">
                        <p className="font-medium text-gray-800">
                          {booking.properties.join(", ")}
                        </p>

                        {booking.rooms.map((room, index) => (
                          <p
                            key={`${room.roomName}-${index}`}
                            className="mt-1 text-xs text-gray-500"
                          >
                            {room.roomName} · {room.ratePlanName} ·{" "}
                            {room.quantity} room(s)
                          </p>
                        ))}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {money(booking.roomSubtotal, booking.currency)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {money(booking.bookingRevenue, booking.currency)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {money(
                          booking.platformCommission,
                          booking.currency
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {money(booking.paymentFees, booking.currency)}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-green-800">
                        {money(booking.partnerEarnings, booking.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="font-semibold text-blue-950">
            How your earnings are calculated
          </h2>

          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-blue-900">
            <li>
              Only successful payments verified during the selected
              reporting period are included.
            </li>

            <li>
              EthiopianBooking commission is 10% of the applicable
              accommodation subtotal, excluding taxes.
            </li>

            <li>
              Chapa fees are based on actual recorded processing fees.
              If Chapa does not provide a fee, no fee is invented.
            </li>

            <li>
              If a booking contains room items from multiple partners,
              booking-level financial amounts are allocated according to
              each Partner&apos;s share of the room-item subtotal.
            </li>

            <li>
              These are recorded earnings, not confirmation that a
              settlement has already been transferred to your bank account.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}