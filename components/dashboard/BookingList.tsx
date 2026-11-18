import type { Booking } from "@/types/booking";
import BookingCard from "./BookingCard";

type BookingListProps = {
  bookings: Booking[];
  onViewDetails?: (bookingId: string) => void;
  onPayNow?: (bookingId: string) => void;
};

export default function BookingList({
  bookings,
  onViewDetails,
  onPayNow,
}: BookingListProps) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h3 className="text-lg font-semibold text-slate-900">
          No bookings yet
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Your hotel bookings will appear here once you make a reservation.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onViewDetails={onViewDetails}
          onPayNow={onPayNow}
        />
      ))}
    </section>
  );
}