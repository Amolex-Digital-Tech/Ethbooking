"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function PartnerApplicationPage() {
  const [businessName, setBusinessName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setApplicationId("");

    try {
      const response = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, legalName, phone }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(result.error || "We couldn't submit your application.");
      } else {
        setApplicationId(result.data.partner.id);
        setMessage(result.message || "Your application has been submitted.");
      }
    } catch {
      setMessage("We couldn't connect to the application service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/login" className="text-sm font-semibold text-blue-700">← Back to sign in</Link>
        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Partner programme</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">List your accommodation</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Sign in with your customer account first. Our team will review your application before enabling partner access.</p>

        <form onSubmit={submitApplication} className="mt-7 space-y-4">
          <div>
            <label htmlFor="businessName" className="mb-2 block text-sm font-medium">Business or property group name *</label>
            <input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required maxLength={150} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="e.g. Lalibela View Hotel" />
          </div>
          <div>
            <label htmlFor="legalName" className="mb-2 block text-sm font-medium">Registered legal name (optional)</label>
            <input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={200} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="Name on registration documents" />
          </div>
          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium">Business contact phone (optional)</label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="+251 ..." />
          </div>

          {message && (
            <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p>{message}</p>
              {applicationId && <p className="mt-2 break-all">Application ID: <code>{applicationId}</code></p>}
              {applicationId && <p className="mt-2 text-slate-500">Keep this ID. It can be used as your Partner ID after approval.</p>}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60">
            {loading ? "Submitting application..." : "Submit for review"}
          </button>
        </form>
        <p className="mt-5 text-xs leading-5 text-slate-500">You must be signed in to apply. Submitting an application does not grant access to partner tools or publish a property.</p>
      </section>
    </main>
  );
}
