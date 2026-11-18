"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  partnerId: string;
  propertyId: string;
  status: string;
  verificationStatus: string;
  rejectionReason: string | null;
  descriptionReady: boolean;
  photoCount: number;
  roomCount: number;
  documentCount: number;
};

export default function PropertySubmissionPanel({
  partnerId,
  propertyId,
  status,
  verificationStatus,
  rejectionReason,
  descriptionReady,
  photoCount,
  roomCount,
  documentCount,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const requirements = [
    { label: "Property description (at least 30 characters)", ready: descriptionReady },
    { label: "At least one property photo", ready: photoCount > 0 },
    { label: "At least one room type", ready: roomCount > 0 },
    { label: "At least one verification document", ready: documentCount > 0 },
  ];
  const isReady = requirements.every((item) => item.ready);
  const canSubmit = status === "DRAFT" || status === "REJECTED";

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/partners/${partnerId}/properties/${propertyId}/submit-review`,
        { method: "POST" }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not submit this property.");
      }

      setSuccess("Your property has been submitted for verification.");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            Verification process
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            Submit property for verification
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Complete the items below, then send your property to EthiopianBooking for admin review.
          </p>
        </div>
      </div>

      {status === "PENDING_REVIEW" || status === "UNDER_REVIEW" ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">Property submitted successfully</p>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            Your property is {status === "UNDER_REVIEW" ? "currently being reviewed" : "waiting for admin review"}. You will be able to see the decision here.
          </p>
        </div>
      ) : status === "APPROVED" ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-900">Property approved</p>
          <p className="mt-1 text-sm text-emerald-800">
            Your property has passed verification.
          </p>
        </div>
      ) : (
        <>
          {status === "REJECTED" && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-red-900">Changes required before approval</p>
              <p className="mt-1 text-sm leading-6 text-red-800">
                {rejectionReason || "Please review your property details and documents, make the required changes, and submit it again."}
              </p>
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {requirements.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${item.ready ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {item.ready ? "✓" : "—"}
                </span>
                <span className={`text-sm ${item.ready ? "text-slate-700" : "text-slate-500"}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              {isReady
                ? "Your property meets the basic submission requirements. Admin will review your documents before approval."
                : "Complete all four items to enable submission."}
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || !isReady || submitting}
              className="inline-flex items-center justify-center rounded-xl bg-[#405744] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#304532] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting..." : status === "REJECTED" ? "Resubmit for Verification" : "Submit for Verification"}
            </button>
          </div>
        </>
      )}

      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      {success && <p role="status" className="mt-4 text-sm text-emerald-700">{success}</p>}
      <p className="mt-3 text-xs text-slate-400">
        Verification status: {verificationStatus.replaceAll("_", " ").toLowerCase()}
      </p>
    </section>
  );
}
