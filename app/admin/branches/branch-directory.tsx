"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Branch={id:string;name:string;code:string;address:string;city:string;phone:string|null;email:string|null;status:"ACTIVE"|"INACTIVE";_count:{members:number;cashRefunds:number}};
export default function BranchDirectory({branches}:{branches:Branch[]}) {
 const router=useRouter();
 const [form,setForm]=useState({name:"",code:"",address:"",city:"Addis Ababa",phone:"",email:""});
 const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [message,setMessage]=useState("");
 async function createBranch(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");setMessage("");try{const r=await fetch("/api/admin/branches",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const d=await r.json();if(!r.ok||!d.success)throw new Error(d.error||"Could not create branch.");setForm({name:"",code:"",address:"",city:"Addis Ababa",phone:"",email:""});setMessage("Branch created.");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Something went wrong.");}finally{setBusy(false);}}
 async function toggle(b:Branch){const status=b.status==="ACTIVE"?"INACTIVE":"ACTIVE";if(!window.confirm((status==="INACTIVE"?"Deactivate ":"Activate ")+b.name+"?"))return;setBusy(true);setError("");setMessage("");try{const r=await fetch("/api/admin/branches/"+b.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});const d=await r.json();if(!r.ok||!d.success)throw new Error(d.error||"Could not update branch.");setMessage(d.message);router.refresh();}catch(e){setError(e instanceof Error?e.message:"Something went wrong.");}finally{setBusy(false);}}
 const input="w-full rounded-xl border border-[#D9DED5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#536D50]";
 return <div className="space-y-6">
 {error&&<p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message&&<p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
 <section className="rounded-2xl border border-[#E7E5DF] bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Register a new branch</h2><p className="mt-1 text-sm text-[#77766F]">Create a branch before assigning employees.</p>
 <form onSubmit={createBranch} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
 <input required minLength={2} maxLength={120} className={input} placeholder="Branch name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
 <input required minLength={2} maxLength={20} pattern="[A-Za-z0-9-]+" className={input} placeholder="Unique code (e.g. ADD-01)" value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})}/>
 <input required minLength={2} className={input} placeholder="City" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/>
 <input required minLength={5} maxLength={300} className={input+" sm:col-span-2 lg:col-span-3"} placeholder="Full street address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>
 <input className={input} placeholder="Branch phone (optional)" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
 <input type="email" className={input} placeholder="Branch email (optional)" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
 <div className="flex items-center"><button disabled={busy} className="rounded-xl bg-[#263B2D] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy?"Saving...":"Create branch"}</button></div></form></section>
 <section className="overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white"><div className="border-b border-[#EEECE6] px-5 py-4"><h2 className="font-semibold">Registered branches</h2><p className="mt-1 text-xs text-[#89877F]">{branches.length} branch record(s)</p></div>
 {branches.length===0?<p className="p-8 text-center text-sm text-[#77766F]">No branches registered yet.</p>:<div className="divide-y divide-[#EEECE6]">{branches.map(b=><article key={b.id} className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{b.name}</h3><span className="rounded-full bg-[#F1F0EB] px-2.5 py-1 text-xs">{b.code}</span><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs">{b.status}</span></div><p className="mt-2 text-sm text-[#77766F]">{b.address}, {b.city}</p><p className="mt-1 text-xs text-[#89877F]">{b._count.members} employee(s) · {b._count.cashRefunds} linked refund(s)</p></div><div className="flex flex-wrap gap-2"><Link href={"/admin/branches/"+b.id} className="rounded-lg border border-[#D9DED5] px-3 py-2 text-xs font-semibold text-[#36513C]">Manage employees</Link><button disabled={busy} onClick={()=>toggle(b)} className="rounded-lg border border-[#D9DED5] px-3 py-2 text-xs font-semibold disabled:opacity-50">{b.status==="ACTIVE"?"Deactivate":"Activate"}</button></div></article>)}</div>}</section></div>;
}