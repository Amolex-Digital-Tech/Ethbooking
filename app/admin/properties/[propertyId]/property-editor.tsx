"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PropertyEditorProps = {
  propertyId: string;
  property: {
    name: string;
    propertyType: string;
    description: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    checkInTime: string | null;
    checkOutTime: string | null;
  };
  location: {
    country: string;
    region: string | null;
    city: string;
    subCity: string | null;
    neighborhood: string | null;
    address: string | null;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
  };
};

const propertyTypes = [
  ["HOTEL", "Hotel"],
  ["GUESTHOUSE", "Guesthouse"],
  ["LODGE", "Lodge"],
  ["RESORT", "Resort"],
  ["APARTMENT", "Apartment"],
  ["HOSTEL", "Hostel"],
  ["VILLA", "Villa"],
  ["BOUTIQUE_HOTEL", "Boutique hotel"],
  ["BED_AND_BREAKFAST", "Bed and breakfast"],
  ["HOMESTAY", "Homestay"],
  ["OTHER", "Other"],
];

const inputClass =
  "mt-1.5 w-full rounded-xl border border-[#DEDAD0] bg-white px-3.5 py-2.5 text-sm text-[#292524] outline-none transition focus:border-[#647866] focus:ring-2 focus:ring-[#647866]/15";

const labelClass = "block text-sm font-medium text-[#44403C]";

export default function PropertyEditor({
  propertyId,
  property,
  location,
}: PropertyEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError(false);

    const formData = new FormData(event.currentTarget);

    const value = (key: string) => String(formData.get(key) ?? "").trim();

    const payload = {
      name: value("name"),
      propertyType: value("propertyType"),
      description: value("description"),
      email: value("email"),
      phone: value("phone"),
      website: value("website"),
      checkInTime: value("checkInTime"),
      checkOutTime: value("checkOutTime"),
      location: {
        country: value("country"),
        region: value("region"),
        city: value("city"),
        subCity: value("subCity"),
        neighborhood: value("neighborhood"),
        address: value("address"),
        postalCode: value("postalCode"),
        latitude: value("latitude"),
        longitude: value("longitude"),
      },
    };

    try {
      const response = await fetch(`/api/admin/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to save property details.");
      }

      setMessage("Property details saved successfully.");
      router.refresh();
    } catch (err) {
      setError(true);
      setMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#E8E5DC] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#647866]">
          Administrator controls
        </p>
        <h2 className="mt-1 text-xl font-semibold">Edit property details</h2>
        <p className="mt-2 text-sm leading-6 text-[#78716C]">
          Update the property&apos;s profile and location. Saving these details does
          not change its verification or approval status.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
        <div>
          <h3 className="mb-4 text-sm font-semibold text-[#292524]">
            Property profile
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Property name *
              <input
                className={inputClass}
                name="name"
                defaultValue={property.name}
                minLength={2}
                maxLength={150}
                required
              />
            </label>

            <label className={labelClass}>
              Property type *
              <select
                className={inputClass}
                name="propertyType"
                defaultValue={property.propertyType}
                required
              >
                {propertyTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Contact email
              <input
                className={inputClass}
                name="email"
                type="email"
                maxLength={254}
                defaultValue={property.email ?? ""}
              />
            </label>

            <label className={labelClass}>
              Contact phone
              <input
                className={inputClass}
                name="phone"
                type="tel"
                maxLength={40}
                defaultValue={property.phone ?? ""}
              />
            </label>

            <label className={`${labelClass} sm:col-span-2`}>
              Website URL
              <input
                className={inputClass}
                name="website"
                type="url"
                placeholder="https://example.com"
                maxLength={500}
                defaultValue={property.website ?? ""}
              />
            </label>

            <label className={labelClass}>
              Check-in time
              <input
                className={inputClass}
                name="checkInTime"
                type="time"
                defaultValue={property.checkInTime ?? ""}
              />
            </label>

            <label className={labelClass}>
              Check-out time
              <input
                className={inputClass}
                name="checkOutTime"
                type="time"
                defaultValue={property.checkOutTime ?? ""}
              />
            </label>

            <label className={`${labelClass} sm:col-span-2`}>
              Description
              <textarea
                className={inputClass}
                name="description"
                rows={5}
                maxLength={5000}
                defaultValue={property.description ?? ""}
                placeholder="Describe the property, its facilities, and what guests can expect."
              />
              <span className="mt-1 block text-xs font-normal text-[#78716C]">
                Leave blank if no description is available. Otherwise, use at
                least 30 characters.
              </span>
            </label>
          </div>
        </div>

        <div className="border-t border-[#E8E5DC] pt-6">
          <h3 className="mb-4 text-sm font-semibold text-[#292524]">
            Property location
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Country *
              <input
                className={inputClass}
                name="country"
                defaultValue={location.country || "Ethiopia"}
                maxLength={100}
                required
              />
            </label>

            <label className={labelClass}>
              Region
              <input
                className={inputClass}
                name="region"
                defaultValue={location.region ?? ""}
                maxLength={150}
              />
            </label>

            <label className={labelClass}>
              City *
              <input
                className={inputClass}
                name="city"
                defaultValue={location.city}
                maxLength={150}
                required
              />
            </label>

            <label className={labelClass}>
              Sub-city
              <input
                className={inputClass}
                name="subCity"
                defaultValue={location.subCity ?? ""}
                maxLength={150}
              />
            </label>

            <label className={labelClass}>
              Neighborhood
              <input
                className={inputClass}
                name="neighborhood"
                defaultValue={location.neighborhood ?? ""}
                maxLength={150}
              />
            </label>

            <label className={labelClass}>
              Postal code
              <input
                className={inputClass}
                name="postalCode"
                defaultValue={location.postalCode ?? ""}
                maxLength={30}
              />
            </label>

            <label className={`${labelClass} sm:col-span-2`}>
              Street address
              <textarea
                className={inputClass}
                name="address"
                rows={2}
                maxLength={500}
                defaultValue={location.address ?? ""}
              />
            </label>

            <label className={labelClass}>
              Latitude
              <input
                className={inputClass}
                name="latitude"
                type="number"
                step="any"
                min="-90"
                max="90"
                defaultValue={location.latitude ?? ""}
              />
            </label>

            <label className={labelClass}>
              Longitude
              <input
                className={inputClass}
                name="longitude"
                type="number"
                step="any"
                min="-180"
                max="180"
                defaultValue={location.longitude ?? ""}
              />
            </label>
          </div>
        </div>

        {message && (
          <p
            role="status"
            className={`rounded-xl border p-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E5DC] pt-5">
          <p className="text-xs text-[#78716C]">
            Fields marked * are required.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#344B3A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#293D2F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving changes..." : "Save property changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
