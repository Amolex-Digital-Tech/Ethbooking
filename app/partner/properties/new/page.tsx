"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

const propertyTypes = [
  { value: "HOTEL", label: "Hotel" },
  { value: "GUESTHOUSE", label: "Guesthouse" },
  { value: "LODGE", label: "Lodge" },
  { value: "RESORT", label: "Resort" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "HOSTEL", label: "Hostel" },
  { value: "VILLA", label: "Villa" },
  { value: "BOUTIQUE_HOTEL", label: "Boutique Hotel" },
  { value: "BED_AND_BREAKFAST", label: "Bed & Breakfast" },
  { value: "HOMESTAY", label: "Homestay" },
  { value: "OTHER", label: "Other" },
];

const inputClass =
  "mt-2.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50";

const labelClass = "block text-sm font-semibold text-slate-700";

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-slate-100 pb-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700 ring-1 ring-blue-100">
        {number}
      </div>
      <div>
        <h2 className="text-base font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function NewPropertyPage() {
  const router = useRouter();

  const [partnerId, setPartnerId] = useState("");
  const [isLoadingPartner, setIsLoadingPartner] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    propertyType: "HOTEL",
    description: "",
    country: "Ethiopia",
    region: "",
    city: "",
    subCity: "",
    neighborhood: "",
    address: "",
    postalCode: "",
    email: "",
    phone: "",
    website: "",
    checkInTime: "",
    checkOutTime: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPartner() {
      try {
        const response = await fetch("/api/partners/me");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : "Unable to load your partner organization."
          );
        }

        if (typeof result.data?.id !== "string") {
          throw new Error("Your partner organization could not be identified.");
        }

        if (!cancelled) {
          setPartnerId(result.data.id);
          setError("");
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load your partner organization."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPartner(false);
        }
      }
    }

    loadPartner();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function handleNameChange(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: generateSlug(value),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!partnerId) {
      setError("Your partner organization has not loaded. Please try again.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          partnerId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          typeof result.error === "string"
            ? result.error
            : "Unable to create property."
        );
        return;
      }

      if (typeof result.data?.id !== "string") {
        setError("The server did not return the new property's ID.");
        return;
      }

      router.push(`/partner/properties/${result.data.id}`);
      router.refresh();
    } catch {
      setError("Unable to create property. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <button
          type="button"
          onClick={() => router.push("/partner")}
          className="group inline-flex items-center gap-2 rounded-lg text-sm font-medium text-slate-500 transition hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
        >
          <span
            aria-hidden="true"
            className="transition-transform group-hover:-translate-x-1"
          >
            ←
          </span>
          Partner dashboard
        </button>

        <div className="mt-7 flex flex-col gap-5 sm:mt-9 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Property setup
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Add your property
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              Introduce your accommodation to travelers. Complete the details
              below to create your property and continue setting it up.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-200">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="15" rx="2" />
                <path d="M7 5V3m10 2V3M3 10h18" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">
                Estimated time
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                5–10 minutes
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-start">
          <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-7">
              <SectionHeading
                number="01"
                title="Property information"
                description="Start with the essential details guests will use to identify your accommodation."
              />

              <div className="mt-6 grid gap-x-5 gap-y-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className={labelClass}>
                    Property name <span className="text-blue-600">*</span>
                  </label>
                  <input
                    id="name"
                    required
                    value={form.name}
                    onChange={(event) => handleNameChange(event.target.value)}
                    placeholder="e.g. Ethiopian Grand Hotel"
                    className={inputClass}
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    Use the official name your guests will recognize.
                  </p>
                </div>

                <div>
                  <label htmlFor="propertyType" className={labelClass}>
                    Property type <span className="text-blue-600">*</span>
                  </label>
                  <select
                    id="propertyType"
                    required
                    value={form.propertyType}
                    onChange={(event) =>
                      updateField("propertyType", event.target.value)
                    }
                    className={inputClass}
                  >
                    {propertyTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="slug" className={labelClass}>
                    Property URL slug{" "}
                    <span className="text-blue-600">*</span>
                  </label>
                  <input
                    id="slug"
                    required
                    value={form.slug}
                    onChange={(event) =>
                      updateField("slug", event.target.value)
                    }
                    placeholder="ethiopian-grand-hotel"
                    className={inputClass}
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    Generated from the name; you can edit it.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="description" className={labelClass}>
                    Property description
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    placeholder="Describe your accommodation, its atmosphere, facilities, and what makes it special..."
                    className={`${inputClass} min-h-28 resize-y leading-6`}
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    You can refine your description after creating the property.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-7">
              <SectionHeading
                number="02"
                title="Property location"
                description="Help travelers understand exactly where your accommodation is located."
              />

              <div className="mt-6 grid gap-x-5 gap-y-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="country" className={labelClass}>
                    Country <span className="text-blue-600">*</span>
                  </label>
                  <input
                    id="country"
                    required
                    value={form.country}
                    onChange={(event) =>
                      updateField("country", event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="region" className={labelClass}>
                    Region
                  </label>
                  <input
                    id="region"
                    value={form.region}
                    onChange={(event) =>
                      updateField("region", event.target.value)
                    }
                    placeholder="e.g. Oromia, Amhara"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="city" className={labelClass}>
                    City <span className="text-blue-600">*</span>
                  </label>
                  <input
                    id="city"
                    required
                    value={form.city}
                    onChange={(event) =>
                      updateField("city", event.target.value)
                    }
                    placeholder="e.g. Addis Ababa"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="subCity" className={labelClass}>
                    Sub-city
                  </label>
                  <input
                    id="subCity"
                    value={form.subCity}
                    onChange={(event) =>
                      updateField("subCity", event.target.value)
                    }
                    placeholder="e.g. Bole, Kirkos"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="neighborhood" className={labelClass}>
                    Neighborhood
                  </label>
                  <input
                    id="neighborhood"
                    value={form.neighborhood}
                    onChange={(event) =>
                      updateField("neighborhood", event.target.value)
                    }
                    placeholder="e.g. Legehar"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="postalCode" className={labelClass}>
                    Postal code
                  </label>
                  <input
                    id="postalCode"
                    value={form.postalCode}
                    onChange={(event) =>
                      updateField("postalCode", event.target.value)
                    }
                    placeholder="Enter postal code"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="address" className={labelClass}>
                    Street address or building
                  </label>
                  <input
                    id="address"
                    value={form.address}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                    placeholder="Street name, building, or nearby landmark"
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-7">
              <SectionHeading
                number="03"
                title="Contact & stay information"
                description="Provide contact details and the usual arrival and departure times for guests."
              />

              <div className="mt-6 grid gap-x-5 gap-y-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className={labelClass}>
                    Contact email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="hotel@example.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className={labelClass}>
                    Contact phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    placeholder="+251 ..."
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="website" className={labelClass}>
                    Property website
                  </label>
                  <input
                    id="website"
                    type="url"
                    value={form.website}
                    onChange={(event) =>
                      updateField("website", event.target.value)
                    }
                    placeholder="https://example.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="checkInTime" className={labelClass}>
                    Check-in time
                  </label>
                  <input
                    id="checkInTime"
                    type="time"
                    value={form.checkInTime}
                    onChange={(event) =>
                      updateField("checkInTime", event.target.value)
                    }
                    className={inputClass}
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    When guests can normally arrive.
                  </p>
                </div>

                <div>
                  <label htmlFor="checkOutTime" className={labelClass}>
                    Check-out time
                  </label>
                  <input
                    id="checkOutTime"
                    type="time"
                    value={form.checkOutTime}
                    onChange={(event) =>
                      updateField("checkOutTime", event.target.value)
                    }
                    className={inputClass}
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    When guests should normally leave.
                  </p>
                </div>
              </div>
            </section>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="mt-0.5 h-5 w-5 shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5m0 3h.01" />
                </svg>
                <p>{error}</p>
              </div>
            )}

            <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:px-5 sm:shadow-sm">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">
                  <span className="font-semibold text-slate-700">*</span>{" "}
                  Required fields. You can manage more details after creation.
                </p>

                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => router.push("/partner")}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || isLoadingPartner || !partnerId}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            stroke="currentColor"
                            strokeOpacity="0.25"
                            strokeWidth="3"
                          />
                          <path
                            d="M21 12a9 9 0 0 0-9-9"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                        </svg>
                        Creating property...
                      </>
                    ) : isLoadingPartner ? (
                      "Loading partner..."
                    ) : (
                      <>
                        Create property
                        <span aria-hidden="true">→</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">
                  Setup checklist
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  A few things to prepare for your listing.
                </p>
              </div>

              <div className="space-y-4 p-5">
                {[
                  {
                    title: "Property details",
                    description: "Name and accommodation type",
                  },
                  {
                    title: "Location",
                    description: "City and address information",
                  },
                  {
                    title: "Contact information",
                    description: "Phone, email, and website",
                  },
                  {
                    title: "Arrival & departure",
                    description: "Your usual check-in times",
                  },
                ].map((item, index) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                      {index + 1}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-sm font-semibold text-slate-800">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm ring-1 ring-blue-100">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M12 3 14.8 9.2 21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8L12 3Z" />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-900">
                Make your property stand out
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                After creating your property, you can continue with its
                description, photos, documents, rooms, and availability from
                your partner dashboard.
              </p>
            </div>

            <p className="px-1 text-xs leading-5 text-slate-400">
              Your property details are submitted to EthiopianBooking when you
              select Create property.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
