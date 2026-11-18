import type { Booking } from "@/types/booking";

type BookingCardProps = {
  booking: Booking;
  onViewDetails?: (bookingId: string) => void;
  onPayNow?: (bookingId: string) => void;
};

function formatDate(date: string) {
  const normalizedDate = date.includes("T")
    ? date
    : `${date}T00:00:00`;

  return new Date(normalizedDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAmount(amount: string, currency: string) {
  return `${Number(amount).toLocaleString("en-US")} ${currency}`;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "Confirmed";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    case "PAYMENT_PENDING":
      return "Payment Pending";
    default:
      return status;
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-50 text-green-700";
    case "COMPLETED":
      return "bg-blue-50 text-blue-700";
    case "CANCELLED":
    case "EXPIRED":
      return "bg-red-50 text-red-700";
    case "PAYMENT_PENDING":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function BookingCard({
  booking,
  onViewDetails,
  onPayNow,
}: BookingCardProps) {
  const firstItem = booking.items[0];

  const propertyName =
    firstItem?.roomType.property.name ?? "Property";

  const roomName =
    firstItem?.roomName ?? "Room";

  const ratePlanName =
    firstItem?.ratePlanName ?? "Rate plan";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                booking.status
              )}`}
            >
              {getStatusLabel(booking.status)}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Payment: {booking.paymentStatus}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-bold text-slate-900">
            {propertyName}
          </h3>

          <p className="mt-1 text-sm text-slate-600">
            {roomName} · {ratePlanName}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-xs text-slate-500">
            Total
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatAmount(booking.totalAmount, booking.currency)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Check-in
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatDate(booking.checkInDate)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Check-out
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatDate(booking.checkOutDate)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Guests
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {booking.guestCount}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Booking reference:{" "}
          <span className="font-semibold text-slate-700">
            {booking.bookingReference}
          </span>
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onViewDetails?.(booking.id)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            View Details
          </button>

          {booking.paymentStatus === "PENDING" && (
            <button
              type="button"
              onClick={() => onPayNow?.(booking.id)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Pay Now
            </button>
          )}
        </div>
      </div>
    </article>
  );
}