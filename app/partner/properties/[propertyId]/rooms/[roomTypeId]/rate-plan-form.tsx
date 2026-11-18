"use client";

import { useState } from "react";

type RatePlanFormProps = {
  partnerId: string;
  propertyId: string;
  roomTypeId: string;
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

export default function RatePlanForm({
  partnerId,
  propertyId,
  roomTypeId,
}: RatePlanFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mealPlan, setMealPlan] = useState("ROOM_ONLY");
  const [cancellationPolicy, setCancellationPolicy] =
    useState("FLEXIBLE");
  const [cancellationDeadlineHours, setCancellationDeadlineHours] =
    useState("");
  const [cancellationFeePercent, setCancellationFeePercent] =
    useState("");
  const [basePrice, setBasePrice] = useState("");
  const [currency, setCurrency] = useState("ETB");

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

    if (cancellationFeePercent.trim() !== "") {
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

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/partners/${partnerId}/properties/${propertyId}/rooms/${roomTypeId}/rate-plans`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            mealPlan,
            cancellationPolicy,
            cancellationDeadlineHours:
              parsedCancellationDeadlineHours,
            cancellationFeePercent:
              parsedCancellationFeePercent,
            basePrice: parsedBasePrice,
            currency: currency.trim().toUpperCase(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to create rate plan."
        );
      }

      setMessage("Rate plan created successfully.");

      setName("");
      setDescription("");
      setMealPlan("ROOM_ONLY");
      setCancellationPolicy("FLEXIBLE");
      setCancellationDeadlineHours("");
      setCancellationFeePercent("");
      setBasePrice("");
      setCurrency("ETB");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while creating the rate plan."
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
            htmlFor="rate-plan-name"
            className="text-sm font-medium text-slate-700"
          >
            Rate plan name
          </label>

          <input
            id="rate-plan-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Standard Rate"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="rate-plan-price"
            className="text-sm font-medium text-slate-700"
          >
            Price per night
          </label>

          <div className="mt-2 flex">
            <input
              id="rate-plan-price"
              type="number"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(event) =>
                setBasePrice(event.target.value)
              }
              placeholder="2500"
              className="w-full rounded-l-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <div className="flex items-center rounded-r-xl border border-l-0 border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-600">
              ETB
            </div>
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor="rate-plan-description"
          className="text-sm font-medium text-slate-700"
        >
          Description
        </label>

        <textarea
          id="rate-plan-description"
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          rows={3}
          placeholder="Describe what is included in this rate..."
          className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="rate-plan-meal"
            className="text-sm font-medium text-slate-700"
          >
            Meal plan
          </label>

          <select
            id="rate-plan-meal"
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
            htmlFor="rate-plan-cancellation"
            className="text-sm font-medium text-slate-700"
          >
            Cancellation policy
          </label>

          <select
            id="rate-plan-cancellation"
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
            htmlFor="rate-plan-deadline"
            className="text-sm font-medium text-slate-700"
          >
            Cancellation deadline
          </label>

          <div className="mt-2 flex">
            <input
              id="rate-plan-deadline"
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

          <p className="mt-1 text-xs text-slate-400">
            Leave empty if there is no deadline.
          </p>
        </div>

        <div>
          <label
            htmlFor="rate-plan-fee"
            className="text-sm font-medium text-slate-700"
          >
            Cancellation fee
          </label>

          <div className="mt-2 flex">
            <input
              id="rate-plan-fee"
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

          <p className="mt-1 text-xs text-slate-400">
            Percentage of the booking price charged when cancellation
            fees apply.
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="rate-plan-currency"
          className="text-sm font-medium text-slate-700"
        >
          Currency
        </label>

        <input
          id="rate-plan-currency"
          type="text"
          maxLength={3}
          value={currency}
          onChange={(event) =>
            setCurrency(event.target.value.toUpperCase())
          }
          className="mt-2 w-32 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <p className="mt-1 text-xs text-slate-400">
          Use a three-letter currency code, such as ETB.
        </p>
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
        {isSubmitting
          ? "Creating rate plan..."
          : "Add Rate Plan"}
      </button>
    </form>
  );
}