CREATE TYPE "SupportCaseCategory" AS ENUM ('GENERAL','BOOKING','PAYMENT','CANCELLATION','REFUND','PROPERTY','ACCOUNT','COMPLAINT');
CREATE TYPE "SupportCasePriority" AS ENUM ('LOW','NORMAL','HIGH','URGENT');
CREATE TYPE "SupportCaseStatus" AS ENUM ('OPEN','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED');

CREATE TABLE "support_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "caseNumber" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" "SupportCaseCategory" NOT NULL DEFAULT 'GENERAL',
  "priority" "SupportCasePriority" NOT NULL DEFAULT 'NORMAL',
  "status" "SupportCaseStatus" NOT NULL DEFAULT 'OPEN',
  "customerName" TEXT,
  "customerEmail" TEXT,
  "customerPhone" TEXT,
  "bookingId" UUID,
  "createdByProfileId" UUID NOT NULL,
  "assignedToProfileId" UUID,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_cases_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "support_cases_createdByProfileId_fkey" FOREIGN KEY ("createdByProfileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "support_cases_assignedToProfileId_fkey" FOREIGN KEY ("assignedToProfileId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "support_cases_caseNumber_key" ON "support_cases"("caseNumber");
CREATE INDEX "support_cases_status_updatedAt_idx" ON "support_cases"("status","updatedAt");
CREATE INDEX "support_cases_priority_status_idx" ON "support_cases"("priority","status");
CREATE INDEX "support_cases_customerEmail_idx" ON "support_cases"("customerEmail");
CREATE INDEX "support_cases_customerPhone_idx" ON "support_cases"("customerPhone");
CREATE INDEX "support_cases_bookingId_idx" ON "support_cases"("bookingId");

CREATE TABLE "support_case_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "caseId" UUID NOT NULL,
  "authorProfileId" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_case_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_case_notes_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "support_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "support_case_notes_authorProfileId_fkey" FOREIGN KEY ("authorProfileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "support_case_notes_caseId_createdAt_idx" ON "support_case_notes"("caseId","createdAt");
