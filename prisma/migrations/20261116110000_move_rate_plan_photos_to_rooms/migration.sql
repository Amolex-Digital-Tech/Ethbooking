-- Transfer existing rate-plan photos to their parent room records.
-- Preserve photo IDs, public URLs, storage paths, descriptions, and ordering.
-- The underlying Supabase Storage files are intentionally not deleted.
INSERT INTO "room_photos" (
    "id",
    "roomTypeId",
    "storagePath",
    "publicUrl",
    "altText",
    "sortOrder",
    "isCover",
    "createdAt"
)
SELECT
    rate_photo."id",
    rate_plan."roomTypeId",
    rate_photo."storagePath",
    rate_photo."publicUrl",
    rate_photo."altText",
    rate_photo."sortOrder",
    false,
    rate_photo."createdAt"
FROM "rate_plan_photos" AS rate_photo
INNER JOIN "rate_plans" AS rate_plan
    ON rate_plan."id" = rate_photo."ratePlanId"
ON CONFLICT ("id") DO NOTHING;

-- All existing photo records have been copied to room_photos.
-- Dropping this table does not remove any Supabase Storage objects.
DROP TABLE "rate_plan_photos";
