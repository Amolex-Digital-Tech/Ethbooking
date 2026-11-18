"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays } from "lucide-react";
import BookingList from "@/components/dashboard/BookingList";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardStats from "@/components/dashboard/DashboardStats";
import type { Booking } from "@/types/booking";

export default function DashboardPage() {
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBookings() {
      try {
        const response = await fetch("/api/bookings/my");
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load bookings.");
        }

        setBookings(result.data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load bookings."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, []);

  const upcomingBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status === "CONFIRMED" ||
          booking.status === "PAYMENT_PENDING"
      ),
    [bookings]
  );

  const completedBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "COMPLETED"),
    [bookings]
  );

  const cancelledBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status === "CANCELLED" ||
          booking.status === "EXPIRED" ||
          booking.status === "NO_SHOW"
      ),
    [bookings]
  );

  const customerName = bookings[0]?.customerFirstName || "Customer";

  return (
    <main className="min-h-screen bg-white text-[#1C1917]">
      <DashboardHeader customerName={customerName} />

      <div className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12">
        <section className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#758675]">
            Your account
          </p>

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome back, {customerName}.
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-[#827D72] sm:text-base">
                Your trips, reservations, and upcoming stays — all in one place.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/properties")}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full bg-[#4A5D4E] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#34483B] sm:self-auto"
            >
              Explore stays
              <ArrowRight size={16} strokeWidth={1.8} />
            </button>
          </div>
        </section>

        {!loading && !error && (
          <section className="mb-10">
            <DashboardStats
              upcoming={upcomingBookings.length}
              completed={completedBookings.length}
              cancelled={cancelledBookings.length}
            />
          </section>
        )}

        <section>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                My bookings
              </h2>

              <p className="mt-1.5 text-sm text-[#827D72]">
                Review your reservations and manage your stays.
              </p>
            </div>

            {!loading && !error && (
              <p className="text-sm text-[#827D72]">
                {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
              </p>
            )}
          </div>

          {loading && (
            <div className="rounded-2xl border border-[#E7E5E0] bg-white px-6 py-14 text-center">
              <CalendarDays
                size={25}
                strokeWidth={1.5}
                className="mx-auto mb-3 text-[#758675]"
              />
              <p className="text-sm font-medium text-[#34483B]">
                Loading your bookings
              </p>
              <p className="mt-1 text-sm text-[#827D72]">
                Just a moment while we retrieve your stays.
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-white p-6">
              <p className="font-medium text-red-800">
                We couldn&apos;t load your bookings.
              </p>
              <p className="mt-2 text-sm text-red-700">{error}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full border border-[#E7E5E0] px-4 py-2 text-sm font-medium text-[#34483B] transition-colors hover:bg-[#F4F3EF]"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && bookings.length === 0 && (
            <div className="rounded-2xl border border-[#E7E5E0] bg-white px-6 py-12 text-center">
              <CalendarDays
                size={30}
                strokeWidth={1.4}
                className="mx-auto mb-4 text-[#758675]"
              />

              <h3 className="text-lg font-semibold text-[#34483B]">
                Your next stay starts here
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#827D72]">
                You haven&apos;t made a booking yet. Explore available stays and find
                the right place for your next trip.
              </p>

              <button
                type="button"
                onClick={() => router.push("/properties")}
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#4A5D4E] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#34483B]"
              >
                Browse properties
                <ArrowRight size={16} strokeWidth={1.8} />
              </button>
            </div>
          )}

          {!loading && !error && bookings.length > 0 && (
            <BookingList
              bookings={bookings}
              onViewDetails={(bookingId) => {
                router.push(`/dashboard/bookings/${bookingId}`);
              }}
              onPayNow={(bookingId) => {
                console.log("Pay Now clicked:", bookingId);
              }}
            />
          )}
        </section>
      </div>
    </main>
  );
}