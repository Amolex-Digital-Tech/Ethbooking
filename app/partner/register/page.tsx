"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type RegistrationResponse = {
  success: boolean;
  message?: string;
  error?: string;
  requiresEmailConfirmation?: boolean;
};

export default function PartnerRegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    businessName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/partner/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          businessName: form.businessName,
          phone: form.phone,
          email: form.email,
          password: form.password,
        }),
      });
      const result = (await response.json()) as RegistrationResponse;

      if (!response.ok || !result.success) {
        setError(result.error || "We couldn't create your account. Please try again.");
        return;
      }

      setSuccess(
        result.message || "Your registration has been received. Please check your email."
      );
      setForm((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));
    } catch {
      setError("We couldn't connect to the server. Check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-[#e3e3d9] bg-[#fbfbf8] px-4 text-sm text-[#24392f] outline-none transition placeholder:text-[#aaa99f] focus:border-[#64806a] focus:bg-white focus:ring-4 focus:ring-[#456c54]/10 disabled:opacity-60";
  const labelClass = "mb-2 block text-sm font-semibold text-[#293c32]";

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#f4f1e8] px-4 py-6 text-[#19382e] sm:px-8 lg:px-12">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#dce7d6] blur-3xl" />
      <div className="absolute -bottom-40 -right-20 h-[30rem] w-[30rem] rounded-full bg-[#e8ddc5] blur-3xl" />

      <header className="relative mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#193f32] text-xl font-bold text-white shadow-lg shadow-[#19382e]/20">E</span>
          <span className="text-lg font-bold tracking-tight">Ethiopian<span className="text-[#83a64b]">Booking</span></span>
        </Link>
        <Link href="/partner/login" className="rounded-full border border-[#d9ddcf] bg-white/70 px-4 py-2 text-sm font-semibold text-[#315d40] transition hover:bg-white">
          Already a partner? Sign in <span aria-hidden="true">→</span>
        </Link>
      </header>

      <div className="relative mx-auto grid max-w-7xl items-center gap-8 py-8 lg:min-h-[calc(100vh-100px)] lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:py-10">
        <section className="relative hidden min-h-[680px] overflow-hidden rounded-[2rem] bg-[#183c30] p-10 text-white shadow-2xl shadow-[#19382e]/15 lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(18,52,39,0.94),rgba(18,52,39,0.58)),url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=85')] bg-cover bg-center" />
          <div className="absolute -right-24 top-24 h-72 w-72 rounded-full border border-white/15" />
          <div className="absolute -right-12 top-36 h-48 w-48 rounded-full border border-white/15" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-[#e8d6a9] backdrop-blur">
              HOSPITALITY PARTNER NETWORK
            </span>
            <h1 className="mt-10 max-w-xl text-5xl font-semibold leading-[1.12] tracking-tight xl:text-6xl">
              Welcome more<br /><span className="text-[#d8c18c]">guests. Grow.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-8 text-white/75">
              Bring your hotel, guesthouse or lodge online and connect with travelers looking for their next stay in Ethiopia.
            </p>
          </div>
          <div className="relative space-y-4">
            {[
              ["01", "Create your partner account", "Register your business and contact details."],
              ["02", "Add your property", "Set up rooms, photos, availability and rates."],
              ["03", "Complete the review", "Get your property ready to welcome guests."],
            ].map(([number, title, description]) => (
              <div key={number} className="flex items-start gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-[#e8d6a9]">{number}</span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/65">{description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="relative text-xs text-white/55">A better way to welcome the world to Ethiopia.</p>
        </section>

        <section className="mx-auto w-full max-w-[650px] rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_25px_80px_rgba(39,57,42,0.12)] backdrop-blur-xl sm:p-9 lg:p-10">
          <div className="mb-7">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a7940]">Partner registration</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#19382e] sm:text-4xl">Create your account.</h2>
            <p className="mt-3 text-sm leading-6 text-[#77776e]">
              Start with your business and contact details. You can add your property information after registration.
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
              <p className="font-semibold">Registration received</p>
              <p className="mt-1">{success}</p>
              <Link href="/partner/login" className="mt-2 inline-flex font-semibold underline underline-offset-4">
                Continue to partner sign in
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="businessName" className={labelClass}>Business or property name *</label>
              <input id="businessName" name="businessName" autoComplete="organization" required maxLength={160} value={form.businessName} onChange={(event) => updateField("businessName", event.target.value)} placeholder="e.g. Addis View Hotel" disabled={loading} className={inputClass} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className={labelClass}>First name *</label>
                <input id="firstName" name="firstName" autoComplete="given-name" required maxLength={80} value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} placeholder="First name" disabled={loading} className={inputClass} />
              </div>
              <div>
                <label htmlFor="lastName" className={labelClass}>Last name *</label>
                <input id="lastName" name="lastName" autoComplete="family-name" required maxLength={80} value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} placeholder="Last name" disabled={loading} className={inputClass} />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className={labelClass}>Business email *</label>
                <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@yourhotel.com" disabled={loading} className={inputClass} />
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>Phone number</label>
                <div className="flex h-12 overflow-hidden rounded-xl border border-[#e3e3d9] bg-[#fbfbf8] transition focus-within:border-[#64806a] focus-within:ring-4 focus-within:ring-[#456c54]/10">
                  <span className="flex items-center border-r border-[#e3e3d9] bg-[#f4f5ef] px-3 text-sm text-[#647064]">+251</span>
                  <input id="phone" name="phone" type="tel" autoComplete="tel-national" maxLength={30} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="9XX XXX XXX" disabled={loading} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[#aaa99f] disabled:opacity-60" />
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className={labelClass}>Password *</label>
                <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="At least 8 characters" disabled={loading} className={inputClass} />
              </div>
              <div>
                <label htmlFor="confirmPassword" className={labelClass}>Confirm password *</label>
                <input id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} placeholder="Enter password again" disabled={loading} className={inputClass} />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#647084]">
              <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} className="h-4 w-4 rounded accent-[#315d40]" />
              Show passwords
            </label>

            <button type="submit" disabled={loading} className="flex h-13 w-full items-center justify-center rounded-xl bg-[#193f32] px-5 text-sm font-bold text-white shadow-lg shadow-[#193f32]/15 transition hover:-translate-y-0.5 hover:bg-[#245340] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#456c54]/25 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Creating your account..." : "Create partner account"} {!loading && <span className="ml-2" aria-hidden="true">→</span>}
            </button>
            <p className="text-center text-xs leading-5 text-[#8b8b80]">
              By creating an account, you agree to follow EthiopianBooking’s partner terms and policies.
            </p>
          </form>

          <div className="mt-7 border-t border-[#eeece5] pt-6 text-center">
            <p className="text-sm text-[#77776e]">Registering as a traveler instead?</p>
            <Link href="/signup" className="mt-2 inline-flex text-sm font-bold text-[#315d40] underline decoration-[#a3b69a] underline-offset-4 hover:text-[#19382e]">
              Create a customer account <span className="ml-1">→</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
