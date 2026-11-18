"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AcceptBranchInvitePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (password.length < 8) { setError("Use at least 8 characters for your password."); return; }
    if (password !== confirmPassword) { setError("The passwords do not match."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("This invitation link is invalid or has expired. Ask an administrator to send a new invitation.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      router.replace("/branch"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to set your password."); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#F5F6F2] px-4 py-10 text-[#263B2D]"><section className="w-full max-w-md rounded-3xl border border-[#E7E5DF] bg-white p-7 shadow-sm sm:p-9"><Link href="/login" className="text-sm font-semibold text-[#687968]">EthiopianBooking</Link><p className="mt-8 text-xs font-bold tracking-[0.18em] text-[#8B967F]">BRANCH EMPLOYEE INVITATION</p><h1 className="mt-2 text-2xl font-semibold">Set your password</h1><p className="mt-2 text-sm leading-6 text-[#77766F]">Create a secure password to activate your employee sign-in.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-medium">New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-[#D9DED5] px-4 py-3"/></label><label className="block text-sm font-medium">Confirm password<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-[#D9DED5] px-4 py-3"/></label>{error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-[#263B2D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?"Saving password...":"Activate employee account"}</button></form></section></main>;
}
