"use client";

import { useCallback, useEffect, useState } from "react";

type Booking = {
  id: string;
  bookingReference: string;
  status: string;
  paymentStatus: string;
  customerFirstName: string;
  customerLastName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  checkInDate: string;
  checkOutDate: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  nights: number;
  guestCount: number;
  totalAmount: string;
  currency: string;
  createdAt: string;
  items: { roomName: string; quantity: number; roomType: { property: { name: string } } }[];
  cashRefund: { id: string; amount: string; currency: string; handedOverAt: string } | null;
};

type ResponseData = {
  success: boolean;
  total: number;
  counts: Record<string, number>;
  bookings: Booking[];
};

const statuses = ["ALL", "PENDING", "PAYMENT_PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "EXPIRED", "NO_SHOW", "REFUND_PENDING", "REFUNDED"];
const pretty = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function BranchBookings() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [data, setData] = useState<ResponseData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status !== "ALL") params.set("status", status);
      const response = await fetch("/api/branch/operations/bookings?" + params.toString(), { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to load bookings.");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load bookings.");
    } finally {
      setBusy(false);
    }
  }, [query, status]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (status !== "ALL") params.set("status", status);
        const response = await fetch("/api/branch/operations/bookings?" + params.toString(), { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Unable to load bookings.");
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load bookings.");
      }
    })();
    return () => { cancelled = true; };
  }, [query, status]);

  async function runAction(booking: Booking, action: "CHECK_IN" | "CHECK_OUT") {
    setError(""); setNotice("");
    const label = action === "CHECK_IN" ? "check this guest in" : "check this guest out";
    if (!window.confirm("Are you sure you want to " + label + "?")) return;
    setActionBusy(booking.id + action);
    try {
      const response = await fetch("/api/branch/operations/bookings/" + booking.id + "/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Action failed.");
      setNotice(booking.bookingReference + ": " + result.message);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Action failed."); }
    finally { setActionBusy(""); }
  }

  const field = "min-w-0 w-full rounded-xl border border-[#D9DED5] bg-white px-4 py-3 text-sm outline-none focus:border-[#819477]";
  const badge = (value: string) => value === "CONFIRMED" || value === "COMPLETED" || value === "REFUNDED"
    ? "bg-emerald-50 text-emerald-800"
    : value === "REFUND_PENDING" || value === "PAYMENT_PENDING"
      ? "bg-amber-50 text-amber-800"
      : value === "CANCELLED" || value === "EXPIRED" || value === "NO_SHOW"
        ? "bg-red-50 text-red-700"
        : "bg-[#F0F2ED] text-[#65715F]";

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Booking directory</h2>
            <p className="mt-1 text-sm text-[#77766F]">Search by booking reference, guest name, email, phone, or property.</p>
          </div>
          <span className="rounded-full bg-[#EDF2E8] px-3 py-1.5 text-xs font-semibold">{data ? data.total.toLocaleString() : "—"} results</span>
        </div>
        <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px_auto]" onSubmit={(event) => { event.preventDefault(); void load(); }}>
          <input className={field} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bookings or customers…" />
          <select className={field} value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((item) => <option key={item} value={item}>{item === "ALL" ? "All booking statuses" : pretty(item)}</option>)}
          </select>
          <button disabled={busy} className="rounded-xl bg-[#263B2D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Searching…" : "Search"}</button>
        </form>
        {data && <div className="mt-4 flex flex-wrap gap-2">
          {["CONFIRMED", "PAYMENT_PENDING", "REFUND_PENDING", "COMPLETED"].map((key) => (
            <button key={key} onClick={() => setStatus(key)} className="rounded-full bg-[#F3F4F0] px-3 py-1.5 text-xs text-[#687362] hover:bg-[#E9EEE4]">{pretty(key)} · {data.counts[key] || 0}</button>
          ))}
          <button onClick={() => setStatus("ALL")} className="rounded-full bg-[#F3F4F0] px-3 py-1.5 text-xs text-[#687362] hover:bg-[#E9EEE4]">All statuses</button>
        </div>}
      </div>

      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!data && !error && <div className="rounded-2xl border border-[#E7E5DF] bg-white p-8 text-sm text-[#77766F]">Loading bookings…</div>}
      {data && data.bookings.length === 0 && <div className="rounded-2xl border border-[#E7E5DF] bg-white p-10 text-center"><p className="font-semibold">No bookings found</p><p className="mt-1 text-sm text-[#77766F]">Try another booking reference, customer detail, or status.</p></div>}
      {data && data.bookings.length > 0 && <div className="overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EEECE6] px-5 py-4">
          <h3 className="text-sm font-semibold">Latest bookings</h3>
          <span className="text-xs text-[#858B80]">Showing up to 100 matches</span>
        </div>
        <div className="divide-y divide-[#EEECE6]">
          {data.bookings.map((booking) => (
            <article key={booking.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold tracking-wide text-[#77836E]">{booking.bookingReference}</p>
                  <h3 className="mt-1 font-semibold">{booking.customerFirstName} {booking.customerLastName || ""}</h3>
                  <p className="mt-1 break-all text-sm text-[#77766F]">{booking.customerEmail} · {booking.customerPhone || "No phone"}</p>
                  <p className="mt-2 text-xs text-[#77766F]">{booking.items.map((item) => item.roomType.property.name).filter((name, index, all) => all.indexOf(name) === index).join(", ") || "Property details unavailable"}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-semibold">{booking.currency} {Number(booking.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
                    <span className={"rounded-full px-2.5 py-1 text-[11px] font-semibold " + badge(booking.status)}>{pretty(booking.status)}</span>
                    <span className={"rounded-full px-2.5 py-1 text-[11px] font-semibold " + badge(booking.paymentStatus)}>{pretty(booking.paymentStatus)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#F0F0EA] pt-3 text-xs text-[#77766F]">
                <span>Check-in: {date(booking.checkInDate)}</span>
                <span>Check-out: {date(booking.checkOutDate)}</span>
                <span>{booking.nights} nights · {booking.guestCount} guests</span>
                {booking.cashRefund && <span className="font-semibold text-emerald-700">Cash refund recorded</span>}
                {booking.checkedInAt && <span className="font-semibold text-emerald-700">Checked in {date(booking.checkedInAt)}</span>}
                {booking.checkedOutAt && <span className="font-semibold text-emerald-700">Checked out {date(booking.checkedOutAt)}</span>}
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#F0F0EA] pt-4">
                {booking.status === "CONFIRMED" && booking.paymentStatus === "PAID" && !booking.checkedInAt && !booking.checkedOutAt && <button type="button" disabled={!!actionBusy} onClick={() => void runAction(booking, "CHECK_IN")} className="rounded-xl border border-[#CBD7C5] px-4 py-2.5 text-xs font-semibold text-[#35543A] disabled:opacity-50">{actionBusy === booking.id + "CHECK_IN" ? "Checking in…" : "Check in guest"}</button>}
                {booking.status === "CONFIRMED" && booking.paymentStatus === "PAID" && booking.checkedInAt && !booking.checkedOutAt && <button type="button" disabled={!!actionBusy} onClick={() => void runAction(booking, "CHECK_OUT")} className="rounded-xl border border-[#CBD7C5] px-4 py-2.5 text-xs font-semibold text-[#35543A] disabled:opacity-50">{actionBusy === booking.id + "CHECK_OUT" ? "Checking out…" : "Check out guest"}</button>}
              </div>
            </article>
          ))}
        </div>
      </div>}
    </section>
  );
}
