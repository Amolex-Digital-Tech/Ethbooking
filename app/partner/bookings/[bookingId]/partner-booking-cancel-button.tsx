
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PartnerBookingCancelButton({
  bookingId,
}: {
  bookingId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  async function handleCancel() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking? Its reserved room inventory will be released."
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/partner/bookings/${bookingId}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cancellationReason: reason.trim() || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        window.alert(
          result.error || "Unable to cancel this booking."
        );
        return;
      }

      window.alert("Booking cancelled successfully.");
      router.refresh();
    } catch {
      window.alert(
        "A network error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <h3 className="font-bold text-red-900">
        Cancel this booking
      </h3>

      <p className="mt-2 text-sm text-red-800">
        Cancelling will release the reserved inventory for this booking.
        This action cannot be undone by the partner.
      </p>

      <label
        htmlFor="cancellationReason"
        className="mt-4 block text-sm font-semibold text-gray-700"
      >
        Cancellation reason (optional)
      </label>

      <textarea
        id="cancellationReason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Enter the reason for cancellation..."
        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-red-400"
      />

      <button
        type="button"
        onClick={handleCancel}
        disabled={loading}
        className="mt-4 rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Cancelling..." : "Cancel Booking"}
      </button>
    </div>
  );
}
