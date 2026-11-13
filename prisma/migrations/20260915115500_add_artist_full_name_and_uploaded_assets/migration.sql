-- Align the live database with the current Prisma schema.
ALTER TABLE "artist_profiles" ADD COLUMN "full_name" VARCHAR(150);

CREATE TABLE "uploaded_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER,
    "folder" TEXT NOT NULL DEFAULT 'media',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "uploaded_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uploaded_assets_key_key" ON "uploaded_assets"("key");
CREATE INDEX "idx_uploaded_assets_user" ON "uploaded_assets"("user_id");
CREATE INDEX "idx_uploaded_assets_folder" ON "uploaded_assets"("folder");

ALTER TABLE "uploaded_assets"
ADD CONSTRAINT "uploaded_assets_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
