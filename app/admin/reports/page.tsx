import Link from "next/link";
import {
  getFinancialReport,
  type ReportFilters,
} from "@/lib/admin/financial-reports";
import { requireRole } from "@/lib/auth/require-role";

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

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN", "FINANCE");

  const params = await searchParams;

  const filters: ReportFilters = {
    period: params.period || "month",
    from: params.from,
    to: params.to,
  };

  let report;

  try {
    report = await getFinancialReport(filters);
  } catch {
    return (
      <main className="min-h-screen bg-[#faf9f5] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin"
            className="text-sm font-medium text-green-800 hover:underline"
          >
            ← Back to Admin Dashboard
          </Link>

          <div className="mt-6 rounded-2xl border border-red-200 bg-white p-6">
            <h1 className="text-xl font-semibold text-gray-900">
              Invalid report date range
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Please select valid dates. The start date must not be
              after the end date.
            </p>
            <Link
              href="/admin/reports"
              className="mt-4 inline-block rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900"
            >
              Return to reports
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { dateRange, summaries, bookingRows, refundRows } = report;

  const exportParams = new URLSearchParams({
    period: dateRange.period,
  });

  if (dateRange.period === "custom") {
    exportParams.set("from", dateRange.from);
    exportParams.set("to", dateRange.to);
  }

  const exportUrl = `/api/admin/reports/export?${exportParams.toString()}`;

  const totalBookings = bookingRows.length;
  const totalTransactions = report.successfulTransactionCount;

  return (
    <main className="min-h-screen bg-[#faf9f5] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-sm font-medium text-green-800 hover:underline"
          >
            ← Back to Admin Dashboard
          </Link>

          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-green-800">
                Finance
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                Financial Reports
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Booking revenue, commissions, partner earnings,
                payment fees, and refund monitoring.
              </p>
            </div>

            <a
              href={exportUrl}
              className="inline-flex items-center justify-center rounded-xl bg-green-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900"
            >
              Export CSV
            </a>
          </div>
        </div>

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
            action="/admin/reports"
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
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
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
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
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
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
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

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Financial overview
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Figures are calculated from successful payments verified
                during the selected period.
              </p>
            </div>
            <p className="text-sm text-gray-500">
              {totalBookings} paid booking{totalBookings === 1 ? "" : "s"} ·{" "}
              {totalTransactions} successful transaction
              {totalTransactions === 1 ? "" : "s"}
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
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      {summary.currency} financial totals
                    </h3>
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">
                      {summary.paidBookingCount} paid bookings
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      title="Gross booking revenue"
                      value={money(
                        summary.bookingRevenue,
                        summary.currency
                      )}
                      description="Booking totals counted once per booking."
                    />

                    <MetricCard
                      title="Platform commission"
                      value={money(
                        summary.platformCommission,
                        summary.currency
                      )}
                      description="Commission recorded on paid bookings."
                    />

                    <MetricCard
                      title="Partner earnings"
                      value={money(
                        summary.partnerEarnings,
                        summary.currency
                      )}
                      description="Partner amount recorded on paid bookings."
                    />

                    <MetricCard
                      title="Payment fees"
                      value={money(
                        summary.paymentFees,
                        summary.currency
                      )}
                      description="Payment fees recorded on paid bookings."
                    />

                    <MetricCard
                      title="Successful transaction value"
                      value={money(
                        summary.successfulTransactionValue,
                        summary.currency
                      )}
                      description={`${summary.successfulTransactionCount} successful transactions verified in this period.`}
                    />

                    <MetricCard
                      title="Recorded refund amount"
                      value={money(
                        summary.recordedRefundAmount,
                        summary.currency
                      )}
                      description={`${summary.refundQueueCount} current bookings with refund records or refund statuses. Not limited to the selected dates.`}
                    />

                    <MetricCard
                      title="Transactions marked refunded"
                      value={money(
                        summary.markedRefundedTransactionValue,
                        summary.currency
                      )}
                      description={`${summary.markedRefundedTransactionCount} transactions marked REFUNDED in the database. This does not confirm a Chapa payout.`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gray-900">
              Refund monitoring
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Current bookings with refund-related statuses or a recorded
              refund amount. This list is not restricted by the selected
              report period.
            </p>
          </div>

          {refundRows.length === 0 ? (
            <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">
              No refund-related bookings are currently recorded.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-3">Booking</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Payment status</th>
                    <th className="px-3 py-3">Booking status</th>
                    <th className="px-3 py-3 text-right">
                      Recorded refund
                    </th>
                    <th className="px-3 py-3">Last updated</th>
                  </tr>
                </thead>

                <tbody>
                  {refundRows.map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-3 py-4 font-semibold text-gray-900">
                        {booking.bookingReference}
                      </td>
                      <td className="px-3 py-4">
                        <p className="font-medium text-gray-800">
                          {booking.customerName || "—"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {booking.customerEmail || ""}
                        </p>
                      </td>
                      <td className="px-3 py-4">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                          {booking.paymentStatus}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-gray-600">
                        {booking.bookingStatus}
                      </td>
                      <td className="px-3 py-4 text-right font-medium text-gray-900">
                        {money(
                          booking.recordedRefundAmount,
                          booking.currency
                        )}
                      </td>
                      <td className="px-3 py-4 text-gray-500">
                        {new Date(booking.updatedAt).toLocaleDateString(
                          "en-GB",
                          { timeZone: "Africa/Addis_Ababa" }
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="font-semibold text-blue-950">
            Important reporting notes
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-blue-900">
            <li>
              Successful transactions are filtered by their verification
              date, not by the booking creation date.
            </li>
            <li>
              Gross booking revenue, commission, partner earnings, and
              payment fees count each paid booking once. Successful
              transaction value is reported separately.
            </li>
            <li>
              Refund figures use the refund amounts and statuses currently
              stored in the database. Your current schema does not record
              a separate confirmed Chapa refund-transfer event or refund
              date, so these figures must not be treated as proof that
              money was returned to a customer.
            </li>
            <li>
              Partner earnings are shown using the booking-level
              <code className="mx-1 rounded bg-blue-100 px-1 py-0.5">
                partnerAmount
              </code>
              field. The current data model does not separately allocate
              earnings to each partner when a booking contains properties
              from multiple partners.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
