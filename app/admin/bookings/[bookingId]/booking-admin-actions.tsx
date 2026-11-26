"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bookingId: string;
  bookingStatus: string;
  paymentStatus: string;
  hasSuccessfulPayment: boolean;
  refundAmount: string;
  currency: string;
  hasCashRefund: boolean;
};

export default function BookingAdminActions({
  bookingId,
  bookingStatus,
  paymentStatus,
  hasSuccessfulPayment,
  refundAmount,
  currency,
  hasCashRefund,
}: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canCancelUnpaid =
    ["PAYMENT_PENDING", "PENDING"].includes(bookingStatus) &&
    ["UNPAID", "PENDING", "FAILED"].includes(paymentStatus) &&
    !hasSuccessfulPayment;

  const canFlagRefund =
    hasSuccessfulPayment &&
    ["CONFIRMED", "CANCELLED", "EXPIRED"].includes(bookingStatus) &&
    paymentStatus !== "REFUND_PENDING";

  const canRecordCashRefund =
    bookingStatus === "REFUND_PENDING" &&
    paymentStatus === "REFUND_PENDING" &&
    hasSuccessfulPayment &&
    !hasCashRefund;

  async function submit(action: "CANCEL_UNPAID" | "FLAG_REFUND_REVIEW") {
    setError("");
    setMessage("");
    if (reason.trim().length < 5) {
      setError("Please enter a reason with at least 5 characters.");
      return;
    }
    const confirmation =
      action === "CANCEL_UNPAID"
        ? "Cancel this unpaid booking and release its future reserved inventory?"
        : "Flag this booking for full cash refund review? No money will be paid by this action.";
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || "Unable to complete this action.");
      setMessage(data.message || "Booking updated.");
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function recordCashRefund(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!confirmed) {
      setError("Confirm that the refund amount has physically been handed over in cash.");
      return;
    }
    if (!window.confirm(`Confirm that ${currency} ${Number(refundAmount).toLocaleString()} has been handed to ${recipientName.trim()} in cash, and record receipt ${receiptNumber.trim()}?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_CASH_REFUND",
          branchName,
          branchAddress,
          recipientName,
          recipientPhone,
          receiptNumber,
          note,
          confirmed,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || "Unable to record the cash refund.");
      setMessage(data.message || "Cash refund recorded.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-bold">Administrative actions</h2>
      <p className="mt-2 text-sm text-gray-500">
        Refunds are paid in cash at an EthiopianBooking branch. This system never sends a refund through Chapa.
      </p>

      {(canCancelUnpaid || canFlagRefund) && (
        <>
          <label className="mt-5 block text-sm font-medium" htmlFor="admin-booking-reason">Reason / internal note</label>
          <textarea
            id="admin-booking-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Explain why this administrative action is needed..."
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#405744]"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            {canCancelUnpaid && <button type="button" disabled={busy} onClick={() => submit("CANCEL_UNPAID")} className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{busy ? "Processing..." : "Cancel unpaid booking"}</button>}
            {canFlagRefund && <button type="button" disabled={busy} onClick={() => submit("FLAG_REFUND_REVIEW")} className="rounded-xl bg-[#263B2D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#405744] disabled:opacity-50">{busy ? "Processing..." : "Flag for cash refund review"}</button>}
          </div>
        </>
      )}

      {canRecordCashRefund && (
        <form onSubmit={recordCashRefund} className="mt-6 border-t border-gray-200 pt-6">
          <div className="rounded-xl bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">Cash refund — handover required</p>
            <p className="mt-1 text-sm text-amber-800">Record this only after branch staff have physically handed this amount to the customer. The original Chapa payment will remain recorded as successful.</p>
            <p className="mt-3 text-2xl font-bold text-[#263B2D]">{currency} {Number(refundAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-amber-800">Amount due under the booking's refund. This can be less than the amount paid when a cancellation fee applies.</p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Branch name" value={branchName} onChange={setBranchName} required placeholder="e.g. Addis Ababa Branch" />
            <Field label="Branch address" value={branchAddress} onChange={setBranchAddress} required placeholder="Street, building, area and city" />
            <Field label="Cash recipient full name" value={recipientName} onChange={setRecipientName} required placeholder="Name of person receiving cash" />
            <Field label="Recipient phone" value={recipientPhone} onChange={setRecipientPhone} placeholder="+251..." />
            <Field label="Official cash receipt number" value={receiptNumber} onChange={setReceiptNumber} required placeholder="Unique receipt number" />
          </div>
          <label className="mt-4 block text-sm font-medium">Additional note (optional)</label>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={2} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm" placeholder="Additional handover details..." />
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-gray-200 p-4 text-sm">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4" />
            <span><strong>I confirm the refund amount has physically been handed over in cash.</strong><br /><span className="text-gray-500">I have verified the recipient and booking, and the receipt number above matches the branch&apos;s official receipt.</span></span>
          </label>
          <button type="submit" disabled={busy || !confirmed} className="mt-5 rounded-xl bg-[#263B2D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#405744] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Recording..." : "Record cash refund"}</button>
        </form>
      )}

      {hasCashRefund && <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-800">A cash refund has already been recorded for this booking. The permanent handover record is shown below.</p>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      {!canCancelUnpaid && !canFlagRefund && !canRecordCashRefund && !hasCashRefund && <p className="mt-4 text-sm text-gray-500">No manual action is available for this booking&apos;s current status.</p>}
    </section>
  );
}

function Field({ label, value, onChange, required = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder: string }) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <label htmlFor={id} className="block text-sm font-medium">
      {label}{required ? " *" : ""}
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={label === "Branch address" ? 300 : 120} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-normal outline-none focus:border-[#405744]" />
    </label>
  );
}
