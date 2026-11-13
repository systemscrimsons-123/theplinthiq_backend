-- AlterTable
ALTER TABLE "gallery_roster" ADD COLUMN IF NOT EXISTS "representation_type" VARCHAR(50) DEFAULT 'exclusive';

-- AlterTable
ALTER TABLE "gallery_exhibitions" ADD COLUMN IF NOT EXISTS "image_url" TEXT,
ADD COLUMN IF NOT EXISTS "exhibition_type" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "participating_artists" TEXT[] DEFAULT ARRAY[]::TEXT[];

