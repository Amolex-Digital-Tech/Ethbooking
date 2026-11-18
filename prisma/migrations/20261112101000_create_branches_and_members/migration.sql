
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "BranchMemberRole" AS ENUM ('MANAGER', 'STAFF');
CREATE TYPE "BranchMemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

INSERT INTO "roles" ("id", "name", "description")
VALUES
  (gen_random_uuid(), 'BRANCH_MANAGER', 'Manager of an EthiopianBooking branch'),
  (gen_random_uuid(), 'BRANCH_STAFF', 'Staff member of an EthiopianBooking branch')
ON CONFLICT ("name") DO NOTHING;

CREATE TABLE "branches" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "branch_members" (
  "id" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "role" "BranchMemberRole" NOT NULL DEFAULT 'STAFF',
  "status" "BranchMemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "branch_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");
CREATE INDEX "branches_city_idx" ON "branches"("city");
CREATE INDEX "branches_status_idx" ON "branches"("status");
CREATE UNIQUE INDEX "branch_members_branchId_profileId_key" ON "branch_members"("branchId", "profileId");
CREATE INDEX "branch_members_profileId_status_idx" ON "branch_members"("profileId", "status");
CREATE INDEX "branch_members_branchId_status_idx" ON "branch_members"("branchId", "status");

ALTER TABLE "branch_members" ADD CONSTRAINT "branch_members_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "branch_members" ADD CONSTRAINT "branch_members_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cash_refunds" ADD COLUMN "branchId" UUID;
CREATE INDEX "cash_refunds_branchId_idx" ON "cash_refunds"("branchId");
ALTER TABLE "cash_refunds" ADD CONSTRAINT "cash_refunds_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
