-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'EXPIRED', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "GuestType" AS ENUM ('PRIMARY', 'ADDITIONAL');

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "customerProfileId" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "checkInDate" DATE NOT NULL,
    "checkOutDate" DATE NOT NULL,
    "nights" INTEGER NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "platformCommission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "partnerAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "customerFirstName" TEXT NOT NULL,
    "customerLastName" TEXT,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "specialRequests" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_items" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "roomTypeId" UUID NOT NULL,
    "ratePlanId" UUID NOT NULL,
    "roomName" TEXT NOT NULL,
    "ratePlanName" TEXT NOT NULL,
    "checkInDate" DATE NOT NULL,
    "checkOutDate" DATE NOT NULL,
    "nights" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "guests" INTEGER NOT NULL,
    "pricePerNight" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_guests" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "guestType" "GuestType" NOT NULL DEFAULT 'ADDITIONAL',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "countryCode" TEXT,
    "dateOfBirth" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingReference_key" ON "bookings"("bookingReference");

-- CreateIndex
CREATE INDEX "bookings_customerProfileId_idx" ON "bookings"("customerProfileId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_paymentStatus_idx" ON "bookings"("paymentStatus");

-- CreateIndex
CREATE INDEX "bookings_checkInDate_checkOutDate_idx" ON "bookings"("checkInDate", "checkOutDate");

-- CreateIndex
CREATE INDEX "bookings_createdAt_idx" ON "bookings"("createdAt");

-- CreateIndex
CREATE INDEX "booking_items_bookingId_idx" ON "booking_items"("bookingId");

-- CreateIndex
CREATE INDEX "booking_items_roomTypeId_idx" ON "booking_items"("roomTypeId");

-- CreateIndex
CREATE INDEX "booking_items_ratePlanId_idx" ON "booking_items"("ratePlanId");

-- CreateIndex
CREATE INDEX "booking_guests_bookingId_idx" ON "booking_guests"("bookingId");

-- CreateIndex
CREATE INDEX "booking_guests_bookingId_guestType_idx" ON "booking_guests"("bookingId", "guestType");

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "rate_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey

-- AddForeignKey
ALTER TABLE "booking_guests" ADD CONSTRAINT "booking_guests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

