import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import PropertyDescriptionForm from "./property-description-form";
import PropertyPhotosForm from "./property-photos-form";
import PropertyRoomForm from "./property-room-form";
import PropertyDocumentsForm from "./property-documents-form";
import PropertySubmissionPanel from "./property-submission-panel";

function formatLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) =>
    char.toUpperCase()
  );
}

function propertyStatusStyle(status: string) {
  if (status === "PUBLISHED" || status === "APPROVED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "REJECTED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function StatCard({
  label,
  value,
  detail,
  numberStyle = "text-slate-950",
}: {
  label: string;
  value: number;
  detail: string;
  numberStyle?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 sm:p-6">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${numberStyle}`}>
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

export default async function PartnerPropertyPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const currentUser = await requireRole(
    "PARTNER_OWNER",
    "PARTNER_MANAGER"
  );

  const { propertyId } = await params;

  const membership = await prisma.partnerMember.findFirst({
    where: {
      profileId: currentUser.profile.id,
      status: "ACTIVE",
    },
    include: {
      partner: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!membership) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">Partner Portal</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Partner account not found
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your account does not currently have an active partner membership.
          </p>
        </div>
      </main>
    );
  }

  if (
    membership.partner.status !== "ACTIVE" &&
    membership.partner.status !== "PENDING"
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">Partner Portal</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Property management unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your partner account is currently{" "}
            {formatLabel(membership.partner.status)}. Property management is
            unavailable until your partner account is reactivated.
          </p>
          <Link
            href="/partner"
            className="mt-6 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      partnerId: membership.partnerId,
    },
    include: {
      location: true,
      roomTypes: {
        include: {
          ratePlans: true,
          inventory: true,
          photos: true,
        },
      },
      photos: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      documents: true,
    },
  });

  if (!property) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">Partner Portal</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Property not found
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            This property does not exist or does not belong to your partner
            organization.
          </p>
          <Link
            href="/partner"
            className="mt-6 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const totalUnits = property.roomTypes.reduce(
    (total, room) => total + room.totalUnits,
    0
  );

  const totalRatePlans = property.roomTypes.reduce(
    (total, room) => total + room.ratePlans.length,
    0
  );

  const totalInventoryNights = property.roomTypes.reduce(
    (total, room) => total + room.inventory.length,
    0
  );

  return (
    <main className="min-h-screen bg-slate-50/80 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {membership.partner.status === "PENDING" && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-semibold text-amber-900">
              Partner account awaiting approval
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              You can continue setting up this property. Booking and financial
              operations will become available after your partner account is
              activated.
            </p>
          </div>
        )}

        <nav className="mb-6 flex items-center gap-2 text-sm">
          <Link
            href="/partner"
            className="font-medium text-slate-500 transition hover:text-blue-700"
          >
            Partner dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <span className="max-w-[220px] truncate font-medium text-slate-800">
            {property.name}
          </span>
        </nav>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
          <div className="h-1.5 bg-blue-600" />
          <div className="p-6 sm:p-8 lg:p-9">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                  Property management
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {property.name}
                </h1>

                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-slate-500">
                  <span>{property.location.city}</span>
                  {property.location.subCity && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>{property.location.subCity}</span>
                    </>
                  )}
                  {property.location.neighborhood && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>{property.location.neighborhood}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/partner/properties/${property.id}/availability`}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#405744] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#304532]"
                >
                  Room Availability →
                </Link>
                <Link
                  href="/partner"
                  className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  ← Dashboard
                </Link>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${propertyStatusStyle(property.status)}`}
              >
                Property: {formatLabel(property.status)}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${propertyStatusStyle(property.verificationStatus)}`}
              >
                Verification: {formatLabel(property.verificationStatus)}
              </span>
            </div>
          </div>
        </section>

        <PropertySubmissionPanel
          partnerId={membership.partnerId}
          propertyId={property.id}
          status={property.status}
          verificationStatus={property.verificationStatus}
          rejectionReason={property.rejectionReason}
          descriptionReady={(property.description ?? "").trim().length >= 30}
          photoCount={property.photos.length}
          roomCount={property.roomTypes.length}
          documentCount={property.documents.length}
        />

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            label="Room types"
            value={property.roomTypes.length}
            detail="Different room categories"
          />
          <StatCard
            label="Total units"
            value={totalUnits}
            detail="Rooms or units configured"
          />
          <StatCard
            label="Rate plans"
            value={totalRatePlans}
            detail="Pricing plans configured"
          />
          <StatCard
            label="Inventory nights"
            value={totalInventoryNights}
            detail="Existing inventory records"
          />
        </section>

        <div className="mt-8 space-y-6">
          <div>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                Property profile
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                Property information
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Keep your listing details accurate and helpful for potential guests.
              </p>
            </div>

            <PropertyDescriptionForm
              partnerId={membership.partnerId}
              propertyId={property.id}
              initialDescription={property.description ?? ""}
            />
          </div>

          <div>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                Listing gallery
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                Property photos
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Manage the images guests use to understand your property.
              </p>
            </div>

            <PropertyPhotosForm
              partnerId={membership.partnerId}
              propertyId={property.id}
              initialPhotos={property.photos.map((photo) => ({
                id: photo.id,
                publicUrl: photo.publicUrl,
                altText: photo.altText,
                isCover: photo.isCover,
              }))}
            />
          </div>

          <div>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                Verification
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                Property documents
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Upload and review the documents associated with your property.
              </p>
            </div>

            <PropertyDocumentsForm
              partnerId={membership.partnerId}
              propertyId={property.id}
              initialDocuments={property.documents.map((document) => ({
                id: document.id,
                documentType: document.documentType,
                documentName: document.documentName,
                verificationStatus: document.verificationStatus,
                rejectionReason: document.rejectionReason,
                createdAt: document.createdAt.toISOString(),
              }))}
            />
          </div>
        </div>

        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                Accommodation setup
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Rooms and inventory
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Create room types, manage pricing plans, and maintain availability.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
              {property.roomTypes.length} room type
              {property.roomTypes.length === 1 ? "" : "s"}
            </span>
          </div>

          <PropertyRoomForm
            partnerId={membership.partnerId}
            propertyId={property.id}
          />

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <h3 className="font-semibold text-slate-950">Your room types</h3>
              <p className="mt-1 text-sm text-slate-500">
                Select a room to manage its availability and rate plans.
              </p>
            </div>

            {property.roomTypes.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-6 w-6"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 20V8.5L12 4l9 4.5V20M3 13h18M6 20v-4m12 4v-4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h4 className="mt-4 font-semibold text-slate-900">
                  No room types yet
                </h4>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Add your first room type using the form above. You can then
                  configure its rate plans and availability.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {property.roomTypes.map((room) => (
                  <div
                    key={room.id}
                    className="flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-sm font-bold text-blue-700">
                        {room.name.trim().charAt(0).toUpperCase() || "R"}
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-900">
                          {room.name}
                        </h4>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {room.totalUnits} unit{room.totalUnits === 1 ? "" : "s"}
                          <span className="mx-2 text-slate-300">·</span>
                          Up to {room.maxGuests} guest
                          {room.maxGuests === 1 ? "" : "s"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {room.ratePlans.length} rate plan
                            {room.ratePlans.length === 1 ? "" : "s"}
                          </span>
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {room.inventory.length} inventory record
                            {room.inventory.length === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/partner/properties/${property.id}/rooms/${room.id}`}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      Manage room
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          EthiopianBooking Partner Portal
        </footer>
      </div>
    </main>
  );
}