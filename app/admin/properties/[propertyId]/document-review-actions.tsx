"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  propertyId: string;
  documentId: string;
  verificationStatus: string;
};

export default function DocumentReviewActions({
  propertyId,
  documentId,
  verificationStatus,
}: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submitReview(action: "VERIFY" | "REJECT") {
    setError("");
    setMessage("");

    if (action === "REJECT" && !reason.trim()) {
      setError("Please enter a reason for rejecting this document.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/properties/${propertyId}/documents/${documentId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            reason: reason.trim(),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || "Unable to update this document.");
        return;
      }

      setMessage(result.message || "Document updated successfully.");
      setReason("");
      setShowReject(false);
      router.refresh();
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading || verificationStatus === "VERIFIED"}
          onClick={() => submitReview("VERIFY")}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Saving..." : "Verify document"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setError("");
            setMessage("");
            setShowReject((current) => !current);
          }}
          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {showReject ? "Cancel rejection" : "Reject document"}
        </button>
      </div>

      {showReject && (
        <div className="mt-3 space-y-2">
          <label
            htmlFor={`rejection-reason-${documentId}`}
            className="block text-sm font-medium text-gray-700"
          >
            Reason for rejection
          </label>
          <textarea
            id={`rejection-reason-${documentId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={2000}
            rows={3}
            required
            placeholder="Explain what needs to be corrected or resubmitted."
            className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            disabled={loading || !reason.trim()}
            onClick={() => submitReview("REJECT")}
            className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : "Confirm rejection"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="mt-2 text-sm text-emerald-700">
          {message}
        </p>
      )}
    </div>
  );
}
