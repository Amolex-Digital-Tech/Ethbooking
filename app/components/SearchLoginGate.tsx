"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export default function SearchLoginGate({ returnUrl }: { returnUrl: string }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  if (!open) return null;
  const next = encodeURIComponent(returnUrl);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="date-search-login-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="date-search-login-title" className="text-xl font-bold text-[#1C1917]">Log in to check availability</h2><p className="mt-2 text-sm leading-6 text-gray-500">Date-specific availability and room selection are available to signed-in customers. Your search will be saved.</p></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><X size={18}/></button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link href={`/login?next=${next}`} className="rounded-xl bg-[#4A5D4E] px-4 py-3 text-center text-sm font-bold text-white">Log in</Link>
          <Link href={`/signup?next=${next}`} className="rounded-xl border border-[#DCE5DB] px-4 py-3 text-center text-sm font-bold text-[#34483B]">Create account</Link>
        </div>
        <button type="button" onClick={() => { const url = new URL(returnUrl, window.location.origin); url.searchParams.delete("checkIn"); url.searchParams.delete("checkOut"); router.replace(`${url.pathname}${url.search}`); setOpen(false); }} className="mt-4 w-full text-sm font-semibold text-gray-500">Close and browse without dates</button>
      </div>
    </div>
  );
}
