"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Period = { id: string; startDate: string; endDate: string; pricePerNight: number };
type Plan = {
  id: string; name: string; description: string | null; mealPlan: string;
  cancellationPolicy: string; cancellationDeadlineHours: number | null;
  cancellationFeePercent: number | null; basePrice: number; currency: string;
  isActive: boolean; ratePeriods: Period[];
};
const meals = ["ROOM_ONLY", "BREAKFAST", "HALF_BOARD", "FULL_BOARD", "ALL_INCLUSIVE"];
const policies = ["NON_REFUNDABLE", "FLEXIBLE", "MODERATE", "CUSTOM"];
const field = "mt-1.5 w-full rounded-xl border border-[#DFE5DC] bg-white px-3 py-2.5 text-sm text-[#263B2D] outline-none focus:border-[#78936F] focus:ring-2 focus:ring-[#EAF1E5]";

export default function RatePlanManager({ propertyId, roomTypeId, plans }: {
  propertyId: string; roomTypeId: string; plans: Plan[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newPlan, setNewPlan] = useState({ name: "", description: "", mealPlan: "ROOM_ONLY", cancellationPolicy: "FLEXIBLE", cancellationDeadlineHours: "24", cancellationFeePercent: "0", basePrice: "", currency: "ETB" });
  const [periods, setPeriods] = useState<Record<string, { startDate: string; endDate: string; pricePerNight: string }>>({});

  async function send(url: string, method: string, body: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) throw new Error(result?.error || "The request could not be completed.");
    return result;
  }

  async function createPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving("new"); setError(""); setNotice("");
    try {
      await send(`/api/admin/properties/${propertyId}/rooms/${roomTypeId}/rate-plans`, "POST", {
        ...newPlan, cancellationDeadlineHours: newPlan.cancellationDeadlineHours === "" ? null : Number(newPlan.cancellationDeadlineHours),
        cancellationFeePercent: newPlan.cancellationFeePercent === "" ? null : Number(newPlan.cancellationFeePercent),
        basePrice: Number(newPlan.basePrice),
      });
      setNewPlan({ name: "", description: "", mealPlan: "ROOM_ONLY", cancellationPolicy: "FLEXIBLE", cancellationDeadlineHours: "24", cancellationFeePercent: "0", basePrice: "", currency: "ETB" });
      setCreating(false); setNotice("Rate plan created."); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create rate plan."); }
    finally { setSaving(""); }
  }

  async function togglePlan(plan: Plan) {
    setSaving(plan.id); setError(""); setNotice("");
    try {
      await send(`/api/admin/properties/${propertyId}/rooms/${roomTypeId}/rate-plans/${plan.id}`, "PATCH", { isActive: !plan.isActive });
      setNotice("Rate plan status updated."); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update rate plan."); }
    finally { setSaving(""); }
  }

  async function addPeriod(plan: Plan, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(plan.id); setError(""); setNotice("");
    const value = periods[plan.id];
    try {
      await send(`/api/admin/properties/${propertyId}/rooms/${roomTypeId}/rate-plans/${plan.id}/periods`, "POST", { ...value, pricePerNight: Number(value.pricePerNight) });
      setPeriods((current) => ({ ...current, [plan.id]: { startDate: "", endDate: "", pricePerNight: "" } }));
      setNotice("Seasonal price period added."); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to add seasonal price."); }
    finally { setSaving(""); }
  }

  async function deletePeriod(plan: Plan, periodId: string) {
    if (!window.confirm("Delete this seasonal price period?")) return;
    setSaving(periodId); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/properties/${propertyId}/rooms/${roomTypeId}/rate-plans/${plan.id}/periods/${periodId}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error || "Unable to delete seasonal price.");
      setNotice("Seasonal price period deleted."); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to delete seasonal price."); }
    finally { setSaving(""); }
  }

  return <div className="mt-5 space-y-4 border-t border-[#E8EDE5] pt-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h4 className="text-sm font-semibold text-[#294332]">Rate plans & seasonal pricing</h4><p className="mt-1 text-xs text-[#879087]">Manage nightly prices, meal inclusions and cancellation rules.</p></div>
      <button type="button" onClick={() => setCreating((v) => !v)} className="rounded-xl bg-[#294332] px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[#1D3528]">{creating ? "Close form" : "＋ Add rate plan"}</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</p>}
    {creating && <form onSubmit={createPlan} className="grid gap-3 rounded-xl border border-[#DCE5D8] bg-[#FAFCF8] p-4 sm:grid-cols-2">
      <label className="text-xs font-semibold text-[#657467]">Plan name<input required maxLength={120} className={field} value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} placeholder="e.g. Flexible breakfast" /></label>
      <label className="text-xs font-semibold text-[#657467]">Base price per night<input required type="number" min="0.01" step="0.01" className={field} value={newPlan.basePrice} onChange={(e) => setNewPlan({ ...newPlan, basePrice: e.target.value })} placeholder="2500" /></label>
      <label className="text-xs font-semibold text-[#657467]">Meal plan<select className={field} value={newPlan.mealPlan} onChange={(e) => setNewPlan({ ...newPlan, mealPlan: e.target.value })}>{meals.map((v) => <option key={v} value={v}>{v.replaceAll("_", " ")}</option>)}</select></label>
      <label className="text-xs font-semibold text-[#657467]">Cancellation policy<select className={field} value={newPlan.cancellationPolicy} onChange={(e) => setNewPlan({ ...newPlan, cancellationPolicy: e.target.value })}>{policies.map((v) => <option key={v} value={v}>{v.replaceAll("_", " ")}</option>)}</select></label>
      <label className="text-xs font-semibold text-[#657467]">Free cancellation deadline (hours)<input type="number" min="0" className={field} value={newPlan.cancellationDeadlineHours} onChange={(e) => setNewPlan({ ...newPlan, cancellationDeadlineHours: e.target.value })} /></label>
      <label className="text-xs font-semibold text-[#657467]">Cancellation fee (%)<input type="number" min="0" max="100" step="0.01" className={field} value={newPlan.cancellationFeePercent} onChange={(e) => setNewPlan({ ...newPlan, cancellationFeePercent: e.target.value })} /></label>
      <label className="text-xs font-semibold text-[#657467] sm:col-span-2">Description<textarea rows={2} className={field} value={newPlan.description} onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })} /></label>
      <div className="sm:col-span-2"><button disabled={saving === "new"} className="rounded-xl bg-[#294332] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{saving === "new" ? "Creating..." : "Create rate plan"}</button></div>
    </form>}
    {plans.length === 0 && <p className="rounded-xl bg-[#F7F9F5] p-4 text-sm text-[#788279]">No rate plans have been configured for this room.</p>}
    {plans.map((plan) => <article key={plan.id} className="rounded-xl border border-[#E5E9E1] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex flex-wrap items-center gap-2"><h5 className="font-semibold text-[#294332]">{plan.name}</h5><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${plan.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{plan.isActive ? "ACTIVE" : "INACTIVE"}</span></div>
          <p className="mt-1 text-xs text-[#788279]">{plan.mealPlan.replaceAll("_", " ")} · {plan.cancellationPolicy.replaceAll("_", " ")}</p>
          {plan.description && <p className="mt-1 text-xs text-[#879087]">{plan.description}</p>}
        </div>
        <div className="text-right"><p className="text-lg font-semibold text-[#294332]">{Number(plan.basePrice).toLocaleString("en-US")} {plan.currency}</p><p className="text-[10px] text-[#879087]">per night</p>
          <button type="button" disabled={saving === plan.id} onClick={() => togglePlan(plan)} className="mt-2 rounded-lg border border-[#DCE5D8] px-3 py-1.5 text-[11px] font-semibold text-[#52704F] disabled:opacity-50">{plan.isActive ? "Deactivate" : "Activate"}</button>
        </div>
      </div>
      <div className="mt-4 border-t border-[#EDF0EA] pt-3">
        <p className="mb-2 text-xs font-semibold text-[#657467]">Seasonal / date-based prices</p>
        {plan.ratePeriods.length > 0 ? <div className="mb-3 space-y-2">{plan.ratePeriods.map((period) => <div key={period.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F7F9F5] px-3 py-2 text-xs"><span>{period.startDate.slice(0,10)} → {period.endDate.slice(0,10)}</span><strong>{Number(period.pricePerNight).toLocaleString("en-US")} {plan.currency} / night</strong><button type="button" disabled={saving === period.id} onClick={() => deletePeriod(plan, period.id)} className="font-semibold text-red-600 hover:underline">Delete</button></div>)}</div> : <p className="mb-3 text-xs text-[#9AA39A]">No seasonal pricing periods.</p>}
        <form onSubmit={(e) => addPeriod(plan, e)} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input required type="date" className={field} value={periods[plan.id]?.startDate ?? ""} onChange={(e) => setPeriods((v) => ({ ...v, [plan.id]: { startDate: e.target.value, endDate: v[plan.id]?.endDate ?? "", pricePerNight: v[plan.id]?.pricePerNight ?? "" } }))} aria-label="Season start date" />
          <input required type="date" min={periods[plan.id]?.startDate} className={field} value={periods[plan.id]?.endDate ?? ""} onChange={(e) => setPeriods((v) => ({ ...v, [plan.id]: { startDate: v[plan.id]?.startDate ?? "", endDate: e.target.value, pricePerNight: v[plan.id]?.pricePerNight ?? "" } }))} aria-label="Season end date" />
          <input required type="number" min="0.01" step="0.01" placeholder="Price / night" className={field} value={periods[plan.id]?.pricePerNight ?? ""} onChange={(e) => setPeriods((v) => ({ ...v, [plan.id]: { startDate: v[plan.id]?.startDate ?? "", endDate: v[plan.id]?.endDate ?? "", pricePerNight: e.target.value } }))} aria-label="Seasonal price per night" />
          <button disabled={saving === plan.id} className="rounded-xl border border-[#DCE5D8] px-3 py-2 text-xs font-semibold text-[#36513C] hover:bg-[#F3F7F0] disabled:opacity-50">Add period</button>
        </form>
      </div>
    </article>)}
  </div>;
}
