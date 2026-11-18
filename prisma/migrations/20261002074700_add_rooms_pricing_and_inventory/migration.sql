-- CreateEnum
CREATE TYPE "BedType" AS ENUM ('SINGLE', 'TWIN', 'DOUBLE', 'QUEEN', 'KING', 'BUNK', 'SOFA_BED', 'MULTIPLE', 'OTHER');

-- CreateEnum
CREATE TYPE "MealPlan" AS ENUM ('ROOM_ONLY', 'BREAKFAST', 'HALF_BOARD', 'FULL_BOARD', 'ALL_INCLUSIVE');

-- CreateEnum
CREATE TYPE "CancellationPolicyType" AS ENUM ('NON_REFUNDABLE', 'FLEXIBLE', 'MODERATE', 'CUSTOM');

-- CreateTable
CREATE TABLE "room_types" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxGuests" INTEGER NOT NULL,
    "maxAdults" INTEGER,
    "maxChildren" INTEGER,
    "bedType" "BedType" NOT NULL,
    "bedCount" INTEGER NOT NULL DEFAULT 1,
    "sizeSquareMeters" DECIMAL(8,2),
    "totalUnits" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_photos" (
    "id" UUID NOT NULL,
    "roomTypeId" UUID NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_plans" (
    "id" UUID NOT NULL,
    "roomTypeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mealPlan" "MealPlan" NOT NULL DEFAULT 'ROOM_ONLY',
    "cancellationPolicy" "CancellationPolicyType" NOT NULL,
    "cancellationDeadlineHours" INTEGER,
    "cancellationFeePercent" DECIMAL(5,2),
    "basePrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_inventory" (
    "id" UUID NOT NULL,
    "roomTypeId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "totalUnits" INTEGER NOT NULL,
    "reservedUnits" INTEGER NOT NULL DEFAULT 0,
    "blockedUnits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_types_propertyId_idx" ON "room_types"("propertyId");

-- CreateIndex
CREATE INDEX "room_types_propertyId_isActive_idx" ON "room_types"("propertyId", "isActive");

-- CreateIndex
CREATE INDEX "room_photos_roomTypeId_idx" ON "room_photos"("roomTypeId");

-- CreateIndex
CREATE INDEX "room_photos_roomTypeId_sortOrder_idx" ON "room_photos"("roomTypeId", "sortOrder");

-- CreateIndex
CREATE INDEX "rate_plans_roomTypeId_idx" ON "rate_plans"("roomTypeId");

-- CreateIndex
CREATE INDEX "rate_plans_roomTypeId_isActive_idx" ON "rate_plans"("roomTypeId", "isActive");

-- CreateIndex
CREATE INDEX "room_inventory_roomTypeId_date_idx" ON "room_inventory"("roomTypeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "room_inventory_roomTypeId_date_key" ON "room_inventory"("roomTypeId", "date");

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_photos" ADD CONSTRAINT "room_photos_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_inventory" ADD CONSTRAINT "room_inventory_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
