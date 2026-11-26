export type CancellationTerms = {
  cancellationPolicy: string;
  cancellationDeadlineHours: number | null;
  cancellationFeePercent: { toString(): string } | null;
  // Local check-in time ("HH:MM"), if the room or property sets one.
  checkInTime: string | null;
};

type BookingItemTermsSource = {
  cancellationPolicy: string | null;
  cancellationDeadlineHours: number | null;
  cancellationFeePercent: { toString(): string } | null;
  checkInTime: string | null;
  ratePlan: {
    cancellationPolicy: string;
    cancellationDeadlineHours: number | null;
    cancellationFeePercent: { toString(): string } | null;
  };
  roomType: { checkInTime: string | null; property: { checkInTime: string | null } };
};

// The terms a booking item was sold under. Items store them when the booking
// is made; an item without them (should not happen after the backfill
// migration) falls back to the rate plan's current terms.
export function cancellationTermsForItem(item: BookingItemTermsSource): CancellationTerms {
  if (item.cancellationPolicy !== null) {
    return {
      cancellationPolicy: item.cancellationPolicy,
      cancellationDeadlineHours: item.cancellationDeadlineHours,
      cancellationFeePercent: item.cancellationFeePercent,
      checkInTime: item.checkInTime,
    };
  }
  return {
    cancellationPolicy: item.ratePlan.cancellationPolicy,
    cancellationDeadlineHours: item.ratePlan.cancellationDeadlineHours,
    cancellationFeePercent: item.ratePlan.cancellationFeePercent,
    checkInTime: item.roomType.checkInTime ?? item.roomType.property.checkInTime,
  };
}

// Ethiopia uses UTC+3 all year (no daylight saving).
const ADDIS_ABABA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

// The moment of check-in in Addis Ababa time. checkInDate is stored as a
// calendar date at UTC midnight. Without a valid check-in time, the start of
// the check-in day (00:00 local) is used.
export function checkInMoment(checkInDate: Date, checkInTime: string | null): Date {
  const match = checkInTime?.trim().match(/^(\d{1,2}):(\d{2})/);
  let hours = 0;
  let minutes = 0;
  if (match) {
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      hours = h;
      minutes = m;
    }
  }
  const localWallClock = Date.UTC(
    checkInDate.getUTCFullYear(),
    checkInDate.getUTCMonth(),
    checkInDate.getUTCDate(),
    hours,
    minutes
  );
  return new Date(localWallClock - ADDIS_ABABA_UTC_OFFSET_MS);
}

// Refund and cancellation-fee split for a customer cancelling a paid booking.
// Amounts are worked out in cents per booking item, based on the terms each
// item was booked under, then summed.
export function calculateCancellationAmounts(
  booking: {
    subtotal: { toString(): string };
    totalAmount: { toString(): string };
    items: {
      subtotal: { toString(): string };
      checkInDate: Date;
      terms: CancellationTerms;
    }[];
  },
  now: Date
) {
  const totalAmount = Number(booking.totalAmount.toString());
  const bookingSubtotal = Number(booking.subtotal.toString());

  if (
    !Number.isFinite(totalAmount) ||
    !Number.isFinite(bookingSubtotal)
  ) {
    throw new Error("Invalid booking amount.");
  }

  const totalCents = Math.max(
    0,
    Math.round(totalAmount * 100)
  );

  if (totalCents === 0 || booking.items.length === 0) {
    return {
      refundAmount: "0.00",
      cancellationFeeAmount: "0.00",
    };
  }

  let allocatedCents = 0;
  let refundCents = 0;

  booking.items.forEach((item, index) => {
    const itemSubtotal = Number(item.subtotal.toString());

    if (!Number.isFinite(itemSubtotal) || itemSubtotal < 0) {
      throw new Error("Invalid booking item amount.");
    }

    // Allocate the booking's total amount across its items.
    // The final item receives any rounding difference.
    const itemBaseCents =
      index === booking.items.length - 1
        ? totalCents - allocatedCents
        : bookingSubtotal > 0
          ? Math.round(
              totalCents * (itemSubtotal / bookingSubtotal)
            )
          : Math.round(totalCents / booking.items.length);

    allocatedCents += itemBaseCents;

    const policy = item.terms.cancellationPolicy;
    const deadlineHours =
      item.terms.cancellationDeadlineHours;

    const deadline =
      deadlineHours === null
        ? null
        : checkInMoment(item.checkInDate, item.terms.checkInTime).getTime() -
          Math.max(0, deadlineHours) * 60 * 60 * 1000;

    const beforeDeadline =
      deadline !== null && now.getTime() < deadline;

    let itemRefundCents = 0;

    if (policy === "FLEXIBLE" && beforeDeadline) {
      itemRefundCents = itemBaseCents;
    }

    if (
      (policy === "MODERATE" || policy === "CUSTOM") &&
      beforeDeadline
    ) {
      // If the fee percentage is missing, use a conservative
      // 100% fee rather than accidentally granting a full refund.
      const configuredFee =
        item.terms.cancellationFeePercent === null
          ? 100
          : Number(
              item.terms.cancellationFeePercent.toString()
            );

      if (!Number.isFinite(configuredFee)) {
        throw new Error(
          "Invalid cancellation fee configuration."
        );
      }

      const feePercent = Math.min(
        100,
        Math.max(0, configuredFee)
      );

      itemRefundCents = Math.round(
        itemBaseCents * (1 - feePercent / 100)
      );
    }

    // NON_REFUNDABLE bookings and cancellations after
    // the deadline receive no refund.
    refundCents += itemRefundCents;
  });

  refundCents = Math.min(
    totalCents,
    Math.max(0, refundCents)
  );

  const cancellationFeeCents = totalCents - refundCents;

  return {
    refundAmount: (refundCents / 100).toFixed(2),
    cancellationFeeAmount: (
      cancellationFeeCents / 100
    ).toFixed(2),
  };
}

const toCents = (value: { toString(): string }) => {
  const number = Number(value.toString());
  if (!Number.isFinite(number)) throw new Error("Invalid booking amount.");
  return Math.round(number * 100);
};
const fromCents = (cents: number) => (cents / 100).toFixed(2);

// Platform and hotel shares of the money kept after a refund.
//
// The kept amount (total minus refund) is split in the same proportion as the
// original booking: the platform keeps the same share of it as its original
// commission was of the total, and the hotel gets the rest. Chapa's
// processing fee was already paid on the original payment and stays with the
// hotel, so on a full refund the hotel's share is minus that fee.
export function calculateSharesAfterRefund(booking: {
  totalAmount: { toString(): string };
  platformCommission: { toString(): string };
  paymentFee: { toString(): string };
  refundAmount: { toString(): string };
}) {
  const totalCents = toCents(booking.totalAmount);
  const commissionCents = toCents(booking.platformCommission);
  const paymentFeeCents = toCents(booking.paymentFee);
  const refundCents = Math.min(Math.max(0, toCents(booking.refundAmount)), totalCents);
  const keptCents = totalCents - refundCents;

  const newCommissionCents =
    totalCents > 0 ? Math.round((commissionCents * keptCents) / totalCents) : 0;

  return {
    platformCommission: fromCents(newCommissionCents),
    partnerAmount: fromCents(keptCents - newCommissionCents - paymentFeeCents),
  };
}
