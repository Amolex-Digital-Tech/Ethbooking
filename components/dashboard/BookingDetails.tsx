
"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { BookingDetail } from "@/types/booking-detail";
import Link from "next/link";

type BookingDetailsProps = {
  booking: BookingDetail;
  onBookingUpdated?: () => void;
};

function formatDate(date: string) {
  const normalizedDate = date.includes("T")
    ? date
    : `${date}T00:00:00`;

  return new Date(normalizedDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAmount(amount: string, currency: string) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return `${amount} ${currency}`;
  }

  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "REFUND_PENDING":
      return "Refund pending";
    case "REFUNDED":
      return "Refunded";
    case "CONFIRMED":
      return "Confirmed";
    case "PAYMENT_PENDING":
      return "Payment pending";
    case "CANCELLED":
      return "Cancelled";
    case "COMPLETED":
      return "Completed";
    case "EXPIRED":
      return "Expired";
    case "NO_SHOW":
      return "No show";
    default:
      return status.replaceAll("_", " ");
  }
}

function getPaymentLabel(status: string) {
  switch (status) {
    case "REFUND_PENDING":
      return "Refund pending";
    case "PAID":
      return "Paid";
    case "PENDING":
      return "Awaiting payment";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partially refunded";
    default:
      return status.replaceAll("_", " ");
  }
}

function getStatusStyles(status: string) {
  switch (status) {
    case "REFUND_PENDING":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "REFUNDED":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "CONFIRMED":
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "PAYMENT_PENDING":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "CANCELLED":
    case "EXPIRED":
    case "NO_SHOW":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-stone-200 bg-stone-50 text-stone-700";
  }
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "check"
    | "calendar"
    | "users"
    | "bed"
    | "download"
    | "arrow"
    | "clock"
    | "mail"
    | "phone"
    | "map";
  className?: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "check":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "calendar":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );

    case "users":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case "bed":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <path d="M3 20v-8m0 4h18v4M3 12h18v4M7 12V8a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v4M14 12V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3" />
        </svg>
      );

    case "download":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m7 10 5 5 5-5M12 15V3" />
        </svg>
      );

    case "arrow":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <path d="M5 12h14m-7-7 7 7-7 7" />
        </svg>
      );

    case "clock":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "mail":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );

    case "phone":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.58 2.8.7A2 2 0 0 1 22 16.92Z" />
        </svg>
      );

    case "map":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
  }
}

