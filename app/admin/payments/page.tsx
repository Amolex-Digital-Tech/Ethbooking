import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
};

const transactionStatuses = [
  "INITIATED",
  "PENDING",
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
] as const;

function formatMoney(
  amount: { toString(): string } | null,
  currency: string
) {
  const value = amount ? Number(amount.toString()) : 0;

  return `${currency} ${value.toLocaleString("en-US", {
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
  if (["SUCCESS"].includes(status)) {
    return "bg-green-100 text-green-800";
  }

  if (["FAILED", "CANCELLED"].includes(status)) {
    return "bg-red-100 text-red-800";
  }

  if (["PENDING", "INITIATED"].includes(status)) {
    return "bg-amber-100 text-amber-800";
  }

  if (status === "REFUNDED") {
    return "bg-blue-100 text-blue-800";
  }

  return "bg-gray-100 text-gray-700";
}

function Status({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
        value
      )}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function validDate(value?: string) {
  if (!value) return undefined;

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function AdminPaymentsPage({
  searchParams,
}: PageProps) {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const params = await searchParams;

  const q = params.q?.trim() || "";

  const status = transactionStatuses.includes(
    params.status as (typeof transactionStatuses)[number]
  )
    ? params.status
    : "";

  const from = validDate(params.from);
  const to = validDate(params.to);

  const dateFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to
              ? {
                  lt: new Date(
                    to.getFullYear(),
                    to.getMonth(),
                    to.getDate() + 1
                  ),
                }
              : {}),
          },
        }
      : {};

  const where = {
    ...(status ? { status: status as never } : {}),
    ...dateFilter,
    ...(q
      ? {
          OR: [
            {
              transactionReference: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              providerTransactionId: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              booking: {
                is: {
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
                },
              },
            },
          ],
        }
      : {}),
  };

  const [
    transactions,
    totalTransactions,
    successful,
    pending,
    failed,
    refunded,
    refundPendingBookings,
  ] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            bookingReference: true,
            customerFirstName: true,
            customerLastName: true,
            customerEmail: true,
            status: true,
            paymentStatus: true,
            refundAmount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),

    prisma.paymentTransaction.count(),

    prisma.paymentTransaction.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: { id: true },
    }),

    prisma.paymentTransaction.aggregate({
      where: {
        status: { in: ["INITIATED", "PENDING"] },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),

    prisma.paymentTransaction.aggregate({
      where: {
        status: { in: ["FAILED", "CANCELLED"] },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),

    prisma.paymentTransaction.aggregate({
      where: { status: "REFUNDED" },
      _sum: { amount: true },
      _count: { id: true },
    }),

    prisma.booking.count({
      where: {
        OR: [
          { status: "REFUND_PENDING" },
          { paymentStatus: "REFUND_PENDING" },
          { paymentStatus: "PARTIALLY_REFUNDED" },
        ],
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-[#F8F8F5] px-4 py-8 text-[#263B2D] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <div>
          <Link
            href="/admin"
            className="text-sm font-medium text-gray-500 hover:text-[#263B2D]"
          >
            ← Back to Admin Dashboard
          </Link>

          <h1 className="mt-3 text-3xl font-bold">
            Payment Management
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Monitor payment transactions, Chapa references, and refund
            statuses across EthiopianBooking.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">
              Successful payments
            </p>
            <p className="mt-2 text-2xl font-bold text-green-700">
              {formatMoney(successful._sum.amount, "ETB")}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {successful._count.id} successful transaction(s)
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">
              Pending payments
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-700">
              {formatMoney(pending._sum.amount, "ETB")}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {pending._count.id} pending transaction(s)
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">
              Failed / cancelled
            </p>
            <p className="mt-2 text-2xl font-bold text-red-700">
              {formatMoney(failed._sum.amount, "ETB")}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {failed._count.id} transaction(s)
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">
              Recorded as refunded
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-700">
              {formatMoney(refunded._sum.amount, "ETB")}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {refunded._count.id} refunded transaction(s)
            </p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-medium text-amber-800">
              Bookings awaiting refund review
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-900">
              {refundPendingBookings}
            </p>
            <p className="mt-1 text-xs text-amber-800">
              Based on booking refund statuses, not confirmed Chapa
              refund transfers.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">
              Total payment transactions
            </p>
            <p className="mt-2 text-3xl font-bold">
              {totalTransactions}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              All recorded payment attempts
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <form
            action="/admin/payments"
            method="GET"
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
          >
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search transaction, booking or customer"
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#405744] xl:col-span-2"
            />

            <select
              name="status"
              defaultValue={status}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            >
              <option value="">All transaction statuses</option>
              {transactionStatuses.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <input
              type="date"
              name="from"
              defaultValue={params.from || ""}
              aria-label="From date"
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            />

            <input
              type="date"
              name="to"
              defaultValue={params.to || ""}
              aria-label="To date"
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            />

            <div className="flex gap-2 md:col-span-2 xl:col-span-5">
              <button
                type="submit"
                className="rounded-xl bg-[#263B2D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#405744]"
              >
                Apply filters
              </button>

              <Link
                href="/admin/payments"
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Clear filters
              </Link>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold">Payment transactions</h2>
            <p className="text-sm text-gray-500">
              Showing {transactions.length} transactions (maximum 100)
            </p>
          </div>

          {transactions.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold">No transactions found</p>
              <p className="mt-2 text-sm text-gray-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-4">Transaction</th>
                    <th className="px-5 py-4">Booking</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Provider</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Transaction status</th>
                    <th className="px-5 py-4">Refund tracking</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {transaction.transactionReference}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/bookings/${transaction.booking.id}`}
                          className="font-semibold text-[#405744] hover:underline"
                        >
                          {transaction.booking.bookingReference}
                        </Link>
                        <p className="mt-1 text-xs text-gray-500">
                          {transaction.booking.paymentStatus.replaceAll(
                            "_",
                            " "
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {transaction.booking.customerFirstName}{" "}
                          {transaction.booking.customerLastName}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {transaction.booking.customerEmail}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {transaction.provider}
                        </p>
                        <p className="mt-1 break-all text-xs text-gray-500">
                          {transaction.providerTransactionId ||
                            "Provider ID unavailable"}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {formatMoney(
                          transaction.amount,
                          transaction.currency
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <Status value={transaction.status} />
                      </td>

                      <td className="px-5 py-4">
                        {Number(
                          transaction.booking.refundAmount.toString()
                        ) > 0 ? (
                          <div>
                            <p className="font-semibold text-amber-800">
                              {formatMoney(
                                transaction.booking.refundAmount,
                                transaction.currency
                              )}
                            </p>
                            <p className="mt-1 text-xs text-amber-700">
                              Booking refund amount
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">
                            No refund amount
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/payments/${transaction.id}`}
                          className="font-semibold text-[#405744] hover:underline"
                        >
                          View details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}