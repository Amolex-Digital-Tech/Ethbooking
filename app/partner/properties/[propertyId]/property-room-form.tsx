
"use client";

import { useState } from "react";

type PropertyRoomFormProps = {
  partnerId: string;
  propertyId: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function PropertyRoomForm({
  partnerId,
  propertyId,
}: PropertyRoomFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxGuests, setMaxGuests] = useState("2");
  const [maxAdults, setMaxAdults] = useState("2");
  const [maxChildren, setMaxChildren] = useState("0");
  const [bedType, setBedType] = useState("DOUBLE");
  const [bedCount, setBedCount] = useState("1");
  const [sizeSquareMeters, setSizeSquareMeters] = useState("");
  const [totalUnits, setTotalUnits] = useState("1");
  const [hasWifi, setHasWifi] = useState(false);
  const [hasAirConditioning, setHasAirConditioning] = useState(false);
  const [hasTv, setHasTv] = useState(false);
  const [hasPrivateBathroom, setHasPrivateBathroom] = useState(false);
  const [smokingPolicy, setSmokingPolicy] = useState("");
  const [extraBedAvailable, setExtraBedAvailable] = useState(false);
  const [extraBedPrice, setExtraBedPrice] = useState("");
  const [childPolicy, setChildPolicy] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [additionalRules, setAdditionalRules] = useState("");
  const [otherAmenities, setOtherAmenities] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        maxGuests: Number(maxGuests),
        maxAdults: maxAdults === "" ? null : Number(maxAdults),
        maxChildren:
          maxChildren === "" ? null : Number(maxChildren),
        bedType,
        bedCount: Number(bedCount),
        sizeSquareMeters:
          sizeSquareMeters === ""
            ? null
            : Number(sizeSquareMeters),
        
        totalUnits: Number(totalUnits),
        hasWifi,
        hasAirConditioning,
        hasTv,
        hasPrivateBathroom,
        smokingPolicy: smokingPolicy || null,
        extraBedAvailable,
        extraBedPrice:
          extraBedPrice.trim() === ""
            ? null
            : Number(extraBedPrice),
        childPolicy: childPolicy.trim() || null,
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
        additionalRules: additionalRules.trim() || null,
        otherAmenities: otherAmenities.trim() || null,
      };  

      if (!payload.name) {
        throw new Error("Please enter a room type name.");
      }

      if (
        !Number.isInteger(payload.maxGuests) ||
        payload.maxGuests < 1
      ) {
        throw new Error("Maximum guests must be at least 1.");
      }

      if (
        !Number.isInteger(payload.bedCount) ||
        payload.bedCount < 1
      ) {
        throw new Error("Bed count must be at least 1.");
      }

      if (
        !Number.isInteger(payload.totalUnits) ||
        payload.totalUnits < 1
      ) {
        throw new Error("Number of units must be at least 1.");
      }

      if (
        payload.maxAdults !== null &&
        payload.maxChildren !== null &&
        payload.maxAdults + payload.maxChildren > payload.maxGuests
      ) {
        throw new Error(
          "Adults and children combined cannot exceed maximum guests."
        );
      }

      const response = await fetch(
        `/api/partners/${partnerId}/properties/${propertyId}/rooms`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not create room type.");
      }

      setMessage("Room type created successfully.");
      window.location.reload();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating the room."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-bold">Add a Room Type</h2>
        <p className="mt-1 text-sm text-slate-500">
          Create a room category for this property and specify its
          capacity, beds, and number of available units.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="room-name"
              className="mb-2 block text-sm font-medium"
            >
              Room type name *
            </label>
            <input
              id="room-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Standard Double Room"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="room-units"
              className="mb-2 block text-sm font-medium"
            >
              Number of units *
            </label>
            <input
              id="room-units"
              required
              type="number"
              min="1"
              step="1"
              value={totalUnits}
              onChange={(event) => setTotalUnits(event.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              How many rooms of this type does the property have?
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="room-description"
            className="mb-2 block text-sm font-medium"
          >
            Description
          </label>
          <textarea
            id="room-description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the room and its amenities."
            className={inputClass}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label
              htmlFor="room-guests"
              className="mb-2 block text-sm font-medium"
            >
              Maximum guests *
            </label>
            <input
              id="room-guests"
              required
              type="number"
              min="1"
              step="1"
              value={maxGuests}
              onChange={(event) => setMaxGuests(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="room-adults"
              className="mb-2 block text-sm font-medium"
            >
              Maximum adults
            </label>
            <input
              id="room-adults"
              type="number"
              min="0"
              step="1"
              value={maxAdults}
              onChange={(event) => setMaxAdults(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="room-children"
              className="mb-2 block text-sm font-medium"
            >
              Maximum children
            </label>
            <input
              id="room-children"
              type="number"
              min="0"
              step="1"
              value={maxChildren}
              onChange={(event) => setMaxChildren(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Room Amenities & Policies
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Select the facilities available in this room and provide the
              relevant guest policies.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-800">
              Available amenities
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  id: "room-wifi",
                  label: "Wi-Fi available",
                  checked: hasWifi,
                  change: setHasWifi,
                },
                {
                  id: "room-ac",
                  label: "Air conditioning",
                  checked: hasAirConditioning,
                  change: setHasAirConditioning,
                },
                {
                  id: "room-tv",
                  label: "Television",
                  checked: hasTv,
                  change: setHasTv,
                },
                {
                  id: "room-bathroom",
                  label: "Private bathroom",
                  checked: hasPrivateBathroom,
                  change: setHasPrivateBathroom,
                },
                {
                  id: "room-extra-bed",
                  label: "Extra bed available",
                  checked: extraBedAvailable,
                  change: setExtraBedAvailable,
                },
              ].map((amenity) => (
                <label
                  key={amenity.id}
                  htmlFor={amenity.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700"
                >
                  <input
                    id={amenity.id}
                    type="checkbox"
                    checked={amenity.checked}
                    onChange={(event) =>
                      amenity.change(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {amenity.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="room-smoking-policy"
                className="mb-2 block text-sm font-medium"
              >
                Smoking policy
              </label>
              <select
                id="room-smoking-policy"
                value={smokingPolicy}
                onChange={(event) => setSmokingPolicy(event.target.value)}
                className={inputClass}
              >
                <option value="">Not specified</option>
                <option value="NON_SMOKING">Non-smoking</option>
                <option value="SMOKING_ALLOWED">Smoking allowed</option>
                <option value="DESIGNATED_AREAS">
                  Designated smoking areas only
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="room-extra-bed-price"
                className="mb-2 block text-sm font-medium"
              >
                Extra bed price
              </label>
              <input
                id="room-extra-bed-price"
                type="number"
                min="0"
                step="0.01"
                value={extraBedPrice}
                onChange={(event) => setExtraBedPrice(event.target.value)}
                placeholder="e.g. 500"
                className={inputClass}
                disabled={!extraBedAvailable}
              />
              <p className="mt-1 text-xs text-slate-500">
                Enter the additional charge in your property&apos;s currency.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="room-check-in"
                className="mb-2 block text-sm font-medium"
              >
                Check-in time
              </label>
              <input
                id="room-check-in"
                type="time"
                value={checkInTime}
                onChange={(event) => setCheckInTime(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="room-check-out"
                className="mb-2 block text-sm font-medium"
              >
                Check-out time
              </label>
              <input
                id="room-check-out"
                type="time"
                value={checkOutTime}
                onChange={(event) => setCheckOutTime(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="room-child-policy"
              className="mb-2 block text-sm font-medium"
            >
              Child policy
            </label>
            <textarea
              id="room-child-policy"
              rows={2}
              value={childPolicy}
              onChange={(event) => setChildPolicy(event.target.value)}
              placeholder="Explain whether children are welcome and any age restrictions."
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="room-other-amenities"
              className="mb-2 block text-sm font-medium"
            >
              Other amenities
            </label>
            <textarea
              id="room-other-amenities"
              rows={2}
              value={otherAmenities}
              onChange={(event) => setOtherAmenities(event.target.value)}
              placeholder="e.g. Mini fridge, desk, wardrobe, kettle"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="room-additional-rules"
              className="mb-2 block text-sm font-medium"
            >
              Additional room rules
            </label>
            <textarea
              id="room-additional-rules"
              rows={3}
              value={additionalRules}
              onChange={(event) => setAdditionalRules(event.target.value)}
              placeholder="Add any other rules or instructions guests should know."
              className={inputClass}
            />
          </div>
        </div>

        {message && (
      
          <p
            role="status"
            className={`text-sm ${
              isError ? "text-red-600" : "text-green-700"
            }`}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating room..." : "Create Room Type"}
        </button>
      </form>
    </section>
  );
}
