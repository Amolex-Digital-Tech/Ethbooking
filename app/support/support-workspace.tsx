"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CaseItem = {
  id: string; caseNumber: string; subject: string; description: string;
  category: string; priority: string; status: string; customerName: string | null;
  customerEmail: string | null; customerPhone: string | null; createdAt: string;
  booking?: { bookingReference: string; status: string; paymentStatus: string; totalAmount: string; currency: string } | null;
  _count?: { notes: number };
};
type Booking = {
  id: string; bookingReference: string; status: string; paymentStatus: string;
  customerFirstName: string; customerLastName: string | null; customerEmail: string;
  customerPhone: string | null; checkInDate: string; checkOutDate: string;
  totalAmount: string; currency: string; items: { roomName: string; roomType: { property: { name: string } } }[];
};
type Note = { id: string; body: string; createdAt: string; author: { firstName: string | null; lastName: string | null } };

const statuses = ["OPEN","IN_PROGRESS","WAITING_CUSTOMER","RESOLVED","CLOSED"];
const priorities = ["LOW","NORMAL","HIGH","URGENT"];
const categories = ["GENERAL","BOOKING","PAYMENT","CANCELLATION","REFUND","PROPERTY","ACCOUNT","COMPLAINT"];
const pretty = (v: string) => v.replaceAll("_"," ").toLowerCase().replace(/\b\w/g, c=>c.toUpperCase());
const date = (v: string) => new Date(v).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"});

