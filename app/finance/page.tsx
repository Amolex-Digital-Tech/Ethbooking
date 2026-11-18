import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { AuthError } from "@/lib/auth/auth-error";

export const dynamic = "force-dynamic";

export default async function FinanceWorkspacePage() {
  try {
    await requireRole("FINANCE");
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) redirect("/staff/login?role=FINANCE");
    if (error instanceof AuthError && error.status === 403) redirect("/staff/login?role=FINANCE&error=access");
    throw error;
  }

  return (
    <main className="min-h-screen bg-[#F5F6F2] px-4 py-8 text-[#263B2D] sm:px-7">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-[#E5E8E0] bg-white p-6">
          <p className="text-xs font-bold tracking-[.18em] text-[#87917F]">ETHIOPIANBOOKING · FINANCE WORKSPACE</p>
          <h1 className="mt-2 text-2xl font-semibold">Finance workspace</h1>
          <p className="mt-2 text-sm text-[#77766F]">Your Finance role provides platform-wide access to financial information across all EthiopianBooking branches.</p>
          <span className="mt-4 inline-flex rounded-full bg-[#EDF2E8] px-3 py-1.5 text-xs font-semibold text-[#466044]">Finance · All branches</span>
        </header>
        <section className="rounded-2xl border border-[#E5E8E0] bg-white p-6">
          <h2 className="text-lg font-semibold">Financial reports</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#77766F]">Review booking revenue, platform commission, partner earnings, payment fees, and refund monitoring. Reports include data from all branches.</p>
          <Link href="/admin/reports" className="mt-5 inline-flex rounded-xl bg-[#294A35] px-5 py-3 text-sm font-semibold text-white hover:bg-[#355B40]">Open financial reports →</Link>
        </section>
        <p className="text-xs text-[#89877F]">Finance access does not grant administrator permissions or branch employee membership.</p>
      </div>
    </main>
  );
}
