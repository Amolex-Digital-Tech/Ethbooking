CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL,
  "actorProfileId" UUID,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "audit_logs_actorProfileId_createdAt_idx" ON "audit_logs"("actorProfileId", "createdAt");
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_actorProfileId_fkey"
FOREIGN KEY ("actorProfileId") REFERENCES "profiles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
