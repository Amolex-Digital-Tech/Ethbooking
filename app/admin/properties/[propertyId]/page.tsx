
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import PropertyReviewActions from "./property-review-actions";
import DocumentReviewActions from "./document-review-actions";
import PropertyEditor from "./property-editor";
import RoomEditor from "./room-editor";
import RatePlanManager from "./rate-plan-manager";
import DeletePropertyButton from "./delete-property-button";
import PropertyStatusActions from "./property-status-actions";

type PageProps = {
  params: Promise<{ propertyId: string }>;
};

function formatAmount(value: unknown) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Not provided";
}

export default async function AdminPropertyReviewPage({
  params,
}: PageProps) {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const { propertyId } = await params;

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      partner: {
        select: {
          id: true,
          businessName: true,
          status: true,
        },
      },
      location: true,
      roomTypes: {
        include: {
          ratePlans: {
            orderBy: { createdAt: "asc" },
            include: {
              ratePeriods: { orderBy: { startDate: "asc" } },
            },
          },
          photos: {
            orderBy: { sortOrder: "asc" },
          },
          inventory: {
            orderBy: { date: "asc" },
          },
        },
      },
      photos: {
        orderBy: { sortOrder: "asc" },
      },
      documents: true,
    },
  });

  if (!property) {
    notFound();
  }

  return (
    <main className="min-h-full bg-[#F5F6F2] px-4 py-7 text-[#20372B] sm:px-7 lg:px-9">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <header>
          <Link
            href="/admin/properties"
            className="text-sm font-medium text-[#4A5D4E] hover:underline"
          >
            ← Back to Property Verification
          </Link>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {property.name}
              </h1>
              <p className="mt-2 text-sm text-[#57534E]">
                Property verification and review
              </p>
            </div>

            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
              {property.status.replaceAll("_", " ")}
            </span>
          </div>
               </header>
                  {/* Property status management */}
        <PropertyStatusActions
          propertyId={property.id}
          propertyName={property.name}
          status={property.status}
        />
        {/* Property deletion */}
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-semibold text-red-700">
              Delete Property
            </h2>
            <p className="mt-1 text-sm text-[#57534E]">
              Permanently remove this property and its related
              information. Properties with booking history cannot be deleted.
            </p>
          </div>

          <DeletePropertyButton
            propertyId={property.id}
            propertyName={property.name}
          />
        </section>

        <PropertyEditor
          propertyId={property.id}
          property={{
            name: property.name,
            propertyType: property.propertyType,
            description: property.description,
            email: property.email,
            phone: property.phone,
            website: property.website,
            checkInTime: property.checkInTime,
            checkOutTime: property.checkOutTime,
          }}
          location={{
            country: property.location.country,
            region: property.location.region,
            city: property.location.city,
            subCity: property.location.subCity,
            neighborhood: property.location.neighborhood,
            address: property.location.address,
            postalCode: property.location.postalCode,
            latitude:
              property.location.latitude === null
                ? null
                : Number(property.location.latitude),
            longitude:
              property.location.longitude === null
                ? null
                : Number(property.location.longitude),
          }}
        />

        {/* Property information */}
        <section className="rounded-xl border border-[#E8E5DC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Property Information</h2>

          <dl className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[#78716C]">Property type</dt>
              <dd className="mt-1 font-medium">
                {property.propertyType.replaceAll("_", " ")}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-[#78716C]">Partner</dt>
              <dd className="mt-1 font-medium">
                <Link href={`/admin/partners/${property.partner.id}`} className="text-[#52704F] hover:underline">{property.partner.businessName} ↗</Link>
              </dd>
              <p className="mt-1 text-xs text-[#78716C]">
                Partner status: {property.partner.status.replaceAll("_", " ")}
              </p>
            </div>

            <div>
              <dt className="text-sm text-[#78716C]">City</dt>
              <dd className="mt-1 font-medium">{property.location.city}</dd>
            </div>

            <div>
              <dt className="text-sm text-[#78716C]">Region</dt>
              <dd className="mt-1 font-medium">
                {property.location.region || "Not provided"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-[#78716C]">Sub-city</dt>
              <dd className="mt-1 font-medium">
                {property.location.subCity || "Not provided"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-[#78716C]">Verification status</dt>
              <dd className="mt-1 font-medium">
                {property.verificationStatus.replaceAll("_", " ")}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-[#78716C]">Check-in time</dt>
              <dd className="mt-1 font-medium">
                {displayValue(property.checkInTime)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-[#78716C]">Check-out time</dt>
              <dd className="mt-1 font-medium">
                {displayValue(property.checkOutTime)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-[#78716C]">Email</dt>
              <dd className="mt-1 break-words font-medium">
                {displayValue(property.email)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-[#78716C]">Phone</dt>
              <dd className="mt-1 font-medium">
                {displayValue(property.phone)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-[#78716C]">Website</dt>
              <dd className="mt-1 break-words font-medium">
                {property.website ? (
                  <a
                    href={property.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#4A5D4E] hover:underline"
                  >
                    {property.website}
                  </a>
                ) : (
                  "Not provided"
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-[#E8E5DC] pt-5">
            <h3 className="text-sm font-medium text-[#78716C]">Description</h3>
            <p className="mt-1 whitespace-pre-wrap text-[#292524]">
              {property.description || "No description provided."}
            </p>
          </div>

          {property.rejectionReason && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <h3 className="text-sm font-semibold text-red-800">
                Previous rejection reason
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-red-700">
                {property.rejectionReason}
              </p>
            </div>
          )}
        </section>

        {/* Room types, photos, inventory, and pricing */}
        <section className="rounded-xl border border-[#E8E5DC] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Rooms and Rate Plans</h2>
              <p className="mt-1 text-sm text-[#788279]">Manage room details, pricing and daily inventory.</p>
            </div>
            <Link href={`/admin/properties/${property.id}/availability`} className="inline-flex items-center rounded-xl bg-[#294332] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1D3528]">
              Manage availability & inventory →
            </Link>
          </div>

          {property.roomTypes.length === 0 ? (
            <p className="mt-3 text-sm text-[#57534E]">
              No room types have been added yet.
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              {property.roomTypes.map((room) => (
                <article
                  key={room.id}
                  className="rounded-xl border border-[#E8E5DC] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{room.name}</h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[#57534E]">
                        {room.description || "No room description provided."}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        room.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-[#F4F3EF] text-[#57534E]"
                      }`}
                    >
                      {room.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Room photos */}
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold">Room Photos</h4>

                    {room.photos.length === 0 ? (
                      <p className="mt-2 text-sm text-amber-700">
                        No room photos uploaded.
                      </p>
                    ) : (
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {room.photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="overflow-hidden rounded-lg border border-[#E8E5DC]"
                          >
                            {photo.publicUrl ? (
                              <a
                                href={photo.publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo.publicUrl}
                                  alt={
                                    photo.altText ||
                                    `${room.name} room photo`
                                  }
                                  className="h-44 w-full bg-[#F4F3EF] object-cover"
                                  loading="lazy"
                                />
                              </a>
                            ) : (
                              <div className="flex h-44 items-center justify-center bg-[#F4F3EF] text-sm text-[#78716C]">
                                Image URL unavailable
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                              <span className="text-sm text-[#57534E]">
                                {photo.altText || "Room photo"}
                              </span>
                              {photo.isCover && (
                                <span className="rounded-full bg-[#F4F3EF] px-2 py-1 text-xs font-semibold text-[#4A5D4E]">
                                  Cover photo
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Room capacity and details */}
                  <div className="mt-5">
                    <h4 className="text-sm font-semibold">
                      Room Details and Capacity
                    </h4>

                    <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
                      <div>
                        <dt className="text-[#78716C]">Maximum guests</dt>
                        <dd className="mt-1 font-medium">{room.maxGuests}</dd>
                      </div>

                      <div>
                        <dt className="text-[#78716C]">Maximum adults</dt>
                        <dd className="mt-1 font-medium">
                          {room.maxAdults ?? "Not specified"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[#78716C]">Maximum children</dt>
                        <dd className="mt-1 font-medium">
                          {room.maxChildren ?? "Not specified"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[#78716C]">Bed type</dt>
                        <dd className="mt-1 font-medium">
                          {room.bedType.replaceAll("_", " ")}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[#78716C]">Number of beds</dt>
                        <dd className="mt-1 font-medium">{room.bedCount}</dd>
                      </div>

                      <div>
                        <dt className="text-[#78716C]">Room size</dt>
                        <dd className="mt-1 font-medium">
                          {room.sizeSquareMeters != null
                            ? `${formatAmount(room.sizeSquareMeters)} m²`
                            : "Not specified"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[#78716C]">Total units</dt>
                        <dd className="mt-1 font-medium">{room.totalUnits}</dd>
                      </div>
                    </dl>
                  </div>
                  <RoomEditor
  propertyId={propertyId}
  room={{
    id: room.id,
    name: room.name,
    description: room.description,
    maxGuests: room.maxGuests,
    maxAdults: room.maxAdults,
    maxChildren: room.maxChildren,
    bedType: room.bedType,
    bedCount: room.bedCount,
    sizeSquareMeters:
      room.sizeSquareMeters == null
        ? null
        : Number(room.sizeSquareMeters),
            totalUnits: room.totalUnits,
            isActive: room.isActive,
            hasWifi: room.hasWifi,
            hasAirConditioning: room.hasAirConditioning,
            hasTv: room.hasTv,
            hasPrivateBathroom: room.hasPrivateBathroom,
            smokingPolicy: room.smokingPolicy,
            extraBedAvailable: room.extraBedAvailable,
            extraBedPrice:
      room.extraBedPrice == null
        ? null
        : Number(room.extraBedPrice),
    childPolicy: room.childPolicy,
    checkInTime: room.checkInTime,
    checkOutTime: room.checkOutTime,
    additionalRules: room.additionalRules,
    otherAmenities: room.otherAmenities,
  }}
/>
                  <RatePlanManager
                    propertyId={propertyId}
                    roomTypeId={room.id}
                    plans={room.ratePlans.map((plan) => ({
                      id: plan.id,
                      name: plan.name,
                      description: plan.description,
                      mealPlan: plan.mealPlan,
                      cancellationPolicy: plan.cancellationPolicy,
                      cancellationDeadlineHours: plan.cancellationDeadlineHours,
                      cancellationFeePercent: plan.cancellationFeePercent == null ? null : Number(plan.cancellationFeePercent),
                      basePrice: Number(plan.basePrice),
                      currency: plan.currency,
                      isActive: plan.isActive,
                      ratePeriods: plan.ratePeriods.map((period) => ({
                        id: period.id,
                        startDate: period.startDate.toISOString().slice(0, 10),
                        endDate: period.endDate.toISOString().slice(0, 10),
                        pricePerNight: Number(period.pricePerNight),
                      })),
                    }))}
                  />
                  {/* Room amenities and policies */}
                  <div className="mt-5 border-t border-[#E8E5DC] pt-4">
                    <h4 className="text-sm font-semibold">
                      Room Amenities and Policies
                    </h4>

                    <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
                      <div>
                        <dt className="text-[#78716C]">Wi-Fi</dt>
                        <dd className="mt-1 font-medium">
                          {room.hasWifi == null
                            ? "Not provided"
                            : room.hasWifi
                              ? "Yes"
                              : "No"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[#78716C]">Air conditioning</dt>
                        <dd className="mt-1 font-medium">
                          {room.hasAirConditioning == null
                            ? "Not provided"
                            : room.hasAirConditioning
                              ? "Yes"
                              : "No"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[#78716C]">Television</dt>
                        <dd className="mt-1 font-medium">
                          {room.hasTv == null
                            ? "Not provided"
                            : room.hasTv
                              ? "Yes"
                              : "No"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[#78716C]">Private bathroom</dt>
                        <dd className="mt-1 font-medium">
                          {room.hasPrivateBathroom == null
                            ? "Not provided"
                            : room.hasPrivateBathroom
                              ? "Yes"
                              : "No"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[#78716C]">Smoking policy</dt>
                        <dd className="mt-1 font-medium">
                          {room.smokingPolicy
                            ? room.smokingPolicy.replaceAll("_", " ")
                            : "Not provided"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[#78716C]">Extra bed available</dt>
                        <dd className="mt-1 font-medium">
                          {room.extraBedAvailable == null
                            ? "Not provided"
                            : room.extraBedAvailable
                              ? "Yes"
                              : "No"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[#78716C]">Extra bed price</dt>
                        <dd className="mt-1 font-medium">
                          {room.extraBedPrice != null
                            ? `${formatAmount(room.extraBedPrice)} ETB`
                            : "Not provided"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[#78716C]">Check-in time</dt>
                        <dd className="mt-1 font-medium">
                          {displayValue(room.checkInTime)}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[#78716C]">Check-out time</dt>
                        <dd className="mt-1 font-medium">
                          {displayValue(room.checkOutTime)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 space-y-4 text-sm">
                      <div>
                        <h5 className="font-medium text-[#78716C]">
                          Child Policy
                        </h5>
                        <p className="mt-1 whitespace-pre-wrap">
                          {room.childPolicy || "Not provided"}
                        </p>
                      </div>

                      <div>
                        <h5 className="font-medium text-[#78716C]">
                          Other Amenities
                        </h5>
                        <p className="mt-1 whitespace-pre-wrap">
                          {room.otherAmenities || "Not provided"}
                        </p>
                      </div>

                      <div>
                        <h5 className="font-medium text-[#78716C]">
                          Additional Rules
                        </h5>
                        <p className="mt-1 whitespace-pre-wrap">
                          {room.additionalRules || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dated inventory */}
                  <div className="mt-5 border-t border-[#E8E5DC] pt-4">
                    <h4 className="text-sm font-semibold">
                      Inventory and Availability Records
                    </h4>
                    <p className="mt-1 text-xs text-[#78716C]">
                      Inventory is displayed by date. These records are not a
                      live availability guarantee for a customer&apos;s requested
                      stay.
                    </p>

                    {room.inventory.length === 0 ? (
                      <p className="mt-2 text-sm text-amber-700">
                        No dated inventory records found. The room&apos;s total
                        unit count is shown above, but bookable availability
                        cannot be confirmed from inventory yet.
                      </p>
                    ) : (
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-[540px] border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-[#E8E5DC] text-[#78716C]">
                              <th className="px-3 py-2 font-medium">Date</th>
                              <th className="px-3 py-2 font-medium">
                                Total units
                              </th>
                              <th className="px-3 py-2 font-medium">
                                Reserved
                              </th>
                              <th className="px-3 py-2 font-medium">
                                Blocked
                              </th>
                              <th className="px-3 py-2 font-medium">
                                Remaining
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {room.inventory.map((inventory) => {
                              const remaining =
                                inventory.totalUnits -
                                inventory.reservedUnits -
                                inventory.blockedUnits;

                              return (
                                <tr
                                  key={inventory.id}
                                  className="border-b border-[#E8E5DC] last:border-0"
                                >
                                  <td className="px-3 py-2">
                                    {formatDate(inventory.date)}
                                  </td>
                                  <td className="px-3 py-2">
                                    {inventory.totalUnits}
                                  </td>
                                  <td className="px-3 py-2">
                                    {inventory.reservedUnits}
                                  </td>
                                  <td className="px-3 py-2">
                                    {inventory.blockedUnits}
                                  </td>
                                  <td
                                    className={`px-3 py-2 font-semibold ${
                                      remaining < 0
                                        ? "text-red-700"
                                        : "text-[#1C1917]"
                                    }`}
                                  >
                                    {remaining}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Rate plans */}
                  <div className="mt-5 border-t border-[#E8E5DC] pt-4">
                    <h4 className="text-sm font-semibold">
                      Rate Plans and Pricing
                    </h4>

                    {room.ratePlans.length === 0 ? (
                      <p className="mt-2 text-sm text-amber-700">
                        No rate plans configured.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {room.ratePlans.map((plan) => (
                          <div
                            key={plan.id}
                            className="rounded-lg border border-[#E8E5DC] bg-[#F4F3EF] p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h5 className="font-semibold">{plan.name}</h5>
                                <p className="mt-1 text-sm text-[#57534E]">
                                  {plan.description ||
                                    "No rate-plan description provided."}
                                </p>
                              </div>

                              <span
                                className={`rounded-full px-2 py-1 text-xs font-medium ${
                                  plan.isActive
                                    ? "bg-green-50 text-green-700"
                                    : "bg-gray-200 text-[#57534E]"
                                }`}
                              >
                                {plan.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>

                            <p className="mt-3 text-xl font-semibold">
                              {formatAmount(plan.basePrice)} {plan.currency}
                              <span className="ml-1 text-sm font-normal text-[#78716C]">
                                per night
                              </span>
                            </p>
                            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                              <div>
                                <dt className="text-[#78716C]">Meal plan</dt>
                                <dd className="mt-1 font-medium">
                                  {plan.mealPlan.replaceAll("_", " ")}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-[#78716C]">
                                  Cancellation policy
                                </dt>
                                <dd className="mt-1 font-medium">
                                  {plan.cancellationPolicy.replaceAll(
                                    "_",
                                    " ",
                                  )}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-[#78716C]">
                                  Cancellation deadline
                                </dt>
                                <dd className="mt-1 font-medium">
                                  {plan.cancellationDeadlineHours != null
                                    ? `${plan.cancellationDeadlineHours} hours before check-in`
                                    : "Not specified"}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-[#78716C]">
                                  Cancellation fee
                                </dt>
                                <dd className="mt-1 font-medium">
                                  {plan.cancellationFeePercent != null
                                    ? `${formatAmount(plan.cancellationFeePercent)}%`
                                    : "Not specified"}
                                </dd>
                              </div>
                            </dl>

                            <p className="mt-3 text-xs text-[#78716C]">
                              Separate tax and fee breakdowns are not stored
                              on this rate plan in the current schema.
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fields not yet represented in the schema */}
                  <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <h4 className="text-sm font-semibold text-amber-900">
                      Additional room policies and amenities
                    </h4>
                    <p className="mt-1 text-sm text-amber-800">
                      Dedicated fields for Wi-Fi, air conditioning, TV, private
                      bathroom, smoking rules, extra beds, and room-specific
                      child policies are not present in the schema reviewed.
                      Do not treat these as included or prohibited until the
                      partner supplies that information.
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Property photos */}
        <section className="rounded-xl border border-[#E8E5DC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Property Photos</h2>

          {property.photos.length === 0 ? (
            <p className="mt-3 text-sm text-[#57534E]">
              No photos uploaded.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {property.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded-xl border border-[#E8E5DC]"
                >
                  {photo.publicUrl ? (
                    <a
                      href={photo.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.publicUrl}
                        alt={
                          photo.altText ||
                          `${property.name} property photo`
                        }
                        className="h-52 w-full bg-[#F4F3EF] object-cover"
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <div className="flex h-52 items-center justify-center bg-[#F4F3EF] text-sm text-[#78716C]">
                      Image URL unavailable
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 p-3">
                    <p className="truncate text-sm text-[#57534E]">
                      {photo.altText || "Property photo"}
                    </p>

                    {photo.isCover && (
                      <span className="shrink-0 rounded-full bg-[#F4F3EF] px-2 py-1 text-xs font-semibold text-[#4A5D4E]">
                        Cover photo
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Documents */}
        <section className="rounded-xl border border-[#E8E5DC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Documents</h2>

          {property.documents.length === 0 ? (
            <p className="mt-3 text-sm text-[#57534E]">
              No documents uploaded.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {property.documents.map((document) => (
                <li
                  key={document.id}
                  className="rounded-lg border border-[#E8E5DC] p-3 text-sm"
                >
                  <span className="font-medium">
                    {document.documentName ||
                      document.documentType.replaceAll("_", " ")}
                  </span>
                  <span className="ml-2 text-[#78716C]">
                    {document.verificationStatus.replaceAll("_", " ")}
                  </span>

                  {document.rejectionReason && (
                    <p className="mt-1 text-red-700">
                      {document.rejectionReason}
                    </p>
                  )}

                  <div className="mt-3">
  <a
    href={`/api/admin/properties/${property.id}/documents/${document.id}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center rounded-lg border border-blue-200 bg-[#F4F3EF] px-3 py-2 text-sm font-medium text-[#4A5D4E] hover:bg-blue-100"
  >
    Open document ↗
  </a>

  <DocumentReviewActions
    propertyId={property.id}
    documentId={document.id}
    verificationStatus={document.verificationStatus}
  />
</div>

<div className="mt-3">
  <a
    href={`/api/admin/properties/${property.id}/documents/${document.id}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center rounded-lg border border-blue-200 bg-[#F4F3EF] px-3 py-2 text-sm font-medium text-[#4A5D4E] hover:bg-blue-100"
  >
    Open document ↗
  </a>
</div>

                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Review actions */}
        {property.status === "PENDING_REVIEW" ? (
          <section className="rounded-xl border border-[#E8E5DC] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Review Decision</h2>
            <p className="mt-2 text-sm text-[#57534E]">
              Check the submitted information before deciding whether to
              approve or reject this property.
            </p>

            <div className="mt-5">
              <PropertyReviewActions propertyId={property.id} />
            </div>
          </section>
        ) : (
          <p className="rounded-xl border border-[#E8E5DC] bg-white p-4 text-sm text-[#57534E] shadow-sm">
            This property is not currently awaiting review.
          </p>
        )}
      </div>
    </main>
  );
}
