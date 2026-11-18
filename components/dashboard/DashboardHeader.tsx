
"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";

type DashboardHeaderProps = {
  customerName: string;
};

export default function DashboardHeader({
  customerName,
}: DashboardHeaderProps) {
  return (
    <header className="border-b border-[#E7E5E0] bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        {/* Brand */}
        <Link
          href="/"
          aria-label="EthiopianBooking home"
          className="shrink-0 text-[17px] font-extrabold tracking-[-0.05em] text-[#1C1917] sm:text-2xl"
        >
          <span className="text-[#4A5D4E]">Ethiopian</span>
          Booking<span className="text-[#D97706]">.</span>
        </Link>

        {/* Desktop navigation */}
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
            aria-current="page"
            className="text-sm font-semibold text-[#4A5D4E]"
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

        {/* Customer profile */}
        <div className="flex min-w-0 items-center gap-2.5 rounded-full border border-[#E7E5E0] bg-white/70 px-3 py-2">
          <UserRound
            size={17}
            strokeWidth={1.7}
            className="shrink-0 text-[#4A5D4E]"
          />

          <span className="max-w-24 truncate text-sm font-medium text-[#34483B] sm:max-w-32">
            {customerName}
          </span>
        </div>
      </div>

      {/* Mobile navigation */}
      <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 border-t border-[#E7E5E0]/70 px-4 py-3 md:hidden">
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
          aria-current="page"
          className="text-sm font-semibold text-[#4A5D4E]"
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
    </header>
  );
}
