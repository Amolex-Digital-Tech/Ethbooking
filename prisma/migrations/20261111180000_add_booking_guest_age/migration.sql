ALTER TABLE "booking_guests"
ADD COLUMN "ageAtBooking" INTEGER;

ALTER TABLE "booking_guests"
ADD CONSTRAINT "booking_guests_ageAtBooking_check"
CHECK ("ageAtBooking" IS NULL OR ("ageAtBooking" >= 0 AND "ageAtBooking" <= 17));
