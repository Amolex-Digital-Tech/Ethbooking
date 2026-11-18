
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer
      id="about"
      className="border-t border-gray-200 bg-white"
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
  );
}
