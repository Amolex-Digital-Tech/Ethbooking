"use client";

import { useState } from "react";

type RatePlanEditFormProps = {
  partnerId: string;
  propertyId: string;
  roomTypeId: string;
  ratePlanId: string;
  initialName: string;
  initialDescription: string | null;
  initialMealPlan: string;
  initialCancellationPolicy: string;
  initialCancellationDeadlineHours: number | null;
  initialCancellationFeePercent: number | null;
  initialBasePrice: string;
  initialCurrency: string;
  initialIsActive: boolean;
};

const mealPlans = [
  {
    value: "ROOM_ONLY",
    label: "Room Only",
  },
  {
    value: "BREAKFAST",
    label: "Breakfast Included",
  },
  {
    value: "HALF_BOARD",
    label: "Half Board",
  },
  {
    value: "FULL_BOARD",
    label: "Full Board",
  },
  {
    value: "ALL_INCLUSIVE",
    label: "All Inclusive",
  },
];

const cancellationPolicies = [
  {
    value: "NON_REFUNDABLE",
    label: "Non-refundable",
  },
  {
    value: "FLEXIBLE",
    label: "Flexible",
  },
  {
    value: "MODERATE",
    label: "Moderate",
  },
  {
    value: "CUSTOM",
    label: "Custom",
  },
];

