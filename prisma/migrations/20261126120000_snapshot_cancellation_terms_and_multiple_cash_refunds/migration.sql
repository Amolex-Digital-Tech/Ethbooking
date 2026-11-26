-- Store each booking item's cancellation terms and check-in time as they were
-- when the booking was made, so later rate-plan edits don't change refunds.
ALTER TABLE "booking_items"
  ADD COLUMN "cancellationPolicy" "CancellationPolicyType",
  ADD COLUMN "cancellationDeadlineHours" INTEGER,
  ADD COLUMN "cancellationFeePercent" DECIMAL(5,2),
  ADD COLUMN "checkInTime" TEXT;

-- Existing bookings: copy the current terms, the best record available.
UPDATE "booking_items" AS bi
SET
  "cancellationPolicy" = rp."cancellationPolicy",
  "cancellationDeadlineHours" = rp."cancellationDeadlineHours",
  "cancellationFeePercent" = rp."cancellationFeePercent",
  "checkInTime" = COALESCE(rt."checkInTime", p."checkInTime")
FROM "rate_plans" AS rp, "room_types" AS rt, "properties" AS p
WHERE rp."id" = bi."ratePlanId"
  AND rt."id" = bi."roomTypeId"
  AND p."id" = rt."propertyId";

-- Allow more than one cash refund per booking (for example a refunded
-- duplicate payment followed by a cancellation refund).
DROP INDEX "cash_refunds_bookingId_key";
CREATE INDEX "cash_refunds_bookingId_idx" ON "cash_refunds"("bookingId");
