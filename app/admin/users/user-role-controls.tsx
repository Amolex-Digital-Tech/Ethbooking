"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const roles=["SUPPORT_AGENT","FINANCE","CONTENT_MANAGER","ADMIN","SUPER_ADMIN"] as const;
export default function UserRoleControls({profileId,assigned}:{profileId:string;assigned:string[]}){
 const router=useRouter(),[role,setRole]=useState<(typeof roles)[number]>("SUPPORT_AGENT"),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function change(method:"POST"|"DELETE",value:string){
  setBusy(true);setMessage("");
  try{
   const response=await fetch(`/api/admin/users/${profileId}/roles`,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify({role:value})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Unable to update role.");
   setMessage(data.message||"Role updated.");router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:"Unable to update role.");}
  finally{setBusy(false);}
 }
 const available=roles.filter(r=>!assigned.includes(r));
 return <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#EDF0EA] pt-3">
  <select value={role} onChange={e=>setRole(e.target.value as (typeof roles)[number])} className="rounded-lg border border-[#E2E7DE] bg-white px-2.5 py-2 text-xs">
   {roles.map(r=><option key={r} value={r}>{r.replaceAll("_"," ")}</option>)}
  </select>
  <button type="button" disabled={busy||!available.includes(role)} onClick={()=>change("POST",role)} className="rounded-lg bg-[#234332] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Assign role</button>
  {assigned.filter(r=>roles.includes(r as (typeof roles)[number])).map(r=><button key={r} type="button" disabled={busy} onClick={()=>{if(window.confirm(`Remove ${r.replaceAll("_"," ")} from this user?`))void change("DELETE",r)}} className="rounded-lg border border-rose-200 px-2.5 py-2 text-[11px] font-semibold text-rose-700 disabled:opacity-40">Remove {r.replaceAll("_"," ")}</button>)}
  {message&&<p className="w-full text-[11px] text-[#64745F]">{message}</p>}
 </div>;
}
