-- AlterTable
ALTER TABLE "artist_profiles" ADD COLUMN "banner_url" TEXT;

-- AlterTable
ALTER TABLE "collector_profiles" ADD COLUMN "banner_url" TEXT,
ADD COLUMN "collecting_eras" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "collecting_since" VARCHAR(10),
ADD COLUMN "collector_type" VARCHAR(100),
ADD COLUMN "curatorial_statement" TEXT,
ADD COLUMN "instagram_handle" VARCHAR(100),
ADD COLUMN "linkedin_handle" VARCHAR(100),
ADD COLUMN "spatial_contexts" JSONB NOT NULL DEFAULT '[]';
