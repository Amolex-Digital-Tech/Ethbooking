"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type InventoryRow = { id: string; date: string; totalUnits: number; reservedUnits: number; blockedUnits: number };
type Room = { id: string; name: string; totalUnits: number; isActive: boolean; inventory: InventoryRow[] };
const inputClass = "w-full rounded-xl border border-[#DFE5DC] bg-white px-3 py-2.5 text-sm text-[#263B2D] outline-none focus:border-[#78936F] focus:ring-2 focus:ring-[#EAF1E5]";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(value + "T00:00:00Z"));
}

export default function AdminInventoryManager({ propertyId, rooms, from, to }: { propertyId: string; rooms: Room[]; from: string; to: string }) {
  const router = useRouter();
  const [ranges, setRanges] = useState<Record<string, { from: string; to: string; blockedUnits: string }>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const days = useMemo(() => {
    const result: string[] = [];
    const cursor = new Date(from + "T00:00:00Z");
    const end = new Date(to + "T00:00:00Z");
    while (cursor < end) { result.push(cursor.toISOString().slice(0, 10)); cursor.setUTCDate(cursor.getUTCDate() + 1); }
    return result;
  }, [from, to]);

  async function updateRange(room: Room, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = ranges[room.id];
    if (!value) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.from) || !/^\d{4}-\d{2}-\d{2}$/.test(value.to) || value.to < value.from) {
      setError("Choose a valid date range. The To date must be on or after the From date.");
      return;
    }
    if (!/^\d+$/.test(value.blockedUnits) || Number(value.blockedUnits) > room.totalUnits) {
      setError(`Rooms to block must be a whole number between 0 and ${room.totalUnits}.`);
      return;
    }
    setBusy(room.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/properties/${propertyId}/inventory`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomTypeId: room.id, from: value.from, to: value.to, blockedUnits: Number(value.blockedUnits) }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error || "Unable to update inventory.");
      setNotice(`Updated ${result.data.updatedCount} dates for ${room.name}.`);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update inventory."); }
    finally { setBusy(""); }
  }

  const totals = rooms.reduce((acc, room) => {
    const first = room.inventory[0];
    if (first) { acc.total += first.totalUnits; acc.booked += first.reservedUnits; acc.blocked += first.blockedUnits; }
    return acc;
  }, { total: 0, booked: 0, blocked: 0 });

  return <div className="space-y-5">
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[["Room types", rooms.length], ["Physical rooms", totals.total], ["Reserved today", totals.booked], ["Blocked today", totals.blocked]].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#E5E9E1] bg-white p-4"><p className="text-xs text-[#788279]">{label}</p><p className="mt-2 text-2xl font-semibold text-[#294332]">{value}</p></div>)}
    </section>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    {rooms.length === 0 ? <div className="rounded-2xl border border-[#E5E9E1] bg-white p-10 text-center text-sm text-[#788279]">No room types are registered for this property yet.</div> : rooms.map((room) => {
      const byDate = new Map(room.inventory.map((item) => [item.date, item]));
      const range = ranges[room.id] ?? { from, to: days.at(-1) ?? from, blockedUnits: "0" };
      return <section key={room.id} className="overflow-hidden rounded-2xl border border-[#E5E9E1] bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF0EA] px-5 py-4">
          <div><h2 className="font-semibold text-[#294332]">{room.name}</h2><p className="mt-1 text-xs text-[#879087]">{room.totalUnits} physical rooms · {room.isActive ? "Active" : "Inactive"}</p></div>
          <span className="rounded-full bg-[#F1F4EE] px-3 py-1 text-[10px] font-semibold text-[#667563]">{room.inventory.length} inventory days</span>
        </header>
        <div className="p-5">
          <form onSubmit={(event) => updateRange(room, event)} className="grid gap-3 rounded-xl bg-[#F7F9F5] p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="text-xs font-semibold text-[#657467]">From date<input required type="date" min={from} max={days.at(-1)} className={inputClass} value={range.from} onChange={(e) => setRanges((v) => {
              const nextFrom = e.target.value;
              const nextTo = range.to && range.to < nextFrom ? nextFrom : range.to;
              return { ...v, [room.id]: { ...range, from: nextFrom, to: nextTo } };
            })} /></label>
            <label className="text-xs font-semibold text-[#657467]">To date (inclusive)<input required type="date" min={range.from || from} max={days.at(-1)} className={inputClass} value={range.to} onChange={(e) => setRanges((v) => ({ ...v, [room.id]: { ...range, to: e.target.value } }))} /></label>
            <label className="text-xs font-semibold text-[#657467]">Rooms to block<input required type="number" min="0" max={room.totalUnits} step="1" className={inputClass} value={range.blockedUnits} onChange={(e) => setRanges((v) => ({ ...v, [room.id]: { ...range, blockedUnits: e.target.value } }))} /></label>
            <button disabled={busy === room.id} className="self-end rounded-xl bg-[#294332] px-4 py-3 text-xs font-semibold text-white disabled:opacity-50">{busy === room.id ? "Saving..." : "Apply to dates"}</button>
          </form>
          <p className="mt-2 text-[11px] text-[#879087]">This sets the blocked-room count for every date in the selected range. Reserved rooms cannot be blocked.</p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead><tr className="bg-[#F8FAF7] text-[10px] uppercase tracking-wide text-[#788279]"><th className="sticky left-0 bg-[#F8FAF7] px-3 py-3 text-left">Date</th><th className="px-3 py-3 text-center">Total</th><th className="px-3 py-3 text-center">Reserved</th><th className="px-3 py-3 text-center">Blocked</th><th className="px-3 py-3 text-center">Available</th><th className="px-3 py-3 text-right">Status</th></tr></thead>
              <tbody className="divide-y divide-[#EDF0EA]">{days.map((day) => {
                const item = byDate.get(day);
                if (!item) return <tr key={day}><td className="px-3 py-3 font-medium">{dateLabel(day)}</td><td colSpan={5} className="px-3 py-3 text-center text-amber-700">Inventory record missing</td></tr>;
                const available = item.totalUnits - item.reservedUnits - item.blockedUnits;
                return <tr key={day} className="hover:bg-[#FCFDFB]"><td className="sticky left-0 bg-white px-3 py-3 font-medium text-[#294332]">{dateLabel(day)}</td><td className="px-3 py-3 text-center">{item.totalUnits}</td><td className="px-3 py-3 text-center"><span className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">{item.reservedUnits}</span></td><td className="px-3 py-3 text-center"><span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">{item.blockedUnits}</span></td><td className="px-3 py-3 text-center"><span className={`rounded-lg px-2.5 py-1 font-semibold ${available > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{available}</span></td><td className="px-3 py-3 text-right text-xs text-[#788279]">{available > 0 ? "Available" : "Sold out"}</td></tr>;
              })}</tbody>
            </table>
          </div>
        </div>
      </section>;
    })}
  </div>;
}
