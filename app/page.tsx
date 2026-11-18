import { getCurrentUser } from "@/lib/auth/get-current-user";
import HomepageSearchForm from "@/app/components/HomepageSearchForm";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import {
  PropertyType,
  VerificationStatus,
} from "@/lib/generated/prisma/enums";
import {
  ArrowRight,
  Building2,
  Compass,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type HomePageProps = {
  searchParams: Promise<{
    destination?: string;
    type?: string;
    guests?: string;
    rooms?: string;
    adults?: string;
    children?: string;
    childAges?: string;
    destinationType?: string;
    checkIn?: string;
    checkOut?: string;
  }>;
};

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2400&q=90";

const PROPERTY_TYPES = [
  { value: PropertyType.HOTEL, label: "Hotels" },
  { value: PropertyType.GUESTHOUSE, label: "Guesthouses" },
  { value: PropertyType.LODGE, label: "Lodges" },
  { value: PropertyType.RESORT, label: "Resorts" },
  { value: PropertyType.APARTMENT, label: "Apartments" },
  { value: PropertyType.HOSTEL, label: "Hostels" },
  { value: PropertyType.VILLA, label: "Villas" },
  { value: PropertyType.BOUTIQUE_HOTEL, label: "Boutique hotels" },
  { value: PropertyType.BED_AND_BREAKFAST, label: "Bed and breakfast" },
  { value: PropertyType.HOMESTAY, label: "Homestays" },
  { value: PropertyType.OTHER, label: "Other stays" },
] as const;

const POPULAR_DESTINATIONS = [
  "Addis Ababa",
  "Bahir Dar",
  "Hawassa",
  "Lalibela",
];

function isValidDate(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function formatPrice(price: number | string) {
  return Number(price).toLocaleString("en-US");
}

export default async function HomePage({
  searchParams,
}: HomePageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const destination = params.destination?.trim() ?? "";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());

  const checkIn =
    isValidDate(params.checkIn) && params.checkIn >= today
      ? params.checkIn
      : "";

  const checkOut =
    isValidDate(params.checkOut) &&
    params.checkOut > (checkIn || today)
      ? params.checkOut
      : "";

  const selectedType = PROPERTY_TYPES.find(
    (item) => item.value === params.type,
  )?.value;

  const parsedGuests = Number(params.guests ?? "2");
  const parsedAdults = Number(params.adults ?? parsedGuests);
  const parsedChildren = Number(params.children ?? "0");
  const initialAdults = Number.isInteger(parsedAdults) && parsedAdults >= 1 && parsedAdults <= 30 ? parsedAdults : 2;
  const initialChildren = Number.isInteger(parsedChildren) && parsedChildren >= 0 && parsedChildren <= 30 && initialAdults + parsedChildren <= 30 ? parsedChildren : 0;
  const guests = initialAdults + initialChildren;
  const initialRoomsValue = Number(params.rooms ?? "1");
  const initialRooms = Number.isInteger(initialRoomsValue) && initialRoomsValue >= 1 && initialRoomsValue <= 30 ? initialRoomsValue : 1;
  const initialChildAges = (params.childAges ?? "").split(",").filter((age) => age !== "").slice(0, initialChildren).map(Number);
  const initialDestinationType = ["Country", "Region", "City", "Sub-city", "Neighborhood"].includes(params.destinationType ?? "") ? params.destinationType ?? "" : "";

  const properties = await prisma.property.findMany({
    where: {
      status: "APPROVED",

      ...(selectedType ? { propertyType: selectedType } : {}),

      roomTypes: {
        some: {
          isActive: true,
        },
      },

      ...(destination
        ? initialDestinationType === "Country" ? { location: { country: { equals: destination, mode: "insensitive" as const } } }
          : initialDestinationType === "Region" ? { location: { region: { equals: destination, mode: "insensitive" as const } } }
          : initialDestinationType === "City" ? { location: { city: { equals: destination, mode: "insensitive" as const } } }
          : initialDestinationType === "Sub-city" ? { location: { subCity: { equals: destination, mode: "insensitive" as const } } }
          : initialDestinationType === "Neighborhood" ? { location: { neighborhood: { equals: destination, mode: "insensitive" as const } } }
          : {
              OR: [
                { name: { contains: destination, mode: "insensitive" as const } },
                { location: { city: { contains: destination, mode: "insensitive" as const } } },
                { location: { region: { contains: destination, mode: "insensitive" as const } } },
                { location: { subCity: { contains: destination, mode: "insensitive" as const } } },
                { location: { neighborhood: { contains: destination, mode: "insensitive" as const } } },
              ],
            }
        : {}),
    },

    include: {
      location: true,

      photos: {
        orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
      },

      roomTypes: {
        where: {
          isActive: true,
        },

        include: {
          ratePlans: {
            where: { isActive: true },
            orderBy: { basePrice: "asc" },
          },
        },
      },
    },

    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="relative z-30 mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5 lg:px-12">
        <Link
          href="/"
          aria-label="EthiopianBooking home"
          className="shrink-0 text-[17px] font-extrabold tracking-[-0.05em] text-[#1C1917] sm:text-2xl"
        >
          <span className="text-[#4A5D4E]">Ethiopian</span>
          Booking<span className="text-[#D97706]">.</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex lg:gap-8">
          <Link
            href="/"
            aria-current="page"
            className="text-sm font-semibold text-[#4A5D4E]"
          >
            Home
          </Link>

          <Link
            href="/properties"
            className="text-sm font-medium text-[#57534E] transition hover:text-[#4A5D4E]"
          >
            Explore stays
          </Link>

          <Link
  href="/dashboard"
  className="text-sm font-medium text-[#57534E] transition hover:text-[#4A5D4E]"
>
  Dashboard
</Link>

          <Link
  href="/about"
  className="text-sm font-medium text-[#57534E] transition hover:text-[#4A5D4E]"
>
  About
</Link>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {!currentUser ? (
            <>
              <Link
                href="/login"
                className="px-2 py-2 text-sm font-medium text-[#4A5D4E] hover:text-[#758675]"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="text-sm font-semibold text-[#4A5D4E] hover:text-[#758675]"
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
                  className="inline-flex items-center justify-center p-2 text-[#34483B] transition-colors hover:text-[#758675]"
                >
                  <ShieldCheck size={20} strokeWidth={1.7} />
                </Link>
              )}

              {currentUser.roles.includes("PARTNER_OWNER") && (
                <Link
                  href="/partner"
                  aria-label="Partner Dashboard"
                  title="Partner Dashboard"
                  className="inline-flex items-center justify-center p-2 text-[#34483B] transition-colors hover:text-[#758675]"
                >
                  <Building2 size={20} strokeWidth={1.7} />
                </Link>
              )}

              {currentUser.roles.includes("CUSTOMER") && (
                <Link
                  href="/profile"
                  aria-label="My Account"
                  title="My Account"
                  className="inline-flex items-center justify-center p-2 text-[#34483B] transition-colors hover:text-[#758675]"
                >
                  <UserRound size={20} strokeWidth={1.7} />
                </Link>
              )}
            </>
          )}
        </div>
      </header>

      {/* Hero and overlapping search panel */}
      <section className="mx-auto w-full max-w-[1440px] px-4 pb-8 sm:px-8 sm:pb-12 lg:px-12">
        {/* Centered brand headline */}
        <div className="relative z-0 mb-[-0.5rem] px-0 pt-6 text-center sm:mb-[-0.75rem] sm:pt-8 lg:mb-[-1rem] lg:pt-10">
          <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8B7355] sm:mb-4 sm:text-xs sm:tracking-[0.4em]">
            Your Next Destination Starts Here
          </p>
          <h1 className="w-full whitespace-nowrap text-center font-[Montserrat,sans-serif] text-[clamp(1rem,9.2vw,8.5rem)] font-semibold leading-[0.95] tracking-[-0.065em] text-[#4A5D4E]">
            EthiopianBooking
          </h1>
        </div>

        {/* Hero image */}
        <div className="relative z-10 isolate h-[clamp(340px,58vw,590px)] min-h-[340px] max-h-[590px] overflow-hidden rounded-[1.25rem] border border-white/40 bg-[#D9D6CB] shadow-[0_24px_60px_-28px_rgba(28,25,23,0.3)] sm:rounded-[2rem] lg:rounded-[2.5rem]">
          <img
            src={HERO_IMAGE}
            alt="Beautiful contemporary accommodation with natural light"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />

          {/* Image gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Glass highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 border-b border-white/20 bg-white/[0.08] backdrop-blur-[2px]" />

          {/* Glass edge */}
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/25" />

          {/* Hero content: Explore stays */}
          <div className="absolute bottom-6 left-5 right-5 z-10 text-white sm:bottom-10 sm:left-10 sm:right-10 lg:bottom-14 lg:left-14">
          </div>

          {/* Explore Ethiopia badge */}
          <div className="absolute right-4 top-4 hidden items-center gap-2 rounded-full border border-white/40 bg-white/20 px-4 py-2 text-xs font-semibold text-white backdrop-blur-xl sm:flex">
            <MapPin size={14} />
            Explore Ethiopia
          </div>
        </div>


        {/* Compact glassmorphism search panel */}
        <div className="relative z-20 mx-auto -mt-7 w-[calc(100%-1rem)] max-w-[1240px] sm:-mt-9 sm:w-[calc(100%-3rem)] lg:-mt-12 lg:w-[calc(100%-5rem)]">
          <div className="rounded-2xl border border-white/70 bg-white/85 p-2 shadow-[0_16px_40px_-20px_rgba(28,25,23,0.2)] backdrop-blur-2xl sm:rounded-2xl sm:p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-[#1C1917] sm:text-base">
                  Plan your stay
                </h2>
                <p className="mt-0.5 text-xs text-[#78716C]">
                  Where would you like to go?
                </p>
              </div>
              <MapPin size={19} className="shrink-0 text-[#4A5D4E]" />
            </div>

            <HomepageSearchForm
              initialDestination={destination}
              initialCheckIn={checkIn}
              initialCheckOut={checkOut}
              initialType={selectedType ?? ""}
              initialGuests={initialAdults}
              initialRooms={initialRooms}
              initialChildren={initialChildren}
              initialChildAges={initialChildAges}
              initialDestinationType={initialDestinationType}
              isAuthenticated={Boolean(currentUser?.roles.includes("CUSTOMER"))}
              propertyTypes={PROPERTY_TYPES.map((item) => ({ value: item.value, label: item.label }))}
              today={today}
            />

            {/* Compact popular destinations */}
            <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-stone-200/80 pt-2">
              <span className="mr-1 text-xs font-semibold text-[#78716C]">
                Popular:
              </span>

              {POPULAR_DESTINATIONS.map((city) => {
                const query = new URLSearchParams();
                query.set("destination", city);

                if (selectedType) query.set("type", selectedType);
                query.set("guests", String(guests));
                query.set("rooms", String(initialRooms));
                query.set("adults", String(initialAdults));
                query.set("children", String(initialChildren));
                if (initialChildAges.length) query.set("childAges", initialChildAges.join(","));
                query.set("destinationType", "City");
                if (checkIn) query.set("checkIn", checkIn);
                if (checkOut) query.set("checkOut", checkOut);

                const isSelected =
                  destination.toLowerCase() === city.toLowerCase();

                return (
                  <Link
                    key={city}
                    href={`/?${query.toString()}#stays`}
                    className={`rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition ${
                      isSelected
                        ? "border-[#C9D5C6] bg-[#E5EBE2] text-[#3B4A3E]"
                        : "border-transparent bg-stone-100 text-stone-600 hover:bg-[#EEF1E9] hover:text-[#4A5D4E]"
                    }`}
                  >
                    {city}
                  </Link>
                );
              })}

              <Link
                href="/properties"
                className="ml-auto inline-flex items-center gap-1 py-1.5 text-xs font-semibold text-[#4A5D4E] hover:text-[#1C1917]"
              >
                All properties
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
        </section>


      {/* Premium property listing grid */}
      <section
        id="stays"
        className="mx-auto w-full max-w-[1440px] px-4 pb-20 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:px-12"
      >
        {/* Section heading */}
        <div className="mb-10 text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DDE5D8] bg-[#EEF1E9] px-4 py-2 text-xs font-semibold text-[#4A5D4E]">
            <Compass size={14} />
            Discover Ethiopia
          </span>

          <h2 className="text-3xl font-extrabold tracking-tight text-[#1C1917] md:text-4xl">
            Find Your Perfect Stay
          </h2>

          <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[#78716C]">
            Explore welcoming hotels, beautiful escapes, and places worth discovering across Ethiopia.
          </p>

          {destination && (
            <p className="mt-3 text-sm font-medium text-[#4A5D4E]">
              Showing stays in {destination}
            </p>
          )}
        </div>

        {/* Category filters */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-1 flex items-center gap-2.5 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {[
              { label: "All", value: "" },
              { label: "Apartment", value: PropertyType.APARTMENT },
              { label: "Resort", value: PropertyType.RESORT },
              { label: "Lodge", value: PropertyType.LODGE },
              { label: "Hotel", value: PropertyType.HOTEL },
            ].map((category) => {
              const isActive = category.value
                ? selectedType === category.value
                : !selectedType;

              const query = new URLSearchParams();

              if (destination) {
                query.set("destination", destination);
              }

              if (category.value) {
                query.set("type", category.value);
              }

              query.set("guests", String(guests));
              query.set("rooms", String(initialRooms));
              query.set("adults", String(initialAdults));
              query.set("children", String(initialChildren));
              if (initialChildAges.length) query.set("childAges", initialChildAges.join(","));
              if (initialDestinationType) query.set("destinationType", initialDestinationType);

              if (checkIn) query.set("checkIn", checkIn);
              if (checkOut) query.set("checkOut", checkOut);

              const href = query.size
                ? `/?${query.toString()}#stays`
                : "/#stays";

              return (
                <Link
                  key={category.label}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`shrink-0 rounded-full px-5 py-2.5 text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-[#EAB308] font-semibold text-stone-900 shadow-sm hover:bg-[#D9A307]"
                      : "border border-stone-200 bg-white font-medium text-stone-700 hover:border-[#C9D2C4] hover:bg-[#EEF1E9] hover:text-[#3B4A3E]"
                  }`}
                >
                  {category.label}
                </Link>
              );
            })}
          </div>

          <Link
            href="/properties"
            className="inline-flex shrink-0 items-center gap-2 self-start text-sm font-semibold text-[#1C1917] transition hover:text-[#4A5D4E] hover:underline sm:self-auto"
          >
            See All
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Property cards */}
        {properties.length === 0 ? (
          <div className="rounded-3xl border border-stone-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF1E9] text-[#4A5D4E]">
              <Building2 size={28} />
            </div>

            <h3 className="text-xl font-bold text-stone-900">
              No stays found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
              Try a different destination or property category to discover
              more places to stay.
            </p>

            <Link
              href="/#stays"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#4A5D4E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3B4A3E]"
            >
              Explore all stays
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => {
              const firstRate = property.roomTypes
                .flatMap((room) => room.ratePlans)
                .sort(
                  (a, b) =>
                    Number(a.basePrice) - Number(b.basePrice),
                )[0];

              const coverPhoto =
                property.photos.find((photo) => photo.isCover) ??
                property.photos[0];

              const imageUrl = coverPhoto?.publicUrl ?? null;

              const isVerified =
                property.verificationStatus ===
                VerificationStatus.VERIFIED;

              const locationLabel = [
                property.location.city,
                property.location.region,
              ]
                .filter(Boolean)
                .join(", ") || "Ethiopia";

              const propertyTypeLabel =
                PROPERTY_TYPES.find(
                  (item) => item.value === property.propertyType,
                )?.label ?? "Accommodation";

              return (
                <article
                  key={property.id}
                  className="group relative flex h-[420px] flex-col justify-between overflow-hidden rounded-3xl bg-stone-900 p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:p-6"
                >
                  {/* Property photography */}
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={coverPhoto?.altText || property.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#657461] via-[#39493D] to-stone-900" />
                  )}

                  {/* Atmospheric image overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/25 to-stone-950/10" />

                  <div className="absolute inset-0 bg-gradient-to-r from-stone-950/15 to-transparent" />

                  {/* Card top */}
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
                        {propertyTypeLabel}
                      </span>

                      {isVerified && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/85 px-3 py-1.5 text-xs font-semibold text-[#3B4A3E] shadow-sm backdrop-blur-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#4A5D4E]" />
                          Verified
                        </span>
                      )}
                    </div>

                    {/* Wishlist entry point */}
                    <Link
                      href="/login"
                      aria-label={`Log in to save ${property.name} to your wishlist`}
                      title="Log in to save this stay"
                      className="flex h-9 w-10 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/80 text-stone-800 shadow-md backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-[#EAB308] hover:text-stone-900"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
                      </svg>
                    </Link>
                  </div>

                  {/* Card bottom content */}
                  <div className="relative z-10">
                    <p className="mb-2 flex items-center gap-1.5 text-sm text-stone-300">
                      <MapPin
                        size={14}
                        className="shrink-0 text-[#EAB308]"
                      />
                      <span className="truncate">{locationLabel}</span>
                    </p>

                    <h3 className="mb-2 line-clamp-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
                      {property.name}
                    </h3>

                    <p className="mb-5 line-clamp-2 text-sm leading-5 text-stone-300">
                      {property.description ||
                        "Discover this accommodation and its facilities for your next stay."}
                    </p>

                    {/* Price and action */}
                    <div className="flex items-end justify-between gap-3 border-t border-white/25 pt-4">
                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-stone-300">
                          {firstRate ? "Starting from" : "Pricing"}
                        </p>

                        <p className="break-words text-lg font-extrabold tracking-tight text-[#EAB308] sm:text-xl">
                          {firstRate
                            ? `ETB ${formatPrice(Number(firstRate.basePrice))}`
                            : "View rates"}
                        </p>

                        {firstRate && (
                          <p className="mt-0.5 text-xs text-stone-300">
                            per night
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/properties/${property.id}`}
                        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition hover:border-[#EAB308] hover:bg-[#EAB308] hover:text-stone-900 sm:text-sm"
                      >
                        View stay
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>


      {/* Footer */}
      <footer
        id="about"
        className="border-t border-[#E8DCCB] bg-[#F9F8F5]"
      >
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-8 lg:px-12">
          <Link
            href="/"
            className="text-lg font-extrabold tracking-tight text-[#1C1917]"
          >
            <span className="text-[#4A5D4E]">Ethiopian</span>
            Booking<span className="text-[#D97706]">.</span>
          </Link>

          <p className="text-sm text-[#78716C]">
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
    </main>
  );
}
