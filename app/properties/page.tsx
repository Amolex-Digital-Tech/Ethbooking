/* eslint-disable @next/next/no-img-element */
import { getCurrentUser } from "@/lib/auth/get-current-user";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpDown,
  Building2,
  ChevronDown,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Hotel,
  House,
  Palmtree,
  Mountain,
} from "lucide-react";

import { PropertyType } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma/client";
import SearchLoginGate from "@/app/components/SearchLoginGate";
import SearchResultsMap from "@/app/components/SearchResultsMap";
import DestinationAutocomplete from "@/app/components/DestinationAutocomplete";

type SearchParams = {
  destination?: string | string[];
  destinationType?: string | string[];
  type?: string | string[];
  guests?: string | string[];
  rooms?: string | string[];
  adults?: string | string[];
  children?: string | string[];
  childAges?: string | string[];
  checkIn?: string | string[];
  checkOut?: string | string[];
  sort?: string | string[];
  minPrice?: string | string[];
  maxPrice?: string | string[];
  facilities?: string | string[];
  showFull?: string | string[];
  availability?: string | string[];
  page?: string | string[];
  view?: string | string[];
};

const propertyTypeLabels: Record<string, string> = {
  HOTEL: "Hotel", GUESTHOUSE: "Guesthouse", LODGE: "Lodge", RESORT: "Resort",
  APARTMENT: "Apartment", HOSTEL: "Hostel", VILLA: "Villa",
  BOUTIQUE_HOTEL: "Boutique hotel", BED_AND_BREAKFAST: "Bed and breakfast", OTHER: "Other",
};
const categories = [
  { label: "Hotels", value: "HOTEL", icon: Hotel },
  { label: "Apartments", value: "APARTMENT", icon: House },
  { label: "Resorts", value: "RESORT", icon: Palmtree },
  { label: "Lodges", value: "LODGE", icon: Mountain },
];

