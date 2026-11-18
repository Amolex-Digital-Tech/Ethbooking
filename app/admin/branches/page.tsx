import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import BranchDirectory from "./branch-directory";
export const dynamic="force-dynamic";
export default async function AdminBranchesPage(){
 await requireRole("ADMIN","SUPER_ADMIN");
 const [branches,activeEmployees,linkedRefunds]=await Promise.all([
  prisma.branch.findMany({orderBy:[{city:"asc"},{name:"asc"}],include:{_count:{select:{members:true,cashRefunds:true}}}}),
  prisma.branchMember.count({where:{status:"ACTIVE"}}),
  prisma.cashRefund.count({where:{branchId:{not:null}}})
 ]);
 const active=branches.filter(b=>b.status==="ACTIVE").length;
 return <main className="min-h-full bg-[#F5F6F2] px-4 py-7 text-[#263B2D] sm:px-7 lg:px-9"><div className="mx-auto max-w-[1440px] space-y-6"><header><Link href="/admin" className="text-sm font-medium text-[#75816F] hover:underline">← Admin overview</Link><p className="mt-4 text-xs font-semibold tracking-[0.16em] text-[#75816F]">ADMINISTRATION / OPERATIONS</p><h1 className="mt-2 text-3xl font-semibold">Branch management</h1><p className="mt-2 text-sm text-[#77766F]">Register branch offices and manage employee assignments.</p></header>
 <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{label:"Total branches",value:branches.length},{label:"Active branches",value:active},{label:"Active employee assignments",value:activeEmployees},{label:"Refunds linked to branches",value:linkedRefunds}].map(x=><div key={x.label} className="rounded-2xl border border-[#E7E5DF] bg-white p-5"><p className="text-sm text-[#77766F]">{x.label}</p><p className="mt-2 text-2xl font-semibold">{x.value}</p></div>)}</section>
 <BranchDirectory branches={branches}/><p className="text-xs leading-5 text-[#89877F]">Historical cash refunds remain intact. Records created before branch registration are not automatically assigned to a branch.</p></div></main>;
}