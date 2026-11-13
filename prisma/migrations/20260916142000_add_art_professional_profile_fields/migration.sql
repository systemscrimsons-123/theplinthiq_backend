-- AlterTable: Add first-class columns to art_professional_profiles
ALTER TABLE "art_professional_profiles" ADD COLUMN IF NOT EXISTS "working_name" VARCHAR(150);
ALTER TABLE "art_professional_profiles" ADD COLUMN IF NOT EXISTS "job_title" VARCHAR(150);
ALTER TABLE "art_professional_profiles" ADD COLUMN IF NOT EXISTS "years_experience" VARCHAR(50);
ALTER TABLE "art_professional_profiles" ADD COLUMN IF NOT EXISTS "state_region" VARCHAR(100);
ALTER TABLE "art_professional_profiles" ADD COLUMN IF NOT EXISTS "why_joined" TEXT;
ALTER TABLE "art_professional_profiles" ADD COLUMN IF NOT EXISTS "what_drives" TEXT;
ALTER TABLE "art_professional_profiles" ADD COLUMN IF NOT EXISTS "current_focus" TEXT;
ALTER TABLE "art_professional_profiles" ADD COLUMN IF NOT EXISTS "additional_interests" TEXT;