const destinations = [
  { name: "Addis Ababa", description: "The capital" },
  { name: "Lalibela", description: "Historic wonders" },
  { name: "Gondar", description: "Castles and culture" },
  { name: "Bahir Dar", description: "Lakeside escapes" },
  { name: "Hawassa", description: "Lakeside relaxation" },
  { name: "Arba Minch", description: "Nature and scenery" },
];
function firstValue(value?: string | string[]) { return Array.isArray(value) ? value[0] : value; }
function isValidDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function formatPrice(price: number) {
  return new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB", maximumFractionDigits: 0 }).format(price);
}
function makeQuery(params: Record<string, string>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) query.set(key, value); });
  const result = query.toString();
  return result ? `/properties?${result}` : "/properties";
}

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const isCustomer = Boolean(currentUser?.roles.includes("CUSTOMER"));
  const destination = (firstValue(params.destination) ?? "").trim().slice(0, 100);
  const rawDestinationType = firstValue(params.destinationType) ?? "";
  const destinationType = ["Country", "Region", "City", "Sub-city", "Neighborhood", "Destination"].includes(rawDestinationType) ? rawDestinationType : "";
  const requestedType = firstValue(params.type) ?? "";
  const validTypes = Object.values(PropertyType) as string[];
  const type = validTypes.includes(requestedType) ? requestedType : "";
  const parsedGuests = Number(firstValue(params.guests) ?? "1");
  const parsedAdults = Number(firstValue(params.adults) ?? parsedGuests);
  const parsedChildren = Number(firstValue(params.children) ?? "0");
  const guestFilterChanged = firstValue(params.guests) !== undefined &&
    Number.isInteger(parsedGuests) && parsedGuests >= 1 && parsedGuests <= 30 &&
    parsedGuests !== parsedAdults + parsedChildren;
  const adults = guestFilterChanged
    ? parsedGuests
    : Number.isInteger(parsedAdults) && parsedAdults >= 1 && parsedAdults <= 30
      ? parsedAdults
      : Math.max(1, Math.min(30, parsedGuests || 1));
  const children = guestFilterChanged
    ? 0
    : Number.isInteger(parsedChildren) && parsedChildren >= 0 && parsedChildren <= 30 && adults + parsedChildren <= 30
      ? parsedChildren
      : 0;
  const guests = adults + children;
  const requestedRooms = Number(firstValue(params.rooms) || "1");
  const rooms = Number.isInteger(requestedRooms) && requestedRooms >= 1 && requestedRooms <= 30 ? requestedRooms : 1;
  const childAges = (firstValue(params.childAges) ?? "").split(",").filter(Boolean).slice(0, children);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
  const requestedCheckIn = firstValue(params.checkIn) ?? "";
  const requestedCheckOut = firstValue(params.checkOut) ?? "";
  const checkIn = isValidDate(requestedCheckIn) && requestedCheckIn >= today ? requestedCheckIn : "";
  const checkOut = isValidDate(requestedCheckOut) && requestedCheckOut > (checkIn || today) ? requestedCheckOut : "";
  const requestedSort = firstValue(params.sort) ?? "recommended";
  const validSorts = ["recommended", "price-low", "price-high", "name", "closest"];
  const sort = validSorts.includes(requestedSort) ? requestedSort : "recommended";
  const rawMinPrice = Number(firstValue(params.minPrice) || 0);
  const rawMaxPrice = Number(firstValue(params.maxPrice) || 0);
  const minPrice = Number.isFinite(rawMinPrice) ? Math.max(0, rawMinPrice) : 0;
  const maxPrice = Number.isFinite(rawMaxPrice) ? Math.max(0, rawMaxPrice) : 0;
  const facilities = (Array.isArray(params.facilities) ? params.facilities : firstValue(params.facilities)?.split(",") ?? [])
    .filter((value): value is string => ["wifi", "aircon", "tv", "bathroom"].includes(value));
  const showFull = firstValue(params.showFull) === "1";
  const requestedAvailability = firstValue(params.availability) ?? "any";
  const availabilityFilter = ["any", "available", "partial"].includes(requestedAvailability) ? requestedAvailability : "any";
  const page = Math.max(1, Math.min(100, Number(firstValue(params.page) || "1") || 1));
  const requestedView = firstValue(params.view);
  const view = requestedView === "map" || requestedView === "list" ? requestedView : "responsive";
  const viewValue = view === "responsive" ? "" : view;
  const pageSize = 12;
  const stayNights = checkIn && checkOut
    ? Math.round((new Date(`${checkOut}T00:00:00.000Z`).getTime() - new Date(`${checkIn}T00:00:00.000Z`).getTime()) / 86400000)
    : 0;

  const destinationPoint = destination ? await prisma.location.findFirst({
    where: destinationType === "Country" ? { country: { equals: destination, mode: "insensitive" } } :
      destinationType === "City" ? { city: { equals: destination, mode: "insensitive" } } :
      destinationType === "Neighborhood" ? { neighborhood: { equals: destination, mode: "insensitive" } } :
      destinationType === "Sub-city" ? { subCity: { equals: destination, mode: "insensitive" } } :
      destinationType === "Region" ? { region: { equals: destination, mode: "insensitive" } } :
      { OR: [
        { city: { equals: destination, mode: "insensitive" } },
        { region: { equals: destination, mode: "insensitive" } },
        { subCity: { equals: destination, mode: "insensitive" } },
        { neighborhood: { equals: destination, mode: "insensitive" } },
      ] },
    select: { latitude: true, longitude: true },
  }) : null;
  const destinationLatitude = destinationPoint?.latitude === null || !destinationPoint ? null : Number(destinationPoint.latitude);
  const destinationLongitude = destinationPoint?.longitude === null || !destinationPoint ? null : Number(destinationPoint.longitude);
  const distanceFromDestination = (property: { location: { latitude: unknown; longitude: unknown } }) => {
    if (destinationLatitude === null || destinationLongitude === null || property.location.latitude === null || property.location.longitude === null) return Number.POSITIVE_INFINITY;
    const lat = Number(property.location.latitude) * Math.PI / 180;
    const targetLat = destinationLatitude * Math.PI / 180;
    const deltaLat = (destinationLatitude - Number(property.location.latitude)) * Math.PI / 180;
    const deltaLon = (destinationLongitude - Number(property.location.longitude)) * Math.PI / 180;
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat) * Math.cos(targetLat) * Math.sin(deltaLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  const priceRange = {
    ...(minPrice > 0 ? { gte: minPrice } : {}),
    ...(maxPrice > 0 ? { lte: maxPrice } : {}),
  };
  const ratePeriodDateFilter = checkIn && checkOut
    ? { startDate: { lt: new Date(`${checkOut}T00:00:00.000Z`) }, endDate: { gte: new Date(`${checkIn}T00:00:00.000Z`) } }
    : {};
  const pricePlanFilter = Object.keys(priceRange).length
    ? {
        OR: [
          { basePrice: priceRange },
          { ratePeriods: { some: { pricePerNight: priceRange, ...ratePeriodDateFilter } } },
        ],
      }
    : {};
  const roomWhere = {
    isActive: true,
    ...(facilities.includes("wifi") ? { hasWifi: true } : {}),
    ...(facilities.includes("aircon") ? { hasAirConditioning: true } : {}),
    ...(facilities.includes("tv") ? { hasTv: true } : {}),
    ...(facilities.includes("bathroom") ? { hasPrivateBathroom: true } : {}),
    ratePlans: {
      some: {
        isActive: true,
        ...pricePlanFilter,
      },
    },
  };
  const propertyWhere = {
    status: "APPROVED" as const,
    ...(type ? { propertyType: type as PropertyType } : {}),
    roomTypes: { some: roomWhere },
    ...(destination ? (
      destinationType === "Country" ? { location: { country: { equals: destination, mode: "insensitive" as const } } } :
      destinationType === "Region" ? { location: { region: { equals: destination, mode: "insensitive" as const } } } :
      destinationType === "City" ? { location: { city: { equals: destination, mode: "insensitive" as const } } } :
      destinationType === "Sub-city" ? { location: { subCity: { equals: destination, mode: "insensitive" as const } } } :
      destinationType === "Neighborhood" ? { location: { neighborhood: { equals: destination, mode: "insensitive" as const } } } :
      { OR: [
        { name: { contains: destination, mode: "insensitive" as const } },
        { location: { city: { contains: destination, mode: "insensitive" as const } } },
        { location: { region: { contains: destination, mode: "insensitive" as const } } },
        { location: { subCity: { contains: destination, mode: "insensitive" as const } } },
        { location: { neighborhood: { contains: destination, mode: "insensitive" as const } } },
      ] }
    ) : {}),
  };

  const properties = await prisma.property.findMany({
    where: propertyWhere,
    include: {
      location: true,
      photos: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }], take: 1 },
      roomTypes: { where: roomWhere, include: {
        inventory: {
          where: isCustomer && checkIn && checkOut
            ? { date: { gte: new Date(`${checkIn}T00:00:00.000Z`), lt: new Date(`${checkOut}T00:00:00.000Z`) } }
            : { date: { equals: new Date("1970-01-01T00:00:00.000Z") } },
          select: { date: true, totalUnits: true, reservedUnits: true, blockedUnits: true },
        },
        ratePlans: {
          where: { isActive: true, ...pricePlanFilter },
          select: {
            basePrice: true,
            ratePeriods: {
              where: checkIn && checkOut ? { startDate: { lt: new Date(`${checkOut}T00:00:00.000Z`) }, endDate: { gte: new Date(`${checkIn}T00:00:00.000Z`) } } : undefined,
              orderBy: { startDate: "desc" },
              select: { startDate: true, endDate: true, pricePerNight: true },
            },
          },
        },
      } },
    },
    orderBy: [{ verificationStatus: "asc" }, { createdAt: "desc" }],
  });

  const results = properties.map((property) => {
    const planPriceOptions = property.roomTypes.flatMap((room) => room.ratePlans.map((plan) => {
      if (!checkIn || !checkOut) return { nightlyPrice: Number(plan.basePrice), stayTotal: Number(plan.basePrice) };
      const nights = Math.round((new Date(`${checkOut}T00:00:00.000Z`).getTime() - new Date(`${checkIn}T00:00:00.000Z`).getTime()) / 86400000);
      const nightly = Array.from({ length: nights }, (_, index) => {
        const date = new Date(`${checkIn}T00:00:00.000Z`);
        date.setUTCDate(date.getUTCDate() + index);
        const period = plan.ratePeriods.find((item) => item.startDate <= date && item.endDate >= date);
        return Number(period?.pricePerNight ?? plan.basePrice);
      });
      return {
        nightlyPrice: nightly.length ? Math.min(...nightly) : Number(plan.basePrice),
        stayTotal: nightly.reduce((sum, price) => sum + price, 0),
      };
    }));
    const prices = planPriceOptions.map((item) => item.nightlyPrice);
    const lowestPrice = prices.length ? Math.min(...prices) : null;
    const estimatedTotal = isCustomer && checkIn && checkOut && planPriceOptions.length
      ? Math.min(...planPriceOptions.map((item) => item.stayTotal)) * rooms
      : null;
    let availableRooms = 0;
    let availableGuestCapacity = 0;
    let availableAdultCapacity = 0;
    let availableChildCapacity = 0;
    let inventoryComplete = true;
    for (const room of property.roomTypes) {
      let minAvailable = room.totalUnits;
      if (checkIn && checkOut) {
        const nights = Math.round((new Date(`${checkOut}T00:00:00.000Z`).getTime() - new Date(`${checkIn}T00:00:00.000Z`).getTime()) / 86400000);
        for (let index = 0; index < nights; index++) {
          const date = new Date(`${checkIn}T00:00:00.000Z`);
          date.setUTCDate(date.getUTCDate() + index);
          const row = room.inventory.find((item) => item.date.getTime() === date.getTime());
          // If a dated inventory row is missing, do not advertise the
          // room as available until its inventory can be established.
          if (!row) inventoryComplete = false;
          const remaining = row ? Math.max(0, row.totalUnits - row.reservedUnits - row.blockedUnits) : 0;
          minAvailable = Math.min(minAvailable, remaining);
        }
      }
      availableRooms += minAvailable;
      availableGuestCapacity += minAvailable * room.maxGuests;
      availableAdultCapacity += minAvailable * (room.maxAdults ?? room.maxGuests);
      availableChildCapacity += minAvailable * (room.maxChildren ?? room.maxGuests);
    }
    const availabilityKnown = Boolean(checkIn && checkOut && isCustomer && inventoryComplete);
    const capacityFits = availableRooms >= rooms && availableGuestCapacity >= guests && availableAdultCapacity >= adults && availableChildCapacity >= children;
    const available = capacityFits;
    const availabilityStatus = !availabilityKnown ? "unknown" : available ? "available" : availableRooms > 0 ? "partial" : "fully-booked";
    return { ...property, lowestPrice, estimatedTotal, availableRooms, availableGuestCapacity, availableAdultCapacity, availableChildCapacity, availabilityKnown, available, capacityFits, availabilityStatus };
  }).filter((property) => {
    if (property.lowestPrice === null) return false;
    if (minPrice > 0 && property.lowestPrice < minPrice) return false;
    if (maxPrice > 0 && property.lowestPrice > maxPrice) return false;
    if (!property.availabilityKnown) {
      // Without confirmed date inventory, use physical room capacity only.
      // If a signed-in date search has incomplete inventory rows, keep the
      // property visible and let the property page perform the live check.
      if (!(checkIn && checkOut && isCustomer) && !property.capacityFits) return false;
      return true;
    }
    if (!showFull && property.availabilityStatus === "fully-booked") return false;
    if (availabilityFilter === "available" && property.availabilityStatus !== "available") return false;
    if (availabilityFilter === "partial" && property.availabilityStatus !== "partial") return false;
    return true;
  })
    .sort((a, b) => {
      if (sort === "recommended") {
        const score = (value: string) => value === "available" ? 3 : value === "partial" ? 2 : value === "unknown" ? 1 : 0;
        if (score(a.availabilityStatus) !== score(b.availabilityStatus)) return score(b.availabilityStatus) - score(a.availabilityStatus);
      }
      if (sort === "price-high") return b.lowestPrice! - a.lowestPrice!;
      if (sort === "price-low") return a.lowestPrice! - b.lowestPrice!;
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "closest") return distanceFromDestination(a) - distanceFromDestination(b);
      return 0;
    });

  const nearbyCandidates = results.length === 0 && destinationLatitude !== null && destinationLongitude !== null
    ? await prisma.property.findMany({
        where: {
          status: "APPROVED",
          roomTypes: { some: { isActive: true, ratePlans: { some: { isActive: true } } } },
        },
        include: {
          location: true,
          photos: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }], take: 1 },
          roomTypes: { where: { isActive: true }, include: { ratePlans: { where: { isActive: true }, select: { basePrice: true } } } },
        },
        take: 100,
      })
    : [];
  const nearbyResults = nearbyCandidates
    .map((property) => ({
      ...property,
      lowestPrice: Math.min(...property.roomTypes.flatMap((room) => room.ratePlans.map((plan) => Number(plan.basePrice)))),
      distance: distanceFromDestination(property),
    }))
    .filter((property) => Number.isFinite(property.lowestPrice) && Number.isFinite(property.distance))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6);

  const nearbyDestinations = Array.from(
    nearbyResults.reduce((map, property) => {
      const city = property.location.city?.trim();
      if (!city) return map;
      const key = city.toLocaleLowerCase();
      const existing = map.get(key);
      if (existing) existing.propertyCount += 1;
      else map.set(key, { name: city, propertyCount: 1, distance: property.distance });
      return map;
    }, new Map<string, { name: string; propertyCount: number; distance: number }>())
      .values()
  ).sort((a, b) => a.distance - b.distance).slice(0, 5);

  const totalResults = results.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const currentPage = Math.min(page, totalPages);
  // Load more reveals the next 12 results while keeping earlier cards visible.
  const pagedResults = results.slice(0, currentPage * pageSize);
  const queryState: Record<string, string> = {
    destination, destinationType, type, guests: String(guests), rooms: String(rooms), adults: String(adults), children: String(children), childAges: childAges.join(","), checkIn, checkOut, sort,
    minPrice: minPrice ? String(minPrice) : "", maxPrice: maxPrice ? String(maxPrice) : "",
    facilities: facilities.join(","), showFull: showFull ? "1" : "", availability: availabilityFilter, view: viewValue, page: String(currentPage),
  };
  const clearFiltersHref = makeQuery({
    destination,
    destinationType,
    guests: String(guests),
    rooms: String(rooms),
    adults: String(adults),
    children: String(children),
    childAges: childAges.join(","),
    checkIn,
    checkOut,
    sort,
    view,
  });

  return (
    <div className="min-h-screen bg-white text-[#1C1917]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:px-12">
          <Link
            href="/"
            aria-label="EthiopianBooking home"
            className="shrink-0 text-[17px] font-extrabold tracking-[-0.055em] text-[#1C1917] sm:text-2xl"
          >
            <span className="text-[#4A5D4E]">Ethiopian</span>
            Booking<span className="text-[#D97706]">.</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex lg:gap-9">
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 transition hover:text-[#4A5D4E]"
            >
              Home
            </Link>

            <Link
              href="/properties"
              aria-current="page"
              className="relative py-2 text-sm font-bold text-[#4A5D4E] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#4A5D4E]"
            >
              Explore stays
            </Link>

            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-500 transition hover:text-[#4A5D4E]"
            >
              Dashboard
            </Link>

            <Link
              href="/about"
              className="text-sm font-medium text-gray-500 transition hover:text-[#4A5D4E]"
            >
              About
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {!currentUser ? (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-3 py-2 text-sm font-semibold text-[#4A5D4E] transition hover:bg-gray-100 sm:px-4"
                >
                  Log in
                </Link>

                <Link
                  href="/signup"
                  className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#4A5D4E] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#3B4A3E] sm:px-5"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <>
                {(currentUser.roles.includes("ADMIN") ||
                  currentUser.roles.includes("SUPER_ADMIN")) && (
                  <Link
                    href="/admin/properties"
                    aria-label="Admin Dashboard"
                    title="Admin Dashboard"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-[#34483B] transition hover:border-[#4A5D4E] hover:bg-gray-50"
                  >
                    <ShieldCheck size={19} strokeWidth={1.7} />
                  </Link>
                )}

                {currentUser.roles.includes("PARTNER_OWNER") && (
                  <Link
                    href="/partner"
                    aria-label="Partner Dashboard"
                    title="Partner Dashboard"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-[#34483B] transition hover:border-[#4A5D4E] hover:bg-gray-50"
                  >
                    <Building2 size={19} strokeWidth={1.7} />
                  </Link>
                )}

                {currentUser.roles.includes("CUSTOMER") && (
                  <Link
                    href="/profile"
                    aria-label="My Account"
                    title="My Account"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-[#34483B] transition hover:border-[#4A5D4E] hover:bg-gray-50"
                  >
                    <UserRound size={19} strokeWidth={1.7} />
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {Boolean(checkIn && checkOut && !isCustomer) && (
          <SearchLoginGate returnUrl={makeQuery({ ...queryState })} />
        )}
        {/* Search and introduction */}
        <section className="bg-white">
          <div className="mx-auto max-w-[1440px] px-4 pb-9 pt-10 sm:px-8 sm:pb-12 sm:pt-14 lg:px-12">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DCE5DB] bg-[#F5F8F4] px-3.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4A5D4E]" />
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#4A5D4E] sm:text-xs">
                  Discover your next stay
                </p>
              </div>

              <h1 className="text-3xl font-bold leading-tight tracking-[-0.045em] text-[#1C1917] sm:text-5xl lg:text-[58px]">
                Find a stay that{" "}
                <span className="text-[#4A5D4E]">feels right.</span>
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
                Discover places to stay across Ethiopia, from city escapes to
                peaceful retreats.
              </p>

              <form
                action="/properties"
                method="GET"
                role="search"
                className="mx-auto mt-7 flex max-w-3xl items-center gap-1.5 rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition focus-within:border-[#4A5D4E] focus-within:ring-4 focus-within:ring-[#4A5D4E]/10 sm:mt-8 sm:gap-2"
              >
                <div className="flex h-11 w-9 shrink-0 items-center justify-center sm:w-12">
                  <Search
                    size={21}
                    className="text-[#4A5D4E]"
                    aria-hidden="true"
                  />
                </div>

                <DestinationAutocomplete initialValue={destination} initialType={destinationType} suggestions={[]} />
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="guests" value={String(guests)} />
                <input type="hidden" name="rooms" value={String(rooms)} />
                <input type="hidden" name="adults" value={String(adults)} />
                <input type="hidden" name="children" value={String(children)} />
                <input type="hidden" name="childAges" value={childAges.join(",")} />
                <input type="hidden" name="checkIn" value={checkIn} />
                <input type="hidden" name="checkOut" value={checkOut} />
                <input type="hidden" name="minPrice" value={String(minPrice || "")} />
                <input type="hidden" name="maxPrice" value={String(maxPrice || "")} />
                <input type="hidden" name="facilities" value={facilities.join(",")} />
                <input type="hidden" name="availability" value={availabilityFilter} />
                <input type="hidden" name="showFull" value={showFull ? "1" : ""} />

                <input type="hidden" name="view" value={viewValue} />
                <input type="hidden" name="page" value="1" />
                <input type="hidden" name="sort" value={sort} />

                <button
                  type="submit"
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#4A5D4E] px-3.5 text-sm font-bold text-white transition hover:bg-[#3B4A3E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#A8B5A5] sm:px-6"
                >
                  <span className="hidden sm:inline">Search stays</span>
                  <span className="sm:hidden">Search</span>
                  <ArrowRight size={16} />
                </button>
              </form>

              <p className="mt-3 text-xs text-gray-400">
                Search by property name to find your next place to stay.
              </p>
            </div>
          </div>
        </section>

        {/* Destinations */}
        <section className="border-y border-gray-100 bg-white">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#4A5D4E] sm:text-xs">
                  Explore Ethiopia
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-[#1C1917] sm:text-2xl">
                  Popular destinations
                </h2>
              </div>
              <p className="text-xs text-gray-500 sm:text-sm">
                Start with a place you love.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {destinations.map((destinationItem) => (
                <Link
                  key={destinationItem.name}
                  href={makeQuery({
                    destination: destinationItem.name,
                    destinationType: "City",
                    guests: String(guests),
                    checkIn,
                    checkOut,
                    sort,
                  })}
                  className="group flex min-h-[88px] flex-col justify-center rounded-2xl border border-gray-200 bg-white px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#B7C6B4] hover:shadow-md"
                >
                  <span className="text-sm font-bold text-[#1C1917] transition group-hover:text-[#4A5D4E]">
                    {destinationItem.name}
                  </span>
                  <span className="mt-1.5 text-xs text-gray-500">
                    {destinationItem.description}
                  </span>
                  <ArrowRight
                    size={15}
                    className="mt-3 text-[#4A5D4E] transition group-hover:translate-x-1"
                  />
                </Link>
              ))}
            </div>

            {/* Accommodation categories */}
            <div className="mt-9 border-t border-gray-100 pt-8">
              <div className="mb-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#4A5D4E] sm:text-xs">
                  Find your perfect match
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-[#1C1917] sm:text-2xl">
                  Browse by stay type
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Choose the accommodation that suits your trip.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {categories.map((category) => {
                  const CategoryIcon = category.icon;
                  const active = type === category.value;

                  return (
                    <Link
                      key={category.value}
                      href={makeQuery({
                        destination,
                        type: category.value,
                        guests: String(guests),
                        checkIn,
                        checkOut,
                        sort,
                      })}
                      aria-current={active ? "page" : undefined}
                      className={`group flex min-h-[112px] items-center gap-3 rounded-2xl border p-4 transition duration-200 sm:gap-4 sm:p-5 ${
                        active
                          ? "border-[#4A5D4E] bg-[#F5F8F4] shadow-sm"
                          : "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-[#B7C6B4] hover:shadow-md"
                      }`}
                    >
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                          active
                            ? "bg-[#4A5D4E] text-white"
                            : "bg-[#F3F5F1] text-[#4A5D4E] transition group-hover:bg-[#E8EEE5]"
                        }`}
                      >
                        <CategoryIcon size={23} strokeWidth={1.7} />
                      </span>

                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-[#1C1917]">
                          {category.label}
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          Explore stays
                        </span>
                      </span>

                      <ArrowRight
                        size={16}
                        className="ml-auto shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#4A5D4E]"
                      />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Filters and sorting */}
            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
              <details className="group relative">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-[#4A5D4E] hover:text-[#4A5D4E] [&::-webkit-details-marker]:hidden">
                  <SlidersHorizontal size={16} />
                  Filters
                  <ChevronDown
                    size={15}
                    className="transition group-open:rotate-180"
                  />
                </summary>

                <div className="fixed inset-x-4 top-20 z-40 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-[0_18px_55px_rgba(0,0,0,0.14)] sm:absolute sm:inset-x-auto sm:left-0 sm:top-14 sm:max-h-[calc(100vh-8rem)] sm:w-[360px] lg:fixed lg:left-8 lg:top-28 lg:bottom-8 lg:max-h-none lg:w-[320px]">
                  <h3 className="text-base font-bold text-[#1C1917]">
                    Refine your search
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Choose the options that fit your trip.
                  </p>

                  <form
                    action="/properties"
                    method="GET"
                    className="mt-4 space-y-4"
                  >
                    <input
                      type="hidden"
                      name="destination"
                      value={destination}
                    />
                    <input type="hidden" name="destinationType" value={destinationType} />
                    <input type="hidden" name="sort" value={sort} />
                    <input type="hidden" name="checkIn" value={checkIn} />
                    <input type="hidden" name="checkOut" value={checkOut} />
                    <input type="hidden" name="rooms" value={String(rooms)} />
                    <input type="hidden" name="adults" value={String(adults)} />
                    <input type="hidden" name="children" value={String(children)} />
                    <input type="hidden" name="childAges" value={childAges.join(",")} />
                    <input type="hidden" name="page" value="1" />
                    <input type="hidden" name="view" value={viewValue} />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="min-price" className="mb-2 block text-sm font-semibold text-gray-700">Minimum price / night</label>
                        <input id="min-price" type="number" min="0" name="minPrice" defaultValue={minPrice || ""} placeholder="Any" className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm" />
                      </div>
                      <div>
                        <label htmlFor="max-price" className="mb-2 block text-sm font-semibold text-gray-700">Maximum price / night</label>
                        <input id="max-price" type="number" min="0" name="maxPrice" defaultValue={maxPrice || ""} placeholder="Any" className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <input type="checkbox" name="showFull" value="1" defaultChecked={showFull} disabled={!checkIn || !checkOut || !isCustomer} className="h-4 w-4 accent-[#4A5D4E] disabled:cursor-not-allowed disabled:opacity-40" />
                      Include fully booked properties
                    </label>
                    <div>
                      <label htmlFor="availability-filter" className="mb-2 block text-sm font-semibold text-gray-700">Availability</label>
                      <select id="availability-filter" name="availability" defaultValue={availabilityFilter} disabled={!checkIn || !checkOut || !isCustomer} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400">
                        <option value="any">Any availability</option>
                        <option value="available">Available for this stay</option>
                        <option value="partial">Partially available</option>
                      </select>
                      {(!checkIn || !checkOut || !isCustomer) && <p className="mt-1 text-xs text-gray-400">Sign in and choose dates to filter live availability.</p>}
                    </div>
                    <div>
                      <label htmlFor="guest-rating-filter" className="mb-2 block text-sm font-semibold text-gray-700">Guest rating</label>
                      <select id="guest-rating-filter" disabled className="h-11 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400">
                        <option>Guest ratings coming soon</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-400">Rating and review data are not available in the current property records.</p>
                    </div>
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-semibold text-gray-700">Facilities</legend>
                      {[
                        ["wifi", "Wi-Fi"],
                        ["aircon", "Air conditioning"],
                        ["tv", "Television"],
                        ["bathroom", "Private bathroom"],
                      ].map(([value, label]) => (
                        <label key={value} className="flex items-center gap-2 text-sm text-gray-600">
                          <input type="checkbox" name="facilities" value={value} defaultChecked={facilities.includes(value)} className="h-4 w-4 accent-[#4A5D4E]" />
                          {label}
                        </label>
                      ))}
                    </fieldset>

                    <div>
                      <label
                        htmlFor="filter-type"
                        className="mb-2 block text-sm font-semibold text-gray-700"
                      >
                        Property type
                      </label>
                      <select
                        id="filter-type"
                        name="type"
                        defaultValue={type}
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#4A5D4E] focus:ring-3 focus:ring-[#4A5D4E]/10"
                      >
                        <option value="">All property types</option>
                        {validTypes.map((propertyType) => (
                          <option key={propertyType} value={propertyType}>
                            {propertyTypeLabels[propertyType] ?? propertyType}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="filter-guests"
                        className="mb-2 block text-sm font-semibold text-gray-700"
                      >
                        Number of guests
                      </label>
                      <select
                        id="filter-guests"
                        name="guests"
                        defaultValue={String(guests)}
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#4A5D4E] focus:ring-3 focus:ring-[#4A5D4E]/10"
                      >
                        {Array.from({ length: 30 }, (_, index) => index + 1).map(
                          (count) => (
                            <option key={count} value={count}>
                              {count} {count === 1 ? "guest" : "guests"}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="filter-checkin"
                          className="mb-2 block text-sm font-semibold text-gray-700"
                        >
                          Check-in
                        </label>
                        <input
                          id="filter-checkin"
                          type="date"
                          name="checkIn"
                          min={today}
                          defaultValue={checkIn}
                          className="h-11 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-2 text-sm outline-none transition focus:border-[#4A5D4E] focus:ring-3 focus:ring-[#4A5D4E]/10"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="filter-checkout"
                          className="mb-2 block text-sm font-semibold text-gray-700"
                        >
                          Check-out
                        </label>
                        <input
                          id="filter-checkout"
                          type="date"
                          name="checkOut"
                          min={checkIn || today}
                          defaultValue={checkOut}
                          className="h-11 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-2 text-sm outline-none transition focus:border-[#4A5D4E] focus:ring-3 focus:ring-[#4A5D4E]/10"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4A5D4E] px-4 text-sm font-bold text-white transition hover:bg-[#3B4A3E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#A8B5A5]"
                    >
                      Apply filters
                      <ArrowRight size={16} />
                    </button>

                    <Link
                      href={makeQuery({ destination, sort })}
                      className="block py-1 text-center text-sm font-semibold text-[#4A5D4E] hover:text-[#3B4A3E]"
                    >
                      Clear filters
                    </Link>
                  </form>
                </div>
              </details>

              <form
                action="/properties"
                method="GET"
                className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5"
              >
                <ArrowUpDown size={16} className="shrink-0 text-[#4A5D4E]" />
                <label htmlFor="sort-properties" className="sr-only">
                  Sort properties
                </label>
                <select
                  id="sort-properties"
                  name="sort"
                  defaultValue={sort}
                  className="max-w-[175px] cursor-pointer bg-transparent py-2 text-xs font-semibold text-gray-700 outline-none sm:text-sm"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price-low">Lowest price</option>
                  <option value="price-high">Highest price</option>
                  <option value="name">Property name</option>
                  <option value="closest" disabled={destinationLatitude === null || destinationLongitude === null}>Closest to destination</option>
                  <option value="highest-rated" disabled>Highest rated · reviews not available yet</option>
                  <option value="most-reviewed" disabled>Most reviewed · reviews not available yet</option>
                </select>

                <input
                  type="hidden"
                  name="destination"
                  value={destination}
                />
                <input type="hidden" name="destinationType" value={destinationType} />
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="guests" value={String(guests)} />
                <input type="hidden" name="checkIn" value={checkIn} />
                <input type="hidden" name="checkOut" value={checkOut} />
                <input type="hidden" name="rooms" value={String(rooms)} />
                <input type="hidden" name="adults" value={String(adults)} />
                <input type="hidden" name="children" value={String(children)} />
                <input type="hidden" name="childAges" value={childAges.join(",")} />
                <input type="hidden" name="minPrice" value={String(minPrice || "")} />
                <input type="hidden" name="maxPrice" value={String(maxPrice || "")} />
                <input type="hidden" name="facilities" value={facilities.join(",")} />
                <input type="hidden" name="showFull" value={showFull ? "1" : ""} />
                <input type="hidden" name="availability" value={availabilityFilter} />
                <input type="hidden" name="view" value={viewValue} />
                <input type="hidden" name="page" value="1" />

                <button
                  type="submit"
                  className="text-xs font-bold text-[#4A5D4E] transition hover:text-[#1C1917]"
                >
                  Apply
                </button>
              </form>

              {(destination || type || guests !== 1 || rooms !== 1 || checkIn || checkOut || minPrice > 0 || maxPrice > 0 || facilities.length > 0 || showFull) && (
                <Link
                  href={clearFiltersHref}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-[#4A5D4E]"
                >
                  Reset filters
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Property results */}
        <section className="border-t border-gray-100 bg-white">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12">
            <div className="flex flex-wrap items-end justify-between gap-4 py-8 sm:py-10">
              <div>
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#4A5D4E] sm:text-xs">
                  Your next getaway
                </p>
                <h2 className="text-2xl font-bold tracking-[-0.035em] text-[#1C1917] sm:text-3xl">
                  {destination
                    ? `Results for "${destination}"`
                    : type
                      ? `${propertyTypeLabels[type] ?? type} stays`
                      : "Explore stays"}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  {totalResults}{" "}
                  {totalResults === 1 ? "property" : "properties"} found · {pagedResults.length} displayed
                  {type ? ` · ${propertyTypeLabels[type] ?? type}` : ""}
                </p>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
              <div className="flex items-center gap-2">
                <Link href={makeQuery({ ...queryState, view: "list" })} aria-pressed={view === "list"} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${view === "list" ? "border-[#4A5D4E] bg-[#F2F5F0] text-[#34483B]" : "border-gray-200 text-gray-600"}`}>List</Link>
                <Link href={makeQuery({ ...queryState, view: "map" })} aria-pressed={view === "map"} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${view === "map" ? "border-[#4A5D4E] bg-[#F2F5F0] text-[#34483B]" : "border-gray-200 text-gray-600"}`}>Map</Link>
              </div>
            </div>
            {pagedResults.length > 0 ? (
              <>
                {(view === "map" || view === "responsive") && (
                  <div className={`${view === "responsive" ? "hidden lg:grid" : "grid"} grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.95fr)]`}>
                    <div className="order-2 grid min-w-0 grid-cols-1 gap-5 pb-8 sm:grid-cols-2 lg:order-1 lg:grid-cols-1">
                      {pagedResults.map((property) => {
                        const photo = property.photos[0];
                        const propertyHref = `/properties/${property.slug}?${new URLSearchParams(queryState).toString()}`;
                        const location = [property.location?.city, property.location?.region].filter(Boolean).join(", ");
                        return (
                          <article id={`property-${property.id}`} key={property.id} className="group flex overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-[#A8B5A5] hover:shadow-lg">
                            <Link href={propertyHref} className="relative block aspect-square w-32 shrink-0 overflow-hidden bg-gray-100 sm:w-44">
                              {photo?.publicUrl ? <img src={photo.publicUrl} alt={photo.altText || property.name} className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-xs text-gray-400">No photo</div>}
                              {property.verificationStatus === "VERIFIED" && <span className="absolute right-2 top-2 rounded-full bg-[#4A5D4E] px-2 py-1 text-[9px] font-bold text-white">Verified</span>}
                              {property.availabilityKnown && <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-[#34483B]">{property.availabilityStatus === "fully-booked" ? "Fully booked" : property.availabilityStatus === "partial" ? "Partially available" : "Available"}</span>}
                            </Link>
                            <div className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:p-4">
                              <div><p className="truncate text-xs text-gray-500">{location}</p><Link href={propertyHref} className="mt-1 block font-bold text-[#1C1917] hover:text-[#4A5D4E]">{property.name}</Link><p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{property.description || propertyTypeLabels[property.propertyType] || property.propertyType}</p>{!property.availabilityKnown && <p className="mt-2 text-[11px] font-semibold text-[#4A5D4E]">{checkIn && checkOut && isCustomer ? "Availability will be confirmed when you select rooms" : "Select your dates to check availability"}</p>}</div>
                              <div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-sm font-extrabold text-[#1C1917]">{formatPrice(property.lowestPrice!)}<span className="ml-1 text-[10px] font-medium text-gray-500">/ room / night</span></p>{property.estimatedTotal !== null && <p className="mt-1 text-[11px] font-semibold text-[#4A5D4E]">Estimated stay total · {stayNights} nights: {formatPrice(property.estimatedTotal)}</p>}</div><Link href={propertyHref} className="text-xs font-bold text-[#4A5D4E]">View stay →</Link></div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    <div className="order-1 min-w-0 lg:order-2">
                    <SearchResultsMap
                      destination={destination}
                      points={pagedResults.map((property) => ({
                        id: property.id,
                        name: property.name,
                        href: `/properties/${property.slug}?${new URLSearchParams(queryState).toString()}`,
                        cardHref: `#property-${property.id}`,
                        latitude: property.location.latitude === null ? null : Number(property.location.latitude),
                        longitude: property.location.longitude === null ? null : Number(property.location.longitude),
                        price: property.lowestPrice!,
                        available: property.available,
                        fullyBooked: property.availabilityStatus === "fully-booked",
                        availabilityKnown: property.availabilityKnown,
                        availabilityMessage: checkIn && checkOut && isCustomer ? "Check when selecting rooms" : "Select dates",
                      }))}
                    />
                    </div>
                  </div>
                )}
                {(view === "list" || view === "responsive") && (
                  <div className={`${view === "responsive" ? "grid lg:hidden" : "grid"} grid-cols-1 gap-6 pb-16 sm:grid-cols-2 xl:grid-cols-3`}>
                    {pagedResults.map((property) => {
                      const photo = property.photos[0];
                      const propertyHref = `/properties/${property.slug}?${new URLSearchParams(queryState).toString()}`;
                      const location = [property.location?.city, property.location?.region].filter(Boolean).join(", ");
                      return (
                        <article key={property.id} className="group flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white transition hover:-translate-y-1 hover:border-gray-300 hover:shadow-[0_18px_45px_rgba(0,0,0,0.09)]">
                          <Link href={propertyHref} className="relative block aspect-[4/3] overflow-hidden bg-gray-100">
                            {photo?.publicUrl ? <img src={photo.publicUrl} alt={photo.altText || property.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]" /> : <div className="flex h-full items-center justify-center text-sm text-gray-400">Property photo coming soon</div>}
                            {property.verificationStatus === "VERIFIED" && <span className="absolute right-3 top-3 rounded-full bg-[#4A5D4E] px-3 py-1.5 text-[10px] font-bold text-white">Verified</span>}
                            {property.availabilityKnown && <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[#34483B]">{property.availabilityStatus === "fully-booked" ? "Fully booked" : property.availabilityStatus === "partial" ? "Partially available" : `${property.availableRooms} rooms available`}</span>}
                          </Link>
                          <div className="flex flex-1 flex-col p-5"><p className="text-xs text-gray-500">{location}</p><Link href={propertyHref} className="mt-2 text-xl font-bold text-[#1C1917] hover:text-[#4A5D4E]">{property.name}</Link><p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{property.description || propertyTypeLabels[property.propertyType] || property.propertyType}</p>{!property.availabilityKnown && <p className="mt-2 text-xs font-semibold text-[#4A5D4E]">{checkIn && checkOut && isCustomer ? "Availability will be confirmed when you select rooms" : "Select your dates to check availability"}</p>}<div className="mt-auto flex items-end justify-between gap-3 border-t border-gray-100 pt-5"><div><p className="text-xs text-gray-500">Starting from</p><p className="text-xl font-extrabold text-[#1C1917]">{formatPrice(property.lowestPrice!)}</p><p className="text-xs text-gray-500">/ room / night</p>{property.estimatedTotal !== null && <p className="mt-2 text-xs font-semibold text-[#4A5D4E]">Estimated stay total · {stayNights} nights: {formatPrice(property.estimatedTotal)}</p>}</div><Link href={propertyHref} className="rounded-xl bg-[#4A5D4E] px-4 py-2.5 text-sm font-bold text-white">View stay</Link></div></div>
                        </article>
                      );
                    })}
                  </div>
                )}
            {totalPages > 1 && (
              <nav aria-label="More property results" className="flex flex-col items-center justify-center gap-3 border-t border-gray-100 py-8">
                <span className="text-sm text-gray-500">Showing {pagedResults.length} of {totalResults} properties</span>
                {currentPage < totalPages && <Link href={makeQuery({ ...queryState, page: String(currentPage + 1) })} className="rounded-xl bg-[#4A5D4E] px-5 py-3 text-sm font-bold text-white">Load more stays</Link>}
              </nav>
            )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center sm:py-20">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-[#4A5D4E]">
                  <Search size={27} strokeWidth={1.6} />
                </div>

                <h3 className="mt-5 text-xl font-bold tracking-tight text-[#1C1917]">
                  No stays found
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                  {destination
                    ? `We couldn't find an available property matching "${destination}". Check the spelling or try another property name.`
                    : "There are no properties matching these filters right now. Try changing your filters."}
                </p>

                {nearbyDestinations.length > 0 && (
                  <form action="/properties" method="GET" className="mt-7 w-full max-w-xl rounded-2xl border border-[#DCE5DB] bg-[#F8FAF7] p-4 text-left">
                    <label htmlFor="nearby-destination" className="mb-2 block text-sm font-bold text-[#34483B]">Explore a nearby destination</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select id="nearby-destination" name="destination" required defaultValue="" className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm">
                        <option value="" disabled>Choose a nearby city</option>
                        {nearbyDestinations.map((item) => <option key={item.name} value={item.name}>{item.name} · {item.propertyCount} nearby stays · {item.distance.toFixed(1)} km</option>)}
                      </select>
                      <input type="hidden" name="destinationType" value="City" />
                      <input type="hidden" name="type" value={type} />
                      <input type="hidden" name="rooms" value={String(rooms)} />
                      <input type="hidden" name="adults" value={String(adults)} />
                      <input type="hidden" name="children" value={String(children)} />
                      <input type="hidden" name="childAges" value={childAges.join(",")} />
                      <input type="hidden" name="checkIn" value={checkIn} />
                      <input type="hidden" name="checkOut" value={checkOut} />
                      <input type="hidden" name="sort" value={sort} />
                      <input type="hidden" name="minPrice" value={String(minPrice || "")} />
                      <input type="hidden" name="maxPrice" value={String(maxPrice || "")} />
                      <input type="hidden" name="facilities" value={facilities.join(",")} />
                      <input type="hidden" name="showFull" value={showFull ? "1" : ""} />
                      <input type="hidden" name="availability" value={availabilityFilter} />
                      <input type="hidden" name="view" value={viewValue} />
                      <button type="submit" className="h-11 shrink-0 rounded-xl bg-[#4A5D4E] px-4 text-sm font-bold text-white">Explore nearby</button>
                    </div>
                  </form>
                )}
                {nearbyResults.length > 0 && (
                  <div className="mt-8 w-full max-w-3xl text-left">
                    <h4 className="mb-3 text-lg font-bold text-[#1C1917]">Nearby alternatives</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {nearbyResults.map((property) => (
                        <Link key={property.id} href={`/properties/${property.slug}?${new URLSearchParams(queryState).toString()}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-[#A8B5A5]">
                          <span className="min-w-0"><span className="block truncate font-semibold text-[#1C1917]">{property.name}</span><span className="block text-xs text-gray-500">{property.location.city} · {property.distance.toFixed(1)} km away</span></span>
                          <span className="shrink-0 text-sm font-bold text-[#4A5D4E]">{formatPrice(property.lowestPrice)} / night</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  href="/properties"
                  className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#4A5D4E] px-5 text-sm font-bold text-white transition hover:bg-[#3B4A3E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#A8B5A5]"
                >
                  Explore all stays
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <Link
            href="/"
            className="text-lg font-extrabold tracking-tight text-[#1C1917]"
          >
            <span className="text-[#4A5D4E]">Ethiopian</span>
            Booking<span className="text-[#D97706]">.</span>
          </Link>

          <p className="text-sm text-gray-500">
            Discover Ethiopia, one stay at a time.
          </p>

          <Link
            href="/properties"
            className="inline-flex min-h-9 items-center gap-1 self-start text-sm font-semibold text-[#4A5D4E] transition hover:text-[#1C1917] sm:self-auto"
          >
            Properties
            <ArrowRight size={14} />
          </Link>
        </div>
      </footer>
    </div>
  );
}
