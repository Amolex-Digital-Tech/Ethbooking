CREATE TABLE "cash_refunds" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "branchName" TEXT NOT NULL,
    "branchAddress" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "handedOverAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "recordedByProfileId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_refunds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cash_refunds_bookingId_key" ON "cash_refunds"("bookingId");
CREATE UNIQUE INDEX "cash_refunds_receiptNumber_key" ON "cash_refunds"("receiptNumber");
CREATE INDEX "cash_refunds_handedOverAt_idx" ON "cash_refunds"("handedOverAt");
CREATE INDEX "cash_refunds_recordedByProfileId_idx" ON "cash_refunds"("recordedByProfileId");

ALTER TABLE "cash_refunds"
ADD CONSTRAINT "cash_refunds_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "bookings"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
