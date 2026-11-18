"use client";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";



type BookingGuest = {

  firstName: string;

  lastName: string;

  email: string;

  phone: string;

  countryCode: string;

  ageAtBooking?: number | null;

};



type CheckoutBookingSummary = {
  bookingReference: string;
  status: string;
  paymentStatus: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guestCount: number;
  currency: string;
  subtotal: string | number;
  discountAmount: string | number;
  taxAmount: string | number;
  paymentFee: string | number;
  totalAmount: string | number;
  expiresAt: string | null;
  items: {
    roomName: string;
    ratePlanName: string;
    quantity: number;
    pricePerNight: string | number;
    subtotal: string | number;
    roomType: { additionalRules: string | null; childPolicy: string | null; smokingPolicy: string | null; property: { name: string; checkInTime: string | null; checkOutTime: string | null } };
    ratePlan: { cancellationPolicy: string; cancellationDeadlineHours: number | null; cancellationFeePercent: string | number | null };
  }[];
};

type CustomerProfile = {

  firstName?: string | null;

  lastName?: string | null;

  email?: string | null;

  phone?: string | null;

};



const inputClass =

  "block w-full min-w-0 rounded-xl border border-[#e4e3d9] bg-white px-4 py-3.5 text-[15px] text-[#24271f] outline-none transition placeholder:text-[#a4a69d] hover:border-[#c9cdbd] focus:border-[#719c35] focus:ring-4 focus:ring-[#a3e635]/20 disabled:bg-[#f5f4ef]";



const labelClass =

  "mb-2 block text-sm font-semibold text-[#42473b]";



const sectionClass =

  "rounded-2xl border border-[#e9e6dc] bg-white p-5 shadow-[0_3px_18px_rgba(35,39,27,0.035)] sm:p-7";



function formatDate(dateString: string) {

  if (!dateString) return "Not selected";



  const date = new Date(`${dateString}T00:00:00`);



  if (Number.isNaN(date.getTime())) return dateString;



  return new Intl.DateTimeFormat("en", {

    weekday: "short",

    day: "numeric",

    month: "short",

    year: "numeric",

  }).format(date);

}



function getNightCount(

  checkInDate: string,

  checkOutDate: string

) {

  if (!checkInDate || !checkOutDate) return 0;



  const checkIn = new Date(`${checkInDate}T00:00:00Z`);

  const checkOut = new Date(`${checkOutDate}T00:00:00Z`);

  const difference = checkOut.getTime() - checkIn.getTime();



  if (difference <= 0) return 0;



  return Math.round(difference / 86_400_000);

}



function makeEmptyGuest(): BookingGuest {

  return {

    firstName: "",

    lastName: "",

    email: "",

    phone: "",

    countryCode: "+251",

  };

}



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

    <div className="flex items-start gap-3.5">

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4e5] text-sm font-bold text-[#46652e]">

        {number}

      </div>

      <div className="min-w-0 pt-0.5">

        <h2 className="text-lg font-bold tracking-tight text-[#292d23] sm:text-xl">

          {title}

        </h2>

        <p className="mt-1 text-sm leading-5 text-[#777b70]">

          {description}

        </p>

      </div>

    </div>

  );

}



function FieldHint({ children }: { children: React.ReactNode }) {

  return (

    <span className="ml-1 text-xs font-normal text-[#92958a]">

      {children}

    </span>

  );

}



