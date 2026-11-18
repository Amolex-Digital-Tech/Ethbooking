
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  Building2,
  ShieldCheck,
  UserRound,
} from "lucide-react";

export default async function SiteHeader() {
  const currentUser = await getCurrentUser();

  return (
    <header className="relative z-30 mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 bg-white px-4 py-4 sm:px-8 sm:py-5 lg:px-12">
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
          className="text-sm font-medium text-[#57534E] transition hover:text-[#4A5D4E]"
        >
          Home
        </Link>

        <Link
          href="/properties"
          className="text-sm font-semibold text-[#4A5D4E]"
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
                className="inline-flex items-center justify-center p-2 text-[#34483B] hover:text-[#758675]"
              >
                <ShieldCheck size={20} strokeWidth={1.7} />
              </Link>
            )}

            {currentUser.roles.includes("PARTNER_OWNER") && (
              <Link
                href="/partner"
                aria-label="Partner Dashboard"
                title="Partner Dashboard"
                className="inline-flex items-center justify-center p-2 text-[#34483B] hover:text-[#758675]"
              >
                <Building2 size={20} strokeWidth={1.7} />
              </Link>
            )}

            {currentUser.roles.includes("CUSTOMER") && (
              <Link
                href="/profile"
                aria-label="My Account"
                title="My Account"
                className="inline-flex items-center justify-center p-2 text-[#34483B] hover:text-[#758675]"
              >
                <UserRound size={20} strokeWidth={1.7} />
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}
