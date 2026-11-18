"use client";

import { useState } from "react";

export default function StaffBookingActions({ partnerId, bookingId, checkedInAt, checkedOutAt, status, paymentStatus }: {
  partnerId: string; bookingId: string; checkedInAt: Date | null; checkedOutAt: Date | null; status: string; paymentStatus: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const checkedIn = Boolean(checkedInAt);
  const checkedOut = Boolean(checkedOutAt);
  const canCheckIn = status === "CONFIRMED" && paymentStatus === "PAID" && !checkedIn && !checkedOut;
  const canCheckOut = status === "CONFIRMED" && paymentStatus === "PAID" && checkedIn && !checkedOut;
  async function act(action: "check-in" | "check-out") {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/partners/${partnerId}/bookings/${bookingId}/${action}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to update guest status.");
      setMessage(result.message);
      window.location.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong."); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 flex flex-wrap items-center gap-2">
    {checkedOut ? <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">Checked out</span>
      : checkedIn ? <button type="button" disabled={!canCheckOut || busy} onClick={() => act("check-out")} className="rounded-lg bg-[#294A35] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? "Processing..." : "Check out guest"}</button>
      : <button type="button" disabled={!canCheckIn || busy} onClick={() => act("check-in")} className="rounded-lg bg-[#294A35] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? "Processing..." : "Check in guest"}</button>}
    {paymentStatus !== "PAID" && <span className="text-xs text-amber-700">Payment must be fully verified by management before check-in/out.</span>}
    {error && <p className="w-full text-xs text-red-700">{error}</p>}
    {message && <p className="w-full text-xs text-green-700">{message}</p>}
  </div>;
}
