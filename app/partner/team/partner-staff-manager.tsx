"use client";

import { useEffect, useState, type FormEvent } from "react";

type Staff = { id: string; status: string; profile: { firstName: string | null; lastName: string | null; phone: string | null }; roles: string[] };
const empty = { firstName: "", lastName: "", email: "", phone: "" };
export default function PartnerStaffManager({ partnerId }: { partnerId: string }) {
  const [members, setMembers] = useState<Staff[]>([]);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    const response = await fetch(`/api/partners/${partnerId}/staff`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || "Unable to load staff.");
    setMembers(data.members);
  }
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/partners/${partnerId}/staff`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Unable to load staff.");
        if (!cancelled) setMembers(data.members);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load staff.");
      }
    })();
    return () => { cancelled = true; };
  }, [partnerId]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/partners/${partnerId}/staff`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to invite staff.");
      setMessage(data.message); setForm(empty); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to invite staff."); }
    finally { setBusy(false); }
  }
  async function status(id: string, next: "ACTIVE" | "SUSPENDED" | "REMOVED") {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/partners/${partnerId}/staff`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: id, status: next }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update staff.");
      setMessage(data.message); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update staff."); }
    finally { setBusy(false); }
  }
  const input = "w-full rounded-xl border border-[#D9DED5] bg-white px-3 py-2.5 text-sm";
  return <div className="space-y-5">
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <input required minLength={2} maxLength={80} className={input} placeholder="First name" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
      <input required minLength={2} maxLength={80} className={input} placeholder="Last name" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
      <input required type="email" maxLength={160} className={input} placeholder="Work email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <input type="tel" maxLength={40} className={input} placeholder="Phone (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
      <div className="sm:col-span-2"><button disabled={busy} className="rounded-xl bg-[#294A35] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Please wait..." : "Invite partner staff"}</button></div>
      <p className="sm:col-span-2 text-xs leading-5 text-[#89877F]">Staff can register walk-in guests and manage check-in/check-out. They cannot view financial amounts, revenue, commissions, earnings or financial reports. They cannot record or edit payments.</p>
    </form>
    <div className="divide-y divide-[#EEECE6] rounded-xl border border-[#E7E5DF]">
      {members.length === 0 ? <p className="p-5 text-sm text-gray-500">No partner staff members yet.</p> : members.map(member => <div key={member.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div><p className="font-semibold text-[#263B2D]">{[member.profile.firstName, member.profile.lastName].filter(Boolean).join(" ") || "Unnamed staff"}</p><p className="mt-1 text-xs text-gray-500">{member.profile.phone || "No phone"} · {member.roles.join(", ")}</p><span className="mt-2 inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs">{member.status}</span></div>
        <div className="flex gap-2">{member.status !== "ACTIVE" && <button type="button" disabled={busy} onClick={() => status(member.id, "ACTIVE")} className="rounded-lg border px-3 py-2 text-xs">Reactivate</button>}{member.status === "ACTIVE" && <button type="button" disabled={busy} onClick={() => status(member.id, "SUSPENDED")} className="rounded-lg border border-amber-200 px-3 py-2 text-xs text-amber-800">Suspend</button>}{member.status !== "REMOVED" && <button type="button" disabled={busy} onClick={() => status(member.id, "REMOVED")} className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700">Remove</button>}</div>
      </div>)}
    </div>
  </div>;
}
