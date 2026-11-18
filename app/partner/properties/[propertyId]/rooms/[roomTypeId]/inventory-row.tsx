
"use client";

import { useState } from "react";

type InventoryRowProps = {
  partnerId: string;
  propertyId: string;
  roomTypeId: string;
  inventoryId: string;
  date: string;
  totalUnits: number;
  reservedUnits: number;
  blockedUnits: number;
};

export default function InventoryRow({
  partnerId,
  propertyId,
  roomTypeId,
  inventoryId,
  date,
  totalUnits,
  reservedUnits,
  blockedUnits,
}: InventoryRowProps) {
  const [currentBlockedUnits, setCurrentBlockedUnits] =
    useState(blockedUnits);

  const [isEditing, setIsEditing] = useState(false);

  const [blockedUnitsInput, setBlockedUnitsInput] =
    useState(String(blockedUnits));

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const availableUnits =
    totalUnits - reservedUnits - currentBlockedUnits;

  const maxBlockedUnits = totalUnits - reservedUnits;

  async function handleSave() {
    setError(null);

    const nextBlockedUnits = Number(blockedUnitsInput);

    if (
      !Number.isInteger(nextBlockedUnits) ||
      nextBlockedUnits < 0
    ) {
      setError(
        "Blocked rooms must be a whole number of 0 or more."
      );
      return;
    }

    if (nextBlockedUnits > maxBlockedUnits) {
      setError(
        `You can block at most ${maxBlockedUnits} room${
          maxBlockedUnits === 1 ? "" : "s"
        } because ${reservedUnits} room${
          reservedUnits === 1 ? "" : "s"
        } ${
          reservedUnits === 1 ? "is" : "are"
        } already reserved.`
      );
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/partners/${partnerId}/properties/${propertyId}/rooms/${roomTypeId}/inventory/${inventoryId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            blockedUnits: nextBlockedUnits,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to update room availability."
        );
      }

      const savedBlockedUnits = result.data?.blockedUnits;

      if (
        typeof savedBlockedUnits !== "number" ||
        !Number.isInteger(savedBlockedUnits)
      ) {
        throw new Error(
          "The server returned an invalid availability response."
        );
      }

      setCurrentBlockedUnits(savedBlockedUnits);
      setBlockedUnitsInput(String(savedBlockedUnits));
      setIsEditing(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Something went wrong while updating availability."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setBlockedUnitsInput(String(currentBlockedUnits));
    setError(null);
    setIsEditing(false);
  }

  return (
    <div className="grid gap-4 p-6 sm:grid-cols-6 sm:items-center">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Date
        </p>
        <p className="mt-1 font-medium">{date}</p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Total
        </p>
        <p className="mt-1 font-medium">{totalUnits}</p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Reserved
        </p>
        <p className="mt-1 font-medium">{reservedUnits}</p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Blocked
        </p>

        {isEditing ? (
          <input
            type="number"
            min="0"
            max={maxBlockedUnits}
            step="1"
            value={blockedUnitsInput}
            onChange={(event) =>
              setBlockedUnitsInput(event.target.value)
            }
            className="mt-1 w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        ) : (
          <p className="mt-1 font-medium">
            {currentBlockedUnits}
          </p>
        )}
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Available
        </p>

        <p className="mt-1 font-medium">
          {availableUnits}
        </p>
      </div>

      <div className="sm:text-right">
        {!isEditing ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setBlockedUnitsInput(
                String(currentBlockedUnits)
              );
              setIsEditing(true);
            }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Manage
          </button>
        ) : (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        )}

        {error ? (
          <p className="mt-2 text-xs leading-5 text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
