"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PropertyPhoto = {
  id: string;
  publicUrl: string | null;
  altText: string | null;
  sortOrder: number;
  isCover: boolean;
};

type RoomPhoto = {
  id: string;
  publicUrl: string | null;
  altText: string | null;
  sortOrder: number;
  isCover: boolean;
};

type RatePlan = {
  id: string;
  name: string;
  description: string | null;
  mealPlan: string;
  cancellationPolicy: string;
  cancellationDeadlineHours: number | null;
  cancellationFeePercent: string | null;
  basePrice: string;
  currency: string;
  ratePeriods: { startDate: string; endDate: string; pricePerNight: string }[];
};

type RoomType = {
  id: string;
  name: string;
  description: string | null;
  maxGuests: number;
  totalUnits: number;
  maxAdults: number | null;
  maxChildren: number | null;
  bedType: string;
  bedCount: number;
  sizeSquareMeters: string | null;
  photos: RoomPhoto[];
  ratePlans: RatePlan[];
};

type Property = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  propertyType: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  location: {
    country: string;
    region: string;
    city: string;
    subCity: string | null;
    neighborhood: string | null;
    address: string | null;
    latitude: string | null;
    longitude: string | null;
  };
  photos: PropertyPhoto[];
  roomTypes: RoomType[];
};



const colors = {
  background: "#F9F8F5",
  surface: "#FFFFFF",
  surfaceSoft: "#FDFCFA",
  border: "#E8DCCB",
  borderHover: "#C7D1C3",
  text: "#1C1917",
  muted: "#78716C",
  green: "#4A5D4E",
  greenDark: "#3B4A3E",
  greenSoft: "#F0F4ED",
  greenBorder: "#D8E3D3",
};

function formatPrice(amount: string, currency: string) {
  return `${Number(amount).toLocaleString("en-US")} ${currency}`;
}

