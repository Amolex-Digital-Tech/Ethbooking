CREATE TABLE "rate_periods" (
    "id" UUID NOT NULL,
    "ratePlanId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "pricePerNight" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_periods_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rate_periods_ratePlanId_startDate_endDate_idx"
ON "rate_periods"("ratePlanId", "startDate", "endDate");

ALTER TABLE "rate_periods"
ADD CONSTRAINT "rate_periods_ratePlanId_fkey"
FOREIGN KEY ("ratePlanId")
REFERENCES "rate_plans"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
