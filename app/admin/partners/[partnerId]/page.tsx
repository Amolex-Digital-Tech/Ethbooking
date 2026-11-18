import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import PartnerProfileEditor from "./partner-profile-editor";
import PartnerStaffManager from "../../../partner/team/partner-staff-manager";

export const dynamic = "force-dynamic";

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value);
}

function statusClass(status: string) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "bg-amber-50 text-amber-700";
  if (status === "SUSPENDED") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminPartnerDetailPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { partnerId } = await params;

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: {
      members: {
        orderBy: { createdAt: "asc" },
        include: {
          profile: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              userRoles: { include: { role: { select: { name: true } } } },
            },
          },
        },
      },
      properties: {
        orderBy: { createdAt: "desc" },
        include: {
          location: { select: { city: true, region: true } },
          _count: { select: { roomTypes: true, documents: true, photos: true } },
        },
      },
    },
  });

  if (!partner) notFound();

  const activeMembers = partner.members.filter((member) => member.status === "ACTIVE").length;
  const approvedProperties = partner.properties.filter((property) => property.status === "APPROVED").length;

  return (
    <main className="min-h-full bg-[#F5F6F2] px-4 py-7 sm:px-7 lg:px-9">
      <div className="mx-auto max-w-[1440px]">
        <Link href="/admin/partners" className="text-sm font-semibold text-[#58745A] hover:underline">← All partners</Link>

        <header className="mt-5 flex flex-col justify-between gap-4 rounded-2xl border border-[#E5E9E1] bg-white p-6 sm:flex-row sm:items-start">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#879487]">PARTNER PROFILE</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-[#20372B]">{partner.businessName}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(partner.status)}`}>{partner.status.replaceAll("_", " ")}</span>
            </div>
            <p className="mt-2 text-sm text-[#788279]">Registered {dateLabel(partner.createdAt)} · Updated {dateLabel(partner.updatedAt)}</p>
          </div>
          <Link href="/admin/properties" className="rounded-xl border border-[#DCE4D8] px-4 py-2.5 text-sm font-semibold text-[#36513C] hover:bg-[#F5F8F2]">Browse all properties</Link>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Properties", partner.properties.length],
            ["Approved properties", approvedProperties],
            ["Team members", partner.members.length],
            ["Active members", activeMembers],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[#E5E9E1] bg-white p-5">
              <p className="text-sm text-[#788279]">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#20372B]">{value}</p>
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <section className="rounded-2xl border border-[#E5E9E1] bg-white p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-[#20372B]">Business information</h2>
              <p className="mt-1 text-xs text-[#879087]">Review and update the partner&apos;s registered details.</p>
            </div>
            <PartnerProfileEditor partner={{
              id: partner.id,
              businessName: partner.businessName,
              legalName: partner.legalName,
              email: partner.email,
              phone: partner.phone,
            }} />
          </section>

          <section className="rounded-2xl border border-[#E5E9E1] bg-white">
            <div className="border-b border-[#EDF0EA] px-6 py-5">
              <h2 className="font-semibold text-[#20372B]">Property portfolio</h2>
              <p className="mt-1 text-xs text-[#879087]">Properties registered under this partner account.</p>
            </div>
            {partner.properties.length === 0 ? (
              <p className="p-6 text-sm text-[#788279]">This partner has not registered any properties yet.</p>
            ) : (
              <div className="divide-y divide-[#EDF0EA]">
                {partner.properties.map((property) => (
                  <Link key={property.id} href={`/admin/properties/${property.id}`} className="flex flex-col justify-between gap-3 px-6 py-4 transition hover:bg-[#FAFBF8] sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-semibold text-[#294332]">{property.name}</p>
                      <p className="mt-1 text-xs text-[#879087]">{[property.location.city, property.location.region].filter(Boolean).join(", ")} · {property._count.roomTypes} room types · {property._count.photos} photos · {property._count.documents} documents</p>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-[11px] font-semibold ${statusClass(property.status)}`}>{property.status.replaceAll("_", " ")}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-[#E5E9E1] bg-white p-6">
          <h2 className="font-semibold text-[#20372B]">Front desk staff access</h2>
          <p className="mt-1 mb-5 text-xs text-[#879087]">Invite and manage front desk accounts for this partner.</p>
          <PartnerStaffManager partnerId={partner.id} />
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#E5E9E1] bg-white">
          <div className="border-b border-[#EDF0EA] px-6 py-5">
            <h2 className="font-semibold text-[#20372B]">Partner team</h2>
            <p className="mt-1 text-xs text-[#879087]">People linked to this partner and their current membership status.</p>
          </div>
          {partner.members.length === 0 ? (
            <p className="p-6 text-sm text-[#788279]">No team members are linked to this partner.</p>
          ) : (
            <div className="divide-y divide-[#EDF0EA]">
              {partner.members.map((member) => {
                const name = [member.profile.firstName, member.profile.lastName].filter(Boolean).join(" ") || "Unnamed member";
                const roles = member.profile.userRoles.map((entry) => entry.role.name.replaceAll("_", " "));
                return (
                  <div key={member.id} className="flex flex-col justify-between gap-2 px-6 py-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-semibold text-[#294332]">{name}</p>
                      <p className="mt-1 text-xs text-[#879087]">{member.profile.phone || "No phone number"} · {roles.join(", ") || "No assigned role"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${member.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{member.status}</span>
                      <span className="text-xs text-[#9AA39A]">Joined {dateLabel(member.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
