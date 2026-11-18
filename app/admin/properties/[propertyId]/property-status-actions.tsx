
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PropertyStatusActionsProps = {
  propertyId: string;
  propertyName: string;
  status: string;
};

type PropertyAction = "SUSPEND" | "REACTIVATE" | "ARCHIVE" | "RESTORE";

export default function PropertyStatusActions({
  propertyId,
  propertyName,
  status,
}: PropertyStatusActionsProps) {
  const router = useRouter();

  const [loading, setLoading] = useState<PropertyAction | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleAction(action: PropertyAction) {
    const confirmations: Record<PropertyAction, string> = {
      SUSPEND:
        `Suspend "${propertyName}"? It will no longer accept new bookings.`,
      REACTIVATE:
        `Reactivate "${propertyName}"? It will become available for new bookings again.`,
      ARCHIVE:
        `Archive "${propertyName}"? It will no longer accept new bookings.`,
      RESTORE:
        `Restore "${propertyName}"? It will become available for new bookings again.`,
    };

    if (!window.confirm(confirmations[action])) return;

    setLoading(action);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/properties/${propertyId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to update property status.");
      }

      setMessage(result.message || "Property status updated successfully.");

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(null);
    }
  }

  const buttonClass =
    "rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className="rounded-xl border border-[#E8E5DC] bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Property Status Management</h2>
        <p className="mt-1 text-sm text-[#57534E]">
          Control whether this property can receive new bookings.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {status === "APPROVED" && (
          <>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleAction("SUSPEND")}
              className={`${buttonClass} bg-amber-100 text-amber-800 hover:bg-amber-200`}
            >
              {loading === "SUSPEND" ? "Suspending..." : "Suspend Property"}
            </button>

            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleAction("ARCHIVE")}
              className={`${buttonClass} bg-red-100 text-red-800 hover:bg-red-200`}
            >
              {loading === "ARCHIVE" ? "Archiving..." : "Archive Property"}
            </button>
          </>
        )}

        {status === "SUSPENDED" && (
          <>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleAction("REACTIVATE")}
              className={`${buttonClass} bg-blue-100 text-blue-800 hover:bg-blue-200`}
            >
              {loading === "REACTIVATE" ? "Reactivating..." : "Reactivate Property"}
            </button>

            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleAction("ARCHIVE")}
              className={`${buttonClass} bg-red-100 text-red-800 hover:bg-red-200`}
            >
              {loading === "ARCHIVE" ? "Archiving..." : "Archive Property"}
            </button>
          </>
        )}

        {status === "ARCHIVED" && (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => handleAction("RESTORE")}
            className={`${buttonClass} bg-blue-100 text-blue-800 hover:bg-blue-200`}
          >
            {loading === "RESTORE" ? "Restoring..." : "Restore Property"}
          </button>
        )}

        {!["APPROVED", "SUSPENDED", "ARCHIVED"].includes(status) && (
          <p className="text-sm text-[#78716C]">
            Status management actions are available after the property has
            been approved.
          </p>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
        </p>
      )}
    </section>
  );
}
