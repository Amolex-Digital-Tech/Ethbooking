"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import DestinationAutocomplete from "@/app/components/DestinationAutocomplete";

type Props = {
  initialDestination: string;
  initialCheckIn: string;
  initialCheckOut: string;
  initialType: string;
  initialGuests: number;
  initialRooms: number;
  initialChildren: number;
  initialChildAges: number[];
  initialDestinationType: string;
  isAuthenticated: boolean;
  propertyTypes: { value: string; label: string }[];
  today: string;
};

export default function HomepageSearchForm(props: Props) {
  const router = useRouter();
  const [destination, setDestination] = useState(props.initialDestination);
  const [destinationType, setDestinationType] = useState(props.initialDestinationType);
  const [checkIn, setCheckIn] = useState(props.initialCheckIn);
  const [checkOut, setCheckOut] = useState(props.initialCheckOut);
  const [type, setType] = useState(props.initialType);
  const [rooms, setRooms] = useState(props.initialRooms);
  const [adults, setAdults] = useState(Math.max(1, props.initialGuests));
  const [children, setChildren] = useState(props.initialChildren);
  const [childAges, setChildAges] = useState<number[]>(Array.from({ length: props.initialChildren }, (_, index) => props.initialChildAges[index] ?? -1));
  const [showLogin, setShowLogin] = useState(false);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (destination.trim()) params.set("destination", destination.trim());
    if (destinationType) params.set("destinationType", destinationType);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (type) params.set("type", type);
    params.set("rooms", String(rooms));
    params.set("adults", String(adults));
    params.set("children", String(children));
    if (children) params.set("childAges", childAges.join(","));
    return params.toString();
  }, [destination, destinationType, checkIn, checkOut, type, rooms, adults, children, childAges]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if ((checkIn || checkOut) && (!checkIn || !checkOut || checkOut <= checkIn)) {
      setError("Choose a check-out date after check-in.");
      return;
    }
    if (rooms + adults + children > 60 || adults + children > 30 || rooms > 30) {
      setError("Choose up to 30 rooms and 30 guests.");
      return;
    }
    if (childAges.length !== children || childAges.some((age) => !Number.isInteger(age) || age < 0 || age > 17)) {
      setError("Please select the age of every child.");
      return;
    }
    if ((checkIn || checkOut) && !props.isAuthenticated) {
      setShowLogin(true);
      return;
    }
    router.push(`/properties?${query}`);
  }

  return (
    <>
      <form onSubmit={submit} className="rounded-2xl border border-white/70 bg-white/95 p-3 shadow-[0_12px_38px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:items-end">
          <div className="col-span-2 min-w-0 sm:col-span-3 lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-[#57534E]" htmlFor="destination">Destination</label>
            <DestinationAutocomplete initialValue={destination} initialType={destinationType} suggestions={[]} onValueChange={setDestination} onTypeChange={setDestinationType} />
          </div>
          <div className="min-w-0">
            <label htmlFor="checkIn" className="mb-1 block text-xs font-semibold text-[#57534E]">Check-in</label>
            <input id="checkIn" type="date" min={props.today} value={checkIn} onChange={(e) => {setCheckIn(e.target.value); if(checkOut && e.target.value >= checkOut) setCheckOut("");}} className="h-11 w-full rounded-lg border border-stone-200 px-2 text-sm" />
          </div>
          <div className="min-w-0">
            <label htmlFor="checkOut" className="mb-1 block text-xs font-semibold text-[#57534E]">Check-out</label>
            <input id="checkOut" type="date" min={checkIn || props.today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="h-11 w-full rounded-lg border border-stone-200 px-2 text-sm" />
          </div>
          <div className="min-w-0">
            <label htmlFor="stay-type" className="mb-1 block text-xs font-semibold text-[#57534E]">Property type</label>
            <select id="stay-type" value={type} onChange={(e) => setType(e.target.value)} className="h-11 w-full rounded-lg border border-stone-200 bg-white px-2 text-sm">
              <option value="">All stays</option>
              {props.propertyTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="rooms" className="mb-1 block text-xs font-semibold text-[#57534E]">Rooms</label>
            <select id="rooms" value={rooms} onChange={(e) => setRooms(Number(e.target.value))} className="h-11 w-full rounded-lg border border-stone-200 bg-white px-2 text-sm">
              {Array.from({length:30},(_,i)=>i+1).map((n)=><option key={n} value={n}>{n} {n===1?"room":"rooms"}</option>)}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="adults" className="mb-1 block text-xs font-semibold text-[#57534E]">Adults</label>
            <select id="adults" value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="h-11 w-full rounded-lg border border-stone-200 bg-white px-2 text-sm">
              {Array.from({length:30},(_,i)=>i+1).map((n)=><option key={n} value={n}>{n} {n===1?"adult":"adults"}</option>)}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="children" className="mb-1 block text-xs font-semibold text-[#57534E]">Children</label>
            <select id="children" value={children} onChange={(e) => {const count=Number(e.target.value);setChildren(count);setChildAges((current)=>Array.from({length:count},(_,i)=>current[i] ?? -1));}} className="h-11 w-full rounded-lg border border-stone-200 bg-white px-2 text-sm">
              {Array.from({length:31},(_,i)=>i).map((n)=><option key={n} value={n}>{n} {n===1?"child":"children"}</option>)}
            </select>
          </div>
          {children > 0 && <div className="col-span-2 sm:col-span-3 lg:col-span-6">
            <p className="mb-2 text-xs font-semibold text-[#57534E]">Age of each child</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {childAges.map((age,index)=><label key={index} className="text-xs text-[#57534E]">Child {index+1}<select value={age} onChange={(e)=>setChildAges((current)=>current.map((v,i)=>i===index?Number(e.target.value):v))} className="mt-1 h-10 w-full rounded-lg border border-stone-200 bg-white px-2 text-sm"><option value={-1}>Select age</option>{Array.from({length:18},(_,n)=>n).map((n)=><option key={n} value={n}>{n} {n===1?"year":"years"}</option>)}</select></label>)}
            </div>
          </div>}
          <div className="col-span-2 sm:col-span-3 lg:col-span-6">
            {error && <p role="alert" className="mb-2 text-sm text-red-600">{error}</p>}
            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#4A5D4E] px-4 text-sm font-semibold text-white transition hover:bg-[#3B4A3E]"><Search size={16}/>Search stays</button>
          </div>
        </div>
      </form>
      {showLogin && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="search-login-title">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><h2 id="search-login-title" className="text-xl font-bold text-[#1C1917]">Sign in to check availability</h2><p className="mt-2 text-sm leading-6 text-gray-500">Create an account or log in to search with travel dates. Your search details will be kept.</p></div><button type="button" onClick={()=>setShowLogin(false)} aria-label="Close" className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><X size={18}/></button></div>
          <div className="mt-5 grid grid-cols-2 gap-3"><a href={`/login?next=${encodeURIComponent(`/properties?${query}`)}`} className="rounded-xl bg-[#4A5D4E] px-4 py-3 text-center text-sm font-bold text-white">Log in</a><a href={`/signup?next=${encodeURIComponent(`/properties?${query}`)}`} className="rounded-xl border border-[#DCE5DB] px-4 py-3 text-center text-sm font-bold text-[#34483B]">Create account</a></div>
          <button type="button" onClick={()=>{setShowLogin(false);setCheckIn("");setCheckOut("");}} className="mt-4 w-full text-sm font-semibold text-gray-500">Close and browse without dates</button>
        </div>
      </div>}
    </>
  );
}
