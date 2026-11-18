"use client";

import { useEffect, useState, type FormEvent } from "react";

type InviteRole = "STAFF" | "MANAGER" | "SUPPORT_AGENT" | "FINANCE";
type Profile = { id: string; firstName: string | null; lastName: string | null; phone: string | null };
type Member = { id: string; role: "MANAGER" | "STAFF"; status: "ACTIVE" | "SUSPENDED"; profile: Profile };
type Branch = { id: string; name: string; code: string; city: string; status: "ACTIVE" | "INACTIVE"; members: Member[] };
type Data = { success: boolean; error?: string; branch?: Branch };

const initialForm = { firstName: "", lastName: "", email: "", phone: "", role: "STAFF" as InviteRole };

export default function BranchEmployees({ branchId }: { branchId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch(`/api/admin/branches/${branchId}/members`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "Could not load branch employees.");
    setData(result);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/admin/branches/${branchId}/members`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Could not load branch employees.");
        if (!cancelled) setData(result);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load branch.");
      }
    })();
    return () => { cancelled = true; };
  }, [branchId]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/branches/${branchId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not invite employee.");
      setForm(initialForm);
      setMessage(result.message);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(member: Member, status: "ACTIVE" | "SUSPENDED") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/branches/${branchId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id, status }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not update employee.");
      setMessage(result.message);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!data?.branch) {
    return <div className="rounded-2xl border border-[#E7E5DF] bg-white p-6 text-sm text-[#77766F]">{error || "Loading branch employees..."}</div>;
  }

  const branch = data.branch;
  const isBranchRole = form.role === "MANAGER" || form.role === "STAFF";
  const input = "w-full rounded-xl border border-[#D9DED5] bg-white px-3 py-2.5 text-sm";

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}

      <section className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
        <h2 className="font-semibold">Invite a new employee</h2>
        <p className="mt-1 text-sm text-[#77766F]">Only Admin and Super Admin can create employee accounts. An invitation email lets the employee securely set their password.</p>

        <form onSubmit={invite} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input required minLength={2} maxLength={80} className={input} placeholder="First name" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
          <input required minLength={2} maxLength={80} className={input} placeholder="Last name" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
          <input required type="email" maxLength={160} className={input} placeholder="Employee email address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <input type="tel" maxLength={40} className={input} placeholder="Phone number (optional)" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />

          <div className="sm:col-span-2">
            <label className="mb-2 block text-xs font-semibold text-[#53634F]">Employee access role</label>
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as InviteRole })} className={input}>
              <optgroup label="Branch access — limited to this branch">
                <option value="STAFF">Branch staff — view branch refund requests</option>
                <option value="MANAGER">Branch manager — record cash refunds</option>
              </optgroup>
              <optgroup label="Platform-wide access — all branches">
                <option value="SUPPORT_AGENT">Support Agent — customer support across all branches</option>
                <option value="FINANCE">Finance — finance access across all branches</option>
              </optgroup>
            </select>
          </div>

          {isBranchRole && branch.status !== "ACTIVE" && (
            <p className="sm:col-span-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">This branch is inactive. Activate it before inviting a Branch Manager or Branch Staff member. Platform-wide roles can still be invited.</p>
          )}

          <div className="flex items-center sm:col-span-2">
            <button disabled={busy || (isBranchRole && branch.status !== "ACTIVE")} className="rounded-xl bg-[#263B2D] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Sending invitation..." : "Send invitation"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white">
        <div className="border-b border-[#EEECE6] px-5 py-4">
          <h2 className="font-semibold">Branch employees</h2>
          <p className="mt-1 text-xs text-[#89877F]">{branch.members.length} employee assignment(s)</p>
        </div>
        {branch.members.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#77766F]">No branch employees assigned yet.</p>
        ) : (
          <div className="divide-y divide-[#EEECE6]">
            {branch.members.map((member) => (
              <div key={member.id} className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold">{[member.profile.firstName, member.profile.lastName].filter(Boolean).join(" ") || "Unnamed user"}</p>
                  <p className="mt-1 text-xs text-[#77766F]">{member.profile.phone || "No phone"} · Profile {member.profile.id}</p>
                  <div className="mt-2 flex gap-2">
                    <span className="rounded-full bg-[#F1F0EB] px-2.5 py-1 text-xs">{member.role === "MANAGER" ? "BRANCH MANAGER" : "BRANCH STAFF"}</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs">{member.status}</span>
                  </div>
                </div>
                <button disabled={busy} onClick={() => setStatus(member, member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")} className="rounded-lg border border-[#D9DED5] px-3 py-2 text-xs font-semibold disabled:opacity-50">
                  {member.status === "ACTIVE" ? "Suspend access" : "Reactivate access"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-[#89877F]">Branch Manager and Branch Staff belong to one branch only. Support Agents and Finance employees are platform-wide accounts: they are not added to this branch&apos;s employee list and can work across all branches. Only Branch Managers can record branch cash handovers.</p>
    </div>
  );
}