function CheckIcon() {

  return (

    <svg

      aria-hidden="true"

      viewBox="0 0 24 24"

      fill="none"

      className="h-4 w-4"

    >

      <path

        d="m5 12 4 4L19 6"

        stroke="currentColor"

        strokeWidth="2"

        strokeLinecap="round"

        strokeLinejoin="round"

      />

    </svg>

  );

}



  function BookingPageContent() {

  const searchParams = useSearchParams();

  const router = useRouter();



  const propertyId = searchParams.get("propertyId") || "";

  const bookingId = searchParams.get("bookingId") || "";

  const roomTypeId = searchParams.get("roomTypeId") || "";

  const ratePlanId = searchParams.get("ratePlanId") || "";

  const checkInDate = searchParams.get("checkIn") || "";

  const checkOutDate = searchParams.get("checkOut") || "";



  const rooms = Number(searchParams.get("rooms") || "1");

  const adults = Number(searchParams.get("adults") || "1");

  const children = Number(searchParams.get("children") || "0");

  const childAges = useMemo(() => {
    const raw = searchParams.get("childAges") || "";
    return raw ? raw.split(",").map((age) => Number(age)).slice(0, children) : [];
  }, [searchParams, children]);

  // URL parsing is inexpensive, so compute this value directly rather than memoizing it.
  const roomItems = (() => {
    const raw = searchParams.get("roomItems");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) =>
        typeof item.roomTypeId === "string" &&
        typeof item.ratePlanId === "string" &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
      ).map((item) => ({
        roomTypeId: item.roomTypeId,
        ratePlanId: item.ratePlanId,
        quantity: item.quantity,
      }));
    } catch {
      return [];
    }
  })();



  const selectedRoomCount = roomItems.length
    ? roomItems.reduce((sum, item) => sum + item.quantity, 0)
    : rooms;

  const totalGuests = adults + children;

  const nights = getNightCount(checkInDate, checkOutDate);



  const [checkingAuth, setCheckingAuth] = useState(true);

  const [customerFirstName, setCustomerFirstName] = useState("");

  const [customerLastName, setCustomerLastName] = useState("");

  const [customerEmail, setCustomerEmail] = useState("");

  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCountry, setCustomerCountry] = useState("");

  const [specialRequests, setSpecialRequests] = useState("");
  const [specialRequestCategories, setSpecialRequestCategories] = useState<string[]>([]);



  const [guestDetails, setGuestDetails] = useState<BookingGuest[]>(

    () =>

      Array.from(

        { length: Math.max(0, Math.min(totalGuests, 30)) },

        (_, index) => ({
          ...makeEmptyGuest(),
          ageAtBooking: index >= adults && index < adults + children
            ? childAges[index - adults] ?? null
            : null,
        })

      )

  );



  const [submitting, setSubmitting] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const [error, setError] = useState("");
  const [bookingSummary, setBookingSummary] = useState<CheckoutBookingSummary | null>(null);
  const [bookingSummaryLoading, setBookingSummaryLoading] = useState(true);
  const [holdTimeRemaining, setHoldTimeRemaining] = useState<number | null>(null);

  const [showAllGuestFields, setShowAllGuestFields] = useState(false);



  const hasRequiredBookingData = useMemo(

    () =>

      Boolean(

        propertyId &&

          bookingId &&

          (roomItems.length > 0 || Boolean(roomTypeId && ratePlanId)) &&

          checkInDate &&

          checkOutDate &&

          nights > 0 &&

          Number.isInteger(selectedRoomCount) &&

          selectedRoomCount > 0 &&

          selectedRoomCount <= 30 &&

          Number.isInteger(adults) &&

          adults > 0 &&

          Number.isInteger(children) &&

          children >= 0 &&

          totalGuests > 0 &&

          totalGuests <= 30

      ),

    [

      propertyId,

      bookingId,

      roomTypeId,

      ratePlanId,

      roomItems,

      checkInDate,

      checkOutDate,

      nights,

      selectedRoomCount,

      adults,

      children,

      totalGuests,

    ]

  );



  useEffect(() => {
    let cancelled = false;
    async function loadBookingSummary() {
      if (!bookingId) { setBookingSummaryLoading(false); return; }
      try {
        const response = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Unable to load your held booking.");
        if (!cancelled) setBookingSummary(result.data);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load your booking review.");
      } finally {
        if (!cancelled) setBookingSummaryLoading(false);
      }
    }
    loadBookingSummary();
    return () => { cancelled = true; };
  }, [bookingId]);

  useEffect(() => {
    if (!bookingSummary?.expiresAt) return;
    const updateRemaining = () => {
      setHoldTimeRemaining(Math.max(0, new Date(bookingSummary.expiresAt!).getTime() - Date.now()));
    };
    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(interval);
  }, [bookingSummary?.expiresAt]);

  useEffect(() => {

    let cancelled = false;



    async function checkAuthentication() {

      try {

        const supabase = createClient();

        const {

          data: { user },

          error: authError,

        } = await supabase.auth.getUser();



        if (authError) {

          throw new Error(

            "Unable to verify your account. Please try again."

          );

        }



        if (!user) {

          const currentUrl = `/booking?${searchParams.toString()}`;



          router.replace(

            `/login?next=${encodeURIComponent(currentUrl)}`

          );

          return;

        }



        const profileResponse = await fetch(

          "/api/customer/profile",

          { cache: "no-store" }

        );



        let profile: CustomerProfile = {

          email: user.email ?? "",

        };



        if (profileResponse.ok) {

          const profileResult = await profileResponse.json();



          if (profileResult.success && profileResult.data) {

            profile = {

              firstName: profileResult.data.firstName ?? "",

              lastName: profileResult.data.lastName ?? "",

              email:

                profileResult.data.email ?? user.email ?? "",

              phone: profileResult.data.phone ?? "",

            };

          }

        }



        if (cancelled) return;



        setCustomerFirstName(profile.firstName ?? "");

        setCustomerLastName(profile.lastName ?? "");

        setCustomerEmail(profile.email ?? user.email ?? "");

        setCustomerPhone(profile.phone ?? "");



        setGuestDetails((currentGuests) =>

          currentGuests.map((guest, index) =>

            index === 0

              ? {

                  ...guest,

                  firstName: profile.firstName ?? "",

                  lastName: profile.lastName ?? "",

                  email: profile.email ?? user.email ?? "",

                  phone: profile.phone ?? "",

                }

              : guest

          )

        );

      } catch (authError) {

        if (!cancelled) {

          setError(

            authError instanceof Error

              ? authError.message

              : "Unable to check your account."

          );

        }

      } finally {

        if (!cancelled) setCheckingAuth(false);

      }

    }



    checkAuthentication();



    return () => {

      cancelled = true;

    };

  }, [router, searchParams]);
