import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";
type Params = { q?: string; action?: string; page?: string };
const fmt = (d: Date) => new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Addis_Ababa"}).format(d);

export default async function AuditLogsPage({searchParams}:{searchParams:Promise<Params>}) {
  await requireRole("ADMIN","SUPER_ADMIN");
  const p=await searchParams, page=Math.max(1,Number(p.page)||1), take=30, q=(p.q||"").trim();
  const where = {
    ...(p.action ? { action:p.action } : {}),
    ...(q ? { OR:[
      {description:{contains:q,mode:"insensitive" as const}},
      {entityType:{contains:q,mode:"insensitive" as const}},
      {entityId:{contains:q,mode:"insensitive" as const}},
      {action:{contains:q,mode:"insensitive" as const}},
      {actor:{is:{firstName:{contains:q,mode:"insensitive" as const}}}},
      {actor:{is:{lastName:{contains:q,mode:"insensitive" as const}}}},
    ]}:{}),
  };
  const [rows,total,actions]=await Promise.all([
    prisma.auditLog.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*take,take,include:{actor:{select:{firstName:true,lastName:true}}}}),
    prisma.auditLog.count({where}),
    prisma.auditLog.findMany({distinct:["action"],select:{action:true},orderBy:{action:"asc"}}),
  ]);
  const pages=Math.max(1,Math.ceil(total/take));
  const query=(next:number)=>{const x=new URLSearchParams();if(q)x.set("q",q);if(p.action)x.set("action",p.action);x.set("page",String(next));return `/admin/audit-logs?${x.toString()}`;};
  return <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-7 lg:px-9"><div className="mb-7"><Link href="/admin/activity" className="text-xs font-semibold text-[#597451] hover:underline">← Activity & alerts</Link><p className="mt-5 text-xs font-bold tracking-[.18em] text-[#72836F]">SECURITY & GOVERNANCE</p><h1 className="mt-2 text-3xl font-semibold text-[#20372B]">Audit history</h1><p className="mt-2 text-sm text-[#737B70]">A chronological record of administrative actions captured by the application.</p></div>
  <form className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#E4E8DF] bg-white p-4 sm:flex-row"><input name="q" defaultValue={q} placeholder="Search action, description, entity or user…" className="min-w-0 flex-1 rounded-xl border border-[#E2E7DE] px-3 py-2.5 text-sm outline-none focus:border-[#78946E]"/><select name="action" defaultValue={p.action||""} className="rounded-xl border border-[#E2E7DE] px-3 py-2.5 text-sm"><option value="">All actions</option>{actions.map(a=><option key={a.action} value={a.action}>{a.action}</option>)}</select><button className="rounded-xl bg-[#234332] px-5 py-2.5 text-sm font-semibold text-white">Filter</button></form>
  <section className="overflow-hidden rounded-2xl border border-[#E4E8DF] bg-white"><div className="flex justify-between border-b border-[#EDF0EA] px-5 py-4"><p className="text-sm font-semibold text-[#293D30]">Audit events</p><p className="text-xs text-[#7F897D]">{total.toLocaleString()} records</p></div>{rows.length?<div className="divide-y divide-[#EFF1EC]">{rows.map(log=><article key={log.id} className="grid gap-2 px-5 py-4 md:grid-cols-[minmax(0,1fr)_190px]"><div><p className="text-sm font-semibold text-[#293D30]">{log.description}</p><div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#798477]"><span className="rounded-md bg-[#F2F5EF] px-2 py-1">{log.action}</span><span>{log.entityType}{log.entityId? ` · ${log.entityId}`:""}</span><span>By {[log.actor?.firstName,log.actor?.lastName].filter(Boolean).join(" ")||"System"}</span>{log.actorRole&&<span>{log.actorRole}</span>}</div>{log.metadata&&<details className="mt-2"><summary className="cursor-pointer text-[11px] font-medium text-[#58734F]">View event details</summary><pre className="mt-2 overflow-x-auto rounded-lg bg-[#F7F8F5] p-3 text-[11px] text-[#566253]">{JSON.stringify(log.metadata,null,2)}</pre></details>}</div><time className="text-xs text-[#899186] md:text-right">{fmt(log.createdAt)}</time></article>)}</div>:<p className="p-8 text-center text-sm text-[#7C8579]">No matching audit events.</p>}<div className="flex items-center justify-between border-t border-[#EDF0EA] px-5 py-4 text-xs text-[#737B70]"><span>Page {page} of {pages}</span><div className="flex gap-2">{page>1&&<Link className="rounded-lg border px-3 py-2" href={query(page-1)}>Previous</Link>}{page<pages&&<Link className="rounded-lg border px-3 py-2" href={query(page+1)}>Next</Link>}</div></div></section></main>;
}
