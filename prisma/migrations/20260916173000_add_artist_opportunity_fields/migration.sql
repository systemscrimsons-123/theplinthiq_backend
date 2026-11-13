-- AlterTable
ALTER TABLE "artist_profiles"
ADD COLUMN IF NOT EXISTS "current_focus" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "preferred_locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "additional_notes" VARCHAR(500);

