"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  partnerId: string;
  propertyId: string;
  propertyStatus: string;
};

export default function SubmitPropertyButton({
  partnerId,
  propertyId,
  propertyStatus,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (propertyStatus !== "DRAFT") {
    return null;
  }

  function submitProperty() {
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/partners/${partnerId}/properties/${propertyId}/submit`,
          {
            method: "POST",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          setError(
            typeof result.error === "string"
              ? result.error
              : "Unable to submit property."
          );
          return;
        }

        router.refresh();
      } catch {
        setError("Unable to submit property. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        type="button"
        onClick={submitProperty}
        disabled={isPending}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Submitting..." : "Submit for Review"}
      </button>

      {error && (
        <p className="max-w-xs text-right text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}