
import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

function formatETB(value: unknown) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 2,
  }).format(amount);
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
      <p className="text-sm font-medium text-[#77766F]">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-[#263B2D]">
        {value}
      </p>
      <p className="mt-2 text-xs text-[#89877F]">{description}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const [
    totalProperties,
    approvedProperties,
    propertiesNeedingReview,
    totalPartners,
    pendingPartners,
    totalBookings,
    paidBookings,
    pendingBookings,
    refundPendingBookings,
    paidFinancials,
    successfulPayments,
    paymentsNeedingAttention,
    recentBookings,
    recentProperties,
  ] = await Promise.all([
    prisma.property.count(),

    prisma.property.count({
      where: { status: "APPROVED" },
    }),

    prisma.property.count({
      where: {
        status: { in: ["PENDING_REVIEW", "UNDER_REVIEW"] },
      },
    }),

    prisma.partner.count(),

    prisma.partner.count({
      where: { status: "PENDING" },
    }),

    prisma.booking.count(),

    prisma.booking.count({
      where: { paymentStatus: "PAID" },
    }),

    prisma.booking.count({
      where: {
        status: { in: ["PENDING", "PAYMENT_PENDING"] },
      },
    }),

    prisma.booking.count({
      where: {
        OR: [
          { status: "REFUND_PENDING" },
          { paymentStatus: "REFUND_PENDING" },
          { paymentStatus: "PARTIALLY_REFUNDED" },
        ],
      },
    }),

    prisma.booking.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: {
        totalAmount: true,
        platformCommission: true,
        partnerAmount: true,
        paymentFee: true,
      },
    }),

    prisma.paymentTransaction.count({
      where: { status: "SUCCESS" },
    }),

    prisma.paymentTransaction.count({
      where: { status: { in: ["INITIATED", "PENDING"] } },
    }),

    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        customerFirstName: true,
        customerLastName: true,
        createdAt: true,
        items: {
          select: {
            roomName: true,
            quantity: true,
          },
        },
      },
    }),

    prisma.property.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        partner: {
          select: { businessName: true },
        },
        location: {
          select: { city: true },
        },
      },
    }),
  ]);

  const revenue = formatETB(paidFinancials._sum.totalAmount);
  const commission = formatETB(paidFinancials._sum.platformCommission);
  const partnerEarnings = formatETB(paidFinancials._sum.partnerAmount);
  const paymentFees = formatETB(paidFinancials._sum.paymentFee);

  return (
    <main className="min-h-full bg-[#F5F6F2] px-4 py-7 sm:px-7 lg:px-9">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-medium text-[#75816F]">
              PLATFORM OVERVIEW
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#263B2D]">
              Good morning, Admin
            </h1>

            <p className="mt-2 text-sm text-[#77766F]">
              Here is what is happening across your marketplace today.
            </p>
          </div>

       </header>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#263B2D]">
              Platform overview
            </h2>
            <p className="mt-1 text-sm text-[#77766F]">
              Current totals across the platform.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total bookings"
              value={totalBookings}
              description={`${paidBookings} bookings have been paid`}
            />

            <StatCard
              label="Paid booking revenue"
              value={revenue}
              description="Total amount from bookings marked PAID"
            />

            <StatCard
              label="Total properties"
              value={totalProperties}
              description={`${approvedProperties} approved properties`}
            />

            <StatCard
              label="Registered partners"
              value={totalPartners}
              description={`${pendingPartners} partner accounts pending`}
            />
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#263B2D]">
              Financial overview
            </h2>
            <p className="mt-1 text-sm text-[#77766F]">
              Financial totals from bookings marked as paid.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Platform commission"
              value={commission}
              description="Recorded platform commission"
            />

            <StatCard
              label="Partner earnings"
              value={partnerEarnings}
              description="Recorded partner amounts"
            />

            <StatCard
              label="Payment fees"
              value={paymentFees}
              description="Recorded payment fees"
            />

            <StatCard
              label="Successful transactions"
              value={successfulPayments}
              description={`${paymentsNeedingAttention} transactions still pending`}
            />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-[#263B2D]">
            Items needing attention
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
              <p className="text-sm text-[#77766F]">Properties to review</p>
              <p className="mt-3 text-3xl font-semibold text-[#263B2D]">
                {propertiesNeedingReview}
              </p>

              <Link
                href="/admin/properties"
                className="mt-4 inline-block text-sm font-medium text-[#536D50] hover:underline"
              >
                Review properties →
              </Link>
            </div>

            <div className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
              <p className="text-sm text-[#77766F]">Pending partners</p>
              <p className="mt-3 text-3xl font-semibold text-[#263B2D]">
                {pendingPartners}
              </p>

              <Link
                href="/admin/partners"
                className="mt-4 inline-block text-sm font-medium text-[#536D50] hover:underline"
              >
                Review partners →
              </Link>
            </div>

            <div className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
              <p className="text-sm text-[#77766F]">
                Unpaid / pending bookings
              </p>

              <p className="mt-3 text-3xl font-semibold text-[#263B2D]">
                {pendingBookings}
              </p>

              <Link
                href="/admin/bookings"
                className="mt-4 inline-block text-sm font-medium text-[#536D50] hover:underline"
              >
                Review bookings →
              </Link>
            </div>

            <div className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
              <p className="text-sm text-[#77766F]">
                Bookings awaiting refund review
              </p>

              <p className="mt-3 text-3xl font-semibold text-amber-700">
                {refundPendingBookings}
              </p>

              <Link
                href="/admin/payments"
                className="mt-4 inline-block text-sm font-medium text-[#536D50] hover:underline"
              >
                Review payments →
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white">
            <div className="flex items-center justify-between border-b border-[#EEECE6] px-5 py-4">
              <div>
                <h2 className="font-semibold text-[#263B2D]">
                  Recent bookings
                </h2>
                <p className="mt-1 text-xs text-[#89877F]">
                  The latest bookings created on the platform.
                </p>
              </div>

              <Link
                href="/admin/bookings"
                className="text-xs font-medium text-[#536D50] hover:underline"
              >
                View all →
              </Link>
            </div>

            {recentBookings.length === 0 ? (
              <p className="p-5 text-sm text-[#77766F]">
                No bookings have been created yet.
              </p>
            ) : (
              <div className="divide-y divide-[#EEECE6]">
                {recentBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/admin/bookings/${booking.id}`}
                    className="block px-5 py-4 transition hover:bg-[#FAF9F6]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#263B2D]">
                          {[booking.customerFirstName, booking.customerLastName]
                            .filter(Boolean)
                            .join(" ") || "Guest"}
                        </p>

                        <p className="mt-1 text-xs text-[#89877F]">
                          {booking.items
                            .map(
                              (item) =>
                                `${item.quantity} × ${item.roomName}`
                            )
                            .join(", ") || "Booking"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#263B2D]">
                          {formatETB(booking.totalAmount)}
                        </p>
                        <p className="mt-1 text-xs text-[#89877F]">
                          {booking.paymentStatus}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-[#89877F]">
                      <span>{booking.status}</span>
                      <span>
                        {new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                        }).format(booking.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white">
            <div className="flex items-center justify-between border-b border-[#EEECE6] px-5 py-4">
              <div>
                <h2 className="font-semibold text-[#263B2D]">
                  Recently added properties
                </h2>
                <p className="mt-1 text-xs text-[#89877F]">
                  The latest properties submitted by partners.
                </p>
              </div>

              <Link
                href="/admin/properties"
                className="text-xs font-medium text-[#536D50] hover:underline"
              >
                View all →
              </Link>
            </div>

            {recentProperties.length === 0 ? (
              <p className="p-5 text-sm text-[#77766F]">
                No properties have been registered yet.
              </p>
            ) : (
              <div className="divide-y divide-[#EEECE6]">
                {recentProperties.map((property) => (
                  <Link
                    key={property.id}
                    href={`/admin/properties/${property.id}`}
                    className="block px-5 py-4 transition hover:bg-[#FAF9F6]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#263B2D]">
                          {property.name}
                        </p>

                        <p className="mt-1 text-xs text-[#89877F]">
                          {property.partner.businessName}
                          {property.location?.city
                            ? ` · ${property.location.city}`
                            : ""}
                        </p>
                      </div>

                      <span className="rounded-full bg-[#F1F0EB] px-3 py-1 text-xs text-[#62665D]">
                        {property.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <footer className="mt-8 border-t border-[#E2E0D9] pt-5 text-xs text-[#89877F]">
          EthiopianBooking Administration · Financial figures reflect
          records currently marked as paid.
        </footer>
      </div>
    </main>
  );
}
