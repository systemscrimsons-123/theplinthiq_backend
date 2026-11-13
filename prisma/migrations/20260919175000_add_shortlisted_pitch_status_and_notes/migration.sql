-- Add 'shortlisted' value to the pitch_status enum
ALTER TYPE "pitch_status" ADD VALUE IF NOT EXISTS 'shortlisted';

-- Add curator_notes column to pitches table for gallery internal notes
ALTER TABLE "pitches" ADD COLUMN IF NOT EXISTS "curator_notes" TEXT;

