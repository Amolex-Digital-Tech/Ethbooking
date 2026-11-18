
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function safeRedirectPath(value: string | null): string {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  ) {
    return value;
  }

  return "/";
}

function LoginPageContent() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setMessage(
          "We couldn't sign you in with those details. Please check your email and password and try again."
        );
        return;
      }

      const requestedNext = searchParams.get("next");
      if (requestedNext) {
        window.location.assign(safeRedirectPath(requestedNext));
      } else {
        try {
          const destinationResponse = await fetch("/api/auth/default-redirect", { cache: "no-store" });
          const destinationData = await destinationResponse.json();
          window.location.assign(destinationData?.success && typeof destinationData.destination === "string" ? safeRedirectPath(destinationData.destination) : "/");
        } catch {
          window.location.assign("/");
        }
      }
    } catch {
      setMessage(
        "Something went wrong. Please try again in a moment."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f4eb] p-4 sm:p-6 lg:justify-end lg:p-10">
      {/* Full-screen hotel photography */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(13,35,27,0.78) 0%, rgba(13,35,27,0.35) 48%, rgba(13,35,27,0.12) 100%), url('https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=2200&q=85')",
        }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1fr_460px] lg:gap-16">
        {/* Brand message */}
        <section className="hidden max-w-2xl text-white lg:block">
          <Link
            href="/"
            className="inline-flex items-center gap-3"
            aria-label="EthiopianBooking home"
          >
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

          <h1 className="mt-5 max-w-xl text-5xl font-medium leading-[1.15] tracking-tight xl:text-6xl">
            Find your place
            <br />
            in Ethiopia.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-8 text-white/85">
            From welcoming city stays to peaceful escapes, discover
            places that make every journey feel special.
          </p>

          <div className="mt-10 flex items-center gap-3 text-sm text-white/80">
            <span className="h-px w-10 bg-[#d8b777]" />
            Discover a stay worth remembering
          </div>
        </section>

        {/* Login card */}
        <section className="w-full rounded-[28px] border border-white/70 bg-[#fffdf8]/95 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-9 lg:p-10">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173f32] text-xl font-semibold text-white">
                E
              </span>
              <span className="text-lg font-semibold tracking-tight text-[#173f32]">
                EthiopianBooking
              </span>
            </Link>
          </div>

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7940]">
              Welcome back
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#19382e]">
              Sign in to continue
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#77776e]">
              Access your account and keep your next stay within
              reach.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[#293c32]"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading}
                className="h-12 w-full rounded-xl border border-[#e3dfd3] bg-white px-4 text-sm text-[#24392f] outline-none transition placeholder:text-[#aaa99f] focus:border-[#456c54] focus:ring-4 focus:ring-[#456c54]/10 disabled:opacity-60"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#293c32]"
                >
                  Password
                </label>
              </div>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={loading}
                  className="h-12 w-full rounded-xl border border-[#e3dfd3] bg-white px-4 pr-20 text-sm text-[#24392f] outline-none transition placeholder:text-[#aaa99f] focus:border-[#456c54] focus:ring-4 focus:ring-[#456c54]/10 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  className="absolute inset-y-0 right-3 text-xs font-semibold text-[#52735d] hover:text-[#19382e] focus:outline-none focus:underline"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {message && (
              <p
                role="alert"
                className="rounded-xl border border-[#e9c8bf] bg-[#fff1ed] px-4 py-3 text-sm leading-5 text-[#963f30]"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#193f32] px-5 text-sm font-semibold text-white shadow-lg shadow-[#193f32]/15 transition hover:bg-[#245340] focus:outline-none focus:ring-4 focus:ring-[#456c54]/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing you in..." : "Sign in"}
              {!loading && <span className="ml-2" aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <span className="h-px flex-1 bg-[#e9e4d9]" />
            <span className="text-xs text-[#96958b]">NEW TO ETHIOPIANBOOKING?</span>
            <span className="h-px flex-1 bg-[#e9e4d9]" />
          </div>

          <Link
            href="/signup"
            className="flex h-12 w-full items-center justify-center rounded-xl border border-[#d9dfd4] bg-transparent px-5 text-sm font-semibold text-[#234b38] transition hover:bg-[#f0f3ec] focus:outline-none focus:ring-4 focus:ring-[#456c54]/15"
          >
            Create an account
          </Link>

          <p className="mt-7 text-center text-xs leading-5 text-[#8b8b80]">
            By continuing, you agree to use EthiopianBooking
            responsibly and keep your account secure.
          </p>

          <div className="mt-5 text-center">
            <Link href="/staff/login" className="text-xs font-semibold text-[#52735d] hover:underline">
              Staff sign in →
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#77776e]">
            <span aria-hidden="true" className="text-[#9a7940]">✦</span>
            <span>Find a stay that feels like yours.</span>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f8f4eb] text-sm text-[#19382e]">
          Loading sign in...
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
