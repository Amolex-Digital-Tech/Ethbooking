
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Heart,
  MapPin,
  BedDouble,
  Users,
} from "lucide-react";

const values = [
  {
    number: "01",
    icon: Compass,
    title: "Discover more",
    description:
      "From lively city stays to peaceful escapes, explore accommodation options that help you experience Ethiopia your way.",
  },
  {
    number: "02",
    icon: Heart,
    title: "Choose with confidence",
    description:
      "Find useful property details, explore your options, and make informed decisions about where to stay.",
  },
  {
    number: "03",
    icon: Users,
    title: "Bring people together",
    description:
      "Connect travelers looking for their next stay with property owners ready to welcome their guests.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-white text-[#1C1917]">

      {/* Navigation */}
      <header className="relative z-30 mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5 lg:px-12">
        {/* Brand */}
        <Link
          href="/"
          aria-label="EthiopianBooking home"
          className="shrink-0 text-[17px] font-extrabold tracking-[-0.05em] text-[#1C1917] sm:text-2xl"
        >
          <span className="text-[#4A5D4E]">Ethiopian</span>
          Booking<span className="text-[#D97706]">.</span>
        </Link>

        {/* Main navigation */}
        <nav className="hidden items-center gap-6 md:flex lg:gap-8">
          <Link
            href="/"
            className="text-sm font-medium text-[#57534E] transition hover:text-[#4A5D4E]"
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
            aria-current="page"
            className="text-sm font-semibold text-[#4A5D4E]"
          >
            About us
          </Link>
        </nav>

        {/* Account actions */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="px-2 py-2 text-sm font-medium text-[#4A5D4E] transition hover:text-[#758675]"
          >
            Log in
          </Link>

          <Link
            href="/signup"
            className="rounded-full bg-[#4A5D4E] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#34483B] sm:px-4"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-20 lg:px-12 lg:pt-24">
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#E7E5E0] bg-[#F4F3EF] px-3.5 py-2">
              <MapPin size={14} className="text-[#4A5D4E]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#57534E] sm:text-xs">
                Made for discovering Ethiopia
              </span>
            </div>

            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Every journey deserves{" "}
              <span className="text-[#4A5D4E]">the right place.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-[#78716C] sm:text-lg sm:leading-8">
              We believe finding somewhere to stay should be part of the
              excitement of traveling. EthiopianBooking brings travelers and
              accommodation providers together, making it easier to discover
              places to stay across Ethiopia.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/properties"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#4A5D4E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#34483B]"
              >
                Find your next stay
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/partner"
                className="inline-flex min-h-12 items-center rounded-full border border-[#E7E5E0] px-6 py-3 text-sm font-semibold text-[#292524] transition hover:bg-[#F4F3EF]"
              >
                Become a partner
              </Link>
            </div>
          </div>

          {/* Editorial visual */}
          <div className="relative min-h-[360px] overflow-hidden rounded-[28px] bg-[#F4F3EF] p-5 sm:min-h-[460px] sm:p-8 lg:min-h-[540px]">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#D97706]/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-10 h-64 w-64 rounded-full bg-[#4A5D4E]/15 blur-3xl" />

            <div className="relative flex h-full min-h-[320px] flex-col justify-between sm:min-h-[396px] lg:min-h-[460px]">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716C]">
                  Your journey starts here
                </span>
                <Compass
                  size={25}
                  strokeWidth={1.3}
                  className="text-[#4A5D4E]"
                />
              </div>

              <div className="py-12 sm:py-16">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#78716C]">
                  Discover · Stay · Experience
                </p>

                <h2 className="mt-5 max-w-lg text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                  Discover Ethiopia,{" "}
                  <span className="text-[#4A5D4E]">beautifully.</span>
                </h2>

                <p className="mt-5 max-w-sm text-sm leading-6 text-[#78716C] sm:text-base">
                  New places. Different perspectives. Stays that make the
                  journey yours.
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-[#D6D3CD] pt-5">
                <span className="text-sm font-medium text-[#57534E]">
                  EthiopianBooking
                </span>
                <span className="text-xs text-[#78716C]">
                  Find your place in Ethiopia.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our story */}
      <section className="bg-[#F4F3EF] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto grid max-w-[1120px] gap-8 md:grid-cols-[0.7fr_1.3fr] md:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4A5D4E]">
              Our story
            </p>
            <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl lg:text-5xl">
              A better way to find your place.
            </h2>
          </div>

          <div className="space-y-5 text-sm leading-7 text-[#57534E] sm:text-base sm:leading-8">
            <p>
              Every trip begins with a question: where should I stay? The
              answer shapes how we experience a destination, the people we
              meet, and the memories we take home.
            </p>

            <p>
              EthiopianBooking is being built to make discovering accommodation
              in Ethiopia simpler. We want travelers to be able to explore
              their options in one place, learn about properties, and find a
              stay that suits their plans.
            </p>

            <p>
              We also want to make it easier for accommodation providers to
              showcase their properties and connect with people looking for
              somewhere to stay.
            </p>

            <p className="font-medium text-[#292524]">
              Because the right stay is more than a place to sleep. It is part
              of the journey.
            </p>
          </div>
        </div>
      </section>

      {/* What matters to us */}
      <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-[1280px]">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4A5D4E]">
              What matters to us
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Built around better stays.
            </h2>

            <p className="mt-5 text-sm leading-7 text-[#78716C] sm:text-base">
              Every part of the experience should help people discover,
              compare, and connect with the right accommodation.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3 lg:mt-14">
            {values.map((value) => {
              const Icon = value.icon;

              return (
                <article
                  key={value.number}
                  className="rounded-[24px] border border-[#E7E5E0] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(28,25,23,0.06)] sm:p-8"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F3EF] text-[#4A5D4E]">
                      <Icon size={22} strokeWidth={1.6} />
                    </div>

                    <span className="text-xs font-semibold tracking-widest text-[#A8A29E]">
                      {value.number}
                    </span>
                  </div>

                  <h3 className="mt-8 text-xl font-semibold tracking-tight">
                    {value.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#78716C]">
                    {value.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Travelers and partners */}
      <section className="px-5 pb-16 sm:px-8 sm:pb-24 lg:px-12">
        <div className="mx-auto grid max-w-[1280px] gap-5 md:grid-cols-2">
          <article className="flex flex-col items-start rounded-[28px] bg-[#F4F3EF] p-7 sm:p-10 lg:p-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#4A5D4E]">
              <Compass size={23} strokeWidth={1.6} />
            </div>

            <h2 className="mt-7 text-2xl font-semibold tracking-tight sm:text-3xl">
              For the curious traveler.
            </h2>

            <p className="mt-4 max-w-md text-sm leading-7 text-[#57534E] sm:text-base">
              Explore accommodation options, discover places you might not
              have considered, and start planning your next Ethiopian escape.
            </p>

            <Link
              href="/properties"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#4A5D4E] transition hover:gap-3"
            >
              Explore stays <ArrowRight size={16} />
            </Link>
          </article>

          <article className="flex flex-col items-start rounded-[28px] bg-[#34483B] p-7 text-white sm:p-10 lg:p-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
              <BedDouble size={23} strokeWidth={1.6} />
            </div>

            <h2 className="mt-7 text-2xl font-semibold tracking-tight sm:text-3xl">
              For the people who host.
            </h2>

            <p className="mt-4 max-w-md text-sm leading-7 text-white/75 sm:text-base">
              Give your property a place to be discovered. Join our growing
              vision for connecting accommodation providers with travelers.
            </p>

            <Link
              href="/partner"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:gap-3"
            >
              List your property <ArrowRight size={16} />
            </Link>
          </article>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12">
        <div className="mx-auto max-w-[1280px] overflow-hidden rounded-[28px] bg-[#F4F3EF] px-6 py-12 text-center sm:px-12 sm:py-16 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4A5D4E]">
            Your next chapter awaits
          </p>

          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">
            Discover somewhere that feels like you.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#78716C] sm:text-base">
            Your next city break, weekend escape, or memorable journey starts
            with finding the right place to stay.
          </p>

          <Link
            href="/properties"
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#4A5D4E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#34483B]"
          >
            Find your stay <ArrowRight size={16} />
          </Link>
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-[#E8DCCB] bg-[#F9F8F5]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-8 lg:px-12">
          {/* Brand */}
          <Link
            href="/"
            aria-label="EthiopianBooking home"
            className="text-lg font-extrabold tracking-[-0.05em] text-[#1C1917]"
          >
            <span className="text-[#4A5D4E]">Ethiopian</span>
            Booking<span className="text-[#D97706]">.</span>
          </Link>

          {/* Tagline */}
          <p className="text-sm text-[#78716C]">
            Discover Ethiopia, one stay at a time.
          </p>

          {/* Footer links */}
          <div className="flex flex-wrap items-center gap-5">
            <Link
              href="/properties"
              className="text-sm font-medium text-[#57534E] transition hover:text-[#4A5D4E]"
            >
              Explore stays
            </Link>

            <Link
              href="/about"
              className="text-sm font-medium text-[#57534E] transition hover:text-[#4A5D4E]"
            >
              About us
            </Link>

            <Link
              href="/partner"
              className="text-sm font-medium text-[#57534E] transition hover:text-[#4A5D4E]"
            >
              List your property
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-[1440px] border-t border-[#E8DCCB] px-4 py-4 sm:px-8 lg:px-12">
          <p className="text-xs text-[#A8A29E]">
            © {new Date().getFullYear()} EthiopianBooking. All rights reserved.
          </p>
        </div>
      </footer>

    </main>
  );
}
