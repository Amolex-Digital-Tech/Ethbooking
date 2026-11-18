import { prisma } from "@/lib/prisma/client";

export type ReportPeriod = "today" | "week" | "month" | "custom";

export type ReportFilters = {
  period?: string;
  from?: string;
  to?: string;
};

const ADDIS_ABABA_OFFSET_HOURS = 3;

function getAddisToday(): string {
  const nowInAddis = new Date(
    Date.now() + ADDIS_ABABA_OFFSET_HOURS * 60 * 60 * 1000
  );

  return nowInAddis.toISOString().slice(0, 10);
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid date. Use YYYY-MM-DD.");
  }

  const date = new Date(`${value}T00:00:00.000+03:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date.");
  }

  // Reject dates that JavaScript silently normalizes, such as February 30.
  const normalized = new Date(date.getTime() + 3 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  if (normalized !== value) {
    throw new Error("Invalid calendar date.");
  }

  return date;
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getReportDateRange(filters: ReportFilters) {
  const requestedPeriod = filters.period || "month";

  const period: ReportPeriod = [
    "today",
    "week",
    "month",
    "custom",
  ].includes(requestedPeriod)
    ? (requestedPeriod as ReportPeriod)
    : "month";

  const today = getAddisToday();

  let from = today;
  let to = today;

  if (period === "week") {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    const daysSinceMonday = (weekday + 6) % 7;

    from = addDays(today, -daysSinceMonday);
  }

  if (period === "month") {
    from = `${today.slice(0, 7)}-01`;
  }

  if (period === "custom") {
    from = filters.from || today;
    to = filters.to || from;

    parseDate(from);
    parseDate(to);

    if (from > to) {
      throw new Error("The start date cannot be after the end date.");
    }
  }

  const start = parseDate(from);
  const end = parseDate(addDays(to, 1));

  return {
    period,
    from,
    to,
    start,
    end,
  };
}

function amount(value: { toString(): string } | number | string): number {
  return Number(value.toString());
}

type CurrencySummary = {
  currency: string;
  bookingRevenue: number;
  platformCommission: number;
  partnerEarnings: number;
  paymentFees: number;
  successfulTransactionValue: number;
  successfulTransactionCount: number;
  paidBookingCount: number;
  recordedRefundAmount: number;
  refundQueueCount: number;
  markedRefundedTransactionValue: number;
  markedRefundedTransactionCount: number;
};

function createCurrencySummary(currency: string): CurrencySummary {
  return {
    currency,
    bookingRevenue: 0,
    platformCommission: 0,
    partnerEarnings: 0,
    paymentFees: 0,
    successfulTransactionValue: 0,
    successfulTransactionCount: 0,
    paidBookingCount: 0,
    recordedRefundAmount: 0,
    refundQueueCount: 0,
    markedRefundedTransactionValue: 0,
    markedRefundedTransactionCount: 0,
  };
}

export async function getFinancialReport(filters: ReportFilters) {
  const dateRange = getReportDateRange(filters);

  const transactionDateFilter = {
    status: "SUCCESS" as const,
    verifiedAt: {
      gte: dateRange.start,
      lt: dateRange.end,
    },
  };

  const [successfulTransactions, paidBookings, refundBookings, refundedTransactions] =
    await Promise.all([
      prisma.paymentTransaction.findMany({
        where: transactionDateFilter,
        include: {
          booking: {
            select: {
              bookingReference: true,
              customerFirstName: true,
              customerLastName: true,
              customerEmail: true,
            },
          },
        },
        orderBy: {
          verifiedAt: "desc",
        },
      }),

      prisma.booking.findMany({
        where: {
          paymentTransactions: {
            some: transactionDateFilter,
          },
        },
        include: {
          paymentTransactions: {
            where: transactionDateFilter,
            orderBy: {
              verifiedAt: "desc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.booking.findMany({
        where: {
          OR: [
            { paymentStatus: "REFUND_PENDING" },
            { paymentStatus: "PARTIALLY_REFUNDED" },
            { paymentStatus: "REFUNDED" },
            { status: "REFUND_PENDING" },
            { status: "REFUNDED" },
            { refundAmount: { gt: 0 } },
          ],
        },
        select: {
          id: true,
          bookingReference: true,
          currency: true,
          paymentStatus: true,
          status: true,
          refundAmount: true,
          totalAmount: true,
          customerFirstName: true,
          customerLastName: true,
          customerEmail: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),

      prisma.paymentTransaction.findMany({
        where: {
          status: "REFUNDED",
        },
        select: {
          amount: true,
          currency: true,
        },
      }),
    ]);

  const summaries = new Map<string, CurrencySummary>();

  function getSummary(currency: string) {
    if (!summaries.has(currency)) {
      summaries.set(currency, createCurrencySummary(currency));
    }

    return summaries.get(currency)!;
  }

  // Count successful payment transactions by their actual transaction currency.
  for (const transaction of successfulTransactions) {
    const summary = getSummary(transaction.currency);

    summary.successfulTransactionValue += amount(transaction.amount);
    summary.successfulTransactionCount += 1;
  }

  // Count each paid booking once, even if it has multiple successful transactions.
  for (const booking of paidBookings) {
    const summary = getSummary(booking.currency);

    summary.bookingRevenue += amount(booking.totalAmount);
    summary.platformCommission += amount(booking.platformCommission);
    summary.partnerEarnings += amount(booking.partnerAmount);
    summary.paymentFees += amount(booking.paymentFee);
    summary.paidBookingCount += 1;
  }

  // These are current refund records, not refunds confirmed as paid out by Chapa.
  for (const booking of refundBookings) {
    const summary = getSummary(booking.currency);

    summary.recordedRefundAmount += amount(booking.refundAmount);
    summary.refundQueueCount += 1;
  }

  // A REFUNDED transaction status is a database status, not independent proof
  // that Chapa transferred the refund to the customer.
  for (const transaction of refundedTransactions) {
    const summary = getSummary(transaction.currency);

    summary.markedRefundedTransactionValue += amount(transaction.amount);
    summary.markedRefundedTransactionCount += 1;
  }

  const bookingRows = paidBookings.map((booking) => ({
    id: booking.id,
    bookingReference: booking.bookingReference,
    customerName: [
      booking.customerFirstName,
      booking.customerLastName,
    ]
      .filter(Boolean)
      .join(" "),
    customerEmail: booking.customerEmail,
    currency: booking.currency,
    bookingRevenue: amount(booking.totalAmount),
    platformCommission: amount(booking.platformCommission),
    partnerEarnings: amount(booking.partnerAmount),
    paymentFees: amount(booking.paymentFee),
    paymentTransactions: booking.paymentTransactions.map((transaction) => ({
      reference: transaction.transactionReference,
      providerTransactionId: transaction.providerTransactionId,
      amount: amount(transaction.amount),
      currency: transaction.currency,
      verifiedAt: transaction.verifiedAt,
    })),
  }));

  const refundRows = refundBookings.map((booking) => ({
    id: booking.id,
    bookingReference: booking.bookingReference,
    customerName: [
      booking.customerFirstName,
      booking.customerLastName,
    ]
      .filter(Boolean)
      .join(" "),
    customerEmail: booking.customerEmail,
    currency: booking.currency,
    paymentStatus: booking.paymentStatus,
    bookingStatus: booking.status,
    recordedRefundAmount: amount(booking.refundAmount),
    bookingTotal: amount(booking.totalAmount),
    updatedAt: booking.updatedAt,
  }));

  return {
    dateRange,
    summaries: Array.from(summaries.values()).sort((a, b) =>
      a.currency.localeCompare(b.currency)
    ),
    bookingRows,
    refundRows,
    successfulTransactionCount: successfulTransactions.length,
  };
}

function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);

  // Prevent spreadsheet formula injection in exported text fields.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function createFinancialReportCsv(
  report: Awaited<ReturnType<typeof getFinancialReport>>
): string {
  const rows: unknown[][] = [
    [
      "Record Type",
      "Currency",
      "Metric",
      "Amount",
      "Booking Reference",
      "Customer",
      "Customer Email",
      "Successful Transaction References",
      "Successful Transaction Value",
      "Platform Commission",
      "Partner Earnings",
      "Payment Fees",
    ],
  ];

  for (const summary of report.summaries) {
    rows.push([
      "SUMMARY",
      summary.currency,
      "Booking revenue",
      summary.bookingRevenue,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);

    rows.push([
      "SUMMARY",
      summary.currency,
      "Platform commission",
      summary.platformCommission,
    ]);

    rows.push([
      "SUMMARY",
      summary.currency,
      "Partner earnings",
      summary.partnerEarnings,
    ]);

    rows.push([
      "SUMMARY",
      summary.currency,
      "Payment fees",
      summary.paymentFees,
    ]);

    rows.push([
      "SUMMARY",
      summary.currency,
      "Successful transaction value",
      summary.successfulTransactionValue,
    ]);

    rows.push([
      "SUMMARY",
      summary.currency,
      "Recorded refund amount - current records",
      summary.recordedRefundAmount,
    ]);

    rows.push([
      "SUMMARY",
      summary.currency,
      "Transactions marked refunded - not payout confirmation",
      summary.markedRefundedTransactionValue,
    ]);
  }

  for (const booking of report.bookingRows) {
    const transactionReferences = booking.paymentTransactions
      .map((transaction) => transaction.reference)
      .join("; ");

    const transactionValue = booking.paymentTransactions
      .filter((transaction) => transaction.currency === booking.currency)
      .reduce((total, transaction) => total + transaction.amount, 0);

    rows.push([
      "BOOKING",
      booking.currency,
      "Paid booking",
      booking.bookingRevenue,
      booking.bookingReference,
      booking.customerName,
      booking.customerEmail,
      transactionReferences,
      transactionValue,
      booking.platformCommission,
      booking.partnerEarnings,
      booking.paymentFees,
    ]);
  }

  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}