CREATE TABLE "booking_email_notifications" (
  "id" UUID NOT NULL,
  "bookingId" UUID NOT NULL,
  "notificationType" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROCESSING',
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "booking_email_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booking_email_notifications_bookingId_notificationType_key"
ON "booking_email_notifications"("bookingId", "notificationType");

CREATE INDEX "booking_email_notifications_status_updatedAt_idx"
ON "booking_email_notifications"("status", "updatedAt");

ALTER TABLE "booking_email_notifications"
ADD CONSTRAINT "booking_email_notifications_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "bookings"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
