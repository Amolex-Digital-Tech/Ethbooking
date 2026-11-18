import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma/client";

export default async function WorkspacePage() {
  const currentUser = await requireAuth();
  const [memberships, pendingApplications] = await Promise.all([
    prisma.partnerMember.findMany({
      where: {
        profileId: currentUser.profile.id,
        status: "ACTIVE",
        partner: { is: { status: "ACTIVE" } },
      },
      include: { partner: { select: { id: true, businessName: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.partnerMember.findMany({
      where: {
        profileId: currentUser.profile.id,
        status: "INVITED",
        partner: { is: { status: "PENDING" } },
      },
      include: { partner: { select: { id: true, businessName: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const roles = currentUser.roles;
  const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
  const isCustomer = roles.includes("CUSTOMER");
  const hasPartnerRole = roles.includes("PARTNER_OWNER") || roles.includes("PARTNER_MANAGER") || roles.includes("PARTNER_STAFF");
  const partnerMemberships = memberships.filter((membership) =>
    hasPartnerRole
  );

  const workspaceCount = Number(isCustomer) + Number(isAdmin) + partnerMemberships.length;
  if (workspaceCount === 1) {
    if (isAdmin) redirect("/admin/properties");
    if (partnerMemberships[0]) redirect(`/partner?partnerId=${partnerMemberships[0].partner.id}`);
    if (isCustomer) redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">EthiopianBooking</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Choose your workspace</h1>
        <p className="mt-2 text-slate-600">Your account can access more than one area. Choose where you want to continue.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {isCustomer && (
            <Link href="/" className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-blue-400 hover:shadow-sm">
              <h2 className="text-lg font-semibold">Customer</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Discover stays, manage your bookings, and update your profile.</p>
              <span className="mt-5 inline-block text-sm font-semibold text-blue-700">Continue to customer site →</span>
            </Link>
          )}

          {partnerMemberships.map(({ partner }) => (
            <Link key={partner.id} href={`/partner?partnerId=${partner.id}`} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-blue-400 hover:shadow-sm">
              <h2 className="text-lg font-semibold">Partner · {partner.businessName}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Manage this accommodation, rooms, availability, and rates.</p>
              <span className="mt-5 inline-block text-sm font-semibold text-blue-700">Open partner workspace →</span>
            </Link>
          ))}

          {isAdmin && (
            <Link href="/admin/properties" className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-blue-400 hover:shadow-sm">
              <h2 className="text-lg font-semibold">Administration</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Review accommodation submissions and manage platform operations.</p>
              <span className="mt-5 inline-block text-sm font-semibold text-blue-700">Open admin workspace →</span>
            </Link>
          )}
        </div>

        {pendingApplications.length > 0 && (
          <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-amber-950">Partner applications under review</h2>
            <p className="mt-1 text-sm text-amber-900">These applications do not grant partner dashboard access until an administrator approves them.</p>
            <ul className="mt-3 space-y-2 text-sm text-amber-950">
              {pendingApplications.map(({ partner }) => (
                <li key={partner.id}>{partner.businessName} · Application ID: <code>{partner.id}</code></li>
              ))}
            </ul>
          </section>
        )}

        {workspaceCount === 0 && pendingApplications.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold">No active workspaces yet</h2>
            <p className="mt-2 text-sm text-slate-500">Your account does not currently have an enabled workspace. If you applied to become a partner, check back after review.</p>
            <Link href="/partner/apply" className="mt-4 inline-block text-sm font-semibold text-blue-700">Apply to become a partner →</Link>
          </div>
        )}
      </div>
    </main>
  );
}
