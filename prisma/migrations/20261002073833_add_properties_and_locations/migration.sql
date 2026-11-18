-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('HOTEL', 'GUESTHOUSE', 'LODGE', 'RESORT', 'APARTMENT', 'HOSTEL', 'VILLA', 'BOUTIQUE_HOTEL', 'BED_AND_BREAKFAST', 'HOMESTAY', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PropertyDocumentType" AS ENUM ('BUSINESS_LICENSE', 'TOURISM_LICENSE', 'TAX_DOCUMENT', 'OWNER_ID', 'PROPERTY_OWNERSHIP', 'OTHER');

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Ethiopia',
    "region" TEXT,
    "city" TEXT NOT NULL,
    "subCity" TEXT,
    "neighborhood" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "propertyType" "PropertyType" NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_photos" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_documents" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "documentType" "PropertyDocumentType" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "documentName" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locations_city_idx" ON "locations"("city");

-- CreateIndex
CREATE INDEX "locations_region_idx" ON "locations"("region");

-- CreateIndex
CREATE INDEX "locations_latitude_longitude_idx" ON "locations"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "properties_slug_key" ON "properties"("slug");

-- CreateIndex
CREATE INDEX "properties_partnerId_idx" ON "properties"("partnerId");

-- CreateIndex
CREATE INDEX "properties_locationId_idx" ON "properties"("locationId");

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");

-- CreateIndex
CREATE INDEX "properties_verificationStatus_idx" ON "properties"("verificationStatus");

-- CreateIndex
CREATE INDEX "properties_propertyType_idx" ON "properties"("propertyType");

-- CreateIndex
CREATE INDEX "property_photos_propertyId_idx" ON "property_photos"("propertyId");

-- CreateIndex
CREATE INDEX "property_photos_propertyId_sortOrder_idx" ON "property_photos"("propertyId", "sortOrder");

-- CreateIndex
CREATE INDEX "property_documents_propertyId_idx" ON "property_documents"("propertyId");

-- CreateIndex
CREATE INDEX "property_documents_verificationStatus_idx" ON "property_documents"("verificationStatus");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_documents" ADD CONSTRAINT "property_documents_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