export default function SupportWorkspace() {
  const [cases,setCases] = useState<CaseItem[]>([]);
  const [counts,setCounts] = useState<Record<string,number>>({});
  const [filter,setFilter] = useState("ALL");
  const [query,setQuery] = useState("");
  const [selected,setSelected] = useState<CaseItem|null>(null);
  const [notes,setNotes] = useState<Note[]>([]);
  const [note,setNote] = useState("");
  const [bookingQuery,setBookingQuery] = useState("");
  const [bookings,setBookings] = useState<Booking[]>([]);
  const [chosenBooking,setChosenBooking] = useState<Booking|null>(null);
  const [showCreate,setShowCreate] = useState(false);
  const [subject,setSubject] = useState("");
  const [description,setDescription] = useState("");
  const [customerName,setCustomerName] = useState("");
  const [customerEmail,setCustomerEmail] = useState("");
  const [customerPhone,setCustomerPhone] = useState("");
  const [category,setCategory] = useState("GENERAL");
  const [priority,setPriority] = useState("NORMAL");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");

  const loadCases = useCallback(async () => {
    const params = new URLSearchParams();
    if(filter!=="ALL") params.set("status",filter);
    if(query.trim()) params.set("q",query.trim());
    const res=await fetch("/api/support/cases?"+params,{cache:"no-store"});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||"Unable to load cases");
    setCases(data.data||[]); setCounts(data.counts||{});
  },[filter,query]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const params = new URLSearchParams();
        if (filter !== "ALL") params.set("status", filter);
        if (query.trim()) params.set("q", query.trim());
        const res = await fetch("/api/support/cases?" + params, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load cases");
        if (!cancelled) { setCases(data.data || []); setCounts(data.counts || {}); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load cases");
      }
    })();
    return () => { cancelled = true; };
  }, [filter, query]);

  async function openCase(item: CaseItem) {
    setSelected(item); setError("");
    try {
      const res=await fetch("/api/support/cases/"+item.id,{cache:"no-store"});
      const data=await res.json(); if(!res.ok) throw new Error(data.error);
      setNotes(data.data.notes||[]);
    } catch(e) { setError(e instanceof Error?e.message:"Could not open case"); }
  }

  async function searchBookings() {
    if(bookingQuery.trim().length<2) return;
    setBusy(true); setError("");
    try {
      const res=await fetch("/api/support/search?q="+encodeURIComponent(bookingQuery),{cache:"no-store"});
      const data=await res.json(); if(!res.ok) throw new Error(data.error);
      setBookings(data.data||[]);
    } catch(e) { setError(e instanceof Error?e.message:"Search failed"); }
    finally { setBusy(false); }
  }

  function chooseBooking(b: Booking) {
    setChosenBooking(b); setCustomerName([b.customerFirstName,b.customerLastName].filter(Boolean).join(" "));
    setCustomerEmail(b.customerEmail||""); setCustomerPhone(b.customerPhone||"");
    setBookings([]); setBookingQuery(b.bookingReference);
  }

  async function createCase(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      const res=await fetch("/api/support/cases",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        subject,description,category,priority,customerName,customerEmail,customerPhone,bookingId:chosenBooking?.id||null
      })});
      const data=await res.json(); if(!res.ok) throw new Error(data.error||"Could not create case");
      setSuccess("Case "+data.data.caseNumber+" created.");
      setShowCreate(false); setSubject("");setDescription("");setChosenBooking(null);setBookingQuery("");setBookings([]);
      await loadCases(); await openCase(data.data);
    } catch(e) { setError(e instanceof Error?e.message:"Could not create case"); }
    finally { setBusy(false); }
  }

  async function updateCase(changes: {status?:string;priority?:string}) {
    if(!selected) return;
    setBusy(true);setError("");
    try {
      const res=await fetch("/api/support/cases/"+selected.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(changes)});
      const data=await res.json();if(!res.ok)throw new Error(data.error);
      const refreshed={...selected,...data.data};setSelected(refreshed);
      await loadCases();
    } catch(e) {setError(e instanceof Error?e.message:"Update failed");}
    finally{setBusy(false);}
  }

  async function addNote(event: React.FormEvent) {
    event.preventDefault();if(!selected||!note.trim())return;
    setBusy(true);setError("");
    try{
      const res=await fetch("/api/support/cases/"+selected.id+"/notes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:note})});
      const data=await res.json();if(!res.ok)throw new Error(data.error);
      setNotes(prev=>[...prev,data.data]);setNote("");
    }catch(e){setError(e instanceof Error?e.message:"Could not save note");}
    finally{setBusy(false);}
  }

  const totalOpen=useMemo(()=>["OPEN","IN_PROGRESS","WAITING_CUSTOMER"].reduce((n,k)=>n+(counts[k]||0),0),[counts]);
  const field="h-11 w-full rounded-xl border border-[#DDE3D9] bg-white px-3 text-sm outline-none focus:border-[#718A67] focus:ring-4 focus:ring-[#718A67]/10";
  const btn="rounded-xl bg-[#294A35] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#355B40] disabled:opacity-50";
  const statusColor=(s:string)=>s==="RESOLVED"||s==="CLOSED"?"bg-emerald-50 text-emerald-700":s==="WAITING_CUSTOMER"?"bg-amber-50 text-amber-700":"bg-blue-50 text-blue-700";
  const priorityColor=(p:string)=>p==="URGENT"?"text-red-700":p==="HIGH"?"text-orange-700":"text-[#65715F]";

  return <main className="min-h-screen bg-[#F5F6F2] px-4 py-6 text-[#263B2D] sm:px-7">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E5E8E0] bg-white p-5 sm:p-6">
        <div><p className="text-[11px] font-bold tracking-[.18em] text-[#87917F]">ETHIOPIANBOOKING · OPERATIONS</p><h1 className="mt-1 text-2xl font-semibold">Support workspace</h1><p className="mt-1 text-sm text-[#77766F]">Customer assistance, booking enquiries and case follow-up.</p></div>
        <div className="flex items-center gap-2"><span className="rounded-full bg-[#EDF2E8] px-3 py-1.5 text-xs font-semibold text-[#466044]">Support Agent</span><Link href="/support/bookings/new" className="rounded-xl bg-[#294A35] px-3 py-2 text-xs font-semibold text-white">+ Create booking</Link><Link href="/" className="rounded-xl border border-[#DDE3D8] px-3 py-2 text-xs font-semibold text-[#456044]">Public website ↗</Link></div>
      </header>

      {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}<button className="ml-3 font-semibold underline" onClick={()=>setError("")}>Dismiss</button></div>}
      {success&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[["All cases",Object.values(counts).reduce((a,b)=>a+b,0)],["Needs attention",totalOpen],["Open",counts.OPEN||0],["Waiting",counts.WAITING_CUSTOMER||0],["Resolved",counts.RESOLVED||0]].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-[#E5E8E0] bg-white p-4"><p className="text-xs text-[#7C8578]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <section className="overflow-hidden rounded-2xl border border-[#E5E8E0] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF0EB] p-5"><div><h2 className="font-semibold">Customer cases</h2><p className="mt-1 text-xs text-[#858B80]">Latest 100 cases</p></div><button className={btn} onClick={()=>{setShowCreate(v=>!v);setSelected(null);setError("");}}>{showCreate?"Close form":"+ New case"}</button></div>
          <div className="space-y-3 border-b border-[#EEF0EB] p-4">
            <input className={field} placeholder="Search case number, customer or subject…" value={query} onChange={e=>setQuery(e.target.value)}/>
            <div className="flex flex-wrap gap-2">{["ALL",...statuses].map(s=><button key={s} onClick={()=>setFilter(s)} className={"rounded-full px-3 py-1.5 text-xs font-semibold "+(filter===s?"bg-[#294A35] text-white":"bg-[#F2F4EF] text-[#697365]")}>{s==="ALL"?"All":pretty(s)}</button>)}</div>
          </div>
          <div className="divide-y divide-[#EEF0EB]">
            {cases.length===0?<div className="p-10 text-center text-sm text-[#8A9186]">No cases found. Create a case when a customer needs help.</div>:cases.map(c=><button key={c.id} onClick={()=>{setShowCreate(false);openCase(c);}} className={"w-full p-4 text-left transition hover:bg-[#FAFBF8] "+(selected?.id===c.id?"bg-[#F3F6F0]":"")}>
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] font-bold tracking-wide text-[#77836E]">{c.caseNumber}</span><span className={"rounded-full px-2.5 py-1 text-[10px] font-semibold "+statusColor(c.status)}>{pretty(c.status)}</span></div>
              <p className="mt-2 text-sm font-semibold">{c.subject}</p><p className="mt-1 text-xs text-[#7B8377]">{c.customerName||c.customerEmail||"Customer not specified"} {c.booking?.bookingReference?"· "+c.booking.bookingReference:""}</p>
              <div className="mt-3 flex items-center justify-between"><span className={"text-[10px] font-bold "+priorityColor(c.priority)}>{pretty(c.priority)} priority</span><span className="text-[10px] text-[#969C92]">{date(c.createdAt)} · {c._count?.notes||0} notes</span></div>
            </button>)}
          </div>
        </section>

        <div className="space-y-6">
          {showCreate?<section className="rounded-2xl border border-[#E5E8E0] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Create support case</h2><p className="mt-1 text-xs text-[#858B80]">Record the customer&apos;s issue and link a booking if available.</p>
            <form onSubmit={createCase} className="mt-5 space-y-4">
              <div><label className="mb-1.5 block text-xs font-semibold">Find booking (optional)</label><div className="flex gap-2"><input className={field} value={bookingQuery} onChange={e=>{setBookingQuery(e.target.value);setChosenBooking(null);}} placeholder="Booking reference, customer name, email or phone"/><button type="button" className="shrink-0 rounded-xl border border-[#DDE3D9] px-3 text-xs font-semibold" onClick={searchBookings} disabled={busy}>Search</button></div>
                {chosenBooking&&<div className="mt-2 rounded-xl bg-[#F0F4EC] p-3 text-xs"><div className="flex justify-between gap-2"><b>{chosenBooking.bookingReference}</b><button type="button" onClick={()=>{setChosenBooking(null);setBookingQuery("");}} className="underline">Remove</button></div><p className="mt-1">{chosenBooking.customerFirstName} {chosenBooking.customerLastName} · {chosenBooking.customerEmail}</p><p className="mt-1">{chosenBooking.items.map(i=>i.roomType.property.name).join(", ")} · {chosenBooking.status} / {chosenBooking.paymentStatus}</p></div>}
                {bookings.length>0&&<div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[#E5E8E0]">{bookings.map(b=><button type="button" key={b.id} onClick={()=>chooseBooking(b)} className="block w-full border-b border-[#EEF0EB] p-3 text-left text-xs hover:bg-[#F7F9F5]"><b>{b.bookingReference}</b> · {b.customerFirstName} {b.customerLastName}<span className="mt-1 block text-[#7B8377]">{b.customerEmail} · {b.status}</span></button>)}</div>}
              </div>
              <div><label className="mb-1.5 block text-xs font-semibold">Customer name</label><input className={field} value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Full name"/></div>
              <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1.5 block text-xs font-semibold">Email</label><input className={field} type="email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} placeholder="customer@email.com"/></div><div><label className="mb-1.5 block text-xs font-semibold">Phone</label><input className={field} value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="+251…"/></div></div>
              <div><label className="mb-1.5 block text-xs font-semibold">Case subject</label><input required minLength={4} maxLength={160} className={field} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Briefly describe the issue"/></div>
              <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1.5 block text-xs font-semibold">Category</label><select className={field} value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c} value={c}>{pretty(c)}</option>)}</select></div><div><label className="mb-1.5 block text-xs font-semibold">Priority</label><select className={field} value={priority} onChange={e=>setPriority(e.target.value)}>{priorities.map(p=><option key={p} value={p}>{pretty(p)}</option>)}</select></div></div>
              <div><label className="mb-1.5 block text-xs font-semibold">Issue details</label><textarea required minLength={10} maxLength={5000} rows={5} className="w-full rounded-xl border border-[#DDE3D9] bg-white p-3 text-sm outline-none focus:border-[#718A67]" value={description} onChange={e=>setDescription(e.target.value)} placeholder="What happened? What does the customer need?"/></div>
              <button disabled={busy} className={btn}>{busy?"Creating…":"Create case"}</button>
            </form>
          </section>:selected?<section className="rounded-2xl border border-[#E5E8E0] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold tracking-wide text-[#7C8974]">{selected.caseNumber}</p><h2 className="mt-1 text-lg font-semibold">{selected.subject}</h2><p className="mt-1 text-xs text-[#858B80]">Created {date(selected.createdAt)}</p></div><span className={"rounded-full px-3 py-1.5 text-[10px] font-semibold "+statusColor(selected.status)}>{pretty(selected.status)}</span></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><div><label className="mb-1.5 block text-xs font-semibold">Case status</label><select className={field} value={selected.status} disabled={busy} onChange={e=>updateCase({status:e.target.value})}>{statuses.map(s=><option key={s} value={s}>{pretty(s)}</option>)}</select></div><div><label className="mb-1.5 block text-xs font-semibold">Priority</label><select className={field} value={selected.priority} disabled={busy} onChange={e=>updateCase({priority:e.target.value})}>{priorities.map(p=><option key={p} value={p}>{pretty(p)}</option>)}</select></div></div>
            <div className="mt-5 rounded-xl bg-[#F7F8F5] p-4"><p className="text-xs font-semibold text-[#697365]">Customer & issue</p><p className="mt-2 text-sm">{selected.customerName||"Customer not specified"}</p><p className="mt-1 text-xs text-[#7B8377]">{selected.customerEmail||"No email"} · {selected.customerPhone||"No phone"}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{selected.description}</p></div>
            {selected.booking&&<div className="mt-4 rounded-xl border border-[#E5E8E0] p-4"><p className="text-xs font-semibold">Linked booking · {selected.booking.bookingReference}</p><p className="mt-1 text-xs text-[#7B8377]">{selected.booking.status} · {selected.booking.paymentStatus} · {selected.booking.currency} {Number(selected.booking.totalAmount).toLocaleString()}</p><p className="mt-2 text-[11px] text-[#92988E]">Support can view booking details here. Payment, cancellation and refund actions remain restricted to their authorized workflows.</p></div>}
            <div className="mt-6"><h3 className="text-sm font-semibold">Internal notes <span className="ml-1 text-xs font-normal text-[#8A9186]">({notes.length})</span></h3><div className="mt-3 space-y-3">{notes.map(n=><div key={n.id} className="rounded-xl border border-[#E9ECE5] p-3"><div className="flex justify-between gap-2 text-[10px] text-[#858B80]"><b>{[n.author.firstName,n.author.lastName].filter(Boolean).join(" ")||"Support Agent"}</b><span>{date(n.createdAt)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-5">{n.body}</p></div>)}{notes.length===0&&<p className="text-xs text-[#8A9186]">No internal notes yet.</p>}</div>
              <form onSubmit={addNote} className="mt-4 space-y-2"><textarea className="w-full rounded-xl border border-[#DDE3D9] p-3 text-sm outline-none focus:border-[#718A67]" rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Add an internal note for the support team…"/><button className={btn} disabled={busy||note.trim().length<2}>Add internal note</button></form>
            </div>
          </section>:<section className="rounded-2xl border border-dashed border-[#D8DED3] bg-white p-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDF2E8] text-xl text-[#426044]">✦</div><h2 className="mt-4 font-semibold">Select a case to get started</h2><p className="mt-2 text-sm leading-6 text-[#858B80]">Open a case from the list to review the customer issue, update its status and add internal notes. You can also create a new case.</p></section>}
          <section className="rounded-2xl border border-[#E5E8E0] bg-white p-5"><h3 className="text-sm font-semibold">Support boundaries</h3><p className="mt-2 text-xs leading-5 text-[#858B80]">This workspace provides customer and booking lookup, case tracking and internal notes. It does not expose administrator controls, payment processing, cash refunds, or direct booking-status changes.</p></section>
        </div>
      </div>
      <footer className="pb-4 text-center text-[11px] text-[#92988E]">EthiopianBooking Support · Authorized team access only</footer>
    </div>
  </main>;
}