export default function BookingDetails({
  booking,
  onBookingUpdated,
}: BookingDetailsProps) {
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const [cancelling, setCancelling] = useState(false);
  const [cancellationError, setCancellationError] = useState("");

  const firstItem = booking.items[0];

  const propertyName =
    firstItem?.roomType.property.name ?? "Your accommodation";

  const customerName =
    `${booking.customerFirstName} ${booking.customerLastName}`.trim() ||
    "Guest";

  const isConfirmed =
    booking.status === "CONFIRMED" ||
    booking.status === "COMPLETED";

  const canShowCheckInQr =
    booking.paymentStatus === "PAID" && isConfirmed;

  const isPending =
    booking.status === "PAYMENT_PENDING" &&
    booking.paymentStatus === "PENDING";

  // eslint-disable-next-line react-hooks/purity -- Booking expiry must be compared with the current clock.
  const now = Date.now();
  const paymentHoldExpired =
    isPending &&
    Boolean(booking.expiresAt) &&
    new Date(booking.expiresAt as string).getTime() <= now;

  const displayedStatusLabel = paymentHoldExpired
    ? "Payment window expired · verification pending"
    : getStatusLabel(booking.status);

  const isCancelled = [
    "CANCELLED",
    "EXPIRED",
    "REFUND_PENDING",
    "REFUNDED",
  ].includes(booking.status);

  const canCancelBooking =
    booking.status === "PAYMENT_PENDING" ||
    booking.status === "CONFIRMED";

  const showCancellationSummary = [
    "CANCELLED",
    "REFUND_PENDING",
    "REFUNDED",
  ].includes(booking.status);

  const checkIn = new Date(
    booking.checkInDate.includes("T")
      ? booking.checkInDate
      : `${booking.checkInDate}T00:00:00`
  );

  const checkOut = new Date(
    booking.checkOutDate.includes("T")
      ? booking.checkOutDate
      : `${booking.checkOutDate}T00:00:00`
  );

  const validDates =
    Number.isFinite(checkIn.getTime()) &&
    Number.isFinite(checkOut.getTime());

  const checkInWeekday = validDates
    ? checkIn.toLocaleDateString("en-US", { weekday: "long" })
    : "Check-in";

  const checkOutWeekday = validDates
    ? checkOut.toLocaleDateString("en-US", { weekday: "long" })
    : "Check-out";

  const roomCount = booking.items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  async function handlePayment() {
    if (paying) return;

    setPaying(true);
    setPaymentError("");

    try {
      const response = await fetch("/api/payments/chapa/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.checkoutUrl) {
        throw new Error(
          result.error || "Unable to start payment. Please try again."
        );
      }

      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Unable to start payment. Please try again."
      );

      setPaying(false);
    }
  }

  async function handleCancelBooking() {
    if (cancelling || !canCancelBooking) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking? The refund, if any, will depend on your room cancellation policy."
    );

    if (!confirmed) return;

    setCancelling(true);
    setCancellationError("");

    try {
      const response = await fetch(
        `/api/bookings/${encodeURIComponent(booking.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cancellationReason: "Cancelled by customer.",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to cancel booking."
        );
      }

      onBookingUpdated?.();
    } catch (error) {
      setCancellationError(
        error instanceof Error
          ? error.message
          : "Unable to cancel booking."
      );
    } finally {
      setCancelling(false);
    }
  }

  function downloadInvoice() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-[#faf9f5] text-[#292d20]">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm;
          }

          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .invoice-print-area {
            max-width: 100% !important;
            padding: 0 !important;
          }

          .print-card {
            break-inside: avoid;
            box-shadow: none !important;
          }

          .print-hide-border {
            border-color: #e7e5e4 !important;
          }
        }
      `}</style>

      {/* Brand header */}
      <header className="no-print sticky top-0 z-30 border-b border-[#e9e4d8] bg-[#faf9f5]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="EthiopianBooking home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#a3e635] text-lg font-black text-[#29351d] shadow-sm">
              E
            </span>

            <span className="text-lg font-extrabold tracking-tight sm:text-xl">
              Ethiopian<span className="text-[#718344]">Booking</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-medium text-[#777a6e] sm:gap-3 sm:text-sm">
            <span className="hidden sm:inline">
              Your trip, all in one place
            </span>
            <span className="h-1 w-1 rounded-full bg-[#a3e635]" />
            <span>Booking details</span>
          </div>
        </div>
      </header>

      <div className="invoice-print-area mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        {/* Progress indicator */}
        <div className="no-print mx-auto mb-9 max-w-3xl">
          <div className="flex items-center justify-between gap-2">
            {[
              { label: "Your stay", complete: true },
              { label: "Your details", complete: true },
              {
                label: "Payment",
                complete: booking.paymentStatus === "PAID",
              },
              { label: "Confirmation", complete: isConfirmed },
            ].map((step, index) => (
              <div
                key={step.label}
                className="flex flex-1 items-center gap-2"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step.complete
                      ? "bg-[#a3e635] text-[#29351d]"
                      : "border border-[#dcd8cc] bg-white text-[#777a6e]"
                  }`}
                >
                  {step.complete ? (
                    <Icon name="check" className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>

                <span
                  className={`hidden text-xs font-semibold sm:inline ${
                    step.complete
                      ? "text-[#454b36]"
                      : "text-[#9a9a8e]"
                  }`}
                >
                  {step.label}
                </span>

                {index < 3 && (
                  <div className="h-px min-w-2 flex-1 bg-[#e5e0d4]" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main column */}
          <div className="min-w-0 space-y-6">
            {/* Confirmation banner */}
            <section
              className={`print-card overflow-hidden rounded-[28px] border bg-white shadow-[0_8px_35px_rgba(50,55,35,0.04)] ${
                isConfirmed
                  ? "border-[#dce9bd]"
                  : isCancelled
                    ? "border-red-200"
                    : "border-[#eee7d8]"
              }`}
            >
              <div
                className={`h-2 ${
                  isConfirmed
                    ? "bg-[#a3e635]"
                    : isCancelled
                      ? "bg-red-400"
                      : "bg-amber-300"
                }`}
              />

              <div className="p-6 sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                      isConfirmed
                        ? "bg-[#eff8dd] text-[#4d7021]"
                        : isCancelled
                          ? "bg-red-50 text-red-600"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {isConfirmed ? (
                      <Icon name="check" className="h-7 w-7" />
                    ) : (
                      <Icon name="clock" className="h-7 w-7" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyles(
                          booking.status
                        )}`}
                      >
                        {displayedStatusLabel}
                      </span>

                      <span className="text-xs text-[#858779]">
                        Reference: {booking.bookingReference}
                      </span>
                    </div>

                    <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                      {isConfirmed
                        ? "Your stay is confirmed."
                        : isCancelled
                          ? "Booking update"
                          : paymentHoldExpired ? "Your payment is still being checked." : "Your booking is almost ready."}
                    </h1>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-[#74786a] sm:text-base">
                      {isConfirmed
                        ? `You're all set, ${customerName.split(" ")[0]}. Keep your booking details handy for your stay.`
                        : isCancelled
                          ? "This booking is not currently active. Review the details below or contact support if you need assistance."
                          : paymentHoldExpired
                            ? "The 15-minute payment window has ended. Chapa is still being checked before we can mark this booking expired or confirm a successful payment."
                            : "We've saved your booking details. Complete payment if required, then check this page again for the latest status."}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={downloadInvoice}
                        className="no-print inline-flex items-center justify-center gap-2 rounded-xl bg-[#a3e635] px-5 py-3 text-sm font-bold text-[#29351d] shadow-sm transition hover:bg-[#b5f04f] focus:outline-none focus:ring-2 focus:ring-[#a3e635] focus:ring-offset-2"
                      >
                        <Icon name="download" className="h-4 w-4" />
                        Download invoice
                      </button>

                      <Link
                        href="/"
                        className="no-print inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e0d4] bg-white px-5 py-3 text-sm font-semibold text-[#464b39] transition hover:bg-[#f8f7f1]"
                      >
                        Explore stays
                        <Icon name="arrow" className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Check-in QR code */}
            {canShowCheckInQr && (
              <section className="print-card rounded-[26px] border border-[#dce9bd] bg-white p-6 shadow-[0_8px_35px_rgba(50,55,35,0.035)] sm:p-8">
                <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
                  <div className="rounded-2xl border border-[#e9e6dc] bg-white p-3">
                    <QRCodeSVG
                      value={booking.bookingReference}
                      size={172}
                      level="M"
                      includeMargin
                      bgColor="#ffffff"
                      fgColor="#292d20"
                      title={`EthiopianBooking reservation ${booking.bookingReference}`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="inline-flex rounded-full border border-[#dce9bd] bg-[#f0f7e4] px-3 py-1 text-xs font-bold text-[#4d7021]">
                      Payment verified
                    </span>

                    <h2 className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">
                      Your check-in QR code
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-[#74786a]">
                      Show this code together with your booking reference when
                      you arrive. The code contains only your booking
                      reference, not your personal contact details.
                    </p>

                    <p className="mt-3 break-all text-sm font-bold tracking-wide text-[#42473b]">
                      {booking.bookingReference}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#858779]">
                      Hotel staff should verify this reference in the booking
                      system before check-in.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Reservation details */}
            <section className="print-card rounded-[26px] border border-[#ebe6da] bg-white p-6 shadow-[0_8px_35px_rgba(50,55,35,0.035)] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#858779]">
                    Your reservation
                  </p>

                  <h2 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
                    Booking details
                  </h2>
                </div>

                <div className="rounded-xl bg-[#f3f5eb] p-3 text-[#66734a]">
                  <Icon name="calendar" className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#eee9de] bg-[#fcfbf8] p-4">
                  <p className="text-xs font-medium text-[#858779]">
                    Lead guest
                  </p>
                  <p className="mt-2 font-bold">{customerName}</p>
                </div>

                <div className="rounded-2xl border border-[#eee9de] bg-[#fcfbf8] p-4">
                  <p className="text-xs font-medium text-[#858779]">
                    Booking reference
                  </p>
                  <p className="mt-2 break-all font-bold tracking-wide">
                    {booking.bookingReference}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#eee9de] bg-[#fcfbf8] p-4">
                  <p className="text-xs font-medium text-[#858779]">
                    Email address
                  </p>
                  <p className="mt-2 flex items-start gap-2 break-all text-sm font-semibold">
                    <Icon
                      name="mail"
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#858779]"
                    />
                    {booking.customerEmail || "Not provided"}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#eee9de] bg-[#fcfbf8] p-4">
                  <p className="text-xs font-medium text-[#858779]">
                    Phone number
                  </p>
                  <p className="mt-2 flex items-start gap-2 text-sm font-semibold">
                    <Icon
                      name="phone"
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#858779]"
                    />
                    {booking.customerPhone || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-[#eee9de] pt-6">
                <h3 className="font-bold">Stay dates</h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="rounded-2xl bg-[#f7f8f1] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#777a6e]">
                      Check-in
                    </p>

                    <p className="mt-2 text-lg font-extrabold">
                      {formatDate(booking.checkInDate)}
                    </p>

                    <p className="mt-1 text-xs text-[#858779]">
                      {checkInWeekday}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#737765] sm:flex-col sm:gap-1">
                    <span className="h-px flex-1 bg-[#e5e0d4] sm:hidden" />
                    <span className="rounded-full border border-[#e5e0d4] bg-white px-3 py-2">
                      {booking.nights} night{booking.nights === 1 ? "" : "s"}
                    </span>
                    <span className="h-px flex-1 bg-[#e5e0d4] sm:hidden" />
                  </div>

                  <div className="rounded-2xl bg-[#f7f8f1] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#777a6e]">
                      Check-out
                    </p>

                    <p className="mt-2 text-lg font-extrabold">
                      {formatDate(booking.checkOutDate)}
                    </p>

                    <p className="mt-1 text-xs text-[#858779]">
                      {checkOutWeekday}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#666b5b]">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="users" className="h-4 w-4 text-[#858779]" />
                    {booking.guestCount} guest
                    {booking.guestCount === 1 ? "" : "s"}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <Icon name="bed" className="h-4 w-4 text-[#858779]" />
                    {roomCount} room{roomCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </section>

            {/* Room information */}
            <section className="print-card rounded-[26px] border border-[#ebe6da] bg-white p-6 shadow-[0_8px_35px_rgba(50,55,35,0.035)] sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f0f3e7] text-[#66734a]">
                  <Icon name="bed" className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#858779]">
                    Where you&apos;re staying
                  </p>

                  <h2 className="mt-1 text-xl font-extrabold">
                    {propertyName}
                  </h2>

                  <p className="mt-1 text-sm text-[#858779]">
                    Accommodation details
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {booking.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#eee9de] bg-[#fcfbf8] p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-bold">{item.roomName}</h3>

                        <p className="mt-1 text-sm text-[#777a6e]">
                          {item.ratePlanName}
                        </p>

                        <p className="mt-3 text-sm text-[#666b5b]">
                          {item.quantity} room
                          {item.quantity === 1 ? "" : "s"} · {item.nights} night
                          {item.nights === 1 ? "" : "s"} · {item.guests} guest
                          {item.guests === 1 ? "" : "s"}
                        </p>
                      </div>

                      <div className="shrink-0 sm:text-right">
                        <p className="text-xs text-[#858779]">
                          Price per night
                        </p>

                        <p className="mt-1 font-bold">
                          {formatAmount(item.pricePerNight, item.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Guest list */}
            {booking.guests.length > 0 && (
              <section className="print-card rounded-[26px] border border-[#ebe6da] bg-white p-6 shadow-[0_8px_35px_rgba(50,55,35,0.035)] sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#858779]">
                  Guest list
                </p>

                <h2 className="mt-2 text-xl font-extrabold">
                  Guest information
                </h2>

                <div className="mt-5 divide-y divide-[#eee9de]">
                  {booking.guests.map((guest, index) => (
                    <div
                      key={guest.id}
                      className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0f3e7] text-sm font-bold text-[#66734a]">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold">
                          {guest.firstName} {guest.lastName}
                        </p>

                        <p className="mt-1 text-xs text-[#858779]">
                          {guest.guestType}
                        </p>

                        {guest.email && (
                          <p className="mt-2 break-all text-sm text-[#666b5b]">
                            {guest.email}
                          </p>
                        )}

                        {guest.phone && (
                          <p className="mt-1 text-sm text-[#666b5b]">
                            {guest.countryCode
                              ? `${guest.countryCode} `
                              : ""}
                            {guest.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Special requests */}
            {booking.specialRequests && (
              <section className="print-card rounded-[26px] border border-[#ebe6da] bg-white p-6 shadow-[0_8px_35px_rgba(50,55,35,0.035)] sm:p-8">
                <h2 className="text-lg font-extrabold">
                  Special requests
                </h2>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#666b5b]">
                  {booking.specialRequests}
                </p>
              </section>
            )}
          </div>

          {/* Right column: reservation summary */}
          <aside className="space-y-5 lg:sticky lg:top-24">
            <section className="print-card rounded-[26px] border border-[#e9e4d8] bg-white p-6 shadow-[0_8px_35px_rgba(50,55,35,0.05)] sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold">Price summary</h2>

                <span className="rounded-full bg-[#f0f3e7] px-3 py-1 text-xs font-bold text-[#66734a]">
                  {booking.currency}
                </span>
              </div>

              <div className="mt-5 rounded-2xl bg-[#f7f8f1] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#777a6e]">
                  Accommodation
                </p>

                <p className="mt-1 font-bold leading-6">
                  {propertyName}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[#858779]">Check-in</p>
                    <p className="mt-1 text-sm font-bold">
                      {formatDate(booking.checkInDate)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#858779]">Check-out</p>
                    <p className="mt-1 text-sm font-bold">
                      {formatDate(booking.checkOutDate)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-[#e5e7d9] pt-3 text-sm text-[#666b5b]">
                  <Icon name="calendar" className="h-4 w-4" />
                  {booking.nights} night
                  {booking.nights === 1 ? "" : "s"}
                  <span className="text-[#c2c4b8]">•</span>
                  {roomCount} room{roomCount === 1 ? "" : "s"}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-[#777a6e]">Subtotal</span>

                  <span className="text-right font-semibold">
                    {formatAmount(booking.subtotal, booking.currency)}
                  </span>
                </div>

                {Number(booking.totalAmount) !==
                  Number(booking.subtotal) && (
                  <div className="text-xs leading-5 text-[#858779]">
                    The total below reflects the amount returned by your
                    booking. Any difference from the subtotal is included in
                    that total.
                  </div>
                )}

                <div className="border-t border-dashed border-[#e2ddcf] pt-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">Total amount</p>

                      <p className="mt-1 text-xs text-[#858779]">
                        Booking reference: {booking.bookingReference}
                      </p>
                    </div>

                    <p className="text-right text-xl font-extrabold tracking-tight">
                      {formatAmount(booking.totalAmount, booking.currency)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-[#eee9de] px-4 py-3">
                  <span className="text-sm text-[#777a6e]">
                    Payment status
                  </span>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                      booking.paymentStatus === "PAID"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : booking.paymentStatus === "PENDING" ||
                            booking.paymentStatus === "REFUND_PENDING"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-stone-200 bg-stone-50 text-stone-700"
                    }`}
                  >
                    {getPaymentLabel(booking.paymentStatus)}
                  </span>
                </div>

                {/* Cancellation summary */}
                {showCancellationSummary && (
                  <div className="rounded-xl border border-[#eee9de] bg-[#fcfbf8] p-4">
                    <h3 className="text-sm font-bold">
                      Cancellation summary
                    </h3>

                    <div className="mt-3 flex justify-between gap-3 text-sm">
                      <span className="text-[#777a6e]">
                        Refund amount
                      </span>

                      <span className="text-right font-bold">
                        {formatAmount(
                          booking.refundAmount,
                          booking.currency
                        )}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between gap-3 text-sm">
                      <span className="text-[#777a6e]">
                        Cancellation fee
                      </span>

                      <span className="text-right font-bold">
                        {formatAmount(
                          booking.cancellationFeeAmount,
                          booking.currency
                        )}
                      </span>
                    </div>

                    {booking.status === "REFUND_PENDING" && (
                      <p className="mt-3 text-xs leading-5 text-amber-800">
                        Your refund is pending processing. This does not mean
                        the money has already been returned.
                      </p>
                    )}

                    {booking.status === "REFUNDED" && (
                      <p className="mt-3 text-xs leading-5 text-emerald-700">
                        Your refund has been marked as completed.
                      </p>
                    )}

                    {booking.status === "CANCELLED" &&
                      Number(booking.refundAmount) === 0 && (
                        <p className="mt-3 text-xs leading-5 text-[#777a6e]">
                          This booking has been cancelled. No refund is
                          currently due.
                        </p>
                      )}
                  </div>
                )}
              </div>

              {/* Payment action */}
              {isPending && !paymentHoldExpired && (
                <div className="no-print mt-6 border-t border-[#eee9de] pt-5">
                  {paymentError && (
                    <p
                      className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                      role="alert"
                    >
                      {paymentError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handlePayment}
                    disabled={paying}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#a3e635] px-5 py-3.5 text-sm font-extrabold text-[#29351d] transition hover:bg-[#b5f04f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {paying
                      ? "Connecting to Chapa..."
                      : "Continue to payment"}

                    {!paying && (
                      <Icon name="arrow" className="h-4 w-4" />
                    )}
                  </button>

                  <p className="mt-3 text-center text-xs leading-5 text-[#858779]">
                    Your booking status will update after payment
                    verification.
                  </p>
                </div>
              )}

              {/* Cancellation action */}
              {canCancelBooking && (
                <div className="no-print mt-6 border-t border-[#eee9de] pt-5">
                  {cancellationError && (
                    <p
                      role="alert"
                      className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                      {cancellationError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleCancelBooking}
                    disabled={cancelling}
                    className="flex w-full items-center justify-center rounded-xl border border-red-200 bg-white px-5 py-3.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cancelling
                      ? "Cancelling booking..."
                      : "Cancel booking"}
                  </button>

                  <p className="mt-3 text-center text-xs leading-5 text-[#858779]">
                    Cancellation fees and refunds depend on your selected
                    room rate plan.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={downloadInvoice}
                className="no-print mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#e5e0d4] bg-white px-5 py-3 text-sm font-bold text-[#464b39] transition hover:bg-[#f8f7f1]"
              >
                <Icon name="download" className="h-4 w-4" />
                Download invoice / Save as PDF
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-[#858779]">
                Keep your booking reference for future enquiries.
              </p>
            </section>

            <section className="no-print rounded-[24px] border border-[#e9e4d8] bg-[#f1f3e9] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#66734a]">
                  <Icon name="check" className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-bold">
                    Keep your trip organized
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[#737765]">
                    Save a PDF copy of these details for your records. Your
                    payment and booking statuses are displayed separately.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {/* Footer */}
        <footer className="no-print mt-12 border-t border-[#e9e4d8] py-6">
          <div className="flex flex-col gap-3 text-center text-xs text-[#858779] sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <p>
              © {new Date().getFullYear()} EthiopianBooking. Made for your
              next stay.
            </p>

            <p>Booking reference: {booking.bookingReference}</p>
          </div>
        </footer>

        {/* Printable invoice footer */}
        <div className="hidden print:block print-card mt-8 border-t border-stone-200 pt-4 text-xs text-stone-500">
          <p>
            EthiopianBooking · Booking reference: {booking.bookingReference}
          </p>

          <p className="mt-1">
            This document summarizes the booking details currently available
            in the system.
          </p>
        </div>
      </div>
    </main>
  );
}