export default function RatePlanEditForm({
  partnerId,
  propertyId,
  roomTypeId,
  ratePlanId,
  initialName,
  initialDescription,
  initialMealPlan,
  initialCancellationPolicy,
  initialCancellationDeadlineHours,
  initialCancellationFeePercent,
  initialBasePrice,
initialCurrency,
initialIsActive,
}: RatePlanEditFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(
    initialDescription ?? ""
  );
  const [mealPlan, setMealPlan] = useState(initialMealPlan);
  const [cancellationPolicy, setCancellationPolicy] = useState(
    initialCancellationPolicy
  );
  const [cancellationDeadlineHours, setCancellationDeadlineHours] =
    useState(
      initialCancellationDeadlineHours !== null
        ? String(initialCancellationDeadlineHours)
        : ""
    );
  const [cancellationFeePercent, setCancellationFeePercent] =
    useState(initialCancellationFeePercent ?? "");
  const [basePrice, setBasePrice] = useState(initialBasePrice);
  const [currency, setCurrency] = useState(initialCurrency);
  const [isActive, setIsActive] = useState(initialIsActive ?? false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage(null);
    setError(null);

    if (!name.trim()) {
      setError("Please enter a rate plan name.");
      return;
    }

    const parsedBasePrice = Number(basePrice);

    if (
      !basePrice ||
      !Number.isFinite(parsedBasePrice) ||
      parsedBasePrice <= 0
    ) {
      setError("Base price must be greater than zero.");
      return;
    }

    let parsedCancellationDeadlineHours: number | null = null;

    if (cancellationDeadlineHours.trim() !== "") {
      const parsed = Number(cancellationDeadlineHours);

      if (
        !Number.isInteger(parsed) ||
        parsed < 0
      ) {
        setError(
          "Cancellation deadline must be a whole number of 0 or more."
        );
        return;
      }

      parsedCancellationDeadlineHours = parsed;
    }

    let parsedCancellationFeePercent: number | null = null;

    if (String(cancellationFeePercent).trim() !== "") {
      const parsed = Number(cancellationFeePercent);

      if (
        !Number.isFinite(parsed) ||
        parsed < 0 ||
        parsed > 100
      ) {
        setError(
          "Cancellation fee must be between 0 and 100 percent."
        );
        return;
      }

      parsedCancellationFeePercent = parsed;
    }

    const normalizedCurrency = currency.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      setError(
        "Currency must be a valid three-letter currency code."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/partners/${partnerId}/properties/${propertyId}/rooms/${roomTypeId}/rate-plans/${ratePlanId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            mealPlan,
            cancellationPolicy,
            cancellationDeadlineHours:
              parsedCancellationDeadlineHours,
            cancellationFeePercent:
              parsedCancellationFeePercent,
            basePrice: parsedBasePrice,
            currency: normalizedCurrency,
            isActive,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to update rate plan."
        );
      }

      setMessage("Rate plan updated successfully.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while updating the rate plan."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`rate-plan-name-${ratePlanId}`}
            className="text-sm font-medium text-slate-700"
          >
            Rate plan name
          </label>

          <input
            id={`rate-plan-name-${ratePlanId}`}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor={`rate-plan-price-${ratePlanId}`}
            className="text-sm font-medium text-slate-700"
          >
            Price per night
          </label>

          <div className="mt-2 flex">
            <input
              id={`rate-plan-price-${ratePlanId}`}
              type="number"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(event) =>
                setBasePrice(event.target.value)
              }
              className="w-full rounded-l-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <div className="flex items-center rounded-r-xl border border-l-0 border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-600">
              {currency || "ETB"}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor={`rate-plan-description-${ratePlanId}`}
          className="text-sm font-medium text-slate-700"
        >
          Description
        </label>

        <textarea
          id={`rate-plan-description-${ratePlanId}`}
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          rows={3}
          className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`rate-plan-meal-${ratePlanId}`}
            className="text-sm font-medium text-slate-700"
          >
            Meal plan
          </label>

          <select
            id={`rate-plan-meal-${ratePlanId}`}
            value={mealPlan}
            onChange={(event) =>
              setMealPlan(event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {mealPlans.map((plan) => (
              <option
                key={plan.value}
                value={plan.value}
              >
                {plan.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`rate-plan-cancellation-${ratePlanId}`}
            className="text-sm font-medium text-slate-700"
          >
            Cancellation policy
          </label>

          <select
            id={`rate-plan-cancellation-${ratePlanId}`}
            value={cancellationPolicy}
            onChange={(event) =>
              setCancellationPolicy(event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {cancellationPolicies.map((policy) => (
              <option
                key={policy.value}
                value={policy.value}
              >
                {policy.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`rate-plan-deadline-${ratePlanId}`}
            className="text-sm font-medium text-slate-700"
          >
            Cancellation deadline
          </label>

          <div className="mt-2 flex">
            <input
              id={`rate-plan-deadline-${ratePlanId}`}
              type="number"
              min="0"
              step="1"
              value={cancellationDeadlineHours}
              onChange={(event) =>
                setCancellationDeadlineHours(
                  event.target.value
                )
              }
              placeholder="24"
              className="w-full rounded-l-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <div className="flex items-center rounded-r-xl border border-l-0 border-slate-200 bg-slate-50 px-4 text-sm text-slate-600">
              hours
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor={`rate-plan-fee-${ratePlanId}`}
            className="text-sm font-medium text-slate-700"
          >
            Cancellation fee
          </label>

          <div className="mt-2 flex">
            <input
              id={`rate-plan-fee-${ratePlanId}`}
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={cancellationFeePercent}
              onChange={(event) =>
                setCancellationFeePercent(
                  event.target.value
                )
              }
              placeholder="0"
              className="w-full rounded-l-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <div className="flex items-center rounded-r-xl border border-l-0 border-slate-200 bg-slate-50 px-4 text-sm text-slate-600">
              %
            </div>
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor={`rate-plan-currency-${ratePlanId}`}
          className="text-sm font-medium text-slate-700"
        >
          Currency
        </label>

        <input
          id={`rate-plan-currency-${ratePlanId}`}
          type="text"
          maxLength={3}
          value={currency}
          onChange={(event) =>
            setCurrency(event.target.value.toUpperCase())
          }
          className="mt-2 w-32 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
  type="checkbox"
  checked={isActive}
  onChange={(event) =>
    setIsActive(event.target.checked)
  }
  className="h-4 w-4 rounded border-slate-300"
/>

          <span>
            <span className="block text-sm font-medium text-slate-800">
              Active rate plan
            </span>

            <span className="block text-xs text-slate-500">
              Active rate plans can be offered to guests for booking.
            </span>
          </span>
        </label>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Saving changes..." : "Save Changes"}
      </button>
    </form>
  );
}