"use client";

import { useState, type FormEvent } from "react";

export default function RecordPartnerPaymentForm({ partnerId, bookingId, remainingBalance, currency }: { partnerId: string; bookingId: string; remainingBalance: number; currency: string }) {
  const [amount, setAmount] = useState(remainingBalance.toFixed(2));
  const [method, setMethod] = useState("CASH");
  const [methodDetails, setMethodDetails] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/partners/${partnerId}/bookings/${bookingId}/offline-payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount), method, methodDetails, reference, note, paidAt: paidAt || undefined }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to record payment.");
      setMessage(`Payment recorded. New payment status: ${result.data.paymentStatus.replaceAll("_", " ")}.`);
      window.location.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to record payment."); }
    finally { setBusy(false); }
  }
  const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";
  return <form onSubmit={submit} className="mt-5 space-y-4">
    <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Outstanding balance: <strong>{remainingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</strong></div>
    {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-slate-700">Amount received ({currency})<input className={input} type="number" min="0.01" step="0.01" max={remainingBalance} required value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <label className="text-sm font-medium text-slate-700">Payment method<select className={input} value={method} onChange={e => setMethod(e.target.value)}><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option><option value="POS_CARD">POS / Card</option><option value="MOBILE_MONEY">Mobile money</option><option value="OTHER">Other</option></select></label>
      {method === "OTHER" && <label className="text-sm font-medium text-slate-700">Specify method<input className={input} required value={methodDetails} onChange={e => setMethodDetails(e.target.value)} /></label>}
      <label className="text-sm font-medium text-slate-700">Payment reference (optional)<input className={input} value={reference} onChange={e => setReference(e.target.value)} maxLength={120} /></label>
      <label className="text-sm font-medium text-slate-700">Payment date<input className={input} type="datetime-local" value={paidAt} onChange={e => setPaidAt(e.target.value)} /></label>
      <label className="text-sm font-medium text-slate-700">Note (optional)<input className={input} value={note} onChange={e => setNote(e.target.value)} maxLength={500} /></label>
    </div>
    <button disabled={busy} className="rounded-xl bg-[#365B35] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Recording..." : "Record payment"}</button>
  </form>;
}
