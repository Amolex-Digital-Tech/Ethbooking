// Rules for deciding when an unresolved Chapa payment attempt should stop
// holding room inventory for an expired booking.
//
// Giving up on an attempt never loses money: if Chapa later reports the
// attempt as successful, completeChapaPayment() still records it and moves
// the booking to REFUND_PENDING (late payment).

// Chapa still reports the attempt as pending (for example the customer
// opened the checkout page and left). After this long we treat it as
// abandoned and release the rooms.
export const PENDING_PAYMENT_ABANDON_AFTER_MS = 2 * 60 * 60 * 1000;

// Chapa could not be reached or returned an unexpected error. We wait much
// longer before giving up, in case the provider is having an outage.
export const UNVERIFIABLE_PAYMENT_ABANDON_AFTER_MS = 24 * 60 * 60 * 1000;

export function isPendingPaymentAbandoned(createdAt: Date, now: Date = new Date()) {
  return now.getTime() - createdAt.getTime() >= PENDING_PAYMENT_ABANDON_AFTER_MS;
}

export function isUnverifiablePaymentAbandoned(createdAt: Date, now: Date = new Date()) {
  return now.getTime() - createdAt.getTime() >= UNVERIFIABLE_PAYMENT_ABANDON_AFTER_MS;
}
