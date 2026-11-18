-- CreateEnum
CREATE TYPE "UserRoleType" AS ENUM ('CUSTOMER', 'PARTNER_OWNER', 'PARTNER_MANAGER', 'PARTNER_STAFF', 'ADMIN', 'SUPER_ADMIN', 'SUPPORT_AGENT', 'FINANCE', 'CONTENT_MANAGER');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PartnerMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "authUserId" UUID NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "countryCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" "UserRoleType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "businessName" TEXT NOT NULL,
    "legalName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_members" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "status" "PartnerMemberStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_authUserId_key" ON "profiles"("authUserId");

-- CreateIndex
CREATE INDEX "profiles_phone_idx" ON "profiles"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "user_roles_profileId_idx" ON "user_roles"("profileId");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_profileId_roleId_key" ON "user_roles"("profileId", "roleId");

-- CreateIndex
CREATE INDEX "partners_status_idx" ON "partners"("status");

-- CreateIndex
CREATE INDEX "partners_businessName_idx" ON "partners"("businessName");

-- CreateIndex
CREATE INDEX "partner_members_partnerId_idx" ON "partner_members"("partnerId");

-- CreateIndex
CREATE INDEX "partner_members_profileId_idx" ON "partner_members"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_members_partnerId_profileId_key" ON "partner_members"("partnerId", "profileId");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_members" ADD CONSTRAINT "partner_members_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_members" ADD CONSTRAINT "partner_members_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
