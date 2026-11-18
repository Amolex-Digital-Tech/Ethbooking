import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import WalkInBookingForm from "./walk-in-booking-form";

export default async function WalkInBookingPage() {
  const currentUser = await requireRole("PARTNER_OWNER", "PARTNER_MANAGER", "PARTNER_STAFF");
  const canRecordPayments = currentUser.roles.some((role) => ["PARTNER_OWNER", "PARTNER_MANAGER"].includes(role));

  const membership = await prisma.partnerMember.findFirst({
    where: {
      profileId: currentUser.profile.id,
      status: "ACTIVE",
    },
    select: {
      partnerId: true,
      partner: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!membership) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8">
          <h1 className="text-xl font-bold text-slate-900">
            Partner account not found
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your account does not have an active partner organization.
          </p>
        </div>
      </main>
    );
  }

  if (membership.partner.status !== "ACTIVE") {
    return (
      <main className="min-h-screen bg-[#f7f8fa] px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8">
          <h1 className="text-xl font-bold text-slate-900">
            Walk-in bookings unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your partner account is currently{" "}
            {membership.partner.status.toLowerCase()}. Walk-in booking
            access is available only to active partner accounts.
          </p>
          <Link
            href="/partner"
            className="mt-5 inline-block font-semibold text-[#405744] hover:underline"
          >
            Back to Partner Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const propertiesData = await prisma.property.findMany({
    where: {
      partnerId: membership.partnerId,
      status: "APPROVED",
    },
    select: {
      id: true,
      name: true,
      roomTypes: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          maxGuests: true,
          totalUnits: true,
          ratePlans: {
            where: {
              isActive: true,
              currency: "ETB",
            },
            select: {
              id: true,
              name: true,
              basePrice: true,
              currency: true,
            },
          },
        },
      },
    },
  });

  const properties = propertiesData.map((property) => ({
    id: property.id,
    name: property.name,
    roomTypes: property.roomTypes.map((room) => ({
      id: room.id,
      name: room.name,
      maxGuests: room.maxGuests,
      totalUnits: room.totalUnits,
      ratePlans: room.ratePlans.map((rate) => ({
        id: rate.id,
        name: rate.name,
        basePrice: canRecordPayments ? rate.basePrice.toString() : "0",
        currency: rate.currency,
      })),
    })),
  }));

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/partner/bookings"
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Back to bookings
          </Link>

          <p className="mt-5 text-sm font-semibold text-[#64834D]">
            PARTNER BOOKINGS
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Create a walk-in booking
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Register a guest who arrives at your property in person.
            {canRecordPayments ? "You can record cash, bank transfer, POS, mobile money, or another offline payment method." : "Register the guest and reserve the room. Payment recording is managed by the Partner Owner or Manager."}
          </p>
        </div>

        {properties.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <h2 className="font-semibold">
              No approved properties available
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              You need an approved property with an active room and
              rate plan before creating a walk-in booking.
            </p>
          </div>
        ) : (
          <WalkInBookingForm
            partnerId={membership.partnerId}
            properties={properties}
            canRecordPayments={canRecordPayments}
          />
        )}
      </div>
    </main>
  );
}