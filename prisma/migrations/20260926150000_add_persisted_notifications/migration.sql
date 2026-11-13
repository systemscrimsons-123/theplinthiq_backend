CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "actor_id" UUID,
  "category" VARCHAR(30) NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "message" TEXT NOT NULL,
  "link" VARCHAR(500),
  "metadata" JSONB DEFAULT '{}',
  "read_at" TIMESTAMPTZ,
  "deleted_at" TIMESTAMPTZ,
  "email_sent_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_deleted_at_created_at_idx"
  ON "notifications"("user_id", "deleted_at", "created_at");
CREATE INDEX "notifications_user_id_read_at_idx"
  ON "notifications"("user_id", "read_at");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
