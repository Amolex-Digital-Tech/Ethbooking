import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    branch?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 25;

function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return undefined;
  }
  return date;
}

function formatMoney(amount: { toString(): string } | null, currency: string) {
  return `${currency} ${Number(amount?.toString() ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Addis_Ababa",
  }).format(date);
}

function pageHref(page: number, q: string, branch: string, from: string, to: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (branch) params.set("branch", branch);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("page", String(page));
  return `/admin/cash-refunds?${params.toString()}`;
}

export default async function AdminCashRefundsPage({ searchParams }: PageProps) {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const params = await searchParams;
  const q = params.q?.trim() || "";
  const branch = params.branch?.trim() || "";
  const from = validDate(params.from);
  const to = validDate(params.to);
  const rangeError = Boolean(from && to && from > to);
  const requestedPage = Number.parseInt(params.page || "1", 10);
  const safePage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const where = {
    ...(branch ? { branchName: branch } : {}),
    ...(!rangeError && (from || to)
      ? {
          handedOverAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: new Date(to.getTime() + 24 * 60 * 60 * 1000) } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { receiptNumber: { contains: q, mode: "insensitive" as const } },
            { branchName: { contains: q, mode: "insensitive" as const } },
            { branchAddress: { contains: q, mode: "insensitive" as const } },
            { recipientName: { contains: q, mode: "insensitive" as const } },
            { recipientPhone: { contains: q, mode: "insensitive" as const } },
            {
              booking: {
                is: {
                  OR: [
                    { bookingReference: { contains: q, mode: "insensitive" as const } },
                    { customerFirstName: { contains: q, mode: "insensitive" as const } },
                    { customerLastName: { contains: q, mode: "insensitive" as const } },
                    { customerEmail: { contains: q, mode: "insensitive" as const } },
                    { customerPhone: { contains: q, mode: "insensitive" as const } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [refunds, filteredCount, summary, allCount, allSummary, branches] =
    await Promise.all([
      prisma.cashRefund.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              bookingReference: true,
              customerFirstName: true,
              customerLastName: true,
              customerEmail: true,
              status: true,
              paymentStatus: true,
            },
          },
        },
        orderBy: { handedOverAt: "desc" },
        skip: (safePage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.cashRefund.count({ where }),
      prisma.cashRefund.aggregate({
        where,
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.cashRefund.count(),
      prisma.cashRefund.aggregate({
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.cashRefund.findMany({
        distinct: ["branchName"],
        select: { branchName: true },
        orderBy: { branchName: "asc" },
      }),
    ]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const currentPage = Math.min(safePage, totalPages);

  return (
    <div className="min-h-full bg-[#F5F6F2] px-4 py-7 text-[#263B2D] sm:px-7 lg:px-9">
      <div className="mx-auto max-w-[1440px] space-y-7">
        <header>
          <Link href="/admin/payments" className="text-sm font-medium text-[#75816F] hover:text-[#263B2D]">
            ← Back to Payments
          </Link>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-[#75816F]">FINANCIAL OPERATIONS</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Cash refunds</h1>
              <p className="mt-2 text-sm text-[#77766F]">
                A register of cash refunds handed to customers at EthiopianBooking branches.
              </p>
            </div>
            <Link href="/admin/payments" className="rounded-xl border border-[#D9DED5] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#FAFBF8]">
              Payment management
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
            <p className="text-sm text-[#77766F]">{q || branch || from || to ? "Refunds matching filters" : "All recorded cash refunds"}</p>
            <p className="mt-2 text-2xl font-semibold">{formatMoney(summary._sum.amount, "ETB")}</p>
            <p className="mt-1 text-xs text-[#89877F]">{summary._count.id.toLocaleString()} refund record(s)</p>
          </div>
          <div className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
            <p className="text-sm text-[#77766F]">Lifetime cash refunds</p>
            <p className="mt-2 text-2xl font-semibold">{formatMoney(allSummary._sum.amount, "ETB")}</p>
            <p className="mt-1 text-xs text-[#89877F]">{allCount.toLocaleString()} total record(s) across all branches</p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E7E5DF] bg-white p-5">
          <form action="/admin/cash-refunds" method="GET" className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search receipt, booking, customer, branch"
              className="rounded-xl border border-[#D9DED5] px-4 py-3 text-sm outline-none focus:border-[#536D50] xl:col-span-2"
            />
            <select name="branch" defaultValue={branch} className="rounded-xl border border-[#D9DED5] bg-white px-4 py-3 text-sm">
              <option value="">All branches</option>
              {branches.map((item) => <option key={item.branchName} value={item.branchName}>{item.branchName}</option>)}
            </select>
            <input type="date" name="from" defaultValue={params.from || ""} aria-label="From date" className="rounded-xl border border-[#D9DED5] px-4 py-3 text-sm" />
            <input type="date" name="to" defaultValue={params.to || ""} aria-label="To date" className="rounded-xl border border-[#D9DED5] px-4 py-3 text-sm" />
            <div className="flex gap-2 md:col-span-2 xl:col-span-5">
              <button type="submit" className="rounded-xl bg-[#263B2D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#405744]">Apply filters</button>
              <Link href="/admin/cash-refunds" className="rounded-xl border border-[#D9DED5] px-5 py-3 text-sm font-semibold text-[#62665D] hover:bg-gray-50">Clear filters</Link>
            </div>
          </form>
          {rangeError && <p className="mt-3 text-sm font-medium text-red-700">Choose a valid date range. The To date must be on or after the From date.</p>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEECE6] px-5 py-4">
            <div>
              <h2 className="font-semibold">Refund register</h2>
              <p className="mt-1 text-xs text-[#89877F]">Sorted by cash handover date, newest first.</p>
            </div>
            <p className="text-sm text-[#77766F]">{filteredCount.toLocaleString()} matching record(s)</p>
          </div>

          {refunds.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold">No cash refunds found</p>
              <p className="mt-2 text-sm text-[#77766F]">Try changing your search or filters. Completed cash refunds will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-[#FAFAF7] text-xs uppercase tracking-wide text-[#77766F]">
                  <tr>
                    <th className="px-5 py-4">Handover date</th>
                    <th className="px-5 py-4">Booking</th>
                    <th className="px-5 py-4">Recipient</th>
                    <th className="px-5 py-4">Branch</th>
                    <th className="px-5 py-4">Receipt number</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEECE6]">
                  {refunds.map((refund) => (
                    <tr key={refund.id} className="hover:bg-[#FAFBF8]">
                      <td className="px-5 py-4 whitespace-nowrap">{formatDateTime(refund.handedOverAt)} EAT</td>
                      <td className="px-5 py-4">
                        <Link href={`/admin/bookings/${refund.booking.id}`} className="font-semibold text-[#536D50] hover:underline">{refund.booking.bookingReference}</Link>
                        <p className="mt-1 text-xs text-[#89877F]">{refund.booking.customerFirstName} {refund.booking.customerLastName || ""}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium">{refund.recipientName}</p>
                        <p className="mt-1 text-xs text-[#89877F]">{refund.recipientPhone || "No phone recorded"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium">{refund.branchName}</p>
                        <p className="mt-1 max-w-[220px] truncate text-xs text-[#89877F]" title={refund.branchAddress}>{refund.branchAddress}</p>
                      </td>
                      <td className="px-5 py-4 font-medium">{refund.receiptNumber}</td>
                      <td className="px-5 py-4 font-semibold">{formatMoney(refund.amount, refund.currency)}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">CASH PAID</span></td>
                      <td className="px-5 py-4"><Link href={`/admin/bookings/${refund.booking.id}`} className="font-semibold text-[#536D50] hover:underline">View booking →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEECE6] px-5 py-4">
            <p className="text-sm text-[#77766F]">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <Link aria-disabled={currentPage <= 1} tabIndex={currentPage <= 1 ? -1 : undefined} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${currentPage <= 1 ? "pointer-events-none border-gray-100 text-gray-300" : "border-[#D9DED5] text-[#52634F] hover:bg-gray-50"}`} href={pageHref(Math.max(1, currentPage - 1), q, branch, params.from || "", params.to || "")}>Previous</Link>
              <Link aria-disabled={currentPage >= totalPages} tabIndex={currentPage >= totalPages ? -1 : undefined} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${currentPage >= totalPages ? "pointer-events-none border-gray-100 text-gray-300" : "border-[#D9DED5] text-[#52634F] hover:bg-gray-50"}`} href={pageHref(Math.min(totalPages, currentPage + 1), q, branch, params.from || "", params.to || "")}>Next</Link>
            </div>
          </div>
        </section>

        <p className="text-xs leading-5 text-[#89877F]">
          This register records cash handovers made at branch offices. It does not change the status of the original Chapa payment transaction.
        </p>
      </div>
    </div>
  );
}
