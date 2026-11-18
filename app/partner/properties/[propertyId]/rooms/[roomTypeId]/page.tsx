import { createRoomInventory } from "@/lib/inventory/create-room-inventory";
import { lockRoomTypeInventory } from "@/lib/inventory/lock-room-type-inventory";
import Link from "next/link";
import AvailabilityForm from "./availability-form";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import RatePlanForm from "./rate-plan-form";
import RatePlanEditForm from "./rate-plan-edit-form";
import RoomPhotos from "./room-photos";

function formatLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) =>
    char.toUpperCase()
  );
}

export default async function PartnerRoomPage({
  params,
}: {
  params: Promise<{
    propertyId: string;
    roomTypeId: string;
  }>;
}) {
  const currentUser = await requireRole(
    "PARTNER_OWNER",
    "PARTNER_MANAGER"
  );

  const { propertyId, roomTypeId } = await params;

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
      <main className="min-h-screen bg-[#f7f8fa] px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <h1 className="text-2xl font-bold">
              Partner account not found
            </h1>

            <p className="mt-2 text-slate-500">
              Your account does not currently have an active partner
              organization.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (
    membership.partner.status !== "ACTIVE" &&
    membership.partner.status !== "PENDING"
  ) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <p className="text-sm font-semibold text-blue-700">
              Partner Portal
            </p>

            <h1 className="mt-3 text-2xl font-bold">
              Room management unavailable
            </h1>

            <p className="mt-2 leading-6 text-slate-500">
              Your partner account is currently{" "}
              {formatLabel(membership.partner.status)}. Room management,
              pricing, and inventory operations are unavailable until your
              partner account is reactivated.
            </p>

            <Link
              href="/partner"
              className="mt-6 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Back to Partner Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const room = await prisma.roomType.findFirst({
    where: {
      id: roomTypeId,
      propertyId,
      property: {
        partnerId: membership.partnerId,
      },
    },
    include: {
      property: {
        include: {
          location: true,
        },
      },
      ratePlans: true,
      photos: true,
    },
  });

  if (!room) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <h1 className="text-2xl font-bold">
              Room type not found
            </h1>

            <p className="mt-2 text-slate-500">
              This room type does not exist or does not belong to your
              partner organization.
            </p>

            <Link
              href={`/partner/properties/${propertyId}`}
              className="mt-6 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Back to Property
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Automatically prepare availability for the next 30 nights.
  const today = new Date();

  const inventoryFrom = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    )
  );

  const inventoryTo = new Date(inventoryFrom);
  inventoryTo.setUTCDate(inventoryTo.getUTCDate() + 30);

  const initialInventory = await prisma.$transaction(
    async (transaction) => {
      await lockRoomTypeInventory(transaction, roomTypeId);

      await createRoomInventory(
        {
          roomTypeId,
          fromDate: inventoryFrom,
          toDate: inventoryTo,
        },
        transaction
      );

      return transaction.roomInventory.findMany({
        where: {
          roomTypeId,
          date: {
            gte: inventoryFrom,
            lt: inventoryTo,
          },
        },
        orderBy: {
          date: "asc",
        },
      });
    }
  );

  const inventoryData = initialInventory.map((item) => ({
    id: item.id,
    date: item.date.toISOString().slice(0, 10),
    totalUnits: item.totalUnits,
    reservedUnits: item.reservedUnits,
    blockedUnits: item.blockedUnits,
  }));

  const totalReserved = initialInventory.reduce(
    (total, item) => total + item.reservedUnits,
    0
  );

  const totalBlocked = initialInventory.reduce(
    (total, item) => total + item.blockedUnits,
    0
  );

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {membership.partner.status === "PENDING" && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-semibold text-amber-900">
              Partner account awaiting approval
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              You can continue setting up this room, its rate plans, and
              availability while your partner account is under review.
              Booking and financial operations will become available after
              your partner account is activated.
            </p>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/partner"
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            Partner Dashboard
          </Link>

          <span className="text-slate-400">/</span>

          <Link
            href={`/partner/properties/${propertyId}`}
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            {room.property.name}
          </Link>

          <span className="text-slate-400">/</span>

          <span className="text-slate-500">{room.name}</span>
        </div>

        {/* Room heading */}
        <section className="mb-8">
          <p className="mb-2 text-sm font-medium text-blue-600">
            Room Management
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {room.name}
              </h1>

              <p className="mt-2 text-slate-500">
                {room.property.name}
                {room.property.location.city
                  ? ` · ${room.property.location.city}`
                  : ""}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                room.isActive
                  ? "bg-green-50 text-green-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {room.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        </section>

        {/* Summary cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">
              Total Physical Rooms
            </p>

            <p className="mt-2 text-3xl font-bold">
              {room.totalUnits}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">
              Max Guests
            </p>

            <p className="mt-2 text-3xl font-bold">
              {room.maxGuests}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">
              Rate Plans
            </p>

            <p className="mt-2 text-3xl font-bold">
              {room.ratePlans.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">
              Inventory Nights
            </p>

            <p className="mt-2 text-3xl font-bold">
              {initialInventory.length}
            </p>
          </div>
        </section>

        {/* Room information and availability overview */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-xl font-bold">
                Room Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Basic information about this room type.
              </p>
            </div>

            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Bed Type
                </p>

                <p className="mt-1 font-medium">
                  {room.bedType}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Bed Count
                </p>

                <p className="mt-1 font-medium">
                  {room.bedCount}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Maximum Adults
                </p>

                <p className="mt-1 font-medium">
                  {room.maxAdults ?? "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Maximum Children
                </p>

                <p className="mt-1 font-medium">
                  {room.maxChildren ?? "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Room Size
                </p>

                <p className="mt-1 font-medium">
                  {room.sizeSquareMeters
                    ? `${room.sizeSquareMeters} m²`
                    : "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Status
                </p>

                <p className="mt-1 font-medium">
                  {room.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </div>

            {room.description ? (
              <div className="border-t border-slate-200 p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Description
                </p>

                <p className="mt-2 leading-7 text-slate-600">
                  {room.description}
                </p>
              </div>
            ) : null}
          </div>

          {/* Availability overview */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-xl font-bold">
                Availability Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Availability over the next 30 nights.
              </p>
            </div>

            <div className="grid gap-5 p-6 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Inventory Nights
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {initialInventory.length}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Reserved Room-Nights
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {totalReserved}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Blocked Room-Nights
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {totalBlocked}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 p-6">
              <p className="text-sm leading-6 text-slate-500">
                Nightly availability is maintained automatically.
                Use the Room Availability section below to view dates
                and block rooms when necessary.
              </p>
            </div>
          </div>
        </section>

        {/* Room photos */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold">Room Photos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload and manage photos that customers will see when viewing this room.
            </p>
          </div>
          <div className="p-6">
            <RoomPhotos
              partnerId={membership.partnerId}
              propertyId={propertyId}
              roomTypeId={roomTypeId}
            />
          </div>
        </section>

        {/* Rate plans */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold">
              Rate Plans
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create and manage the prices and booking conditions for this room.
            </p>
          </div>

          <div className="border-b border-slate-200 p-6">
            <h3 className="text-base font-semibold text-slate-900">
              Add a rate plan
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create a pricing option that guests can choose when booking this
              room.
            </p>

            <div className="mt-6">
              <RatePlanForm
                partnerId={membership.partnerId}
                propertyId={propertyId}
                roomTypeId={roomTypeId}
              />
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {room.ratePlans.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No rate plans have been added yet.
              </div>
            ) : (
              room.ratePlans.map((ratePlan) => (
                <div
                  key={ratePlan.id}
                  className="p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {ratePlan.name}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            ratePlan.isActive
                              ? "bg-green-50 text-green-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {ratePlan.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {ratePlan.description ||
                          "No description provided."}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                          {ratePlan.mealPlan}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                          {ratePlan.cancellationPolicy}
                        </span>

                        {ratePlan.cancellationDeadlineHours !== null ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                            Cancel up to{" "}
                            {ratePlan.cancellationDeadlineHours} hours before
                            check-in
                          </span>
                        ) : null}

                        {ratePlan.cancellationFeePercent !== null ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                            {ratePlan.cancellationFeePercent.toString()}%
                            cancellation fee
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <p className="text-2xl font-bold text-slate-900">
                        {ratePlan.basePrice.toString()}{" "}
                        <span className="text-sm font-medium text-slate-500">
                          {ratePlan.currency}
                        </span>
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        per night
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <details>
                      <summary className="cursor-pointer list-none text-sm font-medium text-blue-600 hover:text-blue-700">
                        Edit rate plan
                      </summary>

                      <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                        <RatePlanEditForm
                          partnerId={membership.partnerId}
                          propertyId={propertyId}
                          roomTypeId={roomTypeId}
                          ratePlanId={ratePlan.id}
                          initialName={ratePlan.name}
                          initialDescription={ratePlan.description}
                          initialMealPlan={ratePlan.mealPlan}
                          initialCancellationPolicy={
                            ratePlan.cancellationPolicy
                          }
                          initialCancellationDeadlineHours={
                            ratePlan.cancellationDeadlineHours
                          }
                          initialCancellationFeePercent={
                            ratePlan.cancellationFeePercent !== null
                              ? Number(ratePlan.cancellationFeePercent)
                              : null
                          }
                          initialBasePrice={ratePlan.basePrice.toString()}
                          initialCurrency={ratePlan.currency}
                          initialIsActive={ratePlan.isActive}
                        />
                      </div>
                    </details>
                  </div>

                </div>
              ))
            )}
          </div>
        </section>

        {/* Automatic nightly availability manager */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold">
              Room Availability
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              View nightly availability and block rooms when necessary.
            </p>
          </div>

          <div className="p-6">
            <AvailabilityForm
              partnerId={membership.partnerId}
              propertyId={propertyId}
              roomTypeId={roomTypeId}
              initialFrom={inventoryFrom.toISOString().slice(0, 10)}
              initialTo={inventoryTo.toISOString().slice(0, 10)}
              initialInventory={inventoryData}
            />
          </div>
        </section>

        <div className="mt-8">
          <Link
            href={`/partner/properties/${propertyId}`}
            className="inline-block rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium hover:bg-slate-50"
          >
            ← Back to Property
          </Link>
        </div>
      </div>
    </main>
  );
}