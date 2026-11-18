"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PartnerFields = {
  id: string;
  businessName: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
};

export default function PartnerProfileEditor({ partner }: { partner: PartnerFields }) {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: partner.businessName,
    legalName: partner.legalName ?? "",
    email: partner.email ?? "",
    phone: partner.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to save partner details.");
      setMessage("Partner details saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-1.5 w-full rounded-xl border border-[#DFE5DC] bg-white px-3.5 py-3 text-sm text-[#263B2D] outline-none transition focus:border-[#78936F] focus:ring-2 focus:ring-[#EAF1E5]";

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-xs font-semibold text-[#657467]">Business name
        <input required maxLength={160} value={form.businessName} onChange={(event) => update("businessName", event.target.value)} className={inputClass} />
      </label>
      <label className="block text-xs font-semibold text-[#657467]">Legal name
        <input maxLength={160} value={form.legalName} onChange={(event) => update("legalName", event.target.value)} className={inputClass} />
      </label>
      <label className="block text-xs font-semibold text-[#657467]">Business email
        <input type="email" maxLength={254} value={form.email} onChange={(event) => update("email", event.target.value)} className={inputClass} />
      </label>
      <label className="block text-xs font-semibold text-[#657467]">Business phone
        <input maxLength={40} value={form.phone} onChange={(event) => update("phone", event.target.value)} className={inputClass} />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">{message}</p>}
      <button disabled={saving} className="w-full rounded-xl bg-[#294332] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1D3528] disabled:opacity-50">{saving ? "Saving changes..." : "Save business details"}</button>
    </form>
  );
}
