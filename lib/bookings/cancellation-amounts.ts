// Refund and cancellation-fee split for a customer cancelling a paid booking.
// Amounts are worked out in cents per booking item, based on each item's
// rate-plan cancellation policy, then summed.
export function calculateCancellationAmounts(
  booking: {
    subtotal: { toString(): string };
    totalAmount: { toString(): string };
    items: {
      subtotal: { toString(): string };
      checkInDate: Date;
      ratePlan: {
        cancellationPolicy: string;
        cancellationDeadlineHours: number | null;
        cancellationFeePercent: { toString(): string } | null;
      };
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

    const policy = item.ratePlan.cancellationPolicy;
    const deadlineHours =
      item.ratePlan.cancellationDeadlineHours;

    const deadline =
      deadlineHours === null
        ? null
        : item.checkInDate.getTime() -
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
        item.ratePlan.cancellationFeePercent === null
          ? 100
          : Number(
              item.ratePlan.cancellationFeePercent.toString()
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
