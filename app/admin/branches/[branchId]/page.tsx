import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import BranchEmployees from "./branch-employees";
type Props={params:Promise<{branchId:string}>};
export const dynamic="force-dynamic";
export default async function AdminBranchDetailsPage({params}:Props){
 await requireRole("ADMIN","SUPER_ADMIN");const {branchId}=await params;
 const branch=await prisma.branch.findUnique({where:{id:branchId},select:{id:true,name:true,code:true,city:true,status:true}});
 if(!branch)notFound();
 return <main className="min-h-full bg-[#F5F6F2] px-4 py-7 text-[#263B2D] sm:px-7 lg:px-9"><div className="mx-auto max-w-[1200px] space-y-6"><header><Link href="/admin/branches" className="text-sm font-medium text-[#75816F] hover:underline">← Back to branches</Link><p className="mt-4 text-xs font-semibold tracking-[0.16em] text-[#75816F]">BRANCH MANAGEMENT</p><h1 className="mt-2 text-3xl font-semibold">{branch.name}</h1><p className="mt-2 text-sm text-[#77766F]">{branch.code} · {branch.city} · {branch.status}</p></header><BranchEmployees branchId={branch.id}/></div></main>;
}