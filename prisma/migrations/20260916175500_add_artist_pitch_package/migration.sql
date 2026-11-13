-- AlterTable
ALTER TABLE "artist_profiles"
ADD COLUMN IF NOT EXISTS "pitch_package" JSONB DEFAULT '{}'::jsonb;

