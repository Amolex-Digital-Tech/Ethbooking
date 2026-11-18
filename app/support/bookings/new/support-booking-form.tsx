"use client";

import { useEffect, useState } from "react";

type RatePlan = { id: string; name: string; basePrice: string; currency: string; mealPlan: string; cancellationPolicy: string };
type RoomType = { id: string; name: string; maxGuests: number; maxAdults: number | null; maxChildren: number | null; totalUnits: number; ratePlans: RatePlan[] };
type Property = { id: string; name: string; location: { city: string; region: string | null }; roomTypes: RoomType[] };
type Guest = { firstName: string; lastName: string; ageAtBooking: string };

export default function SupportBookingForm() {
  const [properties,setProperties] = useState<Property[]>([]);
  const [propertyId,setPropertyId] = useState("");
  const [roomTypeId,setRoomTypeId] = useState("");
  const [ratePlanId,setRatePlanId] = useState("");
  const [quantity,setQuantity] = useState(1);
  const [checkInDate,setCheckInDate] = useState("");
  const [checkOutDate,setCheckOutDate] = useState("");
  const [adults,setAdults] = useState(1);
  const [children,setChildren] = useState(0);
  const [firstName,setFirstName] = useState("");
  const [lastName,setLastName] = useState("");
  const [email,setEmail] = useState("");
  const [phone,setPhone] = useState("");
  const [country,setCountry] = useState("Ethiopia");
  const [guestNames,setGuestNames] = useState<Guest[]>([{firstName:"",lastName:"",ageAtBooking:""}]);
  const [specialRequests,setSpecialRequests] = useState("");
  const [busy,setBusy] = useState(false);
  const [retrying,setRetrying] = useState(false);
  const [error,setError] = useState("");
  const [result,setResult] = useState<{bookingId:string;bookingReference:string;totalAmount:string;currency:string;checkoutUrl:string|null;paymentError:string|null;paymentEmailSent:boolean}|null>(null);

  useEffect(()=>{ fetch("/api/support/booking-options",{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load properties");setProperties(d.data||[]);}).catch(e=>setError(e.message)); },[]);
  const property=properties.find(p=>p.id===propertyId);
  const room=property?.roomTypes.find(r=>r.id===roomTypeId);
  const rate=room?.ratePlans.find(r=>r.id===ratePlanId);
  const totalGuests=adults+children;
  const today=new Date().toLocaleDateString("en-CA");
  function resizeGuestNames(adultCount: number, childCount: number) {
    setGuestNames((previous) =>
      Array.from({ length: adultCount + childCount }, (_, index) =>
        previous[index] || {
          firstName: index === 0 ? firstName : "",
          lastName: "",
          ageAtBooking: "",
        },
      ),
    );
  }
  const estimatedTotal = rate ? Number(rate.basePrice) * quantity : 0;

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");setResult(null);
    try{
      const response=await fetch("/api/support/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        checkInDate,checkOutDate,adults,children,customerFirstName:firstName,customerLastName:lastName,customerEmail:email,customerPhone:phone,customerCountry:country,specialRequests,
        roomItems:[{roomTypeId,ratePlanId,quantity}],
        guestDetails:guestNames.map((g,i)=>({firstName:g.firstName,lastName:g.lastName,email:i===0?email:undefined,phone:i===0?phone:undefined,ageAtBooking:i>=adults?Number(g.ageAtBooking):null}))
      })});
      const data=await response.json();if(!response.ok||!data.success)throw new Error(data.error||"Unable to create booking");
      setResult({bookingId:data.data.bookingId,bookingReference:data.data.bookingReference,totalAmount:data.data.totalAmount,currency:data.data.currency,checkoutUrl:data.data.payment?.checkoutUrl||null,paymentError:data.data.paymentError,paymentEmailSent:Boolean(data.data.paymentEmailSent)});
    }catch(e){setError(e instanceof Error?e.message:"Unable to create booking");}
    finally{setBusy(false);}
  }

  async function retryPaymentLink() {
    if (!result) return;
    setRetrying(true); setError("");
    try {
      const response = await fetch("/api/support/bookings/" + result.bookingId + "/payment", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to prepare payment link");
      setResult({ ...result, checkoutUrl: data.data.checkoutUrl, paymentError: null, paymentEmailSent: Boolean(data.data.emailSent) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to retry payment");
    } finally {
      setRetrying(false);
    }
  }
  const field="h-11 w-full rounded-xl border border-[#DDE3D9] bg-white px-3 text-sm outline-none focus:border-[#718A67] focus:ring-4 focus:ring-[#718A67]/10";
  const label="mb-1.5 block text-xs font-semibold text-[#53634F]";
  if(result)return <section className="rounded-2xl border border-[#DCE7D7] bg-white p-6">
    <h2 className="text-xl font-semibold">Booking created</h2>
    <p className="mt-2 text-sm text-[#667260]">Reference: <strong>{result.bookingReference}</strong></p>
    <p className="mt-1 text-sm">Amount: <strong>{result.currency} {Number(result.totalAmount).toLocaleString()}</strong></p>
    {result.checkoutUrl?<div className="mt-5 space-y-3"><p className="text-sm text-emerald-800">{result.paymentEmailSent?"The Chapa payment link was sent to the guest by email.":"The Chapa payment link was created, but the email could not be confirmed as delivered. Please copy the checkout link and send it to the guest."}</p><a href={result.checkoutUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-xl bg-[#294A35] px-4 py-3 text-sm font-semibold text-white">Open Chapa checkout ↗</a>{!result.paymentEmailSent&&<button type="button" onClick={retryPaymentLink} disabled={retrying} className="rounded-xl border border-[#DDE3D9] px-4 py-3 text-sm font-semibold disabled:opacity-50">{retrying?"Sending…":"Resend payment email"}</button>}</div>:<div className="mt-4 space-y-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><p>The booking was created, but checkout could not be initialized: {result.paymentError||"Please retry payment initialization."}</p><button type="button" onClick={retryPaymentLink} disabled={retrying} className="rounded-xl bg-[#294A35] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{retrying?"Preparing…":"Retry Chapa payment link"}</button></div>}
    <button onClick={()=>{setResult(null);setPropertyId("");setRoomTypeId("");setRatePlanId("");setFirstName("");setLastName("");setEmail("");setPhone("");}} className="mt-6 rounded-xl border border-[#DDE3D9] px-4 py-2.5 text-sm font-semibold">Create another booking</button>
  </section>;

  return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-[#E5E8E0] bg-white p-5 sm:p-7">
    {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <section className="space-y-4"><h2 className="font-semibold">1. Property and room</h2>
      <div><label className={label}>Approved property</label><select required className={field} value={propertyId} onChange={e=>{setPropertyId(e.target.value);setRoomTypeId("");setRatePlanId("");}}><option value="">Choose property</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name} — {p.location.city}</option>)}</select></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><label className={label}>Room type</label><select required disabled={!property} className={field} value={roomTypeId} onChange={e=>{setRoomTypeId(e.target.value);setRatePlanId("");}}><option value="">Choose room</option>{property?.roomTypes.map(r=><option key={r.id} value={r.id}>{r.name} (up to {r.maxGuests} guests)</option>)}</select></div><div><label className={label}>Rate plan</label><select required disabled={!room} className={field} value={ratePlanId} onChange={e=>setRatePlanId(e.target.value)}><option value="">Choose rate</option>{room?.ratePlans.map(r=><option key={r.id} value={r.id}>{r.name} · ETB {Number(r.basePrice).toLocaleString()} / night</option>)}</select></div></div>
      <div className="grid gap-3 sm:grid-cols-3"><div><label className={label}>Check-in</label><input required type="date" min={today} className={field} value={checkInDate} onChange={e=>setCheckInDate(e.target.value)}/></div><div><label className={label}>Check-out</label><input required type="date" min={checkInDate||today} className={field} value={checkOutDate} onChange={e=>setCheckOutDate(e.target.value)}/></div><div><label className={label}>Rooms</label><input required type="number" min="1" max={room?.totalUnits||30} className={field} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></div></div>
      <div className="grid gap-3 sm:grid-cols-3"><div><label className={label}>Adults</label><input type="number" min="1" max="30" className={field} value={adults} onChange={e=>{const nextAdults=Math.max(1,Number(e.target.value));setAdults(nextAdults);resizeGuestNames(nextAdults,children);}}/></div><div><label className={label}>Children</label><input type="number" min="0" max="29" className={field} value={children} onChange={e=>{const nextChildren=Math.max(0,Number(e.target.value));setChildren(nextChildren);resizeGuestNames(adults,nextChildren);}}/></div><div className="rounded-xl bg-[#F4F6F1] p-3"><p className="text-xs text-[#788272]">Estimated room total</p><p className="mt-1 font-semibold">ETB {estimatedTotal.toLocaleString()}</p><p className="text-[10px] text-[#8A9186]">Per night estimate; final price uses stay dates</p></div></div>
    </section>
    <hr className="border-[#EEF0EB]"/>
    <section className="space-y-4"><h2 className="font-semibold">2. Booking contact</h2>
      <div className="grid gap-3 sm:grid-cols-2"><div><label className={label}>First name</label><input required className={field} value={firstName} onChange={e=>{setFirstName(e.target.value);setGuestNames(prev=>prev.map((g,i)=>i===0?{...g,firstName:e.target.value}:g));}}/></div><div><label className={label}>Last name</label><input className={field} value={lastName} onChange={e=>setLastName(e.target.value)}/></div><div><label className={label}>Email (payment link recipient)</label><input required type="email" className={field} value={email} onChange={e=>setEmail(e.target.value)}/></div><div><label className={label}>Phone</label><input className={field} value={phone} onChange={e=>setPhone(e.target.value)}/></div><div><label className={label}>Country</label><input required className={field} value={country} onChange={e=>setCountry(e.target.value)}/></div></div>
    </section>
    <hr className="border-[#EEF0EB]"/>
    <section className="space-y-3"><h2 className="font-semibold">3. Guest details</h2><p className="text-xs text-[#858B80]">Enter a first name for every guest. Children require their age.</p>
      {guestNames.map((guest,i)=><div key={i} className="grid gap-2 rounded-xl bg-[#F8F9F6] p-3 sm:grid-cols-[1fr_1fr_130px]"><div><label className={label}>{i===0?"Primary guest":i<adults?"Adult guest "+(i+1):"Child guest "+(i-adults+1)} · first name</label><input required className={field} value={guest.firstName} onChange={e=>setGuestNames(prev=>prev.map((g,j)=>j===i?{...g,firstName:e.target.value}:g))}/></div><div><label className={label}>Last name</label><input className={field} value={guest.lastName} onChange={e=>setGuestNames(prev=>prev.map((g,j)=>j===i?{...g,lastName:e.target.value}:g))}/></div>{i>=adults&&<div><label className={label}>Age</label><input required type="number" min="0" max="17" className={field} value={guest.ageAtBooking} onChange={e=>setGuestNames(prev=>prev.map((g,j)=>j===i?{...g,ageAtBooking:e.target.value}:g))}/></div>}</div>)}
    </section>
    <div><label className={label}>Special requests (optional)</label><textarea rows={3} maxLength={2000} className="w-full rounded-xl border border-[#DDE3D9] p-3 text-sm outline-none focus:border-[#718A67]" value={specialRequests} onChange={e=>setSpecialRequests(e.target.value)}/></div>
    <button disabled={busy||!ratePlanId||!checkInDate||!checkOutDate||!email} className="w-full rounded-xl bg-[#294A35] px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-50">{busy?"Creating booking and preparing Chapa…":"Create booking and send payment link"}</button>
    <p className="text-[11px] leading-5 text-[#899184]">Room availability and final date-based pricing are checked again securely when the booking is submitted. A 15-minute inventory hold applies while payment is pending.</p>
  </form>;
}
