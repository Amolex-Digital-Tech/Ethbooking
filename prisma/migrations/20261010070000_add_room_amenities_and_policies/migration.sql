-- CreateEnum
CREATE TYPE "RoomDocumentType" AS ENUM ('ROOM_PHOTO_INVOICE', 'ROOM_OWNERSHIP', 'ROOM_SAFETY_CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "SmokingPolicy" AS ENUM ('SMOKING_ALLOWED', 'NON_SMOKING', 'DESIGNATED_AREAS');

-- AlterTable
ALTER TABLE "room_types" ADD COLUMN     "additionalRules" TEXT,
ADD COLUMN     "checkInTime" TEXT,
ADD COLUMN     "checkOutTime" TEXT,
ADD COLUMN     "childPolicy" TEXT,
ADD COLUMN     "extraBedAvailable" BOOLEAN,
ADD COLUMN     "extraBedPrice" DECIMAL(12,2),
ADD COLUMN     "hasAirConditioning" BOOLEAN,
ADD COLUMN     "hasPrivateBathroom" BOOLEAN,
ADD COLUMN     "hasTv" BOOLEAN,
ADD COLUMN     "hasWifi" BOOLEAN,
ADD COLUMN     "otherAmenities" TEXT,
ADD COLUMN     "smokingPolicy" "SmokingPolicy";

-- CreateTable
CREATE TABLE "room_documents" (
    "id" UUID NOT NULL,
    "roomTypeId" UUID NOT NULL,
    "documentType" "RoomDocumentType" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "documentName" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_documents_roomTypeId_idx" ON "room_documents"("roomTypeId");

-- CreateIndex
CREATE INDEX "room_documents_verificationStatus_idx" ON "room_documents"("verificationStatus");

-- AddForeignKey
ALTER TABLE "room_documents" ADD CONSTRAINT "room_documents_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
