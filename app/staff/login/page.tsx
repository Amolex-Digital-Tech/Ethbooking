"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type StaffPortal = "SUPPORT_AGENT" | "FINANCE" | "BRANCH_MANAGER" | "BRANCH_STAFF";
const portals: { value: StaffPortal; title: string; description: string; icon: string }[] = [
  { value: "SUPPORT_AGENT", title: "Support Agent", description: "Customer support across all branches", icon: "✦" },
  { value: "FINANCE", title: "Finance", description: "Financial reports and transactions across all branches", icon: "▣" },
  { value: "BRANCH_MANAGER", title: "Branch Manager", description: "Branch operations and cash refund recording", icon: "⌂" },
  { value: "BRANCH_STAFF", title: "Branch Staff", description: "View refund requests for your assigned branch", icon: "▤" },
];

function StaffLoginContent() {
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("role");
  const initialRole: StaffPortal = portals.some((p) => p.value === requested) ? requested as StaffPortal : "BRANCH_STAFF";
  const [portal, setPortal] = useState<StaffPortal>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) {
        setError("We couldn't sign you in. Check your work email and password.");
        return;
      }
      const response = await fetch("/api/auth/portal-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ portal: "staff", staffRole: portal }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        await supabase.auth.signOut();
        setError(result.error || "This account is not authorized for the selected staff portal.");
        return;
      }
      router.replace(result.destination);
      router.refresh();
    } catch {
      await supabase.auth.signOut();
      setError("We couldn't verify your staff access. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F6F2] px-4 py-10 text-[#263B2D]">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#DDE8D5] blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-20 h-[30rem] w-[30rem] rounded-full bg-[#E9E4D7] blur-3xl" />
      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[30px] border border-[#E1E6DC] bg-white shadow-[0_28px_90px_rgba(34,54,38,0.12)] lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden min-h-[690px] flex-col justify-between overflow-hidden bg-[#203D2D] p-10 text-white lg:flex">
          <div aria-hidden="true" className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 15% 20%, #C4D6A9 0, transparent 35%), radial-gradient(circle at 85% 85%, #B6C88D 0, transparent 32%)" }} />
          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-xl font-semibold">E</span>
              <span className="text-lg font-semibold tracking-tight">EthiopianBooking</span>
            </Link>
            <p className="mt-24 text-[11px] font-bold uppercase tracking-[.28em] text-[#D8C38D]">Internal team access</p>
            <h1 className="mt-5 max-w-md text-5xl font-semibold leading-[1.12] tracking-tight">The people behind every great stay.</h1>
            <p className="mt-6 max-w-sm text-sm leading-7 text-white/75">A secure workspace for the teams helping guests, supporting partners and serving customers across our branches.</p>
          </div>
          <div className="relative border-t border-white/15 pt-5 text-xs text-white/60">Authorized EthiopianBooking personnel only.</div>
        </aside>
        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mb-9 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#203D2D] font-semibold text-white">E</span><span className="font-semibold">EthiopianBooking</span></Link>
            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#7D8978]">Staff portal</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[.22em] text-[#8B9A7C]">Staff portal</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#203D2D]">Sign in to your workspace</h2>
          <p className="mt-2 text-sm leading-6 text-[#7A8175]">Choose your assigned role, then sign in with the work account created by an administrator.</p>
          <div className="mt-7 space-y-2.5">
            {portals.map((item) => {
              const selected = portal === item.value;
              return <button key={item.value} type="button" onClick={() => { setPortal(item.value); setError(""); }} className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition ${selected ? "border-[#68835D] bg-[#F0F4EC] ring-2 ring-[#68835D]/10" : "border-[#E8EBE4] bg-white hover:bg-[#FAFBF8]"}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${selected ? "bg-[#294A35] text-white" : "bg-[#F0F2EC] text-[#66765F]"}`}>{item.icon}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#2B4030]">{item.title}</span><span className="mt-0.5 block text-xs text-[#7D8679]">{item.description}</span></span>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${selected ? "border-[#56734F] bg-[#56734F] text-white" : "border-[#D8DED3] text-transparent"}`}>✓</span>
              </button>;
            })}
          </div>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <div><label htmlFor="staff-email" className="mb-2 block text-xs font-semibold text-[#405342]">Work email</label><input id="staff-email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} disabled={loading} placeholder="name@ethiopianbooking.com" className="h-12 w-full rounded-xl border border-[#DDE3D9] bg-[#FCFDFB] px-4 text-sm outline-none transition placeholder:text-[#A0A79D] focus:border-[#718A67] focus:ring-4 focus:ring-[#718A67]/10" /></div>
            <div><label htmlFor="staff-password" className="mb-2 block text-xs font-semibold text-[#405342]">Password</label><div className="relative"><input id="staff-password" type={showPassword?"text":"password"} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} disabled={loading} placeholder="Enter your password" className="h-12 w-full rounded-xl border border-[#DDE3D9] bg-[#FCFDFB] px-4 pr-16 text-sm outline-none transition placeholder:text-[#A0A79D] focus:border-[#718A67] focus:ring-4 focus:ring-[#718A67]/10"/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute inset-y-0 right-4 text-xs font-semibold text-[#62785C]">{showPassword?"Hide":"Show"}</button></div></div>
            {error&&<p role="alert" className="rounded-xl border border-[#EBCBC3] bg-[#FFF3EF] px-4 py-3 text-sm leading-5 text-[#984B3C]">{error}</p>}
            <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#294A35] px-5 text-sm font-semibold text-white shadow-lg shadow-[#294A35]/10 transition hover:bg-[#355B40] disabled:cursor-not-allowed disabled:opacity-60">{loading?"Verifying access…":"Sign in securely"} <span className="ml-2">→</span></button>
          </form>
          <p className="mt-6 text-center text-xs leading-5 text-[#8A9186]">Accounts are created by EthiopianBooking administrators. If you need access, contact your administrator.</p>
          <div className="mt-7 border-t border-[#EEF0EB] pt-5 text-center"><Link href="/login" className="text-xs font-semibold text-[#60765A] hover:underline">← Return to customer sign in</Link></div>
        </section>
      </div>
    </main>
  );
}

export default function StaffLoginPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#F5F6F2] text-sm text-[#52634F]">Loading staff sign in…</main>}><StaffLoginContent /></Suspense>;
}
