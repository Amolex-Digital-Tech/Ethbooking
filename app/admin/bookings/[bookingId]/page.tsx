import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import BookingAdminActions from "./booking-admin-actions";

type PageProps = {
  params: Promise<{ bookingId: string }>;
};

function formatMoney(amount: { toString(): string }, currency: string) {
  return `${currency} ${Number(amount.toString()).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
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
  if (["CONFIRMED", "COMPLETED", "PAID", "SUCCESS"].includes(status)) {
    return "bg-green-100 text-green-800";
  }

  if (["CANCELLED", "FAILED", "EXPIRED", "REFUNDED"].includes(status)) {
    return "bg-red-100 text-red-800";
  }

  if (
    ["PENDING", "PAYMENT_PENDING", "UNPAID", "REFUND_PENDING"].includes(
      status
    )
  ) {
    return "bg-amber-100 text-amber-800";
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

export default async function AdminBookingDetailsPage({
  params,
}: PageProps) {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const { bookingId } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      items: {
        include: {
          roomType: {
            include: {
              property: true,
            },
          },
          ratePlan: true,
        },
      },
      guests: true,
      paymentTransactions: {
        orderBy: { createdAt: "desc" },
      },
      cashRefund: true,
    },
  });

  if (!booking) {
    notFound();
  }

  const hasSuccessfulPayment = booking.paymentTransactions.some(
    (transaction) => transaction.status === "SUCCESS"
  );

  return (
    <main className="min-h-screen bg-[#F8F8F5] px-4 py-8 text-[#263B2D] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link
            href="/admin/bookings"
            className="text-sm font-medium text-gray-500 hover:text-[#263B2D]"
          >
            ← Back to Bookings
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Booking reference</p>
              <h1 className="mt-1 text-3xl font-bold">
                {booking.bookingReference}
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Created {formatDateTime(booking.createdAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Status value={booking.status} />
              <Status value={booking.paymentStatus} />
            </div>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Total amount</p>
            <p className="mt-2 text-2xl font-bold">
              {formatMoney(booking.totalAmount, booking.currency)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Stay duration</p>
            <p className="mt-2 text-2xl font-bold">
              {booking.nights} night(s)
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Guests</p>
            <p className="mt-2 text-2xl font-bold">
              {booking.guestCount}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold">Customer information</h2>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-gray-500">Full name</p>
                <p className="mt-1 font-semibold">
                  {booking.customerFirstName} {booking.customerLastName}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Email address</p>
                <p className="mt-1 font-semibold">
                  {booking.customerEmail || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Phone number</p>
                <p className="mt-1 font-semibold">
                  {booking.customerPhone || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Special requests</p>
                <p className="mt-1 whitespace-pre-wrap">
                  {booking.specialRequests || "No special requests"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold">Stay information</h2>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-gray-500">Check-in</p>
                <p className="mt-1 font-semibold">
                  {formatDate(booking.checkInDate)}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Check-out</p>
                <p className="mt-1 font-semibold">
                  {formatDate(booking.checkOutDate)}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Number of nights</p>
                <p className="mt-1 font-semibold">{booking.nights}</p>
              </div>

              <div>
                <p className="text-gray-500">Number of guests</p>
                <p className="mt-1 font-semibold">{booking.guestCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold">Booked rooms</h2>

          {booking.items.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No room items found for this booking.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {booking.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{item.roomName}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {item.roomType.property.name}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Rate plan: {item.ratePlanName}
                      </p>
                    </div>

                    <p className="font-bold">
                      {formatMoney(item.subtotal, item.currency)}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-gray-500">Quantity</p>
                      <p className="mt-1 font-medium">{item.quantity}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">Guests</p>
                      <p className="mt-1 font-medium">{item.guests}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">Check-in</p>
                      <p className="mt-1 font-medium">
                        {formatDate(item.checkInDate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Check-out</p>
                      <p className="mt-1 font-medium">
                        {formatDate(item.checkOutDate)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold">Guest details</h2>

          {booking.guests.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No additional guest details recorded.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {booking.guests.map((guest) => (
                <div
                  key={guest.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <p className="font-semibold">
                    {guest.firstName} {guest.lastName}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {guest.guestType}
                  </p>
                  <p className="mt-3 text-sm">
                    {guest.email || "No email provided"}
                  </p>
                  <p className="mt-1 text-sm">
                    {guest.phone || "No phone provided"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold">Payment information</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">Subtotal</p>
              <p className="mt-1 font-semibold">
                {formatMoney(booking.subtotal, booking.currency)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Discount</p>
              <p className="mt-1 font-semibold">
                {formatMoney(booking.discountAmount, booking.currency)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Tax</p>
              <p className="mt-1 font-semibold">
                {formatMoney(booking.taxAmount, booking.currency)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Platform commission</p>
              <p className="mt-1 font-semibold">
                {formatMoney(booking.platformCommission, booking.currency)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Payment fee</p>
              <p className="mt-1 font-semibold">
                {formatMoney(booking.paymentFee, booking.currency)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Partner amount</p>
              <p className="mt-1 font-semibold">
                {formatMoney(booking.partnerAmount, booking.currency)}
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-gray-200 pt-5">
            <p className="text-sm text-gray-500">Total paid / payable</p>
            <p className="mt-1 text-2xl font-bold">
              {formatMoney(booking.totalAmount, booking.currency)}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold">Payment transactions</h2>

          {booking.paymentTransactions.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No payment transactions recorded.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {booking.paymentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{transaction.provider}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {transaction.transactionReference}
                      </p>
                    </div>

                    <Status value={transaction.status} />
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className="mt-1 font-semibold">
                        {formatMoney(
                          transaction.amount,
                          transaction.currency
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Provider transaction ID</p>
                      <p className="mt-1 break-all font-medium">
                        {transaction.providerTransactionId || "Not available"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Created</p>
                      <p className="mt-1 font-medium">
                        {formatDateTime(transaction.createdAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Verified at</p>
                      <p className="mt-1 font-medium">
                        {transaction.verifiedAt
                          ? formatDateTime(transaction.verifiedAt)
                          : "Not verified"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Payment method</p>
                      <p className="mt-1 font-medium">
                        {transaction.paymentMethod || "Not specified"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Failure reason</p>
                      <p className="mt-1 font-medium">
                        {transaction.failureReason || "None"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {booking.cashRefund && (
          <section className="rounded-2xl border border-green-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Cash refund handover record</h2>
              <Status value="REFUNDED" />
            </div>
            <p className="mt-2 text-sm text-gray-500">Permanent record of the cash amount handed to the recipient at an EthiopianBooking branch. The original online payment transaction remains unchanged.</p>
            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div><p className="text-gray-500">Amount handed over</p><p className="mt-1 text-lg font-bold">{formatMoney(booking.cashRefund.amount, booking.cashRefund.currency)}</p></div>
              <div><p className="text-gray-500">Branch</p><p className="mt-1 font-semibold">{booking.cashRefund.branchName}</p></div>
              <div><p className="text-gray-500">Branch address</p><p className="mt-1 font-semibold">{booking.cashRefund.branchAddress}</p></div>
              <div><p className="text-gray-500">Recipient</p><p className="mt-1 font-semibold">{booking.cashRefund.recipientName}</p></div>
              <div><p className="text-gray-500">Recipient phone</p><p className="mt-1 font-semibold">{booking.cashRefund.recipientPhone || "Not provided"}</p></div>
              <div><p className="text-gray-500">Official receipt number</p><p className="mt-1 font-semibold">{booking.cashRefund.receiptNumber}</p></div>
              <div><p className="text-gray-500">Cash handed over</p><p className="mt-1 font-semibold">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Addis_Ababa" }).format(booking.cashRefund.handedOverAt)} (EAT)</p></div>
              <div><p className="text-gray-500">Recorded by profile</p><p className="mt-1 break-all font-semibold">{booking.cashRefund.recordedByProfileId}</p></div>
              <div><p className="text-gray-500">Record created</p><p className="mt-1 font-semibold">{formatDateTime(booking.cashRefund.createdAt)}</p></div>
            </div>
            {booking.cashRefund.note && <div className="mt-4 border-t border-gray-100 pt-4 text-sm"><p className="text-gray-500">Additional note</p><p className="mt-1 whitespace-pre-wrap">{booking.cashRefund.note}</p></div>}
          </section>
        )}

        <BookingAdminActions
          bookingId={booking.id}
          bookingStatus={booking.status}
          paymentStatus={booking.paymentStatus}
          hasSuccessfulPayment={hasSuccessfulPayment}
          refundAmount={booking.refundAmount.toString()}
          currency={booking.currency}
          hasCashRefund={Boolean(booking.cashRefund)}
        />

        {(booking.cancellationReason || booking.cancelledAt) && (
          <section className="rounded-2xl border border-red-200 bg-white p-6">
            <h2 className="text-lg font-bold text-red-700">
              Cancellation information
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Cancellation reason</p>
                <p className="mt-1 font-medium">
                  {booking.cancellationReason || "No reason provided"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Cancelled at</p>
                <p className="mt-1 font-medium">
                  {booking.cancelledAt
                    ? formatDateTime(booking.cancelledAt)
                    : "Not cancelled"}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}