function formatPropertyType(propertyType: string) {
  return propertyType
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMealPlan(mealPlan: string) {
  return mealPlan
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCancellationPolicy(policy: string) {
  return policy
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function calculateAverageNightlyPrice(ratePlan: RatePlan, checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut || checkOut <= checkIn) return Number(ratePlan.basePrice);
  const nights = Math.round((new Date(`${checkOut}T00:00:00.000Z`).getTime() - new Date(`${checkIn}T00:00:00.000Z`).getTime()) / 86400000);
  if (nights <= 0) return Number(ratePlan.basePrice);
  let total = 0;
  for (let index = 0; index < nights; index++) {
    const date = new Date(`${checkIn}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    const period = [...(ratePlan.ratePeriods ?? [])].reverse().find((item) =>
      item.startDate.slice(0, 10) <= dateKey && item.endDate.slice(0, 10) >= dateKey
    );
    total += Number(period?.pricePerNight ?? ratePlan.basePrice);
  }
  return Number((total / nights).toFixed(2));
}

function formatBedType(bedType: string) {
  return bedType
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const inputClass =
  "w-full rounded-xl border border-[#E8DCCB] bg-[#FDFCFA] px-3 py-3 text-sm text-[#1C1917] outline-none transition focus:border-[#4A5D4E] focus:ring-4 focus:ring-[#4A5D4E]/10";

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-xl bg-[#4A5D4E] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3B4A3E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#A8B5A5]/60 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-[#D8E3D3] bg-[#F0F4ED] px-4 py-3 text-sm font-semibold text-[#34483B] transition hover:border-[#A8B5A5] hover:bg-[#E7EEE2] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4A5D4E]/10";

const cardClass =
  "rounded-3xl border border-[#E8DCCB] bg-white shadow-[0_8px_30px_rgba(28,25,23,0.04)]";

export default function PropertyPage() {
  const params = useParams<{ propertyId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRooms = Number(searchParams.get("rooms") || "1");
  const requestedAdults = Number(searchParams.get("adults") || "2");
  const requestedChildren = Number(searchParams.get("children") || "0");
  const propertyGalleryRef = useRef<HTMLDivElement>(null);
const roomGalleryRef = useRef<HTMLDivElement>(null);

function scrollGallery(
  galleryRef: React.RefObject<HTMLDivElement | null>,
  direction: "previous" | "next"
) {
  const gallery = galleryRef.current;
  if (!gallery) return;

  const distance = gallery.clientWidth * 0.8;
  gallery.scrollBy({
    left: direction === "next" ? distance : -distance,
    behavior: "smooth",
  });
}

  const [property, setProperty] = useState<Property | null>(null);
  const [activeRoom, setActiveRoom] = useState<RoomType | null>(null);
    const [selectedRoomItems, setSelectedRoomItems] = useState<
    { roomTypeId: string; roomTypeName: string; ratePlanId: string; ratePlanName: string; quantity: number; maxGuests: number; maxAdults: number | null; maxChildren: number | null; price: number; currency: string }[]
  >([]);

  const [checkInDate, setCheckInDate] = useState(searchParams.get("checkIn") || "");
  const [checkOutDate, setCheckOutDate] = useState(searchParams.get("checkOut") || "");
  const [rooms, setRooms] = useState(Number.isInteger(requestedRooms) && requestedRooms >= 1 && requestedRooms <= 30 ? requestedRooms : 1);
  const [adults, setAdults] = useState(Number.isInteger(requestedAdults) && requestedAdults >= 1 && requestedAdults <= 30 ? requestedAdults : 2);
  const [children, setChildren] = useState(Number.isInteger(requestedChildren) && requestedChildren >= 0 && requestedChildren <= 30 && requestedAdults + requestedChildren <= 30 ? requestedChildren : 0);
  const [childAges, setChildAges] = useState<number[]>(() => {
    const parsed = (searchParams.get("childAges") || "").split(",").filter(Boolean).map(Number);
    return Array.from({ length: children }, (_, index) => parsed[index] ?? -1);
  });

  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityConfirmed, setAvailabilityConfirmed] = useState(false);
  const [roomAvailability, setRoomAvailability] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProperty() {
      try {
        const response = await fetch(`/api/properties/${params.propertyId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load property.");
        }

        setProperty(result.data);
        const pendingRoomTypeId = searchParams.get("selectRoomTypeId");
        const pendingRatePlanId = searchParams.get("selectRatePlanId");
        if (pendingRoomTypeId && pendingRatePlanId) {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          const pendingRoom = result.data.roomTypes.find((room: RoomType) => room.id === pendingRoomTypeId);
          const pendingRate = pendingRoom?.ratePlans.find((plan: RatePlan) => plan.id === pendingRatePlanId);
          if (user && pendingRoom && pendingRate) {
            setSelectedRoomItems([{
              roomTypeId: pendingRoom.id,
              roomTypeName: pendingRoom.name,
              ratePlanId: pendingRate.id,
              ratePlanName: pendingRate.name,
              quantity: rooms,
              maxGuests: pendingRoom.maxGuests,
              maxAdults: pendingRoom.maxAdults,
              maxChildren: pendingRoom.maxChildren,
              price: calculateAverageNightlyPrice(pendingRate, checkInDate, checkOutDate),
              currency: pendingRate.currency,
            }]);
          }
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load property."
        );
      } finally {
        setLoading(false);
      }
    }

    if (params.propertyId) {
      loadProperty();
    }
  }, [params.propertyId, searchParams]);

  useEffect(() => {
    if (!property) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize selected rate prices with refreshed property/date data.
    setSelectedRoomItems((current) => current.map((item) => {
      const room = property.roomTypes.find((candidate) => candidate.id === item.roomTypeId);
      const ratePlan = room?.ratePlans.find((candidate) => candidate.id === item.ratePlanId);
      if (!ratePlan) return item;
      return {
        ...item,
        price: calculateAverageNightlyPrice(ratePlan, checkInDate, checkOutDate),
        currency: ratePlan.currency,
      };
    }));
  }, [property, checkInDate, checkOutDate]);

  useEffect(() => {
    if (!activeRoom) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveRoom(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeRoom]);

  async function selectRatePlan(room: RoomType, ratePlan: RatePlan) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const next = new URLSearchParams({ checkIn: checkInDate, checkOut: checkOutDate, rooms: String(rooms), adults: String(adults), children: String(children), childAges: childAges.join(",") });
      next.set("selectRoomTypeId", room.id);
      next.set("selectRatePlanId", ratePlan.id);
      router.push(`/login?next=${encodeURIComponent(`${window.location.pathname}?${next.toString()}`)}`);
      return;
    }
    const alreadySelected = selectedRoomItems.find(
      (item) => item.roomTypeId === room.id
    );
    setSelectedRoomItems((current) => {
      const existing = current.find((item) => item.roomTypeId === room.id);
      if (existing?.ratePlanId === ratePlan.id) {
        return current.filter((item) => item.roomTypeId !== room.id);
      }
      const nextItem = {
        roomTypeId: room.id,
        roomTypeName: room.name,
        ratePlanId: ratePlan.id,
        ratePlanName: ratePlan.name,
        quantity: existing?.quantity ?? (current.length === 0 ? rooms : 1),
        maxGuests: room.maxGuests,
        maxAdults: room.maxAdults,
        maxChildren: room.maxChildren,
        price: calculateAverageNightlyPrice(ratePlan, checkInDate, checkOutDate),
        currency: ratePlan.currency,
      };
      return [...current.filter((item) => item.roomTypeId !== room.id), nextItem];
    });
    setRoomAvailability({});
    setAvailabilityConfirmed(false);
    setAvailabilityError("");
  }

  async function handleContinue() {
    setAvailabilityError("");
    setAvailabilityConfirmed(false);

    if (!property) {
      setAvailabilityError("Property information is not available yet.");
      return;
    }

    if (selectedRoomItems.length === 0) {
      setAvailabilityError("Please select at least one room and rate plan.");
      return;
    }
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate || checkInDate < new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date())) {
      setAvailabilityError("Please choose valid check-in and check-out dates.");
      return;
    }
    if (childAges.length !== children || childAges.some((age) => !Number.isInteger(age) || age < 0 || age > 17)) {
      setAvailabilityError("Please select the age of every child.");
      return;
    }
    const totalGuests = adults + children;
    const totalRoomCapacity = selectedRoomItems.reduce((sum, item) => sum + item.maxGuests * item.quantity, 0);
    const adultCapacity = selectedRoomItems.reduce((sum, item) => sum + (item.maxAdults ?? item.maxGuests) * item.quantity, 0);
    const childCapacity = selectedRoomItems.reduce((sum, item) => sum + (item.maxChildren ?? item.maxGuests) * item.quantity, 0);
    const totalSelectedRooms = selectedRoomItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalSelectedRooms > 30 || totalGuests > 30) {
      setAvailabilityError("A booking can include up to 30 rooms and 30 guests.");
      return;
    }
    if (totalGuests > totalRoomCapacity || adults > adultCapacity || children > childCapacity) {
      setAvailabilityError(`Your selected room combination accommodates ${totalRoomCapacity} guests, ${adultCapacity} adults and ${childCapacity} children. You can adjust quantities or choose another room type below. Your selections will not be changed automatically.`);
      return;
    }
    setCheckingAvailability(true);
    try {
      const query = new URLSearchParams({
        checkIn: checkInDate,
        checkOut: checkOutDate,
        roomItems: JSON.stringify(selectedRoomItems.map((item) => ({
          roomTypeId: item.roomTypeId,
          ratePlanId: item.ratePlanId,
          quantity: item.quantity,
        }))),
      });
      const response = await fetch(`/api/properties/${property.id}/availability?${query.toString()}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to check room availability.");
      setRoomAvailability(Object.fromEntries((result.data.roomItems ?? []).map((item: { roomTypeId: string; availableUnits: number }) => [item.roomTypeId, item.availableUnits])));
      if (!result.data.available) {
        const unavailable = result.data.roomItems?.filter((item: { available: boolean }) => !item.available) ?? [];
        setAvailabilityError(unavailable.length
          ? `Some selected rooms are not available: ${unavailable.map((item: { roomTypeName: string }) => item.roomTypeName).join(", ")}. Choose an available quantity or another room type below. Your current selections are unchanged.`
          : "The selected room combination is not available for these dates.");
        return;
      }
      // Create the inventory hold only when the guest continues to checkout.
      // The server performs a second atomic availability check while reserving.
      const holdResponse = await fetch("/api/bookings/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomItems: selectedRoomItems.map((item) => ({
            roomTypeId: item.roomTypeId,
            ratePlanId: item.ratePlanId,
            quantity: item.quantity,
          })),
          checkInDate,
          checkOutDate,
          guests: totalGuests,
          adults,
          children,
          childAges,
        }),
      });
      const holdResult = await holdResponse.json();
      if (!holdResponse.ok || !holdResult.success || !holdResult.data?.bookingId) {
        throw new Error(holdResult.error || "The rooms could not be held. Please review availability and try again.");
      }
      setAvailabilityConfirmed(true);
      router.push(`/booking?${new URLSearchParams({
        propertyId: property.id,
        bookingId: holdResult.data.bookingId,
        roomItems: JSON.stringify(selectedRoomItems.map((item) => ({
          roomTypeId: item.roomTypeId, ratePlanId: item.ratePlanId, quantity: item.quantity,
        }))),
        checkIn: checkInDate,
        checkOut: checkOutDate,
        rooms: String(totalSelectedRooms),
        adults: String(adults),
        children: String(children),
        childAges: childAges.join(","),
      }).toString()}`);
    } catch (error) {
      setAvailabilityError(
        error instanceof Error
          ? error.message
          : "Unable to check room availability."
      );
    } finally {
      setCheckingAvailability(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-[#1C1917]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#E8DCCB] bg-white p-10 text-center text-[#78716C] shadow-sm">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#E8DCCB] border-t-[#4A5D4E]" />
            Loading property...
          </div>
        </div>
      </main>
    );
  }

  if (error || !property) {
    return (
      <main className="min-h-screen bg-white text-[#1C1917]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
            <p className="font-semibold">Unable to open this property</p>
            <p className="mt-2 text-sm">
              {error || "Property not found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-[#1C1917]">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <section className="mb-7">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#D8E3D3] bg-[#F0F4ED] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-[#34483B]">
              {formatPropertyType(property.propertyType)}
            </span>

            {property.location.city && (
              <span className="inline-flex items-center gap-1.5 text-sm text-[#78716C]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4 text-[#4A5D4E]"
                >
                  <path
                    d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="10"
                    r="2.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>
                {property.location.city}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-[#1C1917] sm:text-4xl lg:text-5xl">
            {property.name}
          </h1>

          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm leading-6 text-[#78716C]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4 shrink-0 text-[#4A5D4E]"
            >
              <path
                d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="10"
                r="2.5"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
            {[
              property.location.address,
              property.location.neighborhood,
              property.location.subCity,
              property.location.city,
              property.location.region,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        </section>


        {/* Property photo gallery */}
        <section className="mb-9">
          {property.photos.length > 0 ? (
            <div className="relative">
              <div
                ref={propertyGalleryRef}
                className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:thin] [scrollbar-color:#C7D1C3_transparent]"
                aria-label="Property photos"
              >
                {property.photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="group relative h-[280px] w-[85%] shrink-0 snap-start overflow-hidden rounded-3xl bg-[#F1EFE9] sm:h-[380px] sm:w-[70%] lg:h-[460px] lg:w-[65%]"
                  >
                    {photo.publicUrl ? (
                      <img
                        src={photo.publicUrl}
                        alt={photo.altText || `${property.name} — photo ${index + 1}`}
                        loading={index === 0 ? "eager" : "lazy"}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[#78716C]">
                        Property photo unavailable
                      </div>
                    )}

                    {index === 0 && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent px-5 pb-6 pt-16 sm:px-7">
                        <p className="text-xl font-bold text-white sm:text-2xl">
                          {property.name}
                        </p>
                        <p className="mt-1 text-sm text-white/85">
                          {[property.location.city, property.location.region]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    )}

                    <span className="absolute right-4 top-4 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                      {index + 1} / {property.photos.length}
                    </span>
                  </div>
                ))}
              </div>

              {property.photos.length > 1 && (
                <div className="mt-3 flex items-center justify-between gap-4">
                  <p className="text-sm text-[#78716C]">
                    {property.photos.length} photos · Scroll or swipe to explore
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => scrollGallery(propertyGalleryRef, "previous")}
                      aria-label="Previous property photos"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#1C1917] shadow-sm transition hover:border-[#4A5D4E] hover:bg-[#F9FAF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A5D4E]"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => scrollGallery(propertyGalleryRef, "next")}
                      aria-label="Next property photos"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#1C1917] shadow-sm transition hover:border-[#4A5D4E] hover:bg-[#F9FAF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A5D4E]"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#E5E7EB] bg-white px-6 text-center">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="mb-3 h-10 w-10 text-[#A8A29E]"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8.5" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="m4 17 5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <p className="font-semibold text-[#44403C]">
                Property photos coming soon
              </p>
              <p className="mt-1 text-sm text-[#78716C]">
                Photos will appear here when they are available.
              </p>
            </div>
          )}
        </section>


        {/* Stay search controls */}
        <section className={`${cardClass} mb-9 p-5 sm:p-7`}>
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4A5D4E]">
              Plan your visit
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#1C1917]">
              Your stay
            </h2>
            <p className="mt-1 text-sm text-[#78716C]">
              Choose your dates and number of guests.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label
                htmlFor="check-in"
                className="mb-2 block text-sm font-semibold text-[#44403C]"
              >
                Check-in
              </label>
              <input
                id="check-in"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={checkInDate}
                onChange={(event) => {
                  setCheckInDate(event.target.value);
                  setSelectedRoomItems((current) => current.map((item) => {
                    const plan = property?.roomTypes.find((room) => room.id === item.roomTypeId)?.ratePlans.find((rate) => rate.id === item.ratePlanId);
                    return plan ? { ...item, price: calculateAverageNightlyPrice(plan, event.target.value, checkOutDate) } : item;
                  }));
                  setRoomAvailability({});
                  setAvailabilityConfirmed(false);
                  setAvailabilityError("");
                }}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="check-out"
                className="mb-2 block text-sm font-semibold text-[#44403C]"
              >
                Check-out
              </label>
              <input
                id="check-out"
                type="date"
                value={checkOutDate}
                min={checkInDate || undefined}
                onChange={(event) => {
                  setCheckOutDate(event.target.value);
                  setSelectedRoomItems((current) => current.map((item) => {
                    const plan = property?.roomTypes.find((room) => room.id === item.roomTypeId)?.ratePlans.find((rate) => rate.id === item.ratePlanId);
                    return plan ? { ...item, price: calculateAverageNightlyPrice(plan, checkInDate, event.target.value) } : item;
                  }));
                  setRoomAvailability({});
                  setAvailabilityConfirmed(false);
                  setAvailabilityError("");
                }}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="rooms"
                className="mb-2 block text-sm font-semibold text-[#44403C]"
              >
                Rooms
              </label>
              <select
                id="rooms"
                value={rooms}
                onChange={(event) => {
                  setRooms(Number(event.target.value));
                  setRoomAvailability({});
                  setAvailabilityConfirmed(false);
                  setAvailabilityError("");
                }}
                className={inputClass}
              >
                {Array.from({ length: 30 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value} {value === 1 ? "room" : "rooms"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="adults"
                className="mb-2 block text-sm font-semibold text-[#44403C]"
              >
                Adults
              </label>
              <select
                id="adults"
                value={adults}
                onChange={(event) => {
                  setAdults(Number(event.target.value));
                  setRoomAvailability({});
                  setAvailabilityConfirmed(false);
                  setAvailabilityError("");
                }}
                className={inputClass}
              >
                {Array.from({ length: 30 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value} {value === 1 ? "adult" : "adults"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="children"
                className="mb-2 block text-sm font-semibold text-[#44403C]"
              >
                Children
              </label>
              <select
                id="children"
                value={children}
                onChange={(event) => {
                  const count = Number(event.target.value);
                  setChildren(count);
                  setRoomAvailability({});
                  setChildAges((current) => Array.from({ length: count }, (_, index) => current[index] ?? -1));
                  setAvailabilityConfirmed(false);
                  setAvailabilityError("");
                }}
                className={inputClass}
              >
                {Array.from({ length: 31 }, (_, index) => index).map((value) => (
                  <option key={value} value={value}>
                    {value} {value === 1 ? "child" : "children"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {children > 0 && (
            <div className="mt-4 rounded-xl border border-[#E8E6DC] bg-[#FAF9F5] p-4">
              <p className="mb-3 text-sm font-semibold text-[#44403C]">Age of each child</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {childAges.map((age, index) => (
                  <label key={index} className="text-xs font-medium text-[#57534E]">
                    Child {index + 1}
                    <select value={age} onChange={(event) => setChildAges((current) => current.map((value, i) => i === index ? Number(event.target.value) : value))} className={`${inputClass} mt-1`}>
                      <option value={-1}>Select age</option>
                      {Array.from({ length: 18 }, (_, value) => <option key={value} value={value}>{value} {value === 1 ? "year" : "years"}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            {/* Property information */}
            <div className={`${cardClass} p-6 sm:p-7`}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4A5D4E]">
                Get to know the property
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#1C1917]">
                About this property
              </h2>
              <p className="mt-4 whitespace-pre-line leading-7 text-[#57534E]">
                {property.description ||
                  "No property description is available yet."}
              </p>

              <div className="mt-7 grid gap-5 border-t border-[#EEE7DD] pt-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#A8A29E]">
                    Check-in
                  </p>
                  <p className="mt-2 font-semibold text-[#292524]">
                    {property.checkInTime || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#A8A29E]">
                    Check-out
                  </p>
                  <p className="mt-2 font-semibold text-[#292524]">
                    {property.checkOutTime || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#A8A29E]">
                    Address
                  </p>
                  <p className="mt-2 font-semibold leading-6 text-[#292524]">
                    {property.location.address || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#A8A29E]">
                    Contact
                  </p>
                  <p className="mt-2 break-words font-semibold text-[#292524]">
                    {property.phone || property.email || "Not specified"}
                  </p>
                </div>
              </div>
            </div>

            {/* Available rooms */}
            <div className="mt-10">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4A5D4E]">
                  Find your room
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#1C1917] sm:text-3xl">
                  Available rooms
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#78716C]">
                  Choose a room and rate plan for your stay. Open any room to
                  explore its specifications and available rates.
                </p>
              </div>

              <div className="space-y-5">
                {property.roomTypes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#E8DCCB] bg-white px-6 py-12 text-center">
                    <p className="font-semibold text-[#44403C]">
                      No rooms are currently available
                    </p>
                    <p className="mt-2 text-sm text-[#78716C]">
                      Please check again later.
                    </p>
                  </div>
                ) : (
                  property.roomTypes.map((room) => (
                    <article
                      key={room.id}
                      className={`overflow-hidden rounded-3xl border bg-white shadow-[0_8px_30px_rgba(28,25,23,0.04)] transition-all duration-200 ${
                        selectedRoomItems.some((item) => item.roomTypeId === room.id)
                          ? "border-[#4A5D4E] ring-2 ring-[#4A5D4E]/10"
                          : "border-[#E8DCCB] hover:border-[#C7D1C3] hover:shadow-[0_12px_32px_rgba(28,25,23,0.07)]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveRoom(room)}
                        aria-label={`View details for ${room.name}`}
                        className="group block w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4A5D4E]"
                      >
                        <div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[220px_minmax(0,1fr)]">
                          <div className="relative">
                            {room.photos[0]?.publicUrl ? (
                              <img
                                src={room.photos[0].publicUrl}
                                alt={room.photos[0].altText || room.name}
                                className="h-52 w-full rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.01] md:h-full md:min-h-[190px]"
                              />
                            ) : (
                              <div className="flex h-52 items-center justify-center rounded-2xl bg-[#F1EFE9] text-sm text-[#78716C] md:h-full md:min-h-[190px]">
                                No room image
                              </div>
                            )}
                          </div>

                          <div className="py-1">
                            <h3 className="text-xl font-bold tracking-tight text-[#1C1917]">
                              {room.name}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-[#78716C]">
                              {room.description ||
                                "Comfortable accommodation for your stay."}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#57534E]">
                              <span className="rounded-full border border-[#E8DCCB] bg-[#FDFCFA] px-3 py-2">
                                Up to {room.maxGuests} guests
                              </span>
                              <span className="rounded-full border border-[#E8DCCB] bg-[#FDFCFA] px-3 py-2">
                                {roomAvailability[room.id] !== undefined ? `${roomAvailability[room.id]} available` : `${room.totalUnits} physical rooms`}
                              </span>
                              <span className="rounded-full border border-[#E8DCCB] bg-[#FDFCFA] px-3 py-2">
                                {formatBedType(room.bedType)} bed
                                {room.bedCount > 1 ? ` × ${room.bedCount}` : ""}
                              </span>
                              {room.sizeSquareMeters && (
                                <span className="rounded-full border border-[#E8DCCB] bg-[#FDFCFA] px-3 py-2">
                                  {room.sizeSquareMeters} m²
                                </span>
                              )}
                            </div>

                            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#D8E3D3] bg-[#F0F4ED] px-4 py-2.5 text-sm font-semibold text-[#34483B] transition group-hover:border-[#A8B5A5] group-hover:bg-[#E7EEE2]">
                              Explore room
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 20 20"
                                fill="none"
                                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                              >
                                <path
                                  d="M4 10h12m-5-5 5 5-5 5"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          </div>
                        </div>
                      </button>

                      <div className="border-t border-[#EEE7DD]">
                        {room.ratePlans.length === 0 ? (
                          <div className="p-6 text-sm text-[#78716C]">
                            No active rate plans are available for this room.
                          </div>
                        ) : (
                          room.ratePlans.map((ratePlan) => {
                            const isSelected =
                              selectedRoomItems.some((item) => item.roomTypeId === room.id && item.ratePlanId === ratePlan.id);

                            return (
                              <div
                                key={ratePlan.id}
                                tabIndex={0}
                                aria-label={`View details for ${room.name}, ${ratePlan.name}`}
                                onClick={() => setActiveRoom(room)}
                                onKeyDown={(event) => {
                                  if (
                                    (event.key === "Enter" ||
                                      event.key === " ") &&
                                    !(event.target as HTMLElement).closest(
                                      "button"
                                    )
                                  ) {
                                    event.preventDefault();
                                    setActiveRoom(room);
                                  }
                                }}
                                className={`group flex cursor-pointer flex-col gap-5 border-t border-[#F0EBE3] p-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4A5D4E] sm:p-6 lg:flex-row lg:items-center lg:justify-between ${
                                  isSelected
                                    ? "bg-[#F0F4ED]/70"
                                    : "bg-white hover:bg-[#FDFCFA]"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-bold text-[#292524]">
                                      {ratePlan.name}
                                    </h4>
                                    {isSelected && (
                                      <span className="rounded-full bg-[#DDE8D7] px-2.5 py-1 text-xs font-bold text-[#34483B]">
                                        Selected
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-1 text-sm leading-6 text-[#78716C]">
                                    {ratePlan.description ||
                                      "Standard booking rate."}
                                  </p>

                                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-full bg-[#F0F4ED] px-3 py-1.5 font-semibold text-[#34483B]">
                                      {formatMealPlan(ratePlan.mealPlan)}
                                    </span>
                                    <span className="rounded-full bg-[#F5F1EA] px-3 py-1.5 font-semibold text-[#57534E]">
                                      {formatCancellationPolicy(
                                        ratePlan.cancellationPolicy
                                      )}
                                    </span>
                                    {ratePlan.cancellationDeadlineHours !==
                                      null && (
                                      <span className="rounded-full bg-[#F5F1EA] px-3 py-1.5 font-medium text-[#57534E]">
                                        Cancel up to{" "}
                                        {ratePlan.cancellationDeadlineHours}{" "}
                                        hours before check-in
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-3 text-xs font-medium text-[#4A5D4E]">
                                    Open this rate to explore room details
                                  </p>
                                </div>

                                <div className="shrink-0 lg:min-w-[210px] lg:text-right">
                                  <p className="text-2xl font-bold tracking-tight text-[#1C1917]">
                                    {formatPrice(
                                      ratePlan.basePrice,
                                      ratePlan.currency
                                    )}
                                  </p>
                                  <p className="mt-1 text-xs text-[#78716C]">
                                    estimated per night
                                  </p>

                                  <div className="mt-4 flex flex-wrap gap-2 lg:justify-end">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        selectRatePlan(room, ratePlan);
                                      }}
                                      className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition sm:flex-none ${
                                        isSelected
                                          ? "bg-[#E7EEE2] text-[#34483B] ring-1 ring-[#A8B5A5]"
                                          : "bg-[#4A5D4E] text-white hover:bg-[#3B4A3E]"
                                      }`}
                                    >
                                      {isSelected ? "Selected" : "Select rate"}
                                    </button>

                                    {isSelected && (
                                      <label className="flex items-center gap-2 rounded-xl border border-[#D8E3D3] px-3 py-2 text-xs font-semibold text-[#34483B]">
                                        Rooms
                                        <select
                                          value={selectedRoomItems.find((item) => item.roomTypeId === room.id)?.quantity ?? 1}
                                          onClick={(event) => event.stopPropagation()}
                                          onChange={(event) => {
                                            const quantity = Number(event.target.value);
                                            setSelectedRoomItems((current) =>
                                              current.map((item) =>
                                                item.roomTypeId === room.id ? { ...item, quantity } : item
                                              )
                                            );
                                            setAvailabilityConfirmed(false);
                                          }}
                                          className="bg-transparent text-sm font-bold outline-none"
                                          aria-label={`Number of ${room.name} rooms`}
                                        >
                                          {Array.from(
                                            new Set([
                                              selectedRoomItems.find((item) => item.roomTypeId === room.id)?.quantity ?? 1,
                                              ...Array.from({ length: Math.min(30, roomAvailability[room.id] ?? room.totalUnits) }, (_, index) => index + 1),
                                            ])
                                          ).sort((a, b) => a - b).map((quantity) => (
                                            <option key={quantity} value={quantity}>
                                              {quantity}{quantity > (roomAvailability[room.id] ?? room.totalUnits) ? " · unavailable" : ""}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    )}

                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setActiveRoom(room);
                                      }}
                                      className={secondaryButtonClass}
                                    >
                                      Explore room
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Booking summary */}
          <aside className={`${cardClass} h-fit p-6 lg:sticky lg:top-6`}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4A5D4E]">
              Reservation
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-[#1C1917]">
              Your booking
            </h2>

            {selectedRoomItems.length === 0 ? (
              <>
                <div className="mt-4 rounded-2xl bg-[#FDFCFA] p-4">
                  <p className="text-sm leading-6 text-[#78716C]">
                    Select a room and rate to continue with your booking.
                  </p>
                </div>

                <div className="mt-6 space-y-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#78716C]">Location</span>
                    <span className="text-right font-semibold text-[#292524]">
                      {property.location.city}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#78716C]">Check-in</span>
                    <span className="text-right font-semibold text-[#292524]">
                      {checkInDate || "Select date"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#78716C]">Check-out</span>
                    <span className="text-right font-semibold text-[#292524]">
                      {checkOutDate || "Select date"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mt-5 space-y-3 rounded-2xl border border-[#D8E3D3] bg-[#F0F4ED] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#4A5D4E]">
                    Selected rooms
                  </p>
                  {selectedRoomItems.map((item) => (
                    <div key={item.roomTypeId} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <p className="font-bold text-[#292524]">{item.roomTypeName}</p>
                        <p className="mt-1 text-xs text-[#57534E]">{item.ratePlanName}</p>
                      </div>
                      <span className="shrink-0 font-semibold text-[#292524]">{item.quantity} {item.quantity === 1 ? "room" : "rooms"}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#78716C]">Check-in</span>
                    <span className="text-right font-semibold text-[#292524]">
                      {checkInDate || "Select date"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#78716C]">Check-out</span>
                    <span className="text-right font-semibold text-[#292524]">
                      {checkOutDate || "Select date"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#78716C]">Rooms</span>
                    <span className="font-semibold text-[#292524]">{selectedRoomItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#78716C]">Guests</span>
                    <span className="text-right font-semibold text-[#292524]">
                      {adults} adults
                      {children > 0
                        ? `, ${children} ${
                            children === 1 ? "child" : "children"
                          }`
                        : ""}
                    </span>
                  </div>

                  <div className="border-t border-[#EEE7DD] pt-5">
                    <div className="flex items-end justify-between gap-4">
                      <span className="text-[#78716C]">Price</span>
                      <div className="text-right">
                        <p className="text-xl font-bold text-[#1C1917]">
                          {selectedRoomItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString("en-US")}{" "}
                          ETB
                        </p>
                        <p className="mt-1 text-xs text-[#78716C]">
                          per room / night
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {availabilityError && (
                  <div
                    role="alert"
                    className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                  >
                    {availabilityError}
                  </div>
                )}

                {availabilityConfirmed && (
                  <div className="mt-5 rounded-xl border border-[#D8E3D3] bg-[#F0F4ED] p-4 text-sm text-[#34483B]">
                    <p className="font-bold">Room available</p>
                    <p className="mt-1 leading-6">
                      Your selected room is available for your chosen dates.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={checkingAvailability}
                  className={`${primaryButtonClass} mt-6 w-full py-4`}
                >
                  {checkingAvailability
                    ? "Checking availability..."
                    : "Continue to booking"}
                </button>

                <p className="mt-3 text-center text-xs leading-5 text-[#78716C]">
                  Availability will be checked before you continue.
                </p>
              </>
            )}
          </aside>
        </section>
      </div>

      {/* Room details modal — stays on the property page */}
      {activeRoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#171714]/65 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setActiveRoom(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-modal-title"
            className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-[#E8DCCB] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E8DCCB] bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4A5D4E]">
                  Room details
                </p>
                <h2
                  id="room-modal-title"
                  className="mt-1 text-xl font-bold tracking-tight text-[#1C1917]"
                >
                  {activeRoom.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setActiveRoom(null)}
                aria-label="Close room details"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8DCCB] text-2xl leading-none text-[#57534E] transition hover:bg-[#F5F1EA] hover:text-[#1C1917] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4A5D4E]/15"
              >
                ×
              </button>
            </div>

            <div className="p-4 sm:p-7">

              {/* Room photo gallery */}
              {activeRoom.photos.length > 0 ? (
                <div className="relative">
                  <div
                    ref={roomGalleryRef}
                    className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:thin] [scrollbar-color:#C7D1C3_transparent]"
                    aria-label={`${activeRoom.name} photos`}
                  >
                    {activeRoom.photos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className="relative h-64 w-[85%] shrink-0 snap-start overflow-hidden rounded-2xl bg-[#F1EFE9] sm:h-80 sm:w-[65%] lg:h-[400px] lg:w-[60%]"
                      >
                        {photo.publicUrl ? (
                          <img
                            src={photo.publicUrl}
                            alt={photo.altText || `${activeRoom.name} — photo ${index + 1}`}
                            loading={index === 0 ? "eager" : "lazy"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-[#78716C]">
                            Room photo unavailable
                          </div>
                        )}

                        <span className="absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                          {index + 1} / {activeRoom.photos.length}
                        </span>
                      </div>
                    ))}
                  </div>

                  {activeRoom.photos.length > 1 && (
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <p className="text-sm text-[#78716C]">
                        {activeRoom.photos.length} photos · Swipe to explore
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => scrollGallery(roomGalleryRef, "previous")}
                          aria-label="Previous room photos"
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#1C1917] shadow-sm transition hover:border-[#4A5D4E] hover:bg-[#F9FAF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A5D4E]"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                            <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={() => scrollGallery(roomGalleryRef, "next")}
                          aria-label="Next room photos"
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#1C1917] shadow-sm transition hover:border-[#4A5D4E] hover:bg-[#F9FAF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A5D4E]"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                            <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white text-sm text-[#78716C]">
                  <p className="font-semibold">Room photos coming soon</p>
                  <p className="mt-1">More room photos may be added later.</p>
                </div>
              )}


              {/* Room description */}
              <div className="mt-7">
                <h3 className="text-xl font-bold text-[#1C1917]">
                  About this room
                </h3>
                <p className="mt-2 whitespace-pre-line leading-7 text-[#57534E]">
                  {activeRoom.description ||
                    "No additional room description is available."}
                </p>
              </div>

              {/* Room specifications */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-[#E8DCCB] bg-[#FDFCFA] p-4">
                  <p className="text-xs font-medium text-[#78716C]">
                    Guest capacity
                  </p>
                  <p className="mt-2 font-bold text-[#292524]">
                    {activeRoom.maxGuests} guests
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E8DCCB] bg-[#FDFCFA] p-4">
                  <p className="text-xs font-medium text-[#78716C]">
                    Bed type
                  </p>
                  <p className="mt-2 font-bold text-[#292524]">
                    {formatBedType(activeRoom.bedType)}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E8DCCB] bg-[#FDFCFA] p-4">
                  <p className="text-xs font-medium text-[#78716C]">
                    Number of beds
                  </p>
                  <p className="mt-2 font-bold text-[#292524]">
                    {activeRoom.bedCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E8DCCB] bg-[#FDFCFA] p-4">
                  <p className="text-xs font-medium text-[#78716C]">
                    Room size
                  </p>
                  <p className="mt-2 font-bold text-[#292524]">
                    {activeRoom.sizeSquareMeters
                      ? `${activeRoom.sizeSquareMeters} m²`
                      : "Not specified"}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#E8DCCB] p-4">
                  <p className="text-sm text-[#78716C]">Maximum adults</p>
                  <p className="mt-2 font-semibold text-[#292524]">
                    {activeRoom.maxAdults ?? "Not specified"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#E8DCCB] p-4">
                  <p className="text-sm text-[#78716C]">Maximum children</p>
                  <p className="mt-2 font-semibold text-[#292524]">
                    {activeRoom.maxChildren ?? "Not specified"}
                  </p>
                </div>
              </div>

              {/* Available rate plans */}
              <div className="mt-9">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4A5D4E]">
                  Find the right option
                </p>
                <h3 className="mt-2 text-xl font-bold text-[#1C1917]">
                  Choose your rate
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#78716C]">
                  Compare meal options, cancellation policies and prices.
                </p>

                {activeRoom.ratePlans.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FDFCFA] p-5 text-sm text-[#78716C]">
                    No active rate plans are available for this room.
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {activeRoom.ratePlans.map((ratePlan) => {
                      const isSelected =
                        selectedRoomItems.some((item) => item.roomTypeId === activeRoom.id && item.ratePlanId === ratePlan.id);

                      return (
                        <div
                          key={ratePlan.id}
                          className={`rounded-2xl border p-4 transition-colors sm:p-5 ${
                            isSelected
                              ? "border-[#4A5D4E] bg-[#F0F4ED]/70 ring-1 ring-[#4A5D4E]/10"
                              : "border-[#E8DCCB] bg-white hover:border-[#C7D1C3]"
                          }`}
                        >
                          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-[#292524]">
                                  {ratePlan.name}
                                </h4>
                                {isSelected && (
                                  <span className="rounded-full bg-[#DDE8D7] px-2.5 py-1 text-xs font-bold text-[#34483B]">
                                    Selected
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-sm leading-6 text-[#78716C]">
                                {ratePlan.description ||
                                  "Standard booking rate."}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-[#F0F4ED] px-3 py-1.5 text-xs font-semibold text-[#34483B]">
                                  {formatMealPlan(ratePlan.mealPlan)}
                                </span>
                                <span className="rounded-full bg-[#F5F1EA] px-3 py-1.5 text-xs font-semibold text-[#57534E]">
                                  {formatCancellationPolicy(
                                    ratePlan.cancellationPolicy
                                  )}
                                </span>
                              </div>

                              {ratePlan.cancellationDeadlineHours !== null && (
                                <p className="mt-3 text-sm text-[#57534E]">
                                  Cancellation deadline:{" "}
                                  {ratePlan.cancellationDeadlineHours} hours
                                  before check-in.
                                </p>
                              )}

                              {ratePlan.cancellationFeePercent !== null && (
                                <p className="mt-1 text-sm text-[#57534E]">
                                  Cancellation fee:{" "}
                                  {ratePlan.cancellationFeePercent}%
                                </p>
                              )}
                            </div>

                            <div className="shrink-0 sm:text-right">
                              <p className="text-2xl font-bold tracking-tight text-[#1C1917]">
                                {formatPrice(
                                  ratePlan.basePrice,
                                  ratePlan.currency
                                )}
                              </p>
                              <p className="mt-1 text-xs text-[#78716C]">
                                per room / night
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  selectRatePlan(activeRoom, ratePlan)
                                }
                                className={`mt-4 w-full rounded-xl px-5 py-3 text-sm font-bold transition sm:w-auto ${
                                  isSelected
                                    ? "bg-[#E7EEE2] text-[#34483B] ring-1 ring-[#A8B5A5]"
                                    : "bg-[#4A5D4E] text-white hover:bg-[#3B4A3E]"
                                }`}
                              >
                                {isSelected ? "Selected" : "Select this rate"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#E8DCCB] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setActiveRoom(null)}
                  className="rounded-xl border border-[#E8DCCB] px-5 py-3 text-sm font-semibold text-[#57534E] transition hover:bg-[#FDFCFA] hover:text-[#1C1917]"
                >
                  Close details
                </button>

                {selectedRoomItems.some((item) => item.roomTypeId === activeRoom.id) ? (
                  <button
                    type="button"
                    onClick={() => setActiveRoom(null)}
                    className={primaryButtonClass}
                  >
                    Done — rate selected
                  </button>
                ) : (
                  <p className="text-sm text-[#78716C]">
                    Select a rate above to add it to your booking.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
