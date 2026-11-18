import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";

export const dynamic="force-dynamic";
export default async function AdminSettingsPage(){
 await requireRole("ADMIN","SUPER_ADMIN");
 const [branches,admins,roles,refunds]=await Promise.all([
  prisma.branch.count(),prisma.userRole.count({where:{role:{name:{in:["ADMIN","SUPER_ADMIN"]}}}}),prisma.role.findMany({orderBy:{name:"asc"},select:{name:true,description:true}}),prisma.cashRefund.count(),
 ]);
 const sections=[
  {title:"Access & security",description:"Platform roles, privileged account assignments and branch employee controls.",href:"/admin/users",value:`${admins} administrator role assignments`},
  {title:"Branch operations",description:"Branch directory, active/inactive status, employee assignment and branch-level refund records.",href:"/admin/branches",value:`${branches} branches configured`},
  {title:"Financial operations",description:"Review financial reporting and recorded cash refund activity. Cash refund records are retained as operational evidence.",href:"/admin/reports",value:`${refunds} cash refund records`},
 ];
 return <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-7 lg:px-9"><div className="mb-8"><p className="text-xs font-bold tracking-[.18em] text-[#72836F]">ADMINISTRATION</p><h1 className="mt-2 text-3xl font-semibold text-[#20372B]">Platform settings</h1><p className="mt-2 text-sm text-[#737B70]">A central reference for operational configuration and access controls.</p></div>
 <div className="grid gap-4 md:grid-cols-3">{sections.map(s=><Link key={s.title} href={s.href} className="rounded-2xl border border-[#E4E8DF] bg-white p-5 transition hover:border-[#B8CBAF] hover:shadow-sm"><p className="text-sm font-semibold text-[#293D30]">{s.title}</p><p className="mt-2 min-h-12 text-xs leading-5 text-[#7B8578]">{s.description}</p><p className="mt-4 text-xs font-semibold text-[#58734F]">{s.value}</p><span className="mt-4 inline-block text-xs font-semibold text-[#293D30]">Open settings area →</span></Link>)}</div>
 <section className="mt-6 rounded-2xl border border-[#E4E8DF] bg-white p-5"><h2 className="text-sm font-semibold text-[#293D30]">Configured application roles</h2><p className="mt-1 text-xs text-[#818B7D]">Role definitions are currently application-managed. Assignment screens enforce the existing permission boundaries.</p><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{roles.map(r=><div key={r.name} className="rounded-xl bg-[#F7F8F5] p-3"><p className="text-xs font-semibold text-[#344B38]">{r.name.replaceAll("_"," ")}</p><p className="mt-1 text-[11px] text-[#7F897C]">{r.description||"No description configured"}</p></div>)}</div></section>
 <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-5 text-amber-900">Sensitive settings such as payment credentials, authentication secrets and platform-wide policy values are intentionally not editable from this page yet. They remain in protected deployment configuration until dedicated validation, audit and approval workflows are implemented.</div>
 </main>;
}
