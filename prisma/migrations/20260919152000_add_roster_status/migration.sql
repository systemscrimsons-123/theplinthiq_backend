-- AlterTable
ALTER TABLE "gallery_roster" ADD COLUMN IF NOT EXISTS "status" VARCHAR(30) NOT NULL DEFAULT 'active';

