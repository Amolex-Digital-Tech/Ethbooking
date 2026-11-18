"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PortalLoginFormProps = {
  portal: "partner" | "admin";
};

export default function PortalLoginForm({ portal }: PortalLoginFormProps) {
  const router = useRouter();
  const isAdmin = portal === "admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setMessage("Unable to sign in with those details. Check your email and password.");
        return;
      }

      const response = await fetch("/api/auth/portal-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(result.error ?? "Your account is not authorized to access this portal.");
        return;
      }

      if (
        typeof result.destination !== "string" ||
        !["/partner", "/partner/staff", "/admin"].includes(result.destination)
      ) {
        setMessage("The destination could not be verified.");
        return;
      }

      router.replace(result.destination);
      router.refresh();
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) {
    return (
      <main className="relative isolate min-h-screen overflow-hidden bg-[#f4f1e8] px-4 py-6 sm:px-8 lg:px-12">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#dce7d6] blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-[30rem] w-[30rem] rounded-full bg-[#e8ddc5] blur-3xl" />

        <div className="relative mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 text-[#19382e]">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#193f32] text-xl font-bold text-white shadow-lg shadow-[#193f32]/20">E</span>
            <span className="text-lg font-bold tracking-tight">Ethiopian<span className="text-[#83a64b]">Booking</span></span>
          </Link>
          <Link href="/" className="rounded-full border border-[#d9ddcf] bg-white/70 px-4 py-2 text-sm font-medium text-[#526454] transition hover:bg-white">Back to website <span aria-hidden="true">↗</span></Link>
        </div>

        <div className="relative mx-auto grid min-h-[calc(100vh-100px)] max-w-7xl items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <section className="relative hidden min-h-[620px] overflow-hidden rounded-[2rem] bg-[#183c30] p-10 text-white shadow-2xl shadow-[#19382e]/15 lg:flex lg:flex-col lg:justify-between xl:p-14">
            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(18,52,39,0.94),rgba(18,52,39,0.58)),url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=85')] bg-cover bg-center" />
            <div className="absolute -right-24 top-24 h-72 w-72 rounded-full border border-white/15" />
            <div className="absolute -right-12 top-36 h-48 w-48 rounded-full border border-white/15" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-[#e8d6a9] backdrop-blur">HOSPITALITY PARTNER NETWORK</span>
              <h1 className="mt-10 max-w-xl text-5xl font-semibold leading-[1.12] tracking-tight xl:text-6xl">Your property.<br /><span className="text-[#d8c18c]">More possibilities.</span></h1>
              <p className="mt-6 max-w-md text-base leading-8 text-white/75">Manage your property, welcome guests and grow your hospitality business with EthiopianBooking.</p>
            </div>
            <div className="relative grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><span className="text-2xl">⌂</span><p className="mt-3 text-sm font-semibold">Property management</p><p className="mt-1 text-xs text-white/65">Keep your listings organized</p></div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><span className="text-2xl">✦</span><p className="mt-3 text-sm font-semibold">Guest experience</p><p className="mt-1 text-xs text-white/65">Make every stay memorable</p></div>
            </div>
            <p className="relative text-xs text-white/55">A better way to welcome the world to Ethiopia.</p>
          </section>

          <section className="mx-auto w-full max-w-[480px] rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_25px_80px_rgba(39,57,42,0.12)] backdrop-blur-xl sm:p-10">
            <div className="mb-9 lg:hidden">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7940]">Hospitality partner network</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a7940]">Partner workspace</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#19382e] sm:text-4xl">Welcome back.</h2>
              <p className="mt-3 text-sm leading-6 text-[#77776e]">Sign in to manage your property or access your front desk workspace.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-9 space-y-5">
              <div>
                <label htmlFor="partner-email" className="mb-2 block text-sm font-semibold text-[#293c32]">Work email</label>
                <input id="partner-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@yourproperty.com" required disabled={loading} className="h-13 w-full rounded-xl border border-[#e3e3d9] bg-[#fbfbf8] px-4 text-sm text-[#24392f] outline-none transition placeholder:text-[#aaa99f] focus:border-[#64806a] focus:bg-white focus:ring-4 focus:ring-[#456c54]/10 disabled:opacity-60" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="partner-password" className="text-sm font-semibold text-[#293c32]">Password</label></div>
                <div className="relative">
                  <input id="partner-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required disabled={loading} className="h-13 w-full rounded-xl border border-[#e3e3d9] bg-[#fbfbf8] px-4 pr-20 text-sm text-[#24392f] outline-none transition placeholder:text-[#aaa99f] focus:border-[#64806a] focus:bg-white focus:ring-4 focus:ring-[#456c54]/10 disabled:opacity-60" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-4 text-xs font-bold text-[#52735d] hover:text-[#19382e]">{showPassword ? "Hide" : "Show"}</button>
                </div>
              </div>

              {message && <p role="alert" className="rounded-xl border border-[#e9c8bf] bg-[#fff1ed] px-4 py-3 text-sm leading-5 text-[#963f30]">{message}</p>}

              <button type="submit" disabled={loading} className="flex h-13 w-full items-center justify-center rounded-xl bg-[#193f32] px-5 text-sm font-bold text-white shadow-lg shadow-[#193f32]/15 transition hover:-translate-y-0.5 hover:bg-[#245340] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#456c54]/25 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Verifying your access..." : "Sign in to your workspace"} {!loading && <span className="ml-2" aria-hidden="true">→</span>}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-[#77776e]">New to EthiopianBooking?</p>
              <Link
                href="/partner/register"
                className="mt-2 inline-flex items-center justify-center rounded-xl border border-[#d9dfd4] px-5 py-3 text-sm font-bold text-[#315d40] transition hover:bg-[#f0f3ec] focus:outline-none focus:ring-4 focus:ring-[#456c54]/15"
              >
                Create a partner account <span className="ml-2" aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="mt-7 rounded-2xl bg-[#f4f5ef] p-4">
              <div className="flex items-start gap-3"><span className="mt-0.5 text-lg text-[#59745a]">♧</span><div><p className="text-sm font-semibold text-[#314b37]">One secure sign-in</p><p className="mt-1 text-xs leading-5 text-[#777d70]">Owners and managers access property management. Invited front desk staff are directed to guest operations only.</p></div></div>
            </div>

            <div className="mt-7 border-t border-[#eeece5] pt-6 text-center">
              <p className="text-sm text-[#77776e]">Here to book a stay instead?</p>
              <Link href="/login" className="mt-2 inline-flex text-sm font-bold text-[#315d40] underline decoration-[#a3b69a] underline-offset-4 hover:text-[#19382e]">Traveler sign in <span className="ml-1">→</span></Link>
            </div>
            <p className="mt-7 text-center text-[11px] leading-5 text-[#a09e94]">Secure access for authorized EthiopianBooking partners.</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#101D18] px-4 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 12% 18%, rgba(184,217,154,.18), transparent 28%), radial-gradient(circle at 88% 82%, rgba(198,164,104,.16), transparent 30%)" }} />
      <div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full border border-white/[0.06]" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-[24rem] w-[24rem] rounded-full border border-white/[0.06]" />

      <div className="relative mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C9AD78]/40 bg-[#C9AD78]/10 text-lg font-bold text-[#D8C294]">E</span>
          <span className="text-base font-bold tracking-wide text-white">ETHIOPIAN<span className="text-[#C9AD78]">BOOKING</span></span>
        </Link>
        <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-semibold tracking-[0.18em] text-white/55 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#B8D99A]" /> SECURE ADMINISTRATOR ACCESS
        </span>
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-110px)] max-w-7xl items-center gap-12 py-12 lg:grid-cols-[1fr_0.82fr] lg:gap-20">
        <section className="hidden max-w-2xl lg:block">
          <p className="text-xs font-bold tracking-[0.24em] text-[#C9AD78]">PLATFORM CONTROL CENTER</p>
          <h1 className="mt-7 text-5xl font-semibold leading-[1.12] tracking-tight text-white xl:text-6xl">
            Oversight for a<br />
            <span className="text-[#C9AD78]">better stay.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-8 text-white/55">
            Manage the marketplace, support trusted partners and keep guest operations running smoothly from one secure workspace.
          </p>

          <div className="mt-14 grid max-w-xl grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B8D99A]/10 text-lg text-[#C5DFAE]">⌂</span>
              <p className="mt-4 text-sm font-semibold text-white">Marketplace oversight</p>
              <p className="mt-1.5 text-xs leading-5 text-white/45">Partners, properties and listings</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C9AD78]/10 text-lg text-[#D8C294]">◇</span>
              <p className="mt-4 text-sm font-semibold text-white">Operational control</p>
              <p className="mt-1.5 text-xs leading-5 text-white/45">Bookings, payments and activity</p>
            </div>
          </div>

          <div className="mt-12 flex items-center gap-3 text-xs text-white/35">
            <span className="h-px w-10 bg-[#C9AD78]/60" />
            Built to connect Ethiopia with the world.
          </div>
        </section>

        <section className="mx-auto w-full max-w-[470px] rounded-[2rem] border border-white/10 bg-[#FDFCF8] p-7 text-[#20372B] shadow-[0_30px_100px_rgba(0,0,0,0.32)] sm:p-10">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F1EEE5] px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] text-[#806A43]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A88A55]" /> RESTRICTED AREA
            </span>
            <span className="text-[10px] font-semibold tracking-[0.12em] text-[#A4A397]">ADMIN / 01</span>
          </div>

          <div className="mt-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#193F32] text-[#D8C294] shadow-lg shadow-[#193F32]/15">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                <path d="M12 3 19 6v5c0 4.5-2.9 8.1-7 10-4.1-1.9-7-5.5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#19382E]">Administrator sign in</h1>
            <p className="mt-3 text-sm leading-6 text-[#7C8077]">Sign in with your authorized administrator account to access the platform control center.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="admin-email" className="mb-2 block text-sm font-semibold text-[#34483A]">Administrator email</label>
              <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" required disabled={loading} className="h-13 w-full rounded-xl border border-[#E3E5DC] bg-white px-4 text-sm text-[#24392F] outline-none transition placeholder:text-[#AAA99F] focus:border-[#718A68] focus:ring-4 focus:ring-[#718A68]/10 disabled:opacity-60" />
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-[#34483A]">Password</label>
              <div className="relative">
                <input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required disabled={loading} className="h-13 w-full rounded-xl border border-[#E3E5DC] bg-white px-4 pr-20 text-sm text-[#24392F] outline-none transition placeholder:text-[#AAA99F] focus:border-[#718A68] focus:ring-4 focus:ring-[#718A68]/10 disabled:opacity-60" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-4 text-xs font-bold text-[#647B5E] hover:text-[#19382E]">{showPassword ? "Hide" : "Show"}</button>
              </div>
            </div>

            {message && <p role="alert" className="rounded-xl border border-[#E9C8BF] bg-[#FFF1ED] px-4 py-3 text-sm leading-5 text-[#963F30]">{message}</p>}

            <button type="submit" disabled={loading} className="flex h-13 w-full items-center justify-center rounded-xl bg-[#193F32] px-5 text-sm font-bold text-white shadow-lg shadow-[#193F32]/15 transition hover:-translate-y-0.5 hover:bg-[#245340] focus:outline-none focus:ring-4 focus:ring-[#456C54]/25 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Verifying administrator access..." : "Access admin console"} {!loading && <span className="ml-2" aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="mt-7 rounded-xl border border-[#E9E6DC] bg-[#F7F6F0] p-4">
            <p className="text-xs font-semibold text-[#405442]">Protected administrator workspace</p>
            <p className="mt-1 text-xs leading-5 text-[#898B80]">Only accounts with the required administrator permissions can continue. All access is verified before entry.</p>
          </div>

          <div className="mt-7 flex items-center justify-between border-t border-[#ECEAE2] pt-5">
            <Link href="/" className="text-xs font-semibold text-[#617365] transition hover:text-[#19382E]">← Back to website</Link>
            <span className="text-[10px] font-medium text-[#AAA99F]">ETHIOPIANBOOKING</span>
          </div>
        </section>
      </div>
    </main>
  );
}
