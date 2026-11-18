
"use client";

import { useState, type FormEvent } from "react";
import InventoryRow from "./inventory-row";

type InventoryItem = {
  id: string;
  date: string;
  totalUnits: number;
  reservedUnits: number;
  blockedUnits: number;
};

type AvailabilityFormProps = {
  partnerId: string;
  propertyId: string;
  roomTypeId: string;
  initialFrom: string;
  initialTo: string;
  initialInventory: InventoryItem[];
};

export default function AvailabilityForm({
  partnerId,
  propertyId,
  roomTypeId,
  initialFrom,
  initialTo,
  initialInventory,
}: AvailabilityFormProps) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [inventory, setInventory] = useState(initialInventory);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!from || !to || from >= to) {
      setError("Please select a valid date range.");
      return;
    }

    setIsLoading(true);

    try {
      const query = new URLSearchParams({
        from,
        to,
      });

      const response = await fetch(
        `/api/partners/${partnerId}/properties/${propertyId}/rooms/${roomTypeId}/inventory?${query.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to load room availability."
        );
      }

      setInventory(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load room availability."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Manage nightly availability
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Availability is generated automatically using your
          physical room count. Select a date range to view
          availability or block rooms when they are unavailable.
          You do not need to generate inventory manually.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <div>
          <label
            htmlFor="inventory-from"
            className="text-sm font-medium text-slate-700"
          >
            Check-in date
          </label>

          <input
            id="inventory-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="inventory-to"
            className="text-sm font-medium text-slate-700"
          >
            Check-out date
          </label>

          <input
            id="inventory-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <p className="mt-1 text-xs text-slate-400">
            Checkout date is not included as a booked night.
          </p>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isLoading ? "Loading..." : "View dates"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-800">
          Automatic inventory
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Missing nightly records in the selected range are
          created automatically. Existing reservations and
          blocked rooms are preserved.
        </p>
      </div>

      <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
        {inventory.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No nights found for this date range.
          </div>
        ) : (
          inventory.map((item) => (
            <InventoryRow
              key={item.id}
              partnerId={partnerId}
              propertyId={propertyId}
              roomTypeId={roomTypeId}
              inventoryId={item.id}
              date={item.date}
              totalUnits={item.totalUnits}
              reservedUnits={item.reservedUnits}
              blockedUnits={item.blockedUnits}
            />
          ))
        )}
      </div>
    </div>
  );
}
