import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthError } from "@/lib/auth/auth-error";
import { requireBranchMembership } from "@/lib/auth/require-branch-membership";
import BranchBookings from "./branch-bookings";

export const dynamic = "force-dynamic";

export default async function BranchBookingsPage() {
  let currentUser: Awaited<ReturnType<typeof requireBranchMembership>>;
  try {
    currentUser = await requireBranchMembership("MANAGER", "STAFF");
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) redirect("/staff/login?role=BRANCH_STAFF");
    if (error instanceof AuthError && error.status === 403) redirect("/");
    throw error;
  }

  return (
    <main className="min-h-screen bg-[#F5F6F2] px-4 py-8 text-[#263B2D] sm:px-7">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-[#E7E5DF] bg-white p-6">
          <Link href="/branch" className="text-xs font-semibold text-[#64765F] hover:underline">← Branch workspace</Link>
          <p className="mt-4 text-xs font-bold tracking-[0.18em] text-[#87917F]">ETHIOPIANBOOKING · PLATFORM-WIDE LOOKUP</p>
          <h1 className="mt-2 text-2xl font-semibold">All bookings</h1>
          <p className="mt-1 text-sm text-[#77766F]">Search and assist customers with bookings across EthiopianBooking. Your active branch: {currentUser.branchMembership.branch.name}.</p>
          <p className="mt-3 inline-flex rounded-full bg-[#EDF2E8] px-3 py-1.5 text-xs font-semibold">{currentUser.branchMembership.role === "MANAGER" ? "Branch Manager" : "Branch Staff"}</p>
        </header>
        <BranchBookings />
        <p className="text-xs leading-5 text-[#89877F]">Booking lookup is available to active branch employees across the platform. Payment processing, booking cancellation, and hotel check-in/check-out remain in their separately authorized workflows.</p>
      </div>
    </main>
  );
}
