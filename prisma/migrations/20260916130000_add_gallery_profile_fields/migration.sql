-- AlterTable: Add first-class columns to gallery_profiles
ALTER TABLE "gallery_profiles" ADD COLUMN IF NOT EXISTS "also_known_as" VARCHAR(200);
ALTER TABLE "gallery_profiles" ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;
ALTER TABLE "gallery_profiles" ADD COLUMN IF NOT EXISTS "year_established" INTEGER;
ALTER TABLE "gallery_profiles" ADD COLUMN IF NOT EXISTS "number_of_locations" VARCHAR(50);
ALTER TABLE "gallery_profiles" ADD COLUMN IF NOT EXISTS "mission" TEXT;
ALTER TABLE "gallery_profiles" ADD COLUMN IF NOT EXISTS "represented_artists_count" INTEGER;
ALTER TABLE "gallery_profiles" ADD COLUMN IF NOT EXISTS "initial_artists" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable: Add state_region to gallery_locations
ALTER TABLE "gallery_locations" ADD COLUMN IF NOT EXISTS "state_region" VARCHAR(100);

