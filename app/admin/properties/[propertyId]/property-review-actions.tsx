"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  propertyId: string;
};

export default function PropertyReviewActions({
  propertyId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function reviewProperty(
    action: "APPROVE" | "REJECT"
  ) {
    setError("");

    if (action === "REJECT" && !reason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/admin/properties/${propertyId}/review`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action,
              reason: reason.trim(),
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          setError(
            typeof result.error === "string"
              ? result.error
              : "Something went wrong."
          );
          return;
        }

        router.push("/admin/properties");
        router.refresh();
      } catch {
        setError("Unable to complete the review. Please try again.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-bold">Review Decision</h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Review the property information, photos, documents, and room
        types before making a decision.
      </p>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => reviewProperty("APPROVE")}
          disabled={isPending}
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Processing..." : "Approve Property"}
        </button>

        {!showReject ? (
          <button
            type="button"
            onClick={() => setShowReject(true)}
            disabled={isPending}
            className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject Property
          </button>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <label
              htmlFor="rejection-reason"
              className="text-sm font-semibold text-red-800"
            >
              Rejection Reason
            </label>

            <textarea
              id="rejection-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain what the partner needs to correct..."
              rows={5}
              className="mt-3 w-full rounded-xl border border-red-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => reviewProperty("REJECT")}
                disabled={isPending}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Processing..." : "Confirm Rejection"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowReject(false);
                  setReason("");
                  setError("");
                }}
                disabled={isPending}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}