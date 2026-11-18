import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import PartnerStaffManager from "./team/partner-staff-manager";

export const dynamic = "force-dynamic";

function formatETB(value: unknown) {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
      <p className="text-sm text-[#77766F]">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-[#263B2D]">{value}</p>
      <p className="mt-2 text-xs text-[#89877F]">{description}</p>
    </div>
  );
}

export default async function PartnerDashboardPage() {
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
            select: {
              id: true,
              name: true,
              status: true,
              verificationStatus: true,
              createdAt: true,
              location: {
                select: {
                  city: true,
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
      <main className="min-h-screen bg-[#F4F3EF] p-6">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8">
          <h1 className="text-2xl font-semibold text-[#263B2D]">
            Partner account not found
          </h1>

          <p className="mt-3 text-sm text-[#77766F]">
            We could not find an active partner membership linked to your
            account. Please contact EthiopianBooking support.
          </p>
        </div>
      </main>
    );
  }

  const partner = membership.partner;

  if (partner.status === "SUSPENDED" || partner.status === "INACTIVE") {
    return (
      <main className="min-h-screen bg-[#F4F3EF] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#E7E5DF] bg-white p-8">
          <p className="text-sm font-medium text-[#75816F]">
            ETHIOPIANBOOKING / PARTNER PORTAL
          </p>

          <h1 className="mt-3 text-2xl font-semibold text-[#263B2D]">
            Partner account {partner.status.toLowerCase()}
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#77766F]">
            Your partner account is currently {partner.status.toLowerCase()}.
            Access to property operations, bookings, and financial information
            is unavailable. Please contact EthiopianBooking support for
            assistance.
          </p>
        </div>
      </main>
    );
  }

  const properties = partner.properties;

  const approvedProperties = properties.filter(
    (property) => property.status === "APPROVED"
  ).length;

  const pendingProperties = properties.filter((property) =>
    ["PENDING_REVIEW", "UNDER_REVIEW"].includes(property.status)
  ).length;

  // Booking and financial information is retrieved only for ACTIVE partners.
  let totalBookings = 0;
  let paidBookings = 0;
  let pendingBookings = 0;
  let paidRoomSales = 0;

  let recentBookings: {
    id: string;
    status: string;
    paymentStatus: string;
    customerFirstName: string;
    customerLastName: string | null;
    createdAt: Date;
    items: {
      roomName: string;
      quantity: number;
      subtotal: unknown;
      roomType: {
        property: {
          name: string;
        };
      };
    }[];
  }[] = [];

  if (partner.status === "ACTIVE") {
    const propertyWhere = {
      roomType: {
        property: {
          partnerId: partner.id,
        },
      },
    };

    const [
      totalBookingsResult,
      paidBookingsResult,
      pendingBookingsResult,
      paidRoomSalesResult,
      recentBookingsResult,
    ] = await Promise.all([
      prisma.booking.count({
        where: {
          items: {
            some: propertyWhere,
          },
        },
      }),

      prisma.booking.count({
        where: {
          paymentStatus: "PAID",
          items: {
            some: propertyWhere,
          },
        },
      }),

      prisma.booking.count({
        where: {
          status: {
            in: ["PENDING", "PAYMENT_PENDING"],
          },
          items: {
            some: propertyWhere,
          },
        },
      }),

      prisma.bookingItem.aggregate({
        where: {
          ...propertyWhere,
          booking: {
            paymentStatus: "PAID",
          },
        },
        _sum: {
          subtotal: true,
        },
      }),

      prisma.booking.findMany({
        where: {
          items: {
            some: propertyWhere,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          customerFirstName: true,
          customerLastName: true,
          createdAt: true,
          items: {
            where: propertyWhere,
            select: {
              roomName: true,
              quantity: true,
              subtotal: true,
              roomType: {
                select: {
                  property: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    totalBookings = totalBookingsResult;
    paidBookings = paidBookingsResult;
    pendingBookings = pendingBookingsResult;
    paidRoomSales = Number(paidRoomSalesResult._sum.subtotal ?? 0);
    recentBookings = recentBookingsResult;
  }

  return (
    <main className="min-h-screen bg-[#F4F3EF] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-[#75816F]">
              ETHIOPIANBOOKING / PARTNER PORTAL
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-[#263B2D]">
              Welcome, {partner.businessName}
            </h1>

            <p className="mt-2 text-sm text-[#77766F]">
              Manage your properties and monitor your accommodation business.
            </p>
          </div>

          <Link
            href="/partner/properties/new"
            className="w-fit rounded-xl bg-[#405744] px-5 py-3 text-sm font-medium text-white hover:bg-[#304532]"
          >
            + Add new property
          </Link>
        </header>

        {partner.status === "PENDING" && (
          <div className="mb-6 rounded-2xl border border-[#E8DDBB] bg-[#FFF9E9] p-5">
            <p className="font-semibold text-[#665329]">
              Your partner account is awaiting approval
            </p>

            <p className="mt-1 text-sm text-[#806D43]">
              You can register properties and configure rooms, pricing, photos,
              documents, and inventory. Booking and financial features will
              become available after your partner account is activated.
            </p>
          </div>
        )}

        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-[#263B2D]">
            Property overview
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total properties"
              value={properties.length}
              description="Properties registered under your account"
            />

            <StatCard
              label="Approved properties"
              value={approvedProperties}
              description={`${pendingProperties} properties awaiting review`}
            />

            <StatCard
              label="Properties awaiting review"
              value={pendingProperties}
              description="Listings pending platform review"
            />

            <StatCard
              label="Partner account"
              value={partner.status === "ACTIVE" ? "Active" : "Pending"}
              description={
                partner.status === "ACTIVE"
                  ? "Your partner account is active"
                  : "Complete your property setup while awaiting approval"
              }
            />
          </div>
        </section>

        {partner.status === "ACTIVE" && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-[#263B2D]">
              Booking overview
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total bookings"
                value={totalBookings}
                description="Bookings involving your properties"
              />

              <StatCard
                label="Paid bookings"
                value={paidBookings}
                description="Bookings marked as paid"
              />

              <StatCard
                label="Pending bookings"
                value={pendingBookings}
                description="Bookings awaiting confirmation or payment"
              />

              <StatCard
                label="Paid room sales"
                value={formatETB(paidRoomSales)}
                description="Room subtotals from paid bookings"
              />
            </div>
          </section>
        )}

        <section className="mb-8 rounded-2xl border border-[#E7E5DF] bg-white p-5 sm:p-6">
          <div className="mb-5"><h2 className="text-lg font-semibold text-[#263B2D]">Front desk team</h2><p className="mt-1 text-sm text-[#77766F]">Invite and manage staff who handle guest arrivals, departures and walk-in bookings.</p></div>
          <PartnerStaffManager partnerId={partner.id} />
        </section>

        <section className="mb-8 overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white">
          <div
            id="properties"
            className="border-b border-[#EEECE6] px-5 py-4"
          >
            <h2 className="font-semibold text-[#263B2D]">
              Your properties
            </h2>

            <p className="mt-1 text-xs text-[#89877F]">
              Manage your accommodation listings.
            </p>
          </div>

          {properties.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium text-[#263B2D]">
                You have not added any properties yet.
              </p>

              <Link
                href="/partner/properties/new"
                className="mt-3 inline-block text-sm font-medium text-[#536D50] hover:underline"
              >
                Register your first property →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#EEECE6]">
              {properties.map((property) => (
                <Link
                  key={property.id}
                  href={`/partner/properties/${property.id}`}
                  className="flex flex-col justify-between gap-3 px-5 py-4 transition hover:bg-[#FAF9F6] sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-medium text-[#263B2D]">
                      {property.name}
                    </p>

                    <p className="mt-1 text-xs text-[#89877F]">
                      {property.location?.city || "Location not specified"}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-[#F1F0EB] px-3 py-1 text-xs text-[#62665D]">
                    {property.status.replaceAll("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {partner.status === "ACTIVE" && (
          <section className="overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white">
            <div className="border-b border-[#EEECE6] px-5 py-4">
              <h2 className="font-semibold text-[#263B2D]">
                Recent bookings
              </h2>

              <p className="mt-1 text-xs text-[#89877F]">
                Recent reservations involving your properties.
              </p>
            </div>

            {recentBookings.length === 0 ? (
              <p className="p-6 text-sm text-[#77766F]">
                No bookings have been made for your properties yet.
              </p>
            ) : (
              <div className="divide-y divide-[#EEECE6]">
                {recentBookings.map((booking) => {
                  const partnerSubtotal = booking.items.reduce(
                    (total, item) => total + Number(item.subtotal),
                    0
                  );

                  return (
                    <div key={booking.id} className="px-5 py-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row">
                        <div>
                          <p className="font-medium text-[#263B2D]">
                            {[
                              booking.customerFirstName,
                              booking.customerLastName,
                            ]
                              .filter(Boolean)
                              .join(" ") || "Guest"}
                          </p>

                          <p className="mt-1 text-xs text-[#89877F]">
                            {booking.items
                              .map(
                                (item) =>
                                  `${item.quantity} × ${item.roomName} at ${item.roomType.property.name}`
                              )
                              .join(", ")}
                          </p>
                        </div>

                        <div className="sm:text-right">
                          <p className="font-semibold text-[#263B2D]">
                            {formatETB(partnerSubtotal)}
                          </p>

                          <p className="mt-1 text-xs text-[#89877F]">
                            Your room subtotal
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[#89877F]">
                        <span>
                          Booking: {booking.status.replaceAll("_", " ")}
                          {" · "}
                          Payment: {booking.paymentStatus.replaceAll("_", " ")}
                        </span>

                        <span>
                          {new Intl.DateTimeFormat("en-GB", {
                            dateStyle: "medium",
                          }).format(booking.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <footer className="mt-8 border-t border-[#E2E0D9] pt-5 text-xs text-[#89877F]">
          EthiopianBooking Partner Portal ·{" "}
          {partner.status === "ACTIVE"
            ? "Sales figures show room subtotals, not final partner payouts."
            : "Property setup and account onboarding."}
        </footer>
      </div>
    </main>
  );
}