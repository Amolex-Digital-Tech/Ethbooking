"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ProfileData = { firstName?: string; lastName?: string; phone?: string };

export default function AcceptStaffInvitePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadInvitation() {
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user || !user.email) {
          if (active) setError("This invitation link is invalid, expired, or has already been used. Ask your Partner Owner to send a new invitation.");
          return;
        }
        const response = await fetch("/api/customer/profile", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Unable to load your employee information.");
        const profile: ProfileData = result.data || {};
        const metadata = user.user_metadata || {};
        if (!active) return;
        setEmail(user.email);
        setFirstName(profile.firstName || metadata.first_name || "");
        setLastName(profile.lastName || metadata.last_name || "");
        setPhone(profile.phone || metadata.phone || "");
        setSessionReady(true);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to verify this invitation.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInvitation();
    return () => { active = false; };
  }, []);

  async function activateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!sessionReady) {
      setError("Your invitation session is not active. Open the latest invitation email again.");
      return;
    }
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      setError("Enter your first name and last name.");
      return;
    }
    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
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
      if (userError || !user || user.email?.toLowerCase() !== email.toLowerCase()) {
        throw new Error("Your invitation session could not be verified. Open the invitation email again.");
      }
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw new Error(passwordError.message);

      const profileResponse = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() }),
      });
      const profileResult = await profileResponse.json();
      if (!profileResponse.ok || !profileResult.success) throw new Error(profileResult.error || "Your profile information could not be saved.");

      const accessResponse = await fetch("/api/auth/portal-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ portal: "staff", staffRole: "AUTO" }),
      });
      const accessResult = await accessResponse.json();
      if (!accessResponse.ok || !accessResult.success || typeof accessResult.destination !== "string") {
        throw new Error(accessResult.error || "Your details were saved, but your staff access could not be verified. Contact your Partner Owner.");
      }
      router.replace(accessResult.destination);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to activate your employee account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F6F2] px-4 py-10 text-[#263B2D]">
      <section className="w-full max-w-xl rounded-3xl border border-[#E7E5DF] bg-white p-7 shadow-sm sm:p-10">
        <Link href="/staff/login" className="text-sm font-semibold text-[#687968]">EthiopianBooking · Staff</Link>
        <p className="mt-8 text-xs font-bold tracking-[0.18em] text-[#8B967F]">EMPLOYEE ONBOARDING</p>
        <h1 className="mt-2 text-3xl font-semibold">Complete your staff account</h1>
        <p className="mt-2 text-sm leading-6 text-[#77766F]">You have been invited to join a partner team. Confirm your details and create a password to activate your front-desk account.</p>

        {loading ? (
          <div className="mt-8 rounded-xl bg-[#F5F6F2] p-5 text-sm text-[#687968]">Verifying your invitation…</div>
        ) : sessionReady ? (
          <form onSubmit={activateAccount} className="mt-7 space-y-4">
            <div>
              <label className="block text-sm font-medium">Work email</label>
              <input type="email" value={email} readOnly className="mt-2 w-full rounded-xl border border-[#E4E7E0] bg-[#F6F7F4] px-4 py-3 text-[#6E756B]" />
              <p className="mt-1 text-xs text-[#89877F]">This is the email address your Partner Owner invited.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">First name
                <input type="text" autoComplete="given-name" required minLength={2} maxLength={80} value={firstName} onChange={e => setFirstName(e.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-[#D9DED5] px-4 py-3 outline-none focus:border-[#718A67] focus:ring-4 focus:ring-[#718A67]/10" />
              </label>
              <label className="block text-sm font-medium">Last name
                <input type="text" autoComplete="family-name" required minLength={2} maxLength={80} value={lastName} onChange={e => setLastName(e.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-[#D9DED5] px-4 py-3 outline-none focus:border-[#718A67] focus:ring-4 focus:ring-[#718A67]/10" />
              </label>
            </div>
            <label className="block text-sm font-medium">Phone number <span className="font-normal text-[#89877F]">(optional)</span>
              <input type="tel" autoComplete="tel" maxLength={40} value={phone} onChange={e => setPhone(e.target.value)} disabled={busy} placeholder="+251…" className="mt-2 w-full rounded-xl border border-[#D9DED5] px-4 py-3 outline-none focus:border-[#718A67] focus:ring-4 focus:ring-[#718A67]/10" />
            </label>
            <div className="border-t border-[#EEF0EB] pt-4">
              <h2 className="font-semibold">Create your password</h2>
              <p className="mt-1 text-xs text-[#89877F]">Use at least 8 characters. Keep it private.</p>
            </div>
            <label className="block text-sm font-medium">New password
              <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-[#D9DED5] px-4 py-3 outline-none focus:border-[#718A67] focus:ring-4 focus:ring-[#718A67]/10" />
            </label>
            <label className="block text-sm font-medium">Confirm password
              <input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-[#D9DED5] px-4 py-3 outline-none focus:border-[#718A67] focus:ring-4 focus:ring-[#718A67]/10" />
            </label>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#263B2D] px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Activating your account…" : "Complete registration"}
            </button>
          </form>
        ) : (
          <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm leading-6 text-amber-900">{error || "We could not verify this invitation."}</p>
            <p className="mt-3 text-sm text-amber-900">Ask your Partner Owner to send you a new invitation, then open the newest email on this device.</p>
          </div>
        )}
        <p className="mt-6 text-center text-xs text-[#89877F]">Already activated? <Link href="/staff/login" className="font-semibold text-[#60765A] hover:underline">Sign in</Link></p>
      </section>
    </main>
  );
}
