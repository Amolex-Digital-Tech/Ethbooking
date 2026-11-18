-- CreateTable
CREATE TABLE "rate_plan_photos" (
    "id" UUID NOT NULL,
    "ratePlanId" UUID NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_plan_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_plan_photos_ratePlanId_idx" ON "rate_plan_photos"("ratePlanId");

-- CreateIndex
CREATE INDEX "rate_plan_photos_ratePlanId_sortOrder_idx" ON "rate_plan_photos"("ratePlanId", "sortOrder");

-- AddForeignKey
ALTER TABLE "rate_plan_photos" ADD CONSTRAINT "rate_plan_photos_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "rate_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

