
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type NullableBoolean = boolean | null;

type RoomFormValues = {
  name: string;
  description: string;
  maxGuests: number;
  maxAdults: number | null;
  maxChildren: number | null;
  bedType: string;
  bedCount: number;
  sizeSquareMeters: number | null;
  totalUnits: number;
  isActive: boolean;
  hasWifi: NullableBoolean;
  hasAirConditioning: NullableBoolean;
  hasTv: NullableBoolean;
  hasPrivateBathroom: NullableBoolean;
  smokingPolicy: string;
  extraBedAvailable: NullableBoolean;
  extraBedPrice: number | null;
  childPolicy: string;
  checkInTime: string;
  checkOutTime: string;
  additionalRules: string;
  otherAmenities: string;
};

type RoomEditorProps = {
  propertyId: string;
  room: Omit<
    RoomFormValues,
    | "description"
    | "smokingPolicy"
    | "childPolicy"
    | "checkInTime"
    | "checkOutTime"
    | "additionalRules"
    | "otherAmenities"
  > & {
    id: string;
    description: string | null;
    smokingPolicy: string | null;
    childPolicy: string | null;
    checkInTime: string | null;
    checkOutTime: string | null;
    additionalRules: string | null;
    otherAmenities: string | null;
  };
};

const bedTypes = [
  "SINGLE",
  "TWIN",
  "DOUBLE",
  "QUEEN",
  "KING",
  "BUNK",
  "SOFA_BED",
  "MULTIPLE",
  "OTHER",
];

const smokingPolicies = [
  "SMOKING_ALLOWED",
  "NON_SMOKING",
  "DESIGNATED_AREAS",
];

function nullableNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function inputClass() {
  return "mt-1 w-full rounded-lg border border-[#D6D3D1] bg-white px-3 py-2 text-sm text-[#1C1917] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  min,
  step,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  min?: number;
  step?: number;
}) {
  return (
    <label className="block text-sm font-medium text-[#44403C]">
      {label}
      <input
        className={inputClass()}
        type={type}
        value={value}
        min={min}
        step={step}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-[#44403C]">
      {label}
      <textarea
        className={inputClass()}
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-[#44403C]">
      {label}
      <select
        className={inputClass()}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const nullableBooleanOptions = [
  { value: "", label: "Not specified" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

function nullableBooleanValue(value: NullableBoolean): string {
  return value === null ? "" : String(value);
}

function parseNullableBoolean(value: string): NullableBoolean {
  if (value === "") return null;
  return value === "true";
}

export default function RoomEditor({
  propertyId,
  room,
}: RoomEditorProps) {
  const router = useRouter();

  const [form, setForm] = useState<RoomFormValues>({
    name: room.name,
    description: room.description ?? "",
    maxGuests: room.maxGuests,
    maxAdults: room.maxAdults,
    maxChildren: room.maxChildren,
    bedType: room.bedType,
    bedCount: room.bedCount,
    sizeSquareMeters: room.sizeSquareMeters,
    totalUnits: room.totalUnits,
    isActive: room.isActive,
    hasWifi: room.hasWifi,
    hasAirConditioning: room.hasAirConditioning,
    hasTv: room.hasTv,
    hasPrivateBathroom: room.hasPrivateBathroom,
    smokingPolicy: room.smokingPolicy ?? "",
    extraBedAvailable: room.extraBedAvailable,
    extraBedPrice: room.extraBedPrice,
    childPolicy: room.childPolicy ?? "",
    checkInTime: room.checkInTime ?? "",
    checkOutTime: room.checkOutTime ?? "",
    additionalRules: room.additionalRules ?? "",
    otherAmenities: room.otherAmenities ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update<K extends keyof RoomFormValues>(
    key: K,
    value: RoomFormValues[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Enter a room name.");
      return;
    }

    if (
      !Number.isInteger(form.maxGuests) ||
      form.maxGuests < 1 ||
      !Number.isInteger(form.bedCount) ||
      form.bedCount < 1 ||
      !Number.isInteger(form.totalUnits) ||
      form.totalUnits < 1
    ) {
      setError(
        "Maximum guests, number of beds, and total units must be positive whole numbers.",
      );
      return;
    }

    if (
      (form.maxAdults !== null &&
        (!Number.isInteger(form.maxAdults) || form.maxAdults < 0)) ||
      (form.maxChildren !== null &&
        (!Number.isInteger(form.maxChildren) || form.maxChildren < 0))
    ) {
      setError("Adult and child capacities must be zero or greater.");
      return;
    }

    if (
      form.maxAdults !== null &&
      form.maxChildren !== null &&
      form.maxAdults + form.maxChildren > form.maxGuests
    ) {
      setError("Adult and child capacities cannot exceed maximum guests.");
      return;
    }

    if (
      form.sizeSquareMeters !== null &&
      form.sizeSquareMeters <= 0
    ) {
      setError("Room size must be greater than zero.");
      return;
    }

    if (form.extraBedPrice !== null && form.extraBedPrice < 0) {
      setError("Extra bed price cannot be negative.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/properties/${encodeURIComponent(propertyId)}/rooms/${encodeURIComponent(room.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            name: form.name.trim(),
            description: form.description.trim() || null,
            sizeSquareMeters: form.sizeSquareMeters,
            extraBedPrice: form.extraBedPrice,
            smokingPolicy: form.smokingPolicy || null,
            childPolicy: form.childPolicy.trim() || null,
            checkInTime: form.checkInTime.trim() || null,
            checkOutTime: form.checkOutTime.trim() || null,
            additionalRules: form.additionalRules.trim() || null,
            otherAmenities: form.otherAmenities.trim() || null,
          }),
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error || "Could not update this room. Please try again.",
        );
      }

      setSuccess("Room details saved successfully.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while saving.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="mt-6 rounded-xl border border-blue-200 bg-blue-50/40">
      <summary className="cursor-pointer px-4 py-3 font-semibold text-[#1C1917]">
        Edit room details
      </summary>

      <form onSubmit={handleSubmit} className="space-y-6 p-4">
        <section>
          <h4 className="mb-3 font-semibold">Basic information</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Room name"
              value={form.name}
              onChange={(v) => update("name", v)}
            />
            <SelectField
              label="Bed type"
              value={form.bedType}
              options={bedTypes.map((v) => ({
                value: v,
                label: v.replaceAll("_", " "),
              }))}
              onChange={(v) => update("bedType", v)}
            />
            <Field
              label="Maximum guests"
              type="number"
              min={1}
              value={form.maxGuests}
              onChange={(v) => update("maxGuests", Number(v))}
            />
            <Field
              label="Maximum adults (blank = unspecified)"
              type="number"
              min={0}
              value={form.maxAdults ?? ""}
              onChange={(v) =>
                update("maxAdults", v === "" ? null : Number(v))
              }
            />
            <Field
              label="Maximum children (blank = unspecified)"
              type="number"
              min={0}
              value={form.maxChildren ?? ""}
              onChange={(v) =>
                update("maxChildren", v === "" ? null : Number(v))
              }
            />
            <Field
              label="Number of beds"
              type="number"
              min={1}
              value={form.bedCount}
              onChange={(v) => update("bedCount", Number(v))}
            />
            <Field
              label="Room size in m² (blank = unspecified)"
              type="number"
              min={0}
              step={0.01}
              value={form.sizeSquareMeters ?? ""}
              onChange={(v) =>
                update("sizeSquareMeters", nullableNumber(v))
              }
            />
            <Field
              label="Total room units"
              type="number"
              min={1}
              value={form.totalUnits}
              onChange={(v) => update("totalUnits", Number(v))}
            />
          </div>

          <div className="mt-4">
            <TextAreaField
              label="Description"
              value={form.description}
              onChange={(v) => update("description", v)}
            />
          </div>

          <label className="mt-4 flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => update("isActive", event.target.checked)}
              className="h-4 w-4"
            />
            Room is active and available for listing
          </label>
        </section>

        <section className="border-t border-[#E8E5DC] pt-5">
          <h4 className="mb-3 font-semibold">Amenities</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(
              [
                ["hasWifi", "Wi-Fi"],
                ["hasAirConditioning", "Air conditioning"],
                ["hasTv", "Television"],
                ["hasPrivateBathroom", "Private bathroom"],
                ["extraBedAvailable", "Extra bed available"],
              ] as const
            ).map(([key, label]) => (
              <SelectField
                key={key}
                label={label}
                value={nullableBooleanValue(form[key])}
                options={nullableBooleanOptions}
                onChange={(v) =>
                  update(key, parseNullableBoolean(v))
                }
              />
            ))}
            <SelectField
              label="Smoking policy"
              value={form.smokingPolicy}
              options={[
                { value: "", label: "Not specified" },
                ...smokingPolicies.map((v) => ({
                  value: v,
                  label: v.replaceAll("_", " "),
                })),
              ]}
              onChange={(v) => update("smokingPolicy", v)}
            />
            <Field
              label="Extra bed price (ETB; blank = unspecified)"
              type="number"
              min={0}
              step={0.01}
              value={form.extraBedPrice ?? ""}
              onChange={(v) =>
                update("extraBedPrice", nullableNumber(v))
              }
            />
          </div>
        </section>

        <section className="border-t border-[#E8E5DC] pt-5">
          <h4 className="mb-3 font-semibold">Policies and rules</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Check-in time"
              value={form.checkInTime}
              onChange={(v) => update("checkInTime", v)}
            />
            <Field
              label="Check-out time"
              value={form.checkOutTime}
              onChange={(v) => update("checkOutTime", v)}
            />
          </div>
          <div className="mt-4 space-y-4">
            <TextAreaField
              label="Child policy"
              value={form.childPolicy}
              onChange={(v) => update("childPolicy", v)}
            />
            <TextAreaField
              label="Other amenities"
              value={form.otherAmenities}
              onChange={(v) => update("otherAmenities", v)}
            />
            <TextAreaField
              label="Additional rules"
              value={form.additionalRules}
              onChange={(v) => update("additionalRules", v)}
            />
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#1D4ED8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving changes..." : "Save room changes"}
        </button>
      </form>
    </details>
  );
}
