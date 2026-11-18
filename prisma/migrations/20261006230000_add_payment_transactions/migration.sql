-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('CHAPA');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'INITIATED',
    "checkoutUrl" TEXT,
    "paymentMethod" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_transactionReference_key" ON "payment_transactions"("transactionReference");

-- CreateIndex
CREATE INDEX "payment_transactions_bookingId_idx" ON "payment_transactions"("bookingId");

-- CreateIndex
CREATE INDEX "payment_transactions_bookingId_status_idx" ON "payment_transactions"("bookingId", "status");

-- CreateIndex
CREATE INDEX "payment_transactions_provider_idx" ON "payment_transactions"("provider");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_createdAt_idx" ON "payment_transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