const guestDetailsForForm = useMemo(() => {
  const safeGuestCount = Math.max(
    0,
    Math.min(totalGuests, 30)
  );

  if (guestDetails.length >= safeGuestCount) {
    return guestDetails.slice(0, safeGuestCount);
  }

  return [
    ...guestDetails,
    ...Array.from(
      {
        length: safeGuestCount - guestDetails.length,
      },
      () => makeEmptyGuest()
    ),
  ];
}, [guestDetails, totalGuests]);
  function updateGuest(

    index: number,

    field: keyof BookingGuest,

    value: string | number | null

  ) {

    setGuestDetails((currentGuests) => {
      const nextGuests = [...currentGuests];

      while (nextGuests.length <= index) {
        nextGuests.push(makeEmptyGuest());
      }

      nextGuests[index] = {
        ...nextGuests[index],
        [field]: value,
      } as BookingGuest;

      return nextGuests;
    });

  }



  async function handleSubmit(

    event: FormEvent<HTMLFormElement>

  ) {

    event.preventDefault();

    setError("");



    if (!hasRequiredBookingData) {

      setError(

        "Your booking details are incomplete. Return to the property page and select your room, dates, and guests again."

      );

      return;

    }



    if (!customerFirstName.trim()) {

      setError("Please enter your first name.");

      return;

    }



    if (!customerLastName.trim()) {

      setError("Please enter your last name.");

      return;

    }



    if (!customerEmail.trim()) {

      setError("Please enter your email address.");

      return;

    }

    if (!customerCountry.trim()) {
      setError("Please enter your country of residence.");
      return;
    }



    if (guestDetailsForForm.length !== totalGuests) {

      setError("Please check the guest details and try again.");

      return;

    }



    if (guestDetailsForForm.slice(adults, adults + children).some((guest) => !Number.isInteger(guest.ageAtBooking) || guest.ageAtBooking! < 0 || guest.ageAtBooking! > 17)) {
      setError("Please select an age for every child.");
      return;
    }

    if (

      guestDetails.some((guest) => !guest.firstName.trim())

    ) {

      setError("Please enter the first name for every guest.");

      return;

    }



    if (checkoutStep === 1) {
      setCheckoutStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!bookingSummary) {
      setError("Your room hold or final price could not be verified. Please return to the property and start again.");
      return;
    }

    if (!acceptedPolicies) {
      setError("Please accept the cancellation policy, property rules and platform terms to continue.");
      return;
    }

    setSubmitting(true);



    try {

      const profileResponse = await fetch(

        "/api/customer/profile",

        {

          method: "PATCH",

          headers: {

            "Content-Type": "application/json",

          },

          body: JSON.stringify({

            firstName: customerFirstName.trim(),

            lastName: customerLastName.trim(),

            phone: customerPhone.trim(),

          }),

        }

      );



      if (!profileResponse.ok) {

        const profileResult = await profileResponse

          .json()

          .catch(() => ({}));



        throw new Error(

          profileResult.error ||

            "Unable to save your profile details."

        );

      }



      const response = await fetch("/api/bookings", {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          bookingId,
          roomTypeId,

          ratePlanId,
          roomItems: roomItems.length ? roomItems : undefined,

          checkInDate,

          checkOutDate,

          quantity: rooms,

          guests: totalGuests,

          adults,

          children,

          guestDetails: guestDetailsForForm.map((guest) => ({

            firstName: guest.firstName.trim(),

            lastName: guest.lastName.trim(),

            email: guest.email.trim(),

            phone: guest.phone.trim(),

            countryCode: guest.countryCode,

            ageAtBooking: guest.ageAtBooking,

          })),

          customerFirstName: customerFirstName.trim(),

          customerLastName: customerLastName.trim(),

          customerEmail: customerEmail.trim(),

          customerPhone: customerPhone.trim(),

          customerCountry: customerCountry.trim(),

          specialRequests: [...specialRequestCategories.map((category) => `[${category}]`), specialRequests.trim()].filter(Boolean).join(" · "),

        }),

      });



      const result = await response.json();



      if (!response.ok || !result.success) {

        throw new Error(

          result.error || "Unable to create your booking."

        );

      }



      if (!result.data?.bookingId) {

        throw new Error(

          "The booking response did not include a booking reference."

        );

      }



      const paymentResponse = await fetch("/api/payments/chapa/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: result.data.bookingId }),
      });
      const paymentResult = await paymentResponse.json();
      if (!paymentResponse.ok || !paymentResult.success || !paymentResult.checkoutUrl) {
        throw new Error(paymentResult.error || "Unable to start Chapa payment. Your room hold remains active until it expires.");
      }

      window.location.href = paymentResult.checkoutUrl;

    } catch (submitError) {

      setError(

        submitError instanceof Error

          ? submitError.message

          : "Unable to create your booking."

      );

    } finally {

      setSubmitting(false);

    }

  }



  if (checkingAuth) {

    return (

      <main className="flex min-h-screen items-center justify-center bg-[#faf9f5] px-4 py-12 text-[#292d23]">

        <div className="w-full max-w-md rounded-3xl border border-[#e9e6dc] bg-white p-9 text-center shadow-sm">

          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf4e5]">

            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#dce5d1] border-t-[#628a35]" />

          </div>

          <h1 className="text-xl font-bold">Getting things ready</h1>

          <p className="mt-2 text-sm leading-6 text-[#777b70]">

            We’re preparing your booking details.

          </p>

        </div>

      </main>

    );

  }



  if (!hasRequiredBookingData) {

    return (

      <main className="flex min-h-screen items-center justify-center bg-[#faf9f5] px-4 py-12 text-[#292d23]">

        <div className="w-full max-w-lg rounded-3xl border border-[#e9e6dc] bg-white p-7 shadow-sm sm:p-9">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">

            <svg

              aria-hidden="true"

              viewBox="0 0 24 24"

              fill="none"

              className="h-6 w-6"

            >

              <path

                d="M12 8v5m0 3h.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z"

                stroke="currentColor"

                strokeWidth="1.7"

                strokeLinecap="round"

                strokeLinejoin="round"

              />

            </svg>

          </div>

          <h1 className="mt-5 text-2xl font-bold">

            Let’s select your stay again

          </h1>

          <p className="mt-2 text-sm leading-6 text-[#777b70]">

            Some booking details are missing or invalid. Return to

            the property page and choose your room, dates, and guests.

          </p>

          <button

            type="button"

            onClick={() => router.back()}

            className="mt-6 rounded-xl bg-[#a3e635] px-5 py-3.5 text-sm font-bold text-[#26331d] transition hover:bg-[#91d52b] focus:outline-none focus:ring-4 focus:ring-lime-200"

          >

            Return to property

          </button>

        </div>

      </main>

    );

  }



  return (

    <main className="min-h-screen bg-[#faf9f5] text-[#292d23]">

      <header className="sticky top-0 z-30 border-b border-[#e9e4d8] bg-[#faf9f5]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="EthiopianBooking home">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#a3e635] text-lg font-black text-[#29351d] shadow-sm">E</span>
            <span className="text-lg font-extrabold tracking-tight sm:text-xl">
              Ethiopian<span className="text-[#718344]">Booking</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-medium text-[#777a6e] sm:gap-3 sm:text-sm">
            <span className="hidden sm:inline">Your trip, all in one place</span>
            <span className="h-1 w-1 rounded-full bg-[#a3e635]" />
            <span>Your details</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        <div className="mb-7 sm:mb-9">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dce8d0] bg-[#f0f6e9] px-3 py-1.5 text-xs font-semibold text-[#506d38]">
              <CheckIcon />
              Your next stay starts here
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-[#292d23] sm:text-4xl lg:text-[42px]">
              Let’s get your stay <span className="text-[#648c38]">ready.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#777b70] sm:text-base">
              Add your details so we can prepare your booking. You can review everything before completing payment.
            </p>
          </div>
          <div className="mt-7 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {[
              { number: "01", title: "Your stay", state: "complete" },
              { number: "02", title: "Your details", state: "active" },
              { number: "03", title: "Payment", state: "upcoming" },
              { number: "04", title: "Confirmation", state: "upcoming" },
            ].map((step) => (
              <div key={step.number} aria-current={step.state === "active" ? "step" : undefined}>
                <div className={`h-1.5 rounded-full ${step.state !== "upcoming" ? "bg-[#a3e635]" : "bg-[#e7e6de]"}`} />
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-[10px] font-bold tracking-wider sm:text-xs ${step.state !== "upcoming" ? "text-[#5d8137]" : "text-[#999b92]"}`}>
                    {step.number}
                  </span>
                  <span className={`text-[11px] font-semibold sm:text-xs ${step.state !== "upcoming" ? "text-[#42473b]" : "text-[#92958a]"}`}>
                    {step.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form

          onSubmit={handleSubmit}

          className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px] xl:gap-7"

        >

          <div className="min-w-0 space-y-5">

            {/* Stay details */}

            <section className={sectionClass}>

              <SectionHeading

                number="01"

                title="Your stay"

                description="Here’s what you selected. Make sure your dates look right."

              />



              <div className="mt-6 rounded-2xl border border-[#e8e6dc] bg-[#faf9f5] p-4 sm:p-5">

                <div className="grid grid-cols-2 gap-4">

                  <div className="min-w-0">

                    <p className="text-xs font-medium text-[#85897b]">

                      CHECK-IN

                    </p>

                    <p className="mt-2 break-words text-sm font-bold leading-5 text-[#30352a] sm:text-base">

                      {formatDate(checkInDate)}

                    </p>

                    <p className="mt-1 text-xs text-[#85897b]">

                      Arrival

                    </p>

                  </div>



                  <div className="min-w-0 border-l border-[#e5e3d8] pl-4">

                    <p className="text-xs font-medium text-[#85897b]">

                      CHECK-OUT

                    </p>

                    <p className="mt-2 break-words text-sm font-bold leading-5 text-[#30352a] sm:text-base">

                      {formatDate(checkOutDate)}

                    </p>

                    <p className="mt-1 text-xs text-[#85897b]">

                      Departure

                    </p>

                  </div>

                </div>



                <div className="mt-5 flex flex-wrap gap-2 border-t border-[#e5e3d8] pt-4">

                  <span className="inline-flex items-center gap-2 rounded-full border border-[#e5e3d8] bg-white px-3 py-2 text-xs font-semibold text-[#505747]">

                    <svg

                      aria-hidden="true"

                      viewBox="0 0 24 24"

                      fill="none"

                      className="h-4 w-4 text-[#708b4f]"

                    >

                      <circle

                        cx="12"

                        cy="12"

                        r="9"

                        stroke="currentColor"

                        strokeWidth="1.6"

                      />

                      <path

                        d="M12 7v5l3 2"

                        stroke="currentColor"

                        strokeWidth="1.6"

                        strokeLinecap="round"

                      />

                    </svg>

                    {nights} {nights === 1 ? "night" : "nights"}

                  </span>



                  <span className="inline-flex items-center gap-2 rounded-full border border-[#e5e3d8] bg-white px-3 py-2 text-xs font-semibold text-[#505747]">

                    <svg

                      aria-hidden="true"

                      viewBox="0 0 24 24"

                      fill="none"

                      className="h-4 w-4 text-[#708b4f]"

                    >

                      <rect

                        x="3"

                        y="8"

                        width="18"

                        height="11"

                        rx="2"

                        stroke="currentColor"

                        strokeWidth="1.6"

                      />

                      <path

                        d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M3 13h18"

                        stroke="currentColor"

                        strokeWidth="1.6"

                      />

                    </svg>

                    {rooms} {rooms === 1 ? "room" : "rooms"}

                  </span>



                  <span className="inline-flex items-center gap-2 rounded-full border border-[#e5e3d8] bg-white px-3 py-2 text-xs font-semibold text-[#505747]">

                    <svg

                      aria-hidden="true"

                      viewBox="0 0 24 24"

                      fill="none"

                      className="h-4 w-4 text-[#708b4f]"

                    >

                      <circle

                        cx="9"

                        cy="8"

                        r="3.5"

                        stroke="currentColor"

                        strokeWidth="1.6"

                      />

                      <path

                        d="M2.5 20a6.5 6.5 0 0 1 13 0M17 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3.5 4.8"

                        stroke="currentColor"

                        strokeWidth="1.6"

                        strokeLinecap="round"

                      />

                    </svg>

                    {totalGuests}{" "}

                    {totalGuests === 1 ? "guest" : "guests"}

                  </span>

                </div>

              </div>

            </section>



            {/* Contact information */}

            <section className={sectionClass}>

              <SectionHeading

                number="02"

                title="Your contact details"

                description="Your account details are filled in when available. Just check them."

              />



              <div className="mt-6 rounded-xl border border-[#dfe9d5] bg-[#f5f8f0] px-4 py-3">

                <div className="flex items-start gap-3">

                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e2efd5] text-[#537633]">

                    <CheckIcon />

                  </div>

                  <div>

                    <p className="text-sm font-semibold text-[#405b2e]">

                      Booking updates in one place

                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#68745e]">

                      Double-check your email so your booking

                      information reaches you.

                    </p>

                  </div>

                </div>

              </div>



              <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">

                <div>

                  <label htmlFor="first-name" className={labelClass}>

                    First name <span className="text-red-500">*</span>

                  </label>

                  <input

                    id="first-name"

                    name="firstName"

                    autoComplete="given-name"

                    value={customerFirstName}

                    onChange={(event) =>

                      setCustomerFirstName(event.target.value)

                    }

                    required

                    maxLength={100}

                    className={inputClass}

                    placeholder="e.g. Tewodros"

                  />

                </div>



                <div>

                  <label htmlFor="last-name" className={labelClass}>

                    Last name <span className="text-red-500">*</span>

                  </label>

                  <input

                    id="last-name"

                    name="lastName"

                    autoComplete="family-name"

                    value={customerLastName}

                    onChange={(event) =>

                      setCustomerLastName(event.target.value)

                    }

                    required

                    maxLength={100}

                    className={inputClass}

                    placeholder="e.g. Abraham"

                  />

                </div>



                <div>

                  <label htmlFor="email" className={labelClass}>

                    Email address <span className="text-red-500">*</span>

                  </label>

                  <input

                    id="email"

                    name="email"

                    type="email"

                    autoComplete="email"

                    value={customerEmail}

                    onChange={(event) =>

                      setCustomerEmail(event.target.value)

                    }

                    required

                    maxLength={254}

                    className={inputClass}

                    placeholder="you\@example.com"

                  />

                  <p className="mt-2 text-xs leading-5 text-[#85897d]">

                    Used for your booking updates.

                  </p>

                </div>



                <div>

                  <label htmlFor="phone" className={labelClass}>

                    Phone number <FieldHint>(optional)</FieldHint>

                  </label>

                  <input

                    id="phone"

                    name="phone"

                    type="tel"

                    autoComplete="tel"

                    value={customerPhone}

                    onChange={(event) =>

                      setCustomerPhone(event.target.value)

                    }

                    maxLength={30}

                    className={inputClass}

                    placeholder="+251 9..."

                  />

                  <p className="mt-2 text-xs leading-5 text-[#85897d]">

                    Include your country code if possible.

                  </p>

                </div>

                <div className="mt-4">
                  <label htmlFor="customer-country" className={labelClass}>Country of residence <span className="text-red-500">*</span></label>
                  <input id="customer-country" name="customerCountry" value={customerCountry} onChange={(event) => setCustomerCountry(event.target.value)} required maxLength={80} className={inputClass} placeholder="e.g. Ethiopia" autoComplete="country-name" />
                </div>

              </div>

            </section>



            {/* Guests */}

            <section className={sectionClass}>

              <SectionHeading

                number="03"

                title="Who’s staying?"

                description="Enter each guest’s first name. You can leave the other details blank."

              />



              <div className="mt-6 space-y-3">

                {guestDetails.map((guest, index) => (

                  <div

                    key={index}

                    className="overflow-hidden rounded-2xl border border-[#e9e6dc] bg-white"

                  >

                    <div className="flex items-center gap-3 border-b border-[#eeece5] bg-[#fbfaf7] px-4 py-3.5 sm:px-5">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf2df] text-sm font-bold text-[#4c6b32]">

                        {index + 1}

                      </div>



                      <div className="min-w-0 flex-1">

                        <h3 className="text-sm font-bold text-[#30352a]">

                          {index === 0

                            ? "Main guest"

                            : `Guest ${index + 1}`}

                        </h3>

                        <p className="mt-0.5 text-xs text-[#85897d]">

                          {index === 0

                            ? "The person making this reservation"

                            : "Another person staying with you"}

                        </p>

                      </div>



                      {guest.firstName.trim() && (

                        <span className="inline-flex items-center gap-1 rounded-full bg-[#edf5e6] px-2.5 py-1 text-[11px] font-semibold text-[#4b6d31]">

                          <CheckIcon />

                          Added

                        </span>

                      )}

                    </div>



                    <div className="grid gap-x-4 gap-y-4 p-4 sm:grid-cols-2 sm:p-5">
                      {index >= adults && index < adults + children && (
                        <div className="sm:col-span-2">
                          <label htmlFor={`guest-${index}-age`} className={labelClass}>Child age <span className="text-red-500">*</span></label>
                          <select id={`guest-${index}-age`} value={guest.ageAtBooking ?? ""} onChange={(event) => updateGuest(index, "ageAtBooking", event.target.value === "" ? null : Number(event.target.value))} className={inputClass} required>
                            <option value="">Select child age</option>
                            {Array.from({ length: 18 }, (_, age) => <option key={age} value={age}>{age} {age === 1 ? "year" : "years"}</option>)}
                          </select>
                        </div>
                      )}

                      <div>

                        <label

                          htmlFor={`guest-${index}-first-name`}

                          className={labelClass}

                        >

                          First name{" "}

                          <span className="text-red-500">*</span>

                        </label>

                        <input

                          id={`guest-${index}-first-name`}

                          name={`guest-${index}-first-name`}

                          autoComplete="off"

                          value={guest.firstName}

                          onChange={(event) =>

                            updateGuest(

                              index,

                              "firstName",

                              event.target.value

                            )

                          }

                          required

                          maxLength={100}

                          className={inputClass}

                          placeholder="Guest first name"

                        />

                      </div>



                      <div>

                        <label

                          htmlFor={`guest-${index}-last-name`}

                          className={labelClass}

                        >

                          Last name <FieldHint>(optional)</FieldHint>

                        </label>

                        <input

                          id={`guest-${index}-last-name`}

                          name={`guest-${index}-last-name`}

                          autoComplete="off"

                          value={guest.lastName}

                          onChange={(event) =>

                            updateGuest(

                              index,

                              "lastName",

                              event.target.value

                            )

                          }

                          maxLength={100}

                          className={inputClass}

                          placeholder="Guest last name"

                        />

                      </div>



                      {showAllGuestFields && (

                        <>

                          <div>

                            <label

                              htmlFor={`guest-${index}-email`}

                              className={labelClass}

                            >

                              Email <FieldHint>(optional)</FieldHint>

                            </label>

                            <input

                              id={`guest-${index}-email`}

                              name={`guest-${index}-email`}

                              type="email"

                              autoComplete="off"

                              value={guest.email}

                              onChange={(event) =>

                                updateGuest(

                                  index,

                                  "email",

                                  event.target.value

                                )

                              }

                              maxLength={254}

                              className={inputClass}

                              placeholder="guest\@example.com"

                            />

                          </div>



                          <div>

                            <label

                              htmlFor={`guest-${index}-phone`}

                              className={labelClass}

                            >

                              Phone number{" "}

                              <FieldHint>(optional)</FieldHint>

                            </label>

                            <input

                              id={`guest-${index}-phone`}

                              name={`guest-${index}-phone`}

                              type="tel"

                              autoComplete="off"

                              value={guest.phone}

                              onChange={(event) =>

                                updateGuest(

                                  index,

                                  "phone",

                                  event.target.value

                                )

                              }

                              maxLength={30}

                              className={inputClass}

                              placeholder="Guest phone number"

                            />

                          </div>

                        </>

                      )}

                    </div>

                  </div>

                ))}

              </div>



              <button

                type="button"

                onClick={() =>

                  setShowAllGuestFields((current) => !current)

                }

                className="mt-4 inline-flex items-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#5b7e36] transition hover:text-[#3e5c23]"

                aria-expanded={showAllGuestFields}

              >

                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#dce7d0]">

                  {showAllGuestFields ? "−" : "+"}

                </span>

                {showAllGuestFields

                  ? "Hide optional guest contact fields"

                  : "Add guest emails and phone numbers"}

              </button>



              <p className="mt-1 text-xs leading-5 text-[#85897d]">

                You only need each guest’s first name to continue.

              </p>

            </section>



            {/* Special requests */}

            <section className={sectionClass}>

              <SectionHeading

                number="04"

                title="Anything else?"

                description="Let the property know if there’s something that would make your stay easier."

              />



              <fieldset className="mt-5">
                <legend className="mb-3 text-sm font-semibold text-[#44403C]">Request categories <span className="font-normal text-[#92958a]">(optional)</span></legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {["Late arrival", "Accessibility", "Bed preference", "Celebration", "Dietary request", "Other"].map((category) => (
                    <label key={category} className="flex items-center gap-2 rounded-xl border border-[#e9e6dc] px-3 py-2.5 text-xs font-medium text-[#57534E]">
                      <input type="checkbox" checked={specialRequestCategories.includes(category)} onChange={(event) => setSpecialRequestCategories((current) => event.target.checked ? [...current, category] : current.filter((item) => item !== category))} className="h-4 w-4 accent-[#4A5D4E]" />
                      {category}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label htmlFor="special-requests" className="sr-only">

                Special requests

              </label>

              <textarea

                id="special-requests"

                name="specialRequests"

                value={specialRequests}

                onChange={(event) =>

                  setSpecialRequests(event.target.value)

                }

                rows={3}

                maxLength={2000}

                placeholder="For example, a late arrival or accessibility request..."

                className={`${inputClass} mt-5 resize-y`}

              />



              <div className="mt-2 flex items-center justify-between gap-3">

                <p className="text-xs leading-5 text-[#85897d]">

                  Requests are not guaranteed and may be accepted, declined or left pending by the property.

                </p>

                <span className="shrink-0 text-xs tabular-nums text-[#85897d]">

                  {specialRequests.length}/2000

                </span>

              </div>

            </section>



            {checkoutStep === 2 && (
              <section className={sectionClass}>
                <SectionHeading number="05" title="Final review" description="Review your stay and the important conditions before continuing to payment." />
                <div className="mt-5 space-y-3 rounded-xl bg-[#faf9f5] p-4 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-[#777b70]">Property</span><span className="font-semibold text-[#30352a]">{bookingSummary?.items[0]?.roomType.property.name ?? "Loading property…"}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-[#777b70]">Dates</span><span className="font-semibold text-[#30352a]">{formatDate(checkInDate)} – {formatDate(checkOutDate)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-[#777b70]">Guests</span><span className="font-semibold text-[#30352a]">{adults} adults · {children} children</span></div>
                  <div className="flex justify-between gap-3"><span className="text-[#777b70]">Country of residence</span><span className="font-semibold text-[#30352a]">{customerCountry}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-[#777b70]">Primary guest</span><span className="font-semibold text-[#30352a]">{customerFirstName} {customerLastName}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-[#777b70]">Email</span><span className="font-semibold text-[#30352a]">{customerEmail}</span></div>
                  {customerPhone && <div className="flex justify-between gap-3"><span className="text-[#777b70]">Phone</span><span className="font-semibold text-[#30352a]">{customerPhone}</span></div>}
                  <div className="border-t border-[#e9e6dc] pt-3">
                    <p className="mb-2 font-semibold text-[#30352a]">Guest names</p>
                    {guestDetailsForForm.map((guest, index) => (
                      <p key={index} className="py-1 text-[#62665b]">{guest.firstName} {guest.lastName}{index >= adults ? ` · Child, age ${guest.ageAtBooking}` : index === 0 ? " · Primary guest" : " · Adult"}</p>
                    ))}
                  </div>
                  <div className="flex justify-between gap-3"><span className="text-[#777b70]">Rooms</span><span className="font-semibold text-[#30352a]">{selectedRoomCount}</span></div>
                </div>
                {bookingSummaryLoading ? (
                  <p className="mt-4 text-sm text-gray-500">Loading confirmed room prices and policies…</p>
                ) : bookingSummary ? (
                  <>
                    <div className="mt-4 rounded-xl border border-[#e9e6dc] p-4">
                      <p className="mb-3 text-sm font-bold text-[#30352a]">Selected rooms and rates</p>
                      {bookingSummary.items.map((item, index) => (
                        <div key={index} className="flex justify-between gap-3 border-b border-[#eeece5] py-2 text-sm last:border-0">
                          <span className="text-[#62665b]">{item.quantity} × {item.roomName} · {item.ratePlanName}</span>
                          <span className="shrink-0 font-semibold text-[#30352a]">{Number(item.subtotal).toLocaleString("en-US")} {bookingSummary.currency}</span>
                        </div>
                      ))}
                      <div className="mt-3 space-y-2 border-t border-[#eeece5] pt-3 text-sm">
                        <div className="flex justify-between"><span>Room subtotal</span><span>{Number(bookingSummary.subtotal).toLocaleString("en-US")} {bookingSummary.currency}</span></div>
                        <div className="flex justify-between"><span>Discount</span><span>−{Number(bookingSummary.discountAmount).toLocaleString("en-US")} {bookingSummary.currency}</span></div>
                        <div className="flex justify-between"><span>Taxes</span><span>{Number(bookingSummary.taxAmount).toLocaleString("en-US")} {bookingSummary.currency}</span></div>
                        <div className="flex justify-between"><span>Payment fee</span><span>{Number(bookingSummary.paymentFee).toLocaleString("en-US")} {bookingSummary.currency}</span></div>
                        <div className="flex justify-between border-t border-[#eeece5] pt-2 text-base font-bold text-[#30352a]"><span>Total</span><span>{Number(bookingSummary.totalAmount).toLocaleString("en-US")} {bookingSummary.currency}</span></div>
                      </div>
                    </div>
                    {bookingSummary.expiresAt && holdTimeRemaining !== null && (
                      <p className="text-xs font-semibold text-amber-700">
                        {holdTimeRemaining > 0
                          ? `Time remaining on your room hold: ${Math.floor(holdTimeRemaining / 60000)}:${String(Math.floor((holdTimeRemaining % 60000) / 1000)).padStart(2, "0")}`
                          : "The room hold time has ended. Payment can continue only if Chapa verification is still pending."}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-4 text-sm text-red-600">Your room hold could not be loaded. Return to the property and check availability again.</p>
                )}
                {bookingSummary?.items.map((item, index) => (
                  <div key={index} className="rounded-xl border border-[#e9e6dc] p-4 text-sm leading-6 text-[#62665b]">
                    <p className="font-bold text-[#30352a]">{item.roomName} · Property rules</p>
                    {item.roomType.property.checkInTime && <p>Check-in: {item.roomType.property.checkInTime}</p>}
                    {item.roomType.property.checkOutTime && <p>Check-out: {item.roomType.property.checkOutTime}</p>}
                    {item.roomType.childPolicy && <p>Child policy: {item.roomType.childPolicy}</p>}
                    {item.roomType.smokingPolicy && <p>Smoking: {item.roomType.smokingPolicy.replaceAll("_", " ").toLowerCase()}</p>}
                    {item.roomType.additionalRules && <p>{item.roomType.additionalRules}</p>}
                  </div>
                ))}
                {(specialRequests.trim() || specialRequestCategories.length > 0) && <p className="mt-4 rounded-xl bg-[#faf9f5] p-4 text-sm leading-6 text-[#62665b]"><strong className="text-[#30352a]">Your special requests:</strong> {[...specialRequestCategories, specialRequests.trim()].filter(Boolean).join(" · ")}</p>}
                <div className="mt-4 space-y-3 text-sm leading-6 text-[#62665b]">
                  {bookingSummary?.items.map((item, index) => <p key={index}><strong className="text-[#30352a]">Cancellation policy · {item.ratePlanName}:</strong> {item.ratePlan.cancellationPolicy.replaceAll("_", " ").toLowerCase()}{item.ratePlan.cancellationDeadlineHours !== null ? ` · deadline ${item.ratePlan.cancellationDeadlineHours} hours before check-in` : ""}{item.ratePlan.cancellationFeePercent !== null ? ` · cancellation fee ${item.ratePlan.cancellationFeePercent}%` : ""}.</p>)}
                  <p><strong className="text-[#30352a]">Property rules:</strong> Follow the property&apos;s check-in, check-out, occupancy and conduct rules. Special requests are not guaranteed.</p>
                  <p><strong className="text-[#30352a]">Platform terms:</strong> Your reservation is confirmed only after Chapa payment is successfully verified. An unpaid inventory hold expires after 15 minutes, subject to payment verification.</p>
                </div>
                <label className="mt-5 flex items-start gap-3 rounded-xl border border-[#dce5d1] p-4 text-sm leading-6 text-[#42473b]">
                  <input type="checkbox" checked={acceptedPolicies} onChange={(event) => setAcceptedPolicies(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#4A5D4E]" />
                  <span>I have reviewed and accept the cancellation policy, property rules and EthiopianBooking platform terms.</span>
                </label>
                <button type="button" onClick={() => { setCheckoutStep(1); setError(""); }} className="mt-4 text-sm font-semibold text-[#4A5D4E]">← Back to guest details</button>
              </section>
            )}

            {error && (

              <div

                role="alert"

                className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"

              >

                <p className="font-bold">

                  We couldn’t complete your booking

                </p>

                <p className="mt-1">{error}</p>

              </div>

            )}



            {/* Desktop submit */}

            <div className="hidden lg:block">

              <button

                type="submit"

                disabled={submitting}

                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#a3e635] px-6 py-4 text-base font-bold text-[#27321f] shadow-[0_5px_14px_rgba(117,157,55,0.12)] transition hover:bg-[#94d52c] focus:outline-none focus:ring-4 focus:ring-lime-200 disabled:cursor-not-allowed disabled:opacity-60"

              >

                {submitting ? (

                  <>

                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#26331d]/30 border-t-[#26331d]" />

                    Creating your booking...

                  </>

                ) : (

                  <>

                    {checkoutStep === 1 ? "Continue to final review" : "Confirm and continue to payment"}

                    <svg

                      aria-hidden="true"

                      viewBox="0 0 24 24"

                      fill="none"

                      className="h-5 w-5"

                    >

                      <path

                        d="M5 12h14m-6-6 6 6-6 6"

                        stroke="currentColor"

                        strokeWidth="1.8"

                        strokeLinecap="round"

                        strokeLinejoin="round"

                      />

                    </svg>

                  </>

                )}

              </button>



              <p className="mt-3 text-center text-xs leading-5 text-[#85897d]">

                Please check your details before submitting.

              </p>

            </div>

          </div>



          {/* Booking summary */}

          <aside className="h-fit space-y-4 lg:sticky lg:top-6">

            <section className="overflow-hidden rounded-2xl border border-[#e9e6dc] bg-white shadow-[0_4px_24px_rgba(35,39,27,0.05)]">

              <div className="bg-[#303c29] p-5 text-white sm:p-6">

                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#dce9ce]">

                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">

                    <CheckIcon />

                  </span>

                  YOUR TRIP AT A GLANCE

                </div>

                <h2 className="mt-4 text-xl font-bold tracking-tight">

                  Your booking summary

                </h2>

                <p className="mt-1 text-sm leading-5 text-white/65">

                  Everything you need, all in one place.

                </p>

              </div>



              <div className="p-5 sm:p-6">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-[#85897d]">

                    Check-in

                  </p>

                  <p className="mt-1.5 text-sm font-bold text-[#30352a]">

                    {formatDate(checkInDate)}

                  </p>

                </div>



                <div className="my-4 flex items-center gap-3">

                  <div className="h-px flex-1 bg-[#e9e6dc]" />

                  <span className="rounded-full border border-[#e9e6dc] bg-[#faf9f5] px-3 py-1 text-xs font-semibold text-[#667054]">

                    {nights} {nights === 1 ? "night" : "nights"}

                  </span>

                  <div className="h-px flex-1 bg-[#e9e6dc]" />

                </div>



                <div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-[#85897d]">

                    Check-out

                  </p>

                  <p className="mt-1.5 text-sm font-bold text-[#30352a]">

                    {formatDate(checkOutDate)}

                  </p>

                </div>



                <div className="my-5 border-t border-[#eeece5]" />



                <div className="space-y-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2f1e9] text-[#65764f]">

                      <svg

                        aria-hidden="true"

                        viewBox="0 0 24 24"

                        fill="none"

                        className="h-5 w-5"

                      >

                        <rect

                          x="3"

                          y="8"

                          width="18"

                          height="11"

                          rx="2"

                          stroke="currentColor"

                          strokeWidth="1.6"

                        />

                        <path

                          d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M3 13h18"

                          stroke="currentColor"

                          strokeWidth="1.6"

                        />

                      </svg>

                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="text-xs text-[#85897d]">Rooms</p>

                      <p className="mt-0.5 text-sm font-semibold">

                        {rooms} {rooms === 1 ? "room" : "rooms"}

                      </p>

                    </div>

                  </div>



                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2f1e9] text-[#65764f]">

                      <svg

                        aria-hidden="true"

                        viewBox="0 0 24 24"

                        fill="none"

                        className="h-5 w-5"

                      >

                        <circle

                          cx="9"

                          cy="8"

                          r="3.5"

                          stroke="currentColor"

                          strokeWidth="1.6"

                        />

                        <path

                          d="M2.5 20a6.5 6.5 0 0 1 13 0M17 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3.5 4.8"

                          stroke="currentColor"

                          strokeWidth="1.6"

                          strokeLinecap="round"

                        />

                      </svg>

                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="text-xs text-[#85897d]">Guests</p>

                      <p className="mt-0.5 text-sm font-semibold">

                        {adults} {adults === 1 ? "adult" : "adults"}

                        {children > 0

                          ? ` · ${children} ${

                              children === 1 ? "child" : "children"

                            }`

                          : ""}

                      </p>

                    </div>

                  </div>

                </div>



                <div className="mt-5 rounded-xl border border-dashed border-[#dcded1] bg-[#faf9f5] p-4">

                  <p className="text-sm font-semibold text-[#42473b]">

                    Price confirmation

                  </p>

                  <p className="mt-1.5 text-xs leading-5 text-[#777b70]">

                    Your final price is not displayed here. The

                    booking request will be checked by the server

                    using your selected room, rate plan, dates, and

                    number of rooms.

                  </p>

                </div>



                <div className="mt-5 rounded-xl bg-[#f3f6ed] p-4">

                  <p className="text-sm font-semibold text-[#435a32]">

                    Almost there!

                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#69765d]">

                    Check your details, then complete your booking.

                  </p>

                </div>

              </div>

            </section>



            <section className="rounded-2xl border border-[#e9e6dc] bg-white p-5">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4e5] text-[#54773a]">

                  <svg

                    aria-hidden="true"

                    viewBox="0 0 24 24"

                    fill="none"

                    className="h-5 w-5"

                  >

                    <path

                      d="M12 3 5 6v5c0 4.5 3 7.8 7 10 4-2.2 7-5.5 7-10V6l-7-3Z"

                      stroke="currentColor"

                      strokeWidth="1.7"

                      strokeLinejoin="round"

                    />

                    <path

                      d="m9 12 2 2 4-4"

                      stroke="currentColor"

                      strokeWidth="1.7"

                      strokeLinecap="round"

                      strokeLinejoin="round"

                    />

                  </svg>

                </div>

                <div>

                  <h3 className="text-sm font-bold text-[#30352a]">

                    Review before submitting

                  </h3>

                  <p className="mt-1 text-xs leading-5 text-[#777b70]">

                    Make sure your contact details and guest names

                    are correct before creating the reservation.

                  </p>

                </div>

              </div>

            </section>

          </aside>



          {/* Mobile submit stays near the bottom of the form */}

          <div className="lg:hidden">

            <button

              type="submit"

              disabled={submitting}

              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#a3e635] px-5 py-4 text-base font-bold text-[#27321f] shadow-[0_5px_14px_rgba(117,157,55,0.12)] transition hover:bg-[#94d52c] focus:outline-none focus:ring-4 focus:ring-lime-200 disabled:cursor-not-allowed disabled:opacity-60"

            >

              {submitting ? (

                <>

                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#26331d]/30 border-t-[#26331d]" />

                  Creating your booking...

                </>

              ) : (

                <>

                  {checkoutStep === 1 ? "Continue to final review" : "Confirm and continue to payment"}

                  <svg

                    aria-hidden="true"

                    viewBox="0 0 24 24"

                    fill="none"

                    className="h-5 w-5"

                  >

                    <path

                      d="M5 12h14m-6-6 6 6-6 6"

                      stroke="currentColor"

                      strokeWidth="1.8"

                      strokeLinecap="round"

                      strokeLinejoin="round"

                    />

                  </svg>

                </>

              )}

            </button>



            <p className="mt-3 text-center text-xs leading-5 text-[#85897d]">

              Please check your details before submitting.

            </p>

          </div>

        </form>



        <footer className="mt-10 border-t border-[#e9e6dc] py-5 text-center text-xs leading-5 text-[#85897d]">

          EthiopianBooking · Find your next stay in Ethiopia

        </footer>

      </div>

    </main>

  );

}
export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#faf8f2]">
          <p className="text-sm text-[#57534e]">
            Loading booking details...
          </p>
        </main>
      }
    >
      <BookingPageContent />
    </Suspense>
  );
}
