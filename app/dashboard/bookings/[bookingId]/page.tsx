
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import BookingDetails from "@/components/dashboard/BookingDetails";
import type { BookingDetail } from "@/types/booking-detail";

export default function BookingDetailsPage() {
  const params = useParams<{ bookingId: string }>();
  const searchParams = useSearchParams();

  const paymentResult = searchParams.get("payment");

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadBooking() {
      setError("");

      try {
        const response = await fetch(
          `/api/bookings/${encodeURIComponent(params.bookingId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Unable to load booking."
          );
        }

        if (isActive) {
          setBooking(result.data);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load booking."
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    if (params.bookingId) void loadBooking();

    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible" && params.bookingId) void loadBooking();
    }, 60_000);

    return () => {
      isActive = false;
      window.clearInterval(refreshInterval);
    };
  }, [params.bookingId, refreshKey]);

  function handleBookingUpdated() {
    setRefreshKey((current) => current + 1);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf9f5] p-4 text-[#292d20] sm:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-[#e9e4d8] bg-white p-8 text-center text-[#777a6e] shadow-sm">
            Loading booking details...
          </div>
        </div>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-[#faf9f5] p-4 text-[#292d20] sm:p-8">
        <div className="mx-auto max-w-4xl">
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
          >
            {error || "Booking not found."}

            <button
              type="button"
              onClick={handleBookingUpdated}
              className="mt-4 block rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold transition hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      {paymentResult === "success" && (
        <div
          role="status"
          className="mx-auto mt-6 max-w-4xl rounded-xl border border-green-200 bg-green-50 p-4 text-green-800"
        >
          Payment verification succeeded. Your booking status is shown
          below.
        </div>
      )}

      {paymentResult === "pending" && (
        <div
          role="status"
          className="mx-auto mt-6 max-w-4xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800"
        >
          Your payment is not yet confirmed. Please allow time for
          verification and check your booking status again.
        </div>
      )}

      {paymentResult === "refund_pending" && (
        <div
          role="status"
          className="mx-auto mt-6 max-w-4xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800"
        >
          Chapa confirmed that payment was received after the booking
          was cancelled. Your refund is pending processing.
        </div>
      )}

      <BookingDetails
        booking={booking}
        onBookingUpdated={handleBookingUpdated}
      />
    </>
  );
}
