import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

function formatLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) =>
    char.toUpperCase()
  );
}

function getStatusStyle(status: string) {
  if (status === "APPROVED" || status === "PUBLISHED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "REJECTED" || status === "SUSPENDED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default async function PartnerPropertiesPage() {
  const currentUser = await requireRole(
    "PARTNER_OWNER",
    "PARTNER_MANAGER"
  );

  const membership = await prisma.partnerMember.findFirst({
    where: {
      profileId: currentUser.profile.id,
      status: "ACTIVE",
    },
    include: {
      partner: {
        include: {
          properties: {
            orderBy: {
              createdAt: "desc",
            },
            include: {
              location: {
                select: {
                  city: true,
                  subCity: true,
                  neighborhood: true,
                },
              },
              roomTypes: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!membership) {
    return (
      <main className="min-h-screen bg-[#F4F3EF] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#E7E5DF] bg-white p-8">
          <h1 className="text-2xl font-semibold text-[#263B2D]">
            Partner account not found
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#77766F]">
            We could not find an active partner membership linked to your
            account. Please contact EthiopianBooking support.
          </p>
          <Link
            href="/partner"
            className="mt-6 inline-flex rounded-xl bg-[#405744] px-5 py-3 text-sm font-medium text-white hover:bg-[#304532]"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const partner = membership.partner;

  if (partner.status !== "ACTIVE" && partner.status !== "PENDING") {
    return (
      <main className="min-h-screen bg-[#F4F3EF] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#E7E5DF] bg-white p-8">
          <h1 className="text-2xl font-semibold text-[#263B2D]">
            Property management unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#77766F]">
            Your partner account is currently{" "}
            {formatLabel(partner.status)}. Property management is unavailable
            until your partner account is reactivated.
          </p>
          <Link
            href="/partner"
            className="mt-6 inline-flex rounded-xl bg-[#405744] px-5 py-3 text-sm font-medium text-white hover:bg-[#304532]"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const properties = partner.properties;

  const approvedCount = properties.filter(
    (property) => property.status === "APPROVED"
  ).length;

  const pendingCount = properties.filter((property) =>
    ["PENDING_REVIEW", "UNDER_REVIEW"].includes(property.status)
  ).length;

  const totalRoomTypes = properties.reduce(
    (total, property) => total + property.roomTypes.length,
    0
  );

  return (
    <main className="min-h-screen bg-[#F4F3EF] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-[#75816F]">
              ETHIOPIANBOOKING / PARTNER PORTAL
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#263B2D]">
              My Properties
            </h1>
            <p className="mt-2 text-sm text-[#77766F]">
              Manage all accommodation listings registered under{" "}
              {partner.businessName}.
            </p>
          </div>

          <Link
            href="/partner/properties/new"
            className="inline-flex w-fit items-center justify-center rounded-xl bg-[#405744] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#304532]"
          >
            + Add New Property
          </Link>
        </header>

        {partner.status === "PENDING" && (
          <div className="mb-6 rounded-2xl border border-[#E8DDBB] bg-[#FFF9E9] p-5">
            <p className="font-semibold text-[#665329]">
              Your partner account is awaiting approval
            </p>
            <p className="mt-1 text-sm text-[#806D43]">
              You can continue configuring your properties while your partner
              account is under review. Booking and financial features remain
              unavailable until activation.
            </p>
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
            <p className="text-sm text-[#77766F]">Total properties</p>
            <p className="mt-3 text-3xl font-semibold text-[#263B2D]">
              {properties.length}
            </p>
            <p className="mt-2 text-xs text-[#89877F]">
              Registered under your partner account
            </p>
          </div>

          <div className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
            <p className="text-sm text-[#77766F]">Approved properties</p>
            <p className="mt-3 text-3xl font-semibold text-emerald-700">
              {approvedCount}
            </p>
            <p className="mt-2 text-xs text-[#89877F]">
              {pendingCount} awaiting review
            </p>
          </div>

          <div className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
            <p className="text-sm text-[#77766F]">Room types</p>
            <p className="mt-3 text-3xl font-semibold text-[#263B2D]">
              {totalRoomTypes}
            </p>
            <p className="mt-2 text-xs text-[#89877F]">
              Across all your properties
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white">
          <div className="flex flex-col justify-between gap-2 border-b border-[#EEECE6] px-5 py-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-[#263B2D]">
                Your accommodation listings
              </h2>
              <p className="mt-1 text-xs text-[#89877F]">
                Select a property to manage its information, photos, documents,
                rooms, and inventory.
              </p>
            </div>

            <span className="w-fit rounded-full bg-[#F3F4EF] px-3 py-1.5 text-xs font-medium text-[#62665D]">
              {properties.length}{" "}
              {properties.length === 1 ? "property" : "properties"}
            </span>
          </div>

          {properties.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3EC] text-2xl text-[#536D50]">
                ▦
              </div>
              <h3 className="mt-5 text-lg font-semibold text-[#263B2D]">
                No properties yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#77766F]">
                You have not registered any accommodation properties. Add your
                first property to start managing your listings.
              </p>
              <Link
                href="/partner/properties/new"
                className="mt-6 inline-flex rounded-xl bg-[#405744] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#304532]"
              >
                Register Your First Property
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#EEECE6]">
              {properties.map((property) => {
                const location = [
                  property.location?.neighborhood,
                  property.location?.subCity,
                  property.location?.city,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <div
                    key={property.id}
                    className="flex flex-col justify-between gap-5 px-5 py-5 transition hover:bg-[#FAF9F6] sm:flex-row sm:items-center sm:px-6"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-[#263B2D]">
                        {property.name}
                      </h3>
                      <p className="mt-1 text-sm text-[#77766F]">
                        {location || "Location not specified"}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusStyle(property.status)}`}
                        >
                          {formatLabel(property.status)}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusStyle(property.verificationStatus)}`}
                        >
                          Verification: {formatLabel(property.verificationStatus)}
                        </span>
                        <span className="rounded-full bg-[#F1F0EB] px-3 py-1 text-xs font-medium text-[#62665D]">
                          {property.roomTypes.length}{" "}
                          {property.roomTypes.length === 1
                            ? "room type"
                            : "room types"}
                        </span>
                      </div>

                      <p className="mt-3 text-xs text-[#A09E96]">
                        Added{" "}
                        {new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                        }).format(property.createdAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/partner/properties/${property.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-[#DCDDD5] bg-white px-4 py-2.5 text-sm font-medium text-[#405744] transition hover:border-[#405744] hover:bg-[#F5F6F2]"
                      >
                        Manage Property →
                      </Link>
                      <Link
                        href={`/partner/properties/${property.id}/availability`}
                        className="inline-flex items-center justify-center rounded-xl bg-[#405744] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#304532]"
                      >
                        Room Availability →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-[#E2E0D9] pt-5 text-xs text-[#89877F]">
          EthiopianBooking Partner Portal · Property management
        </footer>
      </div>
    </main>
  );
}