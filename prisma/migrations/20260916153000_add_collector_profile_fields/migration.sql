-- AlterTable: Add missing columns to collector_profiles
ALTER TABLE "collector_profiles" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
ALTER TABLE "collector_profiles" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "collector_profiles" ADD COLUMN IF NOT EXISTS "state_region" VARCHAR(100);
ALTER TABLE "collector_profiles" ADD COLUMN IF NOT EXISTS "website_url" VARCHAR(255);
ALTER TABLE "collector_profiles" ADD COLUMN IF NOT EXISTS "privacy_tier" VARCHAR(50) DEFAULT 'public';
ALTER TABLE "collector_profiles" ADD COLUMN IF NOT EXISTS "allow_direct_inquiries" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "collector_profiles" ADD COLUMN IF NOT EXISTS "privacy_settings" JSONB NOT NULL DEFAULT '{}';

