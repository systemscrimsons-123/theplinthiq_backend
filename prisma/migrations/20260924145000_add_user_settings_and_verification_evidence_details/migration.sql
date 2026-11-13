-- Align the migration history with fields already defined in schema.prisma.
-- IF NOT EXISTS keeps this migration safe for databases previously aligned
-- with `prisma db push` while still creating the columns on clean databases.
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "settings" JSONB DEFAULT '{}';

ALTER TABLE "verification_submissions"
ADD COLUMN IF NOT EXISTS "evidence_details" JSONB DEFAULT '{}';
