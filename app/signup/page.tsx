"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);

    const normalizedEmail = email.trim().toLowerCase();

    if (password.length < 8) {
      setMessage("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim(),
            country_code: "+251",
            account_type: "customer",
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Flogin`,
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session) {
        window.location.assign("/");
        return;
      }

      setSuccess(true);
      setMessage(
        "Your registration has been submitted. Check your email for the confirmation link before signing in."
      );
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-[#e3dfd3] bg-white px-4 text-sm text-[#24392f] outline-none transition placeholder:text-[#aaa99f] focus:border-[#456c54] focus:ring-4 focus:ring-[#456c54]/10 disabled:opacity-60";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f4eb] p-4 sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(13,35,27,0.88), rgba(13,35,27,0.45)), url('https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=2200&q=85')",
        }}
      />

      <div className="relative z-10 grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_500px]">
        <section className="hidden text-white lg:block">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white/10 text-2xl font-semibold backdrop-blur">
              E
            </span>
            <span className="text-xl font-semibold tracking-tight">
              EthiopianBooking
            </span>
          </Link>

          <p className="mt-16 text-xs font-semibold uppercase tracking-[0.28em] text-[#e7c98a]">
            Your journey begins here
          </p>

          <h1 className="mt-5 max-w-xl text-5xl font-medium leading-tight tracking-tight xl:text-6xl">
            Make room for
            <br />
            new experiences.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-8 text-white/85">
            Create your account to discover memorable stays, manage your
            bookings, and make every journey feel special.
          </p>
        </section>

        <section className="w-full rounded-[28px] border border-white/70 bg-[#fffdf8]/95 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-9">
          <div className="mb-7 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173f32] text-xl font-semibold text-white">
                E
              </span>
              <span className="text-lg font-semibold tracking-tight text-[#173f32]">
                EthiopianBooking
              </span>
            </Link>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7940]">
            Join EthiopianBooking
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#19382e]">
            Create your account
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#77776e]">
            Sign up to discover stays and keep your travel plans together.
          </p>

          <form onSubmit={handleSignup} className="mt-7 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-[#293c32]">
                  First name
                </label>
                <input
                  id="firstName"
                  autoComplete="given-name"
                  className={inputClass}
                  placeholder="First name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-[#293c32]">
                  Last name
                </label>
                <input
                  id="lastName"
                  autoComplete="family-name"
                  className={inputClass}
                  placeholder="Last name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium text-[#293c32]">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                className={inputClass}
                placeholder="+251 9..."
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                disabled={loading}
              />
              <p className="mt-1.5 text-xs text-[#88877d]">
                Include your country code if you are outside Ethiopia.
              </p>
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#293c32]">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={inputClass}
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#293c32]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`${inputClass} pr-16`}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-3 text-xs font-semibold text-[#52735d]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-[#293c32]">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className={inputClass}
                placeholder="Enter your password again"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={loading}
              />
            </div>

            {message && (
              <p
                role={success ? "status" : "alert"}
                className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
                  success
                    ? "border-[#c9ddce] bg-[#eff8f0] text-[#285d39]"
                    : "border-[#e9c8bf] bg-[#fff1ed] text-[#963f30]"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#193f32] px-5 text-sm font-semibold text-white shadow-lg shadow-[#193f32]/15 transition hover:bg-[#245340] focus:outline-none focus:ring-4 focus:ring-[#456c54]/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating your account..." : "Create account"}
              {!loading && <span className="ml-2" aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#77776e]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#245340] hover:underline">
              Sign in
            </Link>
          </p>

          <div className="my-6 h-px bg-[#e9e4d9]" />

          <p className="text-center text-sm leading-6 text-[#77776e]">
            Own an accommodation?{" "}
            <Link href="/partner/register" className="font-semibold text-[#245340] hover:underline">
              Register your property business
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
