import { prisma } from "@/lib/prisma/client";
import {
  getReportDateRange,
  type ReportFilters,
} from "@/lib/admin/financial-reports";

function amount(value: { toString(): string } | number | string): number {
  return Number(value.toString());
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

type PartnerCurrencySummary = {
  currency: string;
  bookingRevenue: number;
  roomSubtotal: number;
  platformCommission: number;
  paymentFees: number;
  partnerEarnings: number;
  successfulTransactionValue: number;
  paidBookingCount: number;
  successfulTransactionCount: number;
};

function createSummary(currency: string): PartnerCurrencySummary {
  return {
    currency,
    bookingRevenue: 0,
    roomSubtotal: 0,
    platformCommission: 0,
    paymentFees: 0,
    partnerEarnings: 0,
    successfulTransactionValue: 0,
    paidBookingCount: 0,
    successfulTransactionCount: 0,
  };
}
export type { ReportFilters } from "@/lib/admin/financial-reports";
export async function getPartnerFinancialReport(
  partnerId: string,
  filters: ReportFilters
) {
  if (!partnerId) {
    throw new Error("Partner ID is required.");
  }

  const dateRange = getReportDateRange(filters);

  const transactionDateFilter = {
    status: "SUCCESS" as const,
    verifiedAt: {
      gte: dateRange.start,
      lt: dateRange.end,
    },
  };

  const bookings = await prisma.booking.findMany({
    where: {
      paymentTransactions: {
        some: transactionDateFilter,
      },
      items: {
        some: {
          roomType: {
            property: {
              partnerId,
            },
          },
        },
      },
    },
    include: {
      items: {
        include: {
          roomType: {
            include: {
              property: {
                select: {
                  id: true,
                  name: true,
                  partnerId: true,
                },
              },
            },
          },
        },
      },
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
  });

  const summaries = new Map<string, PartnerCurrencySummary>();

  function getSummary(currency: string) {
    if (!summaries.has(currency)) {
      summaries.set(currency, createSummary(currency));
    }

    return summaries.get(currency)!;
  }

  const bookingRows = bookings.map((booking) => {
    // Only include room items belonging to this partner.
    const ownItems = booking.items.filter(
      (item) => item.roomType.property.partnerId === partnerId
    );

    // Include every room item when calculating the allocation denominator.
    const allRoomSubtotal = booking.items.reduce(
      (total, item) => total + amount(item.subtotal),
      0
    );

    // Calculate the room subtotal belonging to this partner.
    const partnerRoomSubtotal = ownItems.reduce(
      (total, item) => total + amount(item.subtotal),
      0
    );

    // Determine this partner's proportional share of the booking.
    const allocationRatio =
      allRoomSubtotal > 0
        ? partnerRoomSubtotal / allRoomSubtotal
        : 0;

    // Allocate booking-level financial values proportionally.
    const allocatedBookingRevenue = roundMoney(
      amount(booking.totalAmount) * allocationRatio
    );

    const allocatedCommission = roundMoney(
      amount(booking.platformCommission) * allocationRatio
    );

    const allocatedPaymentFees = roundMoney(
      amount(booking.paymentFee) * allocationRatio
    );

    const allocatedPartnerEarnings = roundMoney(
      amount(booking.partnerAmount) * allocationRatio
    );

    // Allocate successful transaction values proportionally.
    const allocatedTransactionValue = roundMoney(
      booking.paymentTransactions
        .filter(
          (transaction) => transaction.currency === booking.currency
        )
        .reduce(
          (total, transaction) => total + amount(transaction.amount),
          0
        ) * allocationRatio
    );

    const summary = getSummary(booking.currency);

    summary.bookingRevenue += allocatedBookingRevenue;
    summary.roomSubtotal += roundMoney(partnerRoomSubtotal);
    summary.platformCommission += allocatedCommission;
    summary.paymentFees += allocatedPaymentFees;
    summary.partnerEarnings += allocatedPartnerEarnings;
    summary.successfulTransactionValue += allocatedTransactionValue;
    summary.paidBookingCount += 1;
    summary.successfulTransactionCount +=
      booking.paymentTransactions.length;

    return {
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

      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      createdAt: booking.createdAt,

      roomSubtotal: roundMoney(partnerRoomSubtotal),
      bookingRevenue: allocatedBookingRevenue,
      platformCommission: allocatedCommission,
      paymentFees: allocatedPaymentFees,
      partnerEarnings: allocatedPartnerEarnings,
      successfulTransactionValue: allocatedTransactionValue,

      properties: Array.from(
        new Set(
          ownItems.map((item) => item.roomType.property.name)
        )
      ),

      rooms: ownItems.map((item) => ({
        roomName: item.roomName,
        ratePlanName: item.ratePlanName,
        quantity: item.quantity,
        subtotal: amount(item.subtotal),
      })),

      paymentTransactions: booking.paymentTransactions.map(
        (transaction) => ({
          reference: transaction.transactionReference,

          // Show only this partner's allocated transaction value.
          amount: roundMoney(
            amount(transaction.amount) * allocationRatio
          ),

          currency: transaction.currency,
          verifiedAt: transaction.verifiedAt,
        })
      ),
    };
  });

  // Round accumulated totals after all bookings have been processed.
  const finalSummaries = Array.from(summaries.values())
    .map((summary) => ({
      ...summary,

      bookingRevenue: roundMoney(summary.bookingRevenue),
      roomSubtotal: roundMoney(summary.roomSubtotal),
      platformCommission: roundMoney(summary.platformCommission),
      paymentFees: roundMoney(summary.paymentFees),
      partnerEarnings: roundMoney(summary.partnerEarnings),

      successfulTransactionValue: roundMoney(
        summary.successfulTransactionValue
      ),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  return {
    dateRange,
    summaries: finalSummaries,
    bookingRows,

    successfulTransactionCount: bookingRows.reduce(
      (total, booking) =>
        total + booking.paymentTransactions.length,
      0
    ),
  };
}

// Protect exported CSV values against spreadsheet formula injection.
function csvCell(value: unknown): string {
  let text =
    value === null || value === undefined ? "" : String(value);

  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function createPartnerFinancialReportCsv(
  report: Awaited<ReturnType<typeof getPartnerFinancialReport>>
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
      "Properties",
      "Room Subtotal",
      "Allocated Booking Revenue",
      "Platform Commission",
      "Chapa Payment Fees",
      "Net Partner Earnings",
      "Successful Transaction References",
      "Successful Transaction Value",
    ],
  ];

  // Financial summary rows.
  for (const summary of report.summaries) {
    rows.push([
      "SUMMARY",
      summary.currency,
      "Partner room subtotal",
      summary.roomSubtotal,
    ]);

    rows.push([
      "SUMMARY",
      summary.currency,
      "Allocated booking revenue",
      summary.bookingRevenue,
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
      "Chapa payment fees",
      summary.paymentFees,
    ]);

    rows.push([
      "SUMMARY",
      summary.currency,
      "Net partner earnings",
      summary.partnerEarnings,
    ]);

    rows.push([
      "SUMMARY",
      summary.currency,
      "Successful transaction value",
      summary.successfulTransactionValue,
    ]);
  }

  // Individual booking rows.
  for (const booking of report.bookingRows) {
    rows.push([
      "BOOKING",
      booking.currency,
      "Paid booking",
      booking.partnerEarnings,
      booking.bookingReference,
      booking.customerName,
      booking.customerEmail,
      booking.properties.join("; "),
      booking.roomSubtotal,
      booking.bookingRevenue,
      booking.platformCommission,
      booking.paymentFees,
      booking.partnerEarnings,

      booking.paymentTransactions
        .map((transaction) => transaction.reference)
        .join("; "),

      booking.successfulTransactionValue,
    ]);
  }

  return rows
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}