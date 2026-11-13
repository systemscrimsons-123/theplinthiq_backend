-- AlterTable
ALTER TABLE "pvr_access_grants"
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "shared_documents" JSONB DEFAULT '[]'::jsonb;

