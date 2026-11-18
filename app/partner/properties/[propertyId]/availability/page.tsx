
import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import { createRoomInventory } from "@/lib/inventory/create-room-inventory";
import { lockRoomTypeInventory } from "@/lib/inventory/lock-room-type-inventory";

export const dynamic = "force-dynamic";

const DAYS_TO_SHOW = 30;

function getUtcToday() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    formatDateInput(date) !== value
  ) {
    return null;
  }

  return date;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) =>
    char.toUpperCase()
  );
}

function StatCard({
  label,
  value,
  description,
  color = "text-[#263B2D]",
}: {
  label: string;
  value: number;
  description: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
      <p className="text-sm font-medium text-[#77766F]">{label}</p>

      <p className={`mt-3 text-3xl font-semibold tracking-tight ${color}`}>
        {value}
      </p>

      <p className="mt-2 text-xs text-[#89877F]">{description}</p>
    </div>
  );
}

export default async function PropertyAvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const currentUser = await requireRole(
    "PARTNER_OWNER",
    "PARTNER_MANAGER"
  );

  const { propertyId } = await params;
  const filters = await searchParams;

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
      <main className="min-h-screen bg-[#F4F3EF] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#E7E5DF] bg-white p-8">
          <h1 className="text-2xl font-semibold text-[#263B2D]">
            Partner account not found
          </h1>

          <p className="mt-3 text-sm text-[#77766F]">
            Your account does not currently have an active partner
            organization.
          </p>

          <Link
            href="/partner"
            className="mt-6 inline-flex rounded-xl bg-[#405744] px-5 py-3 text-sm font-medium text-white hover:bg-[#304532]"
          >
            Back to Partner Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (
    membership.partner.status !== "ACTIVE" &&
    membership.partner.status !== "PENDING"
  ) {
    return (
      <main className="min-h-screen bg-[#F4F3EF] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#E7E5DF] bg-white p-8">
          <p className="text-sm font-semibold text-[#75816F]">
            ETHIOPIANBOOKING / PARTNER PORTAL
          </p>

          <h1 className="mt-3 text-2xl font-semibold text-[#263B2D]">
            Inventory management unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#77766F]">
            Your partner account is currently{" "}
            {formatLabel(membership.partner.status)}. Room availability and
            inventory management are unavailable until your partner account
            is reactivated.
          </p>

          <Link
            href="/partner"
            className="mt-6 inline-flex rounded-xl bg-[#405744] px-5 py-3 text-sm font-medium text-white hover:bg-[#304532]"
          >
            Back to Partner Dashboard
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
    select: {
      id: true,
      name: true,
      location: {
        select: {
          city: true,
          subCity: true,
          neighborhood: true,
        },
      },
      roomTypes: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          name: true,
          totalUnits: true,
          isActive: true,
        },
      },
    },
  });

  if (!property) {
    return (
      <main className="min-h-screen bg-[#F4F3EF] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#E7E5DF] bg-white p-8">
          <h1 className="text-2xl font-semibold text-[#263B2D]">
            Property not found
          </h1>

          <p className="mt-3 text-sm text-[#77766F]">
            This property does not exist or does not belong to your
            partner organization.
          </p>

          <Link
            href="/partner/properties"
            className="mt-6 inline-flex rounded-xl bg-[#405744] px-5 py-3 text-sm font-medium text-white"
          >
            Back to My Properties
          </Link>
        </div>
      </main>
    );
  }

  const today = getUtcToday();
  const requestedDate = parseDate(filters.from);

  // Do not generate new inventory records for dates in the past.
  const fromDate =
    requestedDate && requestedDate >= today
      ? requestedDate
      : today;

  const toDate = addDays(fromDate, DAYS_TO_SHOW);

  const dates: Date[] = [];

  for (let index = 0; index < DAYS_TO_SHOW; index++) {
    dates.push(addDays(fromDate, index));
  }

  // Generate missing inventory using the shared inventory service.
  // Sort room types before acquiring locks to prevent deadlocks.
  const roomsForInventory = [...property.roomTypes].sort(
    (a, b) => a.id.localeCompare(b.id)
  );

  if (roomsForInventory.length > 0) {
    await prisma.$transaction(async (transaction) => {
      for (const room of roomsForInventory) {
        await lockRoomTypeInventory(transaction, room.id);

        await createRoomInventory(
          {
            roomTypeId: room.id,
            fromDate,
            toDate,
          },
          transaction
        );
      }
    });
  }

  const inventoryRows =
    property.roomTypes.length > 0
      ? await prisma.roomInventory.findMany({
          where: {
            roomTypeId: {
              in: property.roomTypes.map((room) => room.id),
            },
            date: {
              gte: fromDate,
              lt: toDate,
            },
          },
          orderBy: [
            { date: "asc" },
            { roomTypeId: "asc" },
          ],
        })
      : [];

  // Organize inventory by room type and date.
  const inventoryByRoom = new Map<
    string,
    Map<string, (typeof inventoryRows)[number]>
  >();

  for (const item of inventoryRows) {
    const dateKey = formatDateInput(item.date);

    if (!inventoryByRoom.has(item.roomTypeId)) {
      inventoryByRoom.set(item.roomTypeId, new Map());
    }

    inventoryByRoom.get(item.roomTypeId)!.set(dateKey, item);
  }

  // Property-wide totals for the first displayed day.
  const firstDateKey = formatDateInput(fromDate);

  const firstDayInventory = inventoryRows.filter(
    (item) => formatDateInput(item.date) === firstDateKey
  );

  const totalUnitsToday = firstDayInventory.reduce(
    (sum, item) => sum + item.totalUnits,
    0
  );

  const bookedToday = firstDayInventory.reduce(
    (sum, item) => sum + item.reservedUnits,
    0
  );

  const blockedToday = firstDayInventory.reduce(
    (sum, item) => sum + item.blockedUnits,
    0
  );

  const availableToday = firstDayInventory.reduce(
    (sum, item) =>
      sum + item.totalUnits - item.reservedUnits - item.blockedUnits,
    0
  );

  const previousDate = addDays(fromDate, -DAYS_TO_SHOW);
  const nextDate = addDays(fromDate, DAYS_TO_SHOW);

  const previousHref =
    previousDate >= today
      ? `/partner/properties/${propertyId}/availability?from=${formatDateInput(previousDate)}`
      : null;

  const nextHref =
    `/partner/properties/${propertyId}/availability?from=${formatDateInput(nextDate)}`;

  const location = [
    property.location.neighborhood,
    property.location.subCity,
    property.location.city,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-[#F4F3EF] px-4 py-8 text-[#263B2D] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {membership.partner.status === "PENDING" && (
          <div className="mb-6 rounded-2xl border border-[#E8DDBB] bg-[#FFF9E9] p-5">
            <p className="font-semibold text-[#665329]">
              Partner account awaiting approval
            </p>

            <p className="mt-1 text-sm text-[#806D43]">
              You can configure room inventory while your partner account is
              under review. Booking and financial operations remain unavailable
              until activation.
            </p>
          </div>
        )}

        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/partner"
            className="font-medium text-[#75816F] hover:text-[#405744]"
          >
            Partner Dashboard
          </Link>

          <span className="text-[#C7C5BC]">/</span>

          <Link
            href="/partner/properties"
            className="font-medium text-[#75816F] hover:text-[#405744]"
          >
            My Properties
          </Link>

          <span className="text-[#C7C5BC]">/</span>

          <Link
            href={`/partner/properties/${property.id}`}
            className="font-medium text-[#75816F] hover:text-[#405744]"
          >
            {property.name}
          </Link>

          <span className="text-[#C7C5BC]">/</span>

          <span className="font-medium text-[#263B2D]">
            Room Availability
          </span>
        </nav>

        {/* Property heading */}
        <section className="rounded-3xl border border-[#E7E5DF] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#75816F]">
                PROPERTY INVENTORY MANAGEMENT
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {property.name}
              </h1>

              <p className="mt-3 text-sm text-[#77766F]">
                {location || "Location not specified"}
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#77766F]">
                Monitor the number of rooms booked, blocked, and
                available for every room type at this property.
              </p>
            </div>

            <Link
              href={`/partner/properties/${property.id}`}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#DCDDD5] px-4 py-2.5 text-sm font-medium text-[#405744] transition hover:bg-[#F5F6F2]"
            >
              Manage Property
            </Link>
          </div>
        </section>

        {/* Property summary */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Room types"
            value={property.roomTypes.length}
            description="Registered room categories"
          />

          <StatCard
            label="Total rooms"
            value={totalUnitsToday}
            description="Physical rooms in the displayed inventory"
          />

          <StatCard
            label="Booked rooms"
            value={bookedToday}
            description={`Reserved units on ${formatDate(fromDate)}`}
            color="text-amber-600"
          />

          <StatCard
            label="Available rooms"
            value={availableToday}
            description={`Available units on ${formatDate(fromDate)}`}
            color="text-emerald-700"
          />
        </section>

        {/* Date range controls */}
        <section className="mt-8 rounded-2xl border border-[#E7E5DF] bg-white p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-lg font-semibold">
                Daily availability
              </h2>

              <p className="mt-1 text-sm text-[#77766F]">
                Showing 30 consecutive nights, starting{" "}
                {formatDate(fromDate)}.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              {previousHref ? (
                <Link
                  href={previousHref}
                  className="rounded-xl border border-[#DCDDD5] px-4 py-2.5 text-sm font-medium text-[#405744] hover:bg-[#F5F6F2]"
                >
                  ← Previous 30 days
                </Link>
              ) : (
                <span className="rounded-xl border border-[#EEECE6] px-4 py-2.5 text-sm text-[#AAA89F]">
                  ← Previous 30 days
                </span>
              )}

              <form method="GET" className="flex items-end gap-2">
                <div>
                  <label
                    htmlFor="availability-from"
                    className="mb-1 block text-xs font-medium text-[#77766F]"
                  >
                    Start date
                  </label>

                  <input
                    id="availability-from"
                    name="from"
                    type="date"
                    min={formatDateInput(today)}
                    defaultValue={formatDateInput(fromDate)}
                    required
                    className="rounded-xl border border-[#DCDDD5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#405744]"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-[#405744] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#304532]"
                >
                  View
                </button>
              </form>

              <Link
                href={nextHref}
                className="rounded-xl border border-[#DCDDD5] px-4 py-2.5 text-sm font-medium text-[#405744] hover:bg-[#F5F6F2]"
              >
                Next 30 days →
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#EEECE6] pt-4 text-xs text-[#77766F]">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Available
            </span>

            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Booked / reserved
            </span>

            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              Blocked
            </span>
          </div>
        </section>

        {/* Room type availability */}
        <section className="mt-8">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#75816F]">
              ROOM-BY-ROOM BREAKDOWN
            </p>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              All registered rooms
            </h2>

            <p className="mt-2 text-sm text-[#77766F]">
              Each row shows the daily inventory for one room type.
              Scroll horizontally to view all 30 dates.
            </p>
          </div>

          {property.roomTypes.length === 0 ? (
            <div className="rounded-2xl border border-[#E7E5DF] bg-white px-6 py-14 text-center">
              <h3 className="text-lg font-semibold">
                No room types registered
              </h3>

              <p className="mt-2 text-sm text-[#77766F]">
                Add room types to this property before viewing
                daily availability.
              </p>

              <Link
                href={`/partner/properties/${property.id}`}
                className="mt-5 inline-flex rounded-xl bg-[#405744] px-5 py-3 text-sm font-medium text-white"
              >
                Add Room Types
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {property.roomTypes.map((room) => {
                const roomInventory = inventoryByRoom.get(room.id);

                return (
                  <div
                    key={room.id}
                    className="overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white shadow-sm"
                  >
                    <div className="flex flex-col justify-between gap-3 border-b border-[#EEECE6] p-5 sm:flex-row sm:items-center sm:px-6">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {room.name}
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              room.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {room.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-[#77766F]">
                          {room.totalUnits} physical rooms
                        </p>
                      </div>

                      <Link
                        href={`/partner/properties/${property.id}/rooms/${room.id}`}
                        className="inline-flex w-fit items-center rounded-xl border border-[#DCDDD5] px-4 py-2 text-sm font-medium text-[#405744] hover:bg-[#F5F6F2]"
                      >
                        Manage Room →
                      </Link>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] border-collapse text-sm">
                        <thead>
                          <tr className="bg-[#F8F8F5] text-left text-xs font-semibold uppercase tracking-wide text-[#77766F]">
                            <th className="sticky left-0 z-10 min-w-[150px] border-b border-[#EEECE6] bg-[#F8F8F5] px-5 py-3">
                              Date
                            </th>

                            <th className="border-b border-[#EEECE6] px-4 py-3 text-center">
                              Total
                            </th>

                            <th className="border-b border-[#EEECE6] px-4 py-3 text-center">
                              Booked
                            </th>

                            <th className="border-b border-[#EEECE6] px-4 py-3 text-center">
                              Blocked
                            </th>

                            <th className="border-b border-[#EEECE6] px-4 py-3 text-center">
                              Available
                            </th>

                            <th className="border-b border-[#EEECE6] px-5 py-3 text-right">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-[#EEECE6]">
                          {dates.map((date) => {
                            const dateKey = formatDateInput(date);
                            const item = roomInventory?.get(dateKey);

                            if (!item) {
                              return (
                                <tr key={dateKey}>
                                  <td className="sticky left-0 bg-white px-5 py-4 font-medium">
                                    {formatDate(date)}
                                  </td>

                                  <td
                                    colSpan={5}
                                    className="px-4 py-4 text-center text-sm text-amber-700"
                                  >
                                    Inventory not available for this date
                                  </td>
                                </tr>
                              );
                            }

                            const available =
                              item.totalUnits -
                              item.reservedUnits -
                              item.blockedUnits;

                            return (
                              <tr
                                key={dateKey}
                                className="transition hover:bg-[#FAF9F6]"
                              >
                                <td className="sticky left-0 bg-white px-5 py-4 font-medium text-[#263B2D]">
                                  {formatDate(date)}
                                </td>

                                <td className="px-4 py-4 text-center font-medium">
                                  {item.totalUnits}
                                </td>

                                <td className="px-4 py-4 text-center">
                                  <span className="inline-flex min-w-9 justify-center rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                                    {item.reservedUnits}
                                  </span>
                                </td>

                                <td className="px-4 py-4 text-center">
                                  <span className="inline-flex min-w-9 justify-center rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                                    {item.blockedUnits}
                                  </span>
                                </td>

                                <td className="px-4 py-4 text-center">
                                  <span
                                    className={`inline-flex min-w-9 justify-center rounded-lg px-2.5 py-1 font-semibold ${
                                      available > 0
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-red-50 text-red-700"
                                    }`}
                                  >
                                    {available}
                                  </span>
                                </td>

                                <td className="px-5 py-4 text-right">
                                  <Link
                                    href={`/partner/properties/${property.id}/rooms/${room.id}`}
                                    className="text-xs font-semibold text-[#405744] hover:underline"
                                  >
                                    Manage
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-[#E2E0D9] py-6 text-center text-xs text-[#89877F]">
          EthiopianBooking Partner Portal · Property Room Availability
        </footer>
      </div>
    </main>
  );
}
