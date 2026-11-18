"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type RatePlanOption = {
  id: string;
  name: string;
  basePrice: string;
  currency: string;
};

type RoomOption = {
  id: string;
  name: string;
  maxGuests: number;
  totalUnits: number;
  ratePlans: RatePlanOption[];
};

type PropertyOption = {
  id: string;
  name: string;
  roomTypes: RoomOption[];
};

type Props = {
  partnerId: string;
  properties: PropertyOption[];
  canRecordPayments?: boolean;
};

type CreatedBooking = {
  bookingId: string;
  bookingReference: string;
  paymentStatus: string;
  propertyName: string;
  roomName: string;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  currency: string;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#83A65B] focus:ring-2 focus:ring-[#83A65B]/15";

const labelClass =
  "text-sm font-semibold text-slate-700";

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function WalkInBookingForm({
  partnerId,
  properties,
  canRecordPayments = true,
}: Props) {
  const [propertyId, setPropertyId] = useState(
    properties[0]?.id ?? ""
  );

  const selectedProperty = properties.find(
    (property) => property.id === propertyId
  );

  const availableRooms = selectedProperty?.roomTypes ?? [];

  const [roomTypeId, setRoomTypeId] = useState(
    availableRooms[0]?.id ?? ""
  );

  const selectedRoom = availableRooms.find(
    (room) => room.id === roomTypeId
  );

  const availableRatePlans = selectedRoom?.ratePlans ?? [];

  const [ratePlanId, setRatePlanId] = useState(
    availableRatePlans[0]?.id ?? ""
  );

  const [checkInDate, setCheckInDate] = useState(getToday);
  const [checkOutDate, setCheckOutDate] = useState(getTomorrow);

  const [quantity, setQuantity] = useState("1");
  const [guests, setGuests] = useState("1");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  const [amountPaid, setAmountPaid] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentMethodDetails, setPaymentMethodDetails] =
    useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paidAt, setPaidAt] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdBooking, setCreatedBooking] =
    useState<CreatedBooking | null>(null);

  const selectedRatePlan = availableRatePlans.find(
    (rate) => rate.id === ratePlanId
  );

  const nights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;

    const start = new Date(`${checkInDate}T00:00:00`);
    const end = new Date(`${checkOutDate}T00:00:00`);

    return Math.round(
      (end.getTime() - start.getTime()) /
        (24 * 60 * 60 * 1000)
    );
  }, [checkInDate, checkOutDate]);

  const totalAmount =
  selectedRatePlan && nights > 0
    ? Number(selectedRatePlan.basePrice) *
      nights *
      Number(quantity || 0)
    : 0;

  const balanceDue = Math.max(
    0,
    totalAmount - Number(amountPaid || 0)
  );

  function handlePropertyChange(value: string) {
    const property = properties.find(
      (item) => item.id === value
    );

    const firstRoom = property?.roomTypes[0];

    setPropertyId(value);
    setRoomTypeId(firstRoom?.id ?? "");
    setRatePlanId(firstRoom?.ratePlans[0]?.id ?? "");
  }

  function handleRoomChange(value: string) {
    const room = availableRooms.find(
      (item) => item.id === value
    );

    setRoomTypeId(value);
    setRatePlanId(room?.ratePlans[0]?.id ?? "");
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setCreatedBooking(null);

    if (!propertyId || !roomTypeId || !ratePlanId) {
      setError("Please select a property, room, and rate plan.");
      return;
    }

    if (nights <= 0) {
      setError("Check-out date must be after check-in date.");
      return;
    }

    if (Number(quantity) < 1 || Number(guests) < 1) {
      setError("Enter a valid room quantity and guest count.");
      return;
    }

    if (
      selectedRoom &&
      Number(quantity) > selectedRoom.totalUnits
    ) {
      setError(
        `This room type has ${selectedRoom.totalUnits} physical rooms in total.`
      );
      return;
    }

    if (
      selectedRoom &&
      Number(guests) >
        selectedRoom.maxGuests * Number(quantity)
    ) {
      setError(
        `The selected rooms allow a maximum of ${
          selectedRoom.maxGuests * Number(quantity)
        } guests.`
      );
      return;
    }

    if (canRecordPayments && (
      Number(amountPaid) > totalAmount ||
      Number(amountPaid) < 0
    )) {
      setError("Enter a valid amount paid.");
      return;
    }

    if (canRecordPayments && Number(amountPaid) > 0 && !paymentMethod) {
      setError("Please select a payment method.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/partners/${partnerId}/walk-in-bookings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomTypeId,
            ratePlanId,
            checkInDate,
            checkOutDate,
            quantity: Number(quantity),
            guests: Number(guests),
            firstName,
            lastName,
            phone,
            email,
            specialRequests,
            amountPaid: canRecordPayments ? Number(amountPaid) : 0,
            paymentMethod:
              canRecordPayments && Number(amountPaid) > 0
                ? paymentMethod
                : undefined,
            paymentMethodDetails: canRecordPayments ? paymentMethodDetails : undefined,
            paymentReference: canRecordPayments ? paymentReference : undefined,
            paymentNote: canRecordPayments ? paymentNote : undefined,
            paidAt: canRecordPayments ? (paidAt || undefined) : undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to create booking."
        );
      }

      setCreatedBooking(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  if (createdBooking) {
    return (
      <div className="rounded-2xl border border-[#DDE8D5] bg-white p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF3E3] text-2xl text-[#527A3E]">
          ✓
        </div>

        <h2 className="mt-5 text-2xl font-bold text-slate-900">
          Booking created successfully
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          The walk-in booking has been confirmed and the rooms
          have been reserved.
        </p>

        <div className="mt-6 rounded-xl bg-[#F7F8F5] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Booking reference
          </p>

          <p className="mt-2 text-xl font-bold text-[#365B35]">
            {createdBooking.bookingReference}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Property</p>
              <p className="mt-1 font-semibold">
                {createdBooking.propertyName}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Room</p>
              <p className="mt-1 font-semibold">
                {createdBooking.roomName}
              </p>
            </div>

            {canRecordPayments && <>
            <div>
              <p className="text-xs text-slate-500">Booking total</p>
              <p className="mt-1 font-semibold">
                {Number(createdBooking.totalAmount).toLocaleString()}{" "}
                {createdBooking.currency}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Amount received</p>
              <p className="mt-1 font-semibold">
                {Number(createdBooking.amountPaid).toLocaleString()}{" "}
                {createdBooking.currency}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Balance due</p>
              <p className="mt-1 font-semibold">
                {Number(createdBooking.balanceDue).toLocaleString()}{" "}
                {createdBooking.currency}
              </p>
            </div>
            </>}

            <div>
              <p className="text-xs text-slate-500">Payment status</p>
              <p className="mt-1 font-semibold">
                {createdBooking.paymentStatus.replaceAll("_", " ")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/partner/bookings"
            className="rounded-xl bg-[#365B35] px-5 py-3 text-center text-sm font-semibold text-white hover:bg-[#29482A]"
          >
            View bookings
          </Link>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Create another booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-lg font-bold">Property and room</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Property</label>
            <select
              className={inputClass}
              value={propertyId}
              onChange={(event) =>
                handlePropertyChange(event.target.value)
              }
              required
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Room type</label>
            <select
              className={inputClass}
              value={roomTypeId}
              onChange={(event) =>
                handleRoomChange(event.target.value)
              }
              required
            >
              {availableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} · {room.totalUnits} total rooms
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Rate plan</label>
            <select
              className={inputClass}
              value={ratePlanId}
              onChange={(event) =>
                setRatePlanId(event.target.value)
              }
              required
            >
              {availableRatePlans.map((rate) => (
                <option key={rate.id} value={rate.id}>
                  {rate.name}{canRecordPayments ? ` — ${Number(rate.basePrice).toLocaleString()} ETB/night` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Number of rooms</label>
            <input
              className={inputClass}
              type="number"
              min="1"
              max={selectedRoom?.totalUnits ?? 1}
              value={quantity}
              onChange={(event) =>
                setQuantity(event.target.value)
              }
              required
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-lg font-bold">Stay details</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Check-in</label>
            <input
              className={inputClass}
              type="date"
              min={getToday()}
              value={checkInDate}
              onChange={(event) =>
                setCheckInDate(event.target.value)
              }
              required
            />
          </div>

          <div>
            <label className={labelClass}>Check-out</label>
            <input
              className={inputClass}
              type="date"
              min={checkInDate || getToday()}
              value={checkOutDate}
              onChange={(event) =>
                setCheckOutDate(event.target.value)
              }
              required
            />
          </div>

          <div>
            <label className={labelClass}>Total guests</label>
            <input
              className={inputClass}
              type="number"
              min="1"
              value={guests}
              onChange={(event) =>
                setGuests(event.target.value)
              }
              required
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-lg font-bold">Guest information</h2>

        <p className="mt-1 text-sm text-slate-500">
          The primary guest does not need an EthiopianBooking account.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>First name *</label>
            <input
              className={inputClass}
              value={firstName}
              onChange={(event) =>
                setFirstName(event.target.value)
              }
              required
            />
          </div>

          <div>
            <label className={labelClass}>Last name</label>
            <input
              className={inputClass}
              value={lastName}
              onChange={(event) =>
                setLastName(event.target.value)
              }
            />
          </div>

          <div>
            <label className={labelClass}>Phone number</label>
            <input
              className={inputClass}
              type="tel"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              placeholder="+251..."
            />
          </div>

          <div>
            <label className={labelClass}>Email address</label>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Optional"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Special requests</label>
            <textarea
              className={inputClass}
              rows={3}
              value={specialRequests}
              onChange={(event) =>
                setSpecialRequests(event.target.value)
              }
              placeholder="Any requests from the guest..."
            />
          </div>
        </div>
      </section>

      {canRecordPayments && <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-lg font-bold">Payment received</h2>

        <p className="mt-1 text-sm text-slate-500">
          Record the amount the guest pays at the property.
          You can create the booking with no payment as well.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Amount paid (ETB)</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              max={totalAmount}
              value={amountPaid}
              onChange={(event) =>
                setAmountPaid(event.target.value)
              }
              required
            />
          </div>

          <div>
            <label className={labelClass}>Payment method</label>
            <select
              className={inputClass}
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value)
              }
              disabled={Number(amountPaid) <= 0}
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="POS_CARD">POS / Card</option>
              <option value="MOBILE_MONEY">Mobile money</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {paymentMethod === "OTHER" &&
            Number(amountPaid) > 0 && (
              <div>
                <label className={labelClass}>
                  Specify payment method
                </label>
                <input
                  className={inputClass}
                  value={paymentMethodDetails}
                  onChange={(event) =>
                    setPaymentMethodDetails(event.target.value)
                  }
                  placeholder="Describe the method"
                />
              </div>
            )}

          <div>
            <label className={labelClass}>
              Payment reference
            </label>
            <input
              className={inputClass}
              value={paymentReference}
              onChange={(event) =>
                setPaymentReference(event.target.value)
              }
              placeholder="Optional transaction reference"
            />
          </div>

          <div>
            <label className={labelClass}>Payment date</label>
            <input
              className={inputClass}
              type="datetime-local"
              value={paidAt}
              onChange={(event) =>
                setPaidAt(event.target.value)
              }
            />
          </div>

          <div>
            <label className={labelClass}>Payment note</label>
            <input
              className={inputClass}
              value={paymentNote}
              onChange={(event) =>
                setPaymentNote(event.target.value)
              }
              placeholder="Optional note"
            />
          </div>
        </div>
      </section>}

      <section className="rounded-2xl border border-[#DDE8D5] bg-[#F7F8F5] p-5 sm:p-7">
        <h2 className="text-lg font-bold">Booking summary</h2>

        <div className="mt-5 space-y-3 text-sm">
          {canRecordPayments && <div className="flex justify-between gap-4">
            <span className="text-slate-500">Rate per room / night</span>
            <span className="font-semibold">
              {Number(selectedRatePlan?.basePrice ?? 0).toLocaleString()} ETB
            </span>
          </div>}

          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Nights</span>
            <span className="font-semibold">{Math.max(0, nights)}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Rooms</span>
            <span className="font-semibold">{quantity}</span>
          </div>

          {canRecordPayments && <div className="border-t border-slate-200 pt-4">
            <div className="flex justify-between gap-4">
              <span className="font-semibold">Booking total</span>
              <span className="text-lg font-bold">
                {totalAmount.toLocaleString()} ETB
              </span>
            </div>

            <div className="mt-3 flex justify-between gap-4">
              <span className="text-slate-500">Amount paid</span>
              <span className="font-semibold">
                {Number(amountPaid || 0).toLocaleString()} ETB
              </span>
            </div>

            <div className="mt-3 flex justify-between gap-4">
              <span className="text-slate-500">Balance due</span>
              <span className="font-bold text-[#365B35]">
                {balanceDue.toLocaleString()} ETB
              </span>
            </div>
          </div>}
        </div>
      </section>

      <button
        type="submit"
        disabled={loading || !selectedRatePlan}
        className="w-full rounded-xl bg-[#365B35] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#29482A] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating booking..." : "Confirm walk-in booking"}
      </button>
    </form>
  );
}