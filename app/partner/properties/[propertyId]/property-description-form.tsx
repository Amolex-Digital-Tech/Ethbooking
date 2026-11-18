"use client";

import { useState } from "react";

type PropertyDescriptionFormProps = {
  partnerId: string;
  propertyId: string;
  initialDescription: string;
};

export default function PropertyDescriptionForm({
  partnerId,
  propertyId,
  initialDescription,
}: PropertyDescriptionFormProps) {
  const [description, setDescription] = useState(initialDescription);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [isError, setIsError] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (description.trim().length < 30) {
      setMessage("Please enter at least 30 characters.");
      setIsError(true);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/partners/${partnerId}/properties/${propertyId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: description.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not save the description.");
      }

      setDescription(result.data.description);
      setMessage("Description saved successfully.");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="mb-5">
        <h2 className="text-xl font-bold">Property Description</h2>
        <p className="mt-1 text-sm text-slate-500">
          Describe your property, its facilities, location, and what guests
          can expect. Use at least 30 characters.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <label
          htmlFor="property-description"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Description
        </label>

        <textarea
          id="property-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={7}
          maxLength={5000}
          required
          placeholder="Describe your hotel or accommodation..."
          className="w-full rounded-xl border border-slate-300 p-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-400">
            {description.length}/5000 characters
          </span>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Description"}
          </button>
        </div>

        {message && (
          <p
            role="status"
            aria-live="polite"
            className={`mt-4 text-sm ${
              isError ? "text-red-600" : "text-emerald-700"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
