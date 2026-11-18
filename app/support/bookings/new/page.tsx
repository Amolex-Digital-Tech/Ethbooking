import { redirect } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { AuthError } from "@/lib/auth/auth-error";
import SupportBookingForm from "./support-booking-form";

export const dynamic = "force-dynamic";

export default async function NewSupportBookingPage() {
  try {
    await requireRole("SUPPORT_AGENT");
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) redirect("/staff/login?role=SUPPORT_AGENT");
    if (error instanceof AuthError && error.status === 403) redirect("/staff/login?role=SUPPORT_AGENT&error=access");
    throw error;
  }

  return <main className="min-h-screen bg-[#F5F6F2] px-4 py-8 text-[#263B2D] sm:px-7">
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/support" className="text-sm font-semibold text-[#456044] hover:underline">← Back to Support workspace</Link>
      <header className="rounded-2xl border border-[#E5E8E0] bg-white p-6">
        <p className="text-[11px] font-bold tracking-[.18em] text-[#87917F]">ETHIOPIANBOOKING · OPERATIONS</p>
        <h1 className="mt-2 text-2xl font-semibold">Create a guest booking</h1>
        <p className="mt-2 text-sm text-[#77766F]">Book an approved property on behalf of a customer. The guest will receive a Chapa payment link by email.</p>
      </header>
      <SupportBookingForm />
    </div>
  </main>;
}
