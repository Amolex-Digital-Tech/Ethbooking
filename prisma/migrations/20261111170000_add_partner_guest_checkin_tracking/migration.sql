ALTER TABLE "bookings"
ADD COLUMN "checkedInAt" TIMESTAMP(3),
ADD COLUMN "checkedInByProfileId" UUID,
ADD COLUMN "checkedOutAt" TIMESTAMP(3),
ADD COLUMN "checkedOutByProfileId" UUID;

CREATE INDEX "bookings_checkedInAt_idx" ON "bookings"("checkedInAt");
CREATE INDEX "bookings_checkedOutAt_idx" ON "bookings"("checkedOutAt");
