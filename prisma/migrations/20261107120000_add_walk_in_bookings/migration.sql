ALTER TABLE "bookings"
ALTER COLUMN "customerProfileId" DROP NOT NULL;

ALTER TYPE "PaymentStatus"
ADD VALUE 'PARTIALLY_PAID';

CREATE TYPE "OfflinePaymentMethod" AS ENUM (
  'CASH',
  'BANK_TRANSFER',
  'POS_CARD',
  'MOBILE_MONEY',
  'OTHER'
);

CREATE TABLE "offline_payments" (
  "id" UUID NOT NULL,
  "bookingId" UUID NOT NULL,
  "method" "OfflinePaymentMethod" NOT NULL,
  "methodDetails" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ETB',
  "reference" TEXT,
  "note" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedByProfileId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "offline_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "offline_payments_bookingId_idx"
ON "offline_payments"("bookingId");

CREATE INDEX "offline_payments_recordedByProfileId_idx"
ON "offline_payments"("recordedByProfileId");

CREATE INDEX "offline_payments_paidAt_idx"
ON "offline_payments"("paidAt");

ALTER TABLE "offline_payments"
ADD CONSTRAINT "offline_payments_bookingId_fkey"
FOREIGN KEY ("bookingId")
REFERENCES "bookings"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;