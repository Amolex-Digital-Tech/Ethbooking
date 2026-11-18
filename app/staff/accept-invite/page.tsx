"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AcceptStaffInvitePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // A clickable Supabase ConfirmationURL can establish the session before
  // the employee reaches this page. Keep OTP entry available as a fallback.
  useEffect(() => {
    let active = true;
    async function detectVerifiedInvite() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (active && user?.email) {
        setEmail(user.email.toLowerCase());
        setVerified(true);
      }
    }
    void detectVerifiedInvite();
    return () => { active = false; };
  }, []);

  async function verifyInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedToken = token.replace(/\s/g, "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter the email address where you received the invitation.");
      return;
    }
    if (!/^\d{6,8}$/.test(normalizedToken)) {
      setError("Enter the 6–8 digit verification code from your invitation email.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedToken,
        type: "invite",
      });
      if (verifyError) throw new Error("That invitation code is invalid or expired. Ask an administrator to send a new invitation.");
      setEmail(normalizedEmail);
      setVerified(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to verify this invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function setAccountPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!verified) {
      setError("Verify your invitation code before setting a password.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user || user.email?.toLowerCase() !== email) {
        throw new Error("Your invitation session could not be verified. Please start again with a new invitation.");
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);

      const response = await fetch("/api/auth/portal-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ portal: "staff", staffRole: "AUTO" }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || typeof result.destination !== "string") {
        throw new Error(result.error || "Your password was saved, but we could not verify your staff access. Please contact an administrator.");
      }
      router.replace(result.destination);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to activate your employee account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F6F2] px-4 py-10 text-[#263B2D]">
      <section className="w-full max-w-md rounded-3xl border border-[#E7E5DF] bg-white p-7 shadow-sm sm:p-9">
        <Link href="/staff/login" className="text-sm font-semibold text-[#687968]">EthiopianBooking · Staff</Link>
        <p className="mt-8 text-xs font-bold tracking-[0.18em] text-[#8B967F]">EMPLOYEE INVITATION</p>
        <h1 className="mt-2 text-2xl font-semibold">{verified ? "Set your password" : "Verify your invitation"}</h1>
        <p className="mt-2 text-sm leading-6 text-[#77766F]">
          {verified
            ? "Your invitation is verified. Create a secure password to activate your employee account."
            : "Enter the email address and one-time verification code from your invitation email. This code is not a clickable sign-in link."}
        </p>

        {!verified ? (
          <form onSubmit={verifyInvitation} className="mt-7 space-y-4">
            <label className="block text-sm font-medium">
              Work email
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-[#D9DED5] px-4 py-3 outline-none focus:border-[#718A67] focus:ring-4 focus:ring-[#718A67]/10" />
            </label>
            <label className="block text-sm font-medium">
              Invitation code
              <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" minLength={6} maxLength={8} required value={token} onChange={(event) => setToken(event.target.value.replace(/[^0-9]/g, "").slice(0, 8))} disabled={busy} className="mt-2 w-full rounded-xl border border-[#D9DED5] px-4 py-3 tracking-[0.25em] outline-none focus:border-[#718A67] focus:ring-4 focus:ring-[#718A67]/10" />
            </label>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#263B2D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Verifying..." : "Verify invitation"}
            </button>
          </form>
        ) : (
          <form onSubmit={setAccountPassword} className="mt-7 space-y-4">
            <p className="rounded-xl bg-[#F5F6F2] p-3 text-sm text-[#52644F]">Verified for <strong>{email}</strong></p>
            <label className="block text-sm font-medium">
              New password
              <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-[#D9DED5] px-4 py-3 outline-none focus:border-[#718A67] focus:ring-4 focus:ring-[#718A67]/10" />
            </label>
            <label className="block text-sm font-medium">
              Confirm password
              <input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-[#D9DED5] px-4 py-3 outline-none focus:border-[#718A67] focus:ring-4 focus:ring-[#718A67]/10" />
            </label>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#263B2D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Activating account..." : "Activate employee account"}
            </button>
          </form>
        )}
        {!verified && error === "" ? null : null}
        <p className="mt-6 text-center text-xs text-[#89877F]">Already activated? <Link href="/staff/login" className="font-semibold text-[#60765A] hover:underline">Sign in</Link></p>
      </section>
    </main>
  );
}
