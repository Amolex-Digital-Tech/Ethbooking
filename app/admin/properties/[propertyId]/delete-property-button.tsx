
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePropertyButton({
  propertyId,
  propertyName,
}: {
  propertyId: string;
  propertyName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${propertyName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/properties/${propertyId}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to delete this property.");
        return;
      }

      router.push("/admin/properties");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Deleting..." : "Delete Property"}
      </button>

      {error && (
        <p className="max-w-md text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
