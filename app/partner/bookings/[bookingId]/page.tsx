import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import PartnerBookingCancelButton from "./partner-booking-cancel-button";
import RecordPartnerPaymentForm from "./record-payment-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    bookingId: string;
  }>;
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
    timeZone: "UTC",
  }).format(date);
}

function statusStyle(status: string) {
  if (["CONFIRMED", "COMPLETED", "PAID"].includes(status)) {
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

export default async function PartnerBookingDetailsPage({
  params,
}: PageProps) {
  const currentUser = await requireRole(
    "PARTNER_OWNER",
    "PARTNER_MANAGER"
  );

  const { bookingId } = await params;

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
            You need an active partner membership to view booking details.
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
            Booking details unavailable
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Your partner account is currently{" "}
            {membership.partner.status.toLowerCase()}. Booking details are
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

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      items: {
        some: {
          roomType: {
            property: {
              partnerId: membership.partnerId,
            },
          },
        },
      },
    },
    include: {
      offlinePayments: { select: { amount: true } },
      paymentTransactions: { where: { status: "SUCCESS" }, select: { amount: true } },
      items: {
        include: {
          roomType: {
            include: {
              property: {
                select: {
                  name: true,
                  partnerId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!booking) {
    notFound();
  }

  const partnerItems = booking.items.filter(
    (item) => item.roomType.property.partnerId === membership.partnerId
  );

  const partnerSubtotal = partnerItems.reduce(
    (total, item) => total + Number(item.subtotal.toString()),
    0
  );

  const bookingContainsOtherPartnerItems =
    partnerItems.length !== booking.items.length;

  const offlinePaid = booking.offlinePayments.reduce(
    (total, payment) => total + Number(payment.amount.toString()),
    0
  );
  const onlinePaid = booking.paymentTransactions.reduce(
    (total, payment) => total + Number(payment.amount.toString()),
    0
  );
  const outstandingBalance = Math.max(
    0,
    Number(booking.totalAmount.toString()) - offlinePaid - onlinePaid
  );

  const eligibleStatuses = [
    "PENDING",
    "PAYMENT_PENDING",
    "CONFIRMED",
  ];

  const canPartnerCancel =
    !bookingContainsOtherPartnerItems &&
    eligibleStatuses.includes(booking.status) &&
    ["UNPAID", "PENDING"].includes(booking.paymentStatus);

  const requiresAdmin =
    booking.paymentStatus === "PAID" ||
    booking.paymentStatus === "PARTIALLY_PAID" ||
    booking.paymentStatus === "REFUND_PENDING" ||
    booking.paymentStatus === "PARTIALLY_REFUNDED" ||
    booking.paymentStatus === "REFUNDED";

  return (
    <main className="min-h-screen bg-[#F8F8F5] px-4 py-8 text-[#263B2D] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            href="/partner/bookings"
            className="text-sm font-medium text-gray-500 hover:text-[#263B2D]"
          >
            ← Back to Booking Management
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Booking reference</p>
              <h1 className="mt-1 text-3xl font-bold">
                {booking.bookingReference}
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Created {formatDate(booking.createdAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-2 text-xs font-bold ${statusStyle(
                  booking.status
                )}`}
              >
                {booking.status.replaceAll("_", " ")}
              </span>

              <span
                className={`rounded-full px-3 py-2 text-xs font-bold ${statusStyle(
                  booking.paymentStatus
                )}`}
              >
                {booking.paymentStatus.replaceAll("_", " ")}
              </span>
            </div>
          </div>
        </div>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold">Guest information</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Guest name</p>
                <p className="mt-1 font-semibold">
                  {booking.customerFirstName} {booking.customerLastName}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Email</p>
                <p className="mt-1 font-medium">
                  {booking.customerEmail || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Phone</p>
                <p className="mt-1 font-medium">
                  {booking.customerPhone || "Not provided"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold">Stay information</h2>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
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
                <p className="text-gray-500">Nights</p>
                <p className="mt-1 font-semibold">{booking.nights}</p>
              </div>

              <div>
                <p className="text-gray-500">Guests</p>
                <p className="mt-1 font-semibold">{booking.guestCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-bold">Your booked rooms</h2>
            <p className="mt-1 text-sm text-gray-500">
              Rooms belonging to {membership.partner.businessName}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {partnerItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {item.roomType.property.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {item.roomName}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.ratePlanName}
                    </p>
                  </div>

                  <div className="text-right text-sm">
                    <p className="font-semibold">
                      {item.quantity} room(s)
                    </p>
                    <p className="mt-1 text-gray-500">
                      {item.guests} guest(s)
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-between border-t border-gray-100 pt-3 text-sm">
                  <span className="text-gray-500">
                    {item.nights} night(s)
                  </span>
                  <span className="font-bold">
                    {formatMoney(item.subtotal, item.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-between border-t border-gray-200 pt-5">
            <div>
              <p className="font-bold">Your room-item subtotal</p>
              <p className="mt-1 text-xs text-gray-500">
                Excludes any other partner&apos;s items and booking-wide charges.
              </p>
            </div>

            <p className="text-xl font-bold">
              {formatMoney(
                { toString: () => partnerSubtotal.toString() },
                booking.currency
              )}
            </p>
          </div>
        </section>

        {booking.specialRequests && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold">Special requests</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
              {booking.specialRequests}
            </p>
          </section>
        )}

        {booking.status === "CANCELLED" && (
          <section className="rounded-2xl border border-red-200 bg-white p-6">
            <h2 className="font-bold text-red-800">
              This booking has been cancelled
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {booking.cancellationReason || "No cancellation reason provided."}
            </p>

            {booking.cancelledAt && (
              <p className="mt-2 text-xs text-gray-500">
                Cancelled on {formatDate(booking.cancelledAt)}
              </p>
            )}
          </section>
        )}

        {!bookingContainsOtherPartnerItems &&
          booking.status === "CONFIRMED" &&
          booking.paymentStatus !== "PAID" &&
          outstandingBalance > 0 && (
            <section className="rounded-2xl border border-[#DDE8D5] bg-white p-6">
              <h2 className="text-lg font-bold">Record in-person payment</h2>
              <p className="mt-1 text-sm text-gray-500">
                This payment action is available to the Partner Owner and Manager only.
                Front desk staff can see the payment status but cannot record or edit payments.
              </p>
              <RecordPartnerPaymentForm
                partnerId={membership.partnerId}
                bookingId={booking.id}
                remainingBalance={outstandingBalance}
                currency={booking.currency}
              />
            </section>
          )}

        {canPartnerCancel && (
          <PartnerBookingCancelButton bookingId={booking.id} />
        )}

        {requiresAdmin && booking.status !== "CANCELLED" && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-bold text-amber-900">
              Cancellation / refund assistance required
            </h2>
            <p className="mt-2 text-sm text-amber-800">
              This booking has a payment or refund history. Partners cannot
              cancel paid or partially paid bookings directly. Please contact
              your administrator.
            </p>
          </section>
        )}

        {bookingContainsOtherPartnerItems && booking.status !== "CANCELLED" && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-bold text-amber-900">
              Administrator assistance required
            </h2>
            <p className="mt-2 text-sm text-amber-800">
              This booking contains rooms from more than one partner.
              Contact an administrator if cancellation is required.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}