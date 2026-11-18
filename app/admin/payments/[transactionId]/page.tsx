import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";

type PageProps = {
  params: Promise<{ transactionId: string }>;
};

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

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export default async function AdminPaymentDetailsPage({
  params,
}: PageProps) {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const { transactionId } = await params;

  const transaction = await prisma.paymentTransaction.findUnique({
    where: { id: transactionId },
    include: {
      booking: {
        select: {
          id: true,
          bookingReference: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          currency: true,
          refundAmount: true,
          cancellationFeeAmount: true,
          cancellationReason: true,
          cancelledAt: true,
          customerFirstName: true,
          customerLastName: true,
          customerEmail: true,
          customerPhone: true,
          checkInDate: true,
          checkOutDate: true,
          createdAt: true,
        },
      },
    },
  });

  if (!transaction) {
    notFound();
  }

  const booking = transaction.booking;

  const refundAmount = Number(booking.refundAmount.toString());

  const hasRefundTracking =
    refundAmount > 0 ||
    booking.status === "REFUND_PENDING" ||
    booking.status === "REFUNDED" ||
    booking.paymentStatus === "REFUND_PENDING" ||
    booking.paymentStatus === "PARTIALLY_REFUNDED" ||
    booking.paymentStatus === "REFUNDED";

  return (
    <main className="min-h-screen bg-[#F8F8F5] px-4 py-8 text-[#263B2D] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            href="/admin/payments"
            className="text-sm font-medium text-gray-500 hover:text-[#263B2D]"
          >
            ← Back to Payments
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">
                Payment transaction reference
              </p>

              <h1 className="mt-1 break-all text-2xl font-bold sm:text-3xl">
                {transaction.transactionReference}
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Created {formatDateTime(transaction.createdAt)}
              </p>
            </div>

            <Status value={transaction.status} />
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Transaction amount</p>
            <p className="mt-2 text-2xl font-bold">
              {formatMoney(transaction.amount, transaction.currency)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Payment provider</p>
            <p className="mt-2 text-2xl font-bold">
              {transaction.provider}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Payment method</p>
            <p className="mt-2 text-2xl font-bold">
              {transaction.paymentMethod || "Not specified"}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold">Transaction information</h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">
                Merchant transaction reference
              </p>
              <p className="mt-1 break-all font-semibold">
                {transaction.transactionReference}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Chapa provider transaction ID
              </p>
              <p className="mt-1 break-all font-semibold">
                {transaction.providerTransactionId || "Not available"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Provider</p>
              <p className="mt-1 font-semibold">
                {transaction.provider}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Currency</p>
              <p className="mt-1 font-semibold">
                {transaction.currency}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Created at</p>
              <p className="mt-1 font-semibold">
                {formatDateTime(transaction.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Last updated</p>
              <p className="mt-1 font-semibold">
                {formatDateTime(transaction.updatedAt)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Verified at</p>
              <p className="mt-1 font-semibold">
                {transaction.verifiedAt
                  ? formatDateTime(transaction.verifiedAt)
                  : "Not verified"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Transaction status</p>
              <div className="mt-2">
                <Status value={transaction.status} />
              </div>
            </div>
          </div>

          {transaction.failureReason && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                Failure reason
              </p>
              <p className="mt-1 text-sm text-red-700">
                {transaction.failureReason}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold">Related booking</h2>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Booking reference</p>
              <Link
                href={`/admin/bookings/${booking.id}`}
                className="mt-1 inline-block font-bold text-[#405744] hover:underline"
              >
                {booking.bookingReference} →
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              <Status value={booking.status} />
              <Status value={booking.paymentStatus} />
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="mt-1 font-semibold">
                {booking.customerFirstName} {booking.customerLastName}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="mt-1 break-all font-semibold">
                {booking.customerEmail}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="mt-1 font-semibold">
                {booking.customerPhone || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Booking total</p>
              <p className="mt-1 font-semibold">
                {formatMoney(booking.totalAmount, booking.currency)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Check-in</p>
              <p className="mt-1 font-semibold">
                {formatDateTime(booking.checkInDate)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Check-out</p>
              <p className="mt-1 font-semibold">
                {formatDateTime(booking.checkOutDate)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-white p-6">
          <h2 className="text-lg font-bold">Refund tracking</h2>

          {hasRefundTracking ? (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">
                    Booking refund amount
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-800">
                    {formatMoney(booking.refundAmount, booking.currency)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Cancellation fee amount
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {formatMoney(
                      booking.cancellationFeeAmount,
                      booking.currency
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-semibold text-amber-900">
                  Refund status requires review
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  The booking has refund-related records. The amount shown
                  is stored at booking level and may relate to more than
                  one payment transaction. This page does not confirm that
                  money has been transferred back to the customer.
                </p>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              No refund amount or refund-related booking status is recorded
              for this booking.
            </p>
          )}

          {booking.cancelledAt && (
            <div className="mt-5 border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">Cancelled at</p>
              <p className="mt-1 font-semibold">
                {formatDateTime(booking.cancelledAt)}
              </p>
            </div>
          )}

          {booking.cancellationReason && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Cancellation reason</p>
              <p className="mt-1 text-sm font-medium">
                {booking.cancellationReason}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}