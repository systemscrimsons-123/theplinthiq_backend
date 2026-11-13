-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('artist', 'gallery', 'art_professional', 'collector', 'admin');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('active', 'inactive', 'pending_verification');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('unverified', 'pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "career_stage" AS ENUM ('emerging', 'mid_career', 'established');

-- CreateEnum
CREATE TYPE "scale_range" AS ENUM ('small', 'medium', 'large');

-- CreateEnum
CREATE TYPE "taxonomy_category" AS ENUM ('medium', 'aesthetic', 'interest');

-- CreateEnum
CREATE TYPE "representation_status" AS ENUM ('unrepresented_seeking', 'represented_non_exclusive', 'fully_represented');

-- CreateEnum
CREATE TYPE "platform_intent" AS ENUM ('open_to_gallery_representation', 'seeking_group_shows', 'seeking_residencies', 'open_to_collector_visits', 'other');

-- CreateEnum
CREATE TYPE "cv_entry_type" AS ENUM ('exhibition', 'award', 'residency', 'education');

-- CreateEnum
CREATE TYPE "space_type" AS ENUM ('digital', 'commercial_brick_mortar', 'hybrid_pop_up', 'non_profit_project_space');

-- CreateEnum
CREATE TYPE "open_call_status" AS ENUM ('accepting_pitches', 'reviewing_portfolios_closed', 'invite_only');

-- CreateEnum
CREATE TYPE "professional_sub_type" AS ENUM ('curator', 'art_advisor');

-- CreateEnum
CREATE TYPE "collecting_intent" AS ENUM ('supporting_emerging', 'institutional_acquisition', 'meeting_artists_directly', 'discovering_unrepresented_talent');

-- CreateEnum
CREATE TYPE "brief_type" AS ENUM ('gallery_open_call', 'curatorial_brief', 'patronage_brief');

-- CreateEnum
CREATE TYPE "brief_status" AS ENUM ('draft', 'published', 'closed');

-- CreateEnum
CREATE TYPE "pitch_status" AS ENUM ('submitted', 'under_review', 'saved', 'accepted', 'declined');

-- CreateEnum
CREATE TYPE "request_type" AS ENUM ('pvr', 'introduction', 'visit', 'enquiry');

-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('pending', 'accepted', 'declined');

-- CreateEnum
CREATE TYPE "visit_status" AS ENUM ('pending', 'accepted', 'declined', 'scheduled', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email1" VARCHAR(255) NOT NULL,
    "email2" VARCHAR(255),
    "phone1" VARCHAR(30),
    "phone2" VARCHAR(30),
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL,
    "status" "account_status" NOT NULL DEFAULT 'pending_verification',
    "verification_status" "verification_status" NOT NULL DEFAULT 'unverified',
    "email_verified_at" TIMESTAMPTZ,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "evidence_url" TEXT,
    "evidence_notes" TEXT,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision" "verification_status",
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "reviewer_notes" TEXT,

    CONSTRAINT "verification_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxonomy_terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" "taxonomy_category" NOT NULL,
    "label" VARCHAR(100) NOT NULL,

    CONSTRAINT "taxonomy_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_profiles" (
    "user_id" UUID NOT NULL,
    "working_name" VARCHAR(150) NOT NULL,
    "photo_url" TEXT,
    "city" VARCHAR(100),
    "state_region" VARCHAR(100),
    "country" VARCHAR(100),
    "career_stage" "career_stage",
    "website_url" TEXT,
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "artist_statement" TEXT,
    "biography" TEXT,
    "representation_status" "representation_status",
    "availability_status" VARCHAR(200),
    "cv_document_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "artist_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "artist_mediums" (
    "artist_id" UUID NOT NULL,
    "medium_id" UUID NOT NULL,

    CONSTRAINT "artist_mediums_pkey" PRIMARY KEY ("artist_id","medium_id")
);

-- CreateTable
CREATE TABLE "artist_material_tags" (
    "artist_id" UUID NOT NULL,
    "tag" VARCHAR(60) NOT NULL,

    CONSTRAINT "artist_material_tags_pkey" PRIMARY KEY ("artist_id","tag")
);

-- CreateTable
CREATE TABLE "artist_scale_ranges" (
    "artist_id" UUID NOT NULL,
    "scale" "scale_range" NOT NULL,

    CONSTRAINT "artist_scale_ranges_pkey" PRIMARY KEY ("artist_id","scale")
);

-- CreateTable
CREATE TABLE "artist_aesthetics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artist_id" UUID NOT NULL,
    "aesthetic_id" UUID,
    "custom_label" VARCHAR(100),

    CONSTRAINT "artist_aesthetics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_platform_intent" (
    "artist_id" UUID NOT NULL,
    "intent" "platform_intent" NOT NULL,
    "other_text" VARCHAR(150),

    CONSTRAINT "artist_platform_intent_pkey" PRIMARY KEY ("artist_id","intent")
);

-- CreateTable
CREATE TABLE "artist_cv_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artist_id" UUID NOT NULL,
    "entry_type" "cv_entry_type" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "organisation" VARCHAR(200),
    "year" INTEGER,
    "description" TEXT,

    CONSTRAINT "artist_cv_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artist_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "title" VARCHAR(200),
    "year" INTEGER,
    "medium" VARCHAR(150),
    "dimensions" VARCHAR(100),
    "context_notes" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_profiles" (
    "user_id" UUID NOT NULL,
    "gallery_name" VARCHAR(200) NOT NULL,
    "logo_url" TEXT,
    "space_type" "space_type",
    "director_name" VARCHAR(150),
    "director_email" VARCHAR(255),
    "director_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "ethos_statement" TEXT,
    "open_call_status" "open_call_status" NOT NULL DEFAULT 'invite_only',
    "visit_policy_enabled" BOOLEAN NOT NULL DEFAULT false,
    "direct_outreach_enabled" BOOLEAN NOT NULL DEFAULT false,
    "website_url" TEXT,
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "gallery_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "gallery_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gallery_id" UUID NOT NULL,
    "street_address" VARCHAR(200),
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "postcode" VARCHAR(20),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "gallery_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_mediums" (
    "gallery_id" UUID NOT NULL,
    "medium_id" UUID NOT NULL,

    CONSTRAINT "gallery_mediums_pkey" PRIMARY KEY ("gallery_id","medium_id")
);

-- CreateTable
CREATE TABLE "gallery_target_career_stages" (
    "gallery_id" UUID NOT NULL,
    "career_stage" "career_stage" NOT NULL,

    CONSTRAINT "gallery_target_career_stages_pkey" PRIMARY KEY ("gallery_id","career_stage")
);

-- CreateTable
CREATE TABLE "gallery_roster" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gallery_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "note" VARCHAR(200),
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_exhibitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gallery_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_exhibitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "art_professional_profiles" (
    "user_id" UUID NOT NULL,
    "sub_type" "professional_sub_type" NOT NULL,
    "display_name" VARCHAR(150) NOT NULL,
    "photo_url" TEXT,
    "organisation" VARCHAR(200),
    "biography" TEXT,
    "background_text" TEXT,
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "website_url" TEXT,
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "art_professional_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "art_professional_interests" (
    "professional_id" UUID NOT NULL,
    "interest_id" UUID NOT NULL,

    CONSTRAINT "art_professional_interests_pkey" PRIMARY KEY ("professional_id","interest_id")
);

-- CreateTable
CREATE TABLE "art_professional_preferences" (
    "user_id" UUID NOT NULL,
    "preferred_career_stages" "career_stage"[],
    "preferred_scale" "scale_range"[],
    "preferred_location" VARCHAR(150),
    "note" TEXT,

    CONSTRAINT "art_professional_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "art_professional_preference_mediums" (
    "user_id" UUID NOT NULL,
    "medium_id" UUID NOT NULL,

    CONSTRAINT "art_professional_preference_mediums_pkey" PRIMARY KEY ("user_id","medium_id")
);

-- CreateTable
CREATE TABLE "collector_profiles" (
    "user_id" UUID NOT NULL,
    "display_handle" VARCHAR(100) NOT NULL,
    "real_name" VARCHAR(150),
    "is_pseudonymous" BOOLEAN NOT NULL DEFAULT true,
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "collector_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "collector_interests" (
    "collector_id" UUID NOT NULL,
    "interest_id" UUID NOT NULL,

    CONSTRAINT "collector_interests_pkey" PRIMARY KEY ("collector_id","interest_id")
);

-- CreateTable
CREATE TABLE "collector_career_stage_prefs" (
    "collector_id" UUID NOT NULL,
    "career_stage" "career_stage" NOT NULL,

    CONSTRAINT "collector_career_stage_prefs_pkey" PRIMARY KEY ("collector_id","career_stage")
);

-- CreateTable
CREATE TABLE "collector_intents" (
    "collector_id" UUID NOT NULL,
    "intent" "collecting_intent" NOT NULL,

    CONSTRAINT "collector_intents_pkey" PRIMARY KEY ("collector_id","intent")
);

-- CreateTable
CREATE TABLE "follows" (
    "follower_id" UUID NOT NULL,
    "followee_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id","followee_id")
);

-- CreateTable
CREATE TABLE "shortlists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlist_items" (
    "shortlist_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlist_items_pkey" PRIMARY KEY ("shortlist_id","artist_id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collector_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "collection_id" UUID NOT NULL,
    "portfolio_item_id" UUID NOT NULL,
    "note" VARCHAR(300),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("collection_id","portfolio_item_id")
);

-- CreateTable
CREATE TABLE "briefs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "posted_by_user_id" UUID NOT NULL,
    "brief_type" "brief_type" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "opportunity_type" VARCHAR(100),
    "exhibition_theme" VARCHAR(200),
    "required_career_stages" "career_stage"[],
    "scale_requirements" "scale_range"[],
    "location" VARCHAR(150),
    "submission_deadline" DATE,
    "event_start_date" DATE,
    "event_end_date" DATE,
    "artist_requirements" TEXT,
    "additional_info" TEXT,
    "status" "brief_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brief_mediums" (
    "brief_id" UUID NOT NULL,
    "medium_id" UUID NOT NULL,

    CONSTRAINT "brief_mediums_pkey" PRIMARY KEY ("brief_id","medium_id")
);

-- CreateTable
CREATE TABLE "brief_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brief_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "brief_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pitches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brief_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "statement" TEXT NOT NULL,
    "status" "pitch_status" NOT NULL DEFAULT 'submitted',
    "decline_reason" VARCHAR(100),
    "decline_feedback" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pitches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pitch_portfolio_items" (
    "pitch_id" UUID NOT NULL,
    "portfolio_item_id" UUID NOT NULL,

    CONSTRAINT "pitch_portfolio_items_pkey" PRIMARY KEY ("pitch_id","portfolio_item_id")
);

-- CreateTable
CREATE TABLE "artist_pitch_allowances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artist_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "pitch_limit" INTEGER NOT NULL DEFAULT 3,
    "pitches_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_pitch_allowances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interaction_permissions" (
    "from_role" "user_role" NOT NULL,
    "to_role" "user_role" NOT NULL,
    "mode" VARCHAR(20) NOT NULL,

    CONSTRAINT "interaction_permissions_pkey" PRIMARY KEY ("from_role","to_role")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requester_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "request_type" "request_type" NOT NULL,
    "status" "request_status" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "decline_reason" VARCHAR(100),
    "decline_feedback" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "from_status" "request_status",
    "to_status" "request_status" NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "request_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pvr_access_grants" (
    "request_id" UUID NOT NULL,
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "pvr_access_grants_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "pvr_access_grant_items" (
    "request_id" UUID NOT NULL,
    "portfolio_item_id" UUID NOT NULL,

    CONSTRAINT "pvr_access_grant_items_pkey" PRIMARY KEY ("request_id","portfolio_item_id")
);

-- CreateTable
CREATE TABLE "visit_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "requested_date" DATE,
    "requested_time" TIME,
    "location" VARCHAR(250),
    "purpose" TEXT,
    "status" "visit_status" NOT NULL DEFAULT 'pending',
    "confirmed_date" DATE,
    "confirmed_time" TIME,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "visit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "visit_id" UUID NOT NULL,
    "from_status" "visit_status",
    "to_status" "visit_status" NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "visit_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "originating_request_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_participants" (
    "thread_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "thread_participants_pkey" PRIMARY KEY ("thread_id","user_id")
);

-- CreateTable
CREATE TABLE "thread_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pitch_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pitch_id" UUID NOT NULL,
    "from_status" "pitch_status",
    "to_status" "pitch_status" NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "pitch_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_events" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "event_type" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "action_type" VARCHAR(50) NOT NULL,
    "target_user_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email1_key" ON "users"("email1");

-- CreateIndex
CREATE UNIQUE INDEX "taxonomy_terms_category_label_key" ON "taxonomy_terms"("category", "label");

-- CreateIndex
CREATE INDEX "idx_portfolio_artist" ON "portfolio_items"("artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_roster_gallery_id_artist_id_key" ON "gallery_roster"("gallery_id", "artist_id");

-- CreateIndex
CREATE INDEX "idx_briefs_type_status" ON "briefs"("brief_type", "status");

-- CreateIndex
CREATE INDEX "idx_pitches_brief" ON "pitches"("brief_id");

-- CreateIndex
CREATE INDEX "idx_pitches_artist" ON "pitches"("artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "pitches_brief_id_artist_id_key" ON "pitches"("brief_id", "artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "artist_pitch_allowances_artist_id_period_start_key" ON "artist_pitch_allowances"("artist_id", "period_start");

-- CreateIndex
CREATE INDEX "idx_requests_recipient" ON "requests"("recipient_id", "status");

-- CreateIndex
CREATE INDEX "idx_requests_requester" ON "requests"("requester_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "visit_requests_request_id_key" ON "visit_requests"("request_id");

-- CreateIndex
CREATE INDEX "idx_visit_requests_status" ON "visit_requests"("status");

-- CreateIndex
CREATE INDEX "idx_events_type_created" ON "engagement_events"("event_type", "created_at");

-- CreateTable
CREATE TABLE "contact_reveals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "revealer_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "revealed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_reveals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contact_reveals_revealer_id_target_id_key" ON "contact_reveals"("revealer_id", "target_id");

-- AddForeignKey
ALTER TABLE "contact_reveals" ADD CONSTRAINT "contact_reveals_revealer_id_fkey" FOREIGN KEY ("revealer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_reveals" ADD CONSTRAINT "contact_reveals_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_submissions" ADD CONSTRAINT "verification_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_submissions" ADD CONSTRAINT "verification_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_profiles" ADD CONSTRAINT "artist_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_mediums" ADD CONSTRAINT "artist_mediums_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_mediums" ADD CONSTRAINT "artist_mediums_medium_id_fkey" FOREIGN KEY ("medium_id") REFERENCES "taxonomy_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_material_tags" ADD CONSTRAINT "artist_material_tags_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_scale_ranges" ADD CONSTRAINT "artist_scale_ranges_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_aesthetics" ADD CONSTRAINT "artist_aesthetics_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_aesthetics" ADD CONSTRAINT "artist_aesthetics_aesthetic_id_fkey" FOREIGN KEY ("aesthetic_id") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_platform_intent" ADD CONSTRAINT "artist_platform_intent_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_cv_entries" ADD CONSTRAINT "artist_cv_entries_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_profiles" ADD CONSTRAINT "gallery_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_locations" ADD CONSTRAINT "gallery_locations_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "gallery_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_mediums" ADD CONSTRAINT "gallery_mediums_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "gallery_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_mediums" ADD CONSTRAINT "gallery_mediums_medium_id_fkey" FOREIGN KEY ("medium_id") REFERENCES "taxonomy_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_target_career_stages" ADD CONSTRAINT "gallery_target_career_stages_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "gallery_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_roster" ADD CONSTRAINT "gallery_roster_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "gallery_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_roster" ADD CONSTRAINT "gallery_roster_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_exhibitions" ADD CONSTRAINT "gallery_exhibitions_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "gallery_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_professional_profiles" ADD CONSTRAINT "art_professional_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_professional_interests" ADD CONSTRAINT "art_professional_interests_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "art_professional_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_professional_interests" ADD CONSTRAINT "art_professional_interests_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "taxonomy_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_professional_preferences" ADD CONSTRAINT "art_professional_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "art_professional_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_professional_preference_mediums" ADD CONSTRAINT "art_professional_preference_mediums_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "art_professional_preferences"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_professional_preference_mediums" ADD CONSTRAINT "art_professional_preference_mediums_medium_id_fkey" FOREIGN KEY ("medium_id") REFERENCES "taxonomy_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collector_profiles" ADD CONSTRAINT "collector_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collector_interests" ADD CONSTRAINT "collector_interests_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collector_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collector_interests" ADD CONSTRAINT "collector_interests_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "taxonomy_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collector_career_stage_prefs" ADD CONSTRAINT "collector_career_stage_prefs_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collector_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collector_intents" ADD CONSTRAINT "collector_intents_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collector_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followee_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_items" ADD CONSTRAINT "shortlist_items_shortlist_id_fkey" FOREIGN KEY ("shortlist_id") REFERENCES "shortlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_items" ADD CONSTRAINT "shortlist_items_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collector_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_portfolio_item_id_fkey" FOREIGN KEY ("portfolio_item_id") REFERENCES "portfolio_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_posted_by_user_id_fkey" FOREIGN KEY ("posted_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brief_mediums" ADD CONSTRAINT "brief_mediums_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brief_mediums" ADD CONSTRAINT "brief_mediums_medium_id_fkey" FOREIGN KEY ("medium_id") REFERENCES "taxonomy_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brief_images" ADD CONSTRAINT "brief_images_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pitch_portfolio_items" ADD CONSTRAINT "pitch_portfolio_items_pitch_id_fkey" FOREIGN KEY ("pitch_id") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pitch_portfolio_items" ADD CONSTRAINT "pitch_portfolio_items_portfolio_item_id_fkey" FOREIGN KEY ("portfolio_item_id") REFERENCES "portfolio_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_pitch_allowances" ADD CONSTRAINT "artist_pitch_allowances_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvr_access_grants" ADD CONSTRAINT "pvr_access_grants_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvr_access_grant_items" ADD CONSTRAINT "pvr_access_grant_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvr_access_grant_items" ADD CONSTRAINT "pvr_access_grant_items_portfolio_item_id_fkey" FOREIGN KEY ("portfolio_item_id") REFERENCES "portfolio_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_requests" ADD CONSTRAINT "visit_requests_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_status_history" ADD CONSTRAINT "visit_status_history_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_status_history" ADD CONSTRAINT "visit_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_originating_request_id_fkey" FOREIGN KEY ("originating_request_id") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_participants" ADD CONSTRAINT "thread_participants_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_participants" ADD CONSTRAINT "thread_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pitch_status_history" ADD CONSTRAINT "pitch_status_history_pitch_id_fkey" FOREIGN KEY ("pitch_id") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pitch_status_history" ADD CONSTRAINT "pitch_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_events" ADD CONSTRAINT "engagement_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- =====================================================================
-- CUSTOM: Triggers, Functions, Seed Data
-- =====================================================================

-- TRIGGER 1: Limit artist aesthetics to 10 per artist
CREATE OR REPLACE FUNCTION enforce_artist_aesthetic_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM artist_aesthetics WHERE artist_id = NEW.artist_id) >= 10 THEN
    RAISE EXCEPTION 'Artist may have at most 10 aesthetics (artist_id=%)', NEW.artist_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_artist_aesthetic_limit
  BEFORE INSERT ON artist_aesthetics
  FOR EACH ROW EXECUTE FUNCTION enforce_artist_aesthetic_limit();

-- TRIGGER 2: Limit public portfolio items to 10 per artist
CREATE OR REPLACE FUNCTION enforce_portfolio_public_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_public = TRUE THEN
    IF (SELECT COUNT(*) FROM portfolio_items WHERE artist_id = NEW.artist_id AND is_public = TRUE AND id IS DISTINCT FROM NEW.id) >= 10 THEN
      RAISE EXCEPTION 'Artist may have at most 10 public portfolio items (artist_id=%)', NEW.artist_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_portfolio_public_limit
  BEFORE INSERT OR UPDATE ON portfolio_items
  FOR EACH ROW EXECUTE FUNCTION enforce_portfolio_public_limit();

-- TRIGGER 3: Restrict follows to allowed role pairs
CREATE OR REPLACE FUNCTION enforce_follow_role_pairs()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  follower_role user_role;
  followee_role user_role;
BEGIN
  SELECT role INTO follower_role FROM users WHERE id = NEW.follower_id;
  SELECT role INTO followee_role FROM users WHERE id = NEW.followee_id;
  IF NOT (
    (follower_role = 'collector' AND followee_role = 'artist') OR
    (follower_role = 'art_professional' AND followee_role = 'artist')
  ) THEN
    RAISE EXCEPTION 'Follow not permitted between roles % -> %', follower_role, followee_role;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_follow_role_pairs
  BEFORE INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION enforce_follow_role_pairs();

-- TRIGGER 4: Shortlists can only be owned by art_professional
CREATE OR REPLACE FUNCTION enforce_shortlist_owner_role()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE owner_role user_role;
BEGIN
  SELECT role INTO owner_role FROM users WHERE id = NEW.owner_id;
  IF owner_role <> 'art_professional' THEN
    RAISE EXCEPTION 'Only art_professional users may create shortlists';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_shortlist_owner_role
  BEFORE INSERT ON shortlists
  FOR EACH ROW EXECUTE FUNCTION enforce_shortlist_owner_role();

-- TRIGGER 5: Brief poster role must match brief_type
CREATE OR REPLACE FUNCTION enforce_brief_poster_role()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE poster_role user_role;
BEGIN
  SELECT role INTO poster_role FROM users WHERE id = NEW.posted_by_user_id;
  IF NEW.brief_type = 'gallery_open_call' AND poster_role <> 'gallery' THEN
    RAISE EXCEPTION 'gallery_open_call briefs must be posted by a gallery user';
  END IF;
  IF NEW.brief_type = 'curatorial_brief' AND poster_role <> 'art_professional' THEN
    RAISE EXCEPTION 'curatorial_brief briefs must be posted by an art_professional user';
  END IF;
  IF NEW.brief_type = 'patronage_brief' AND poster_role <> 'collector' THEN
    RAISE EXCEPTION 'patronage_brief briefs must be posted by a collector user';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_brief_poster_role
  BEFORE INSERT OR UPDATE ON briefs
  FOR EACH ROW EXECUTE FUNCTION enforce_brief_poster_role();

-- TRIGGER 6: pvr_access_grants must reference a request of type='pvr' AND status='accepted'
CREATE OR REPLACE FUNCTION enforce_pvr_grant_request_type()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE req_type request_type; req_status request_status;
BEGIN
  SELECT request_type, status INTO req_type, req_status FROM requests WHERE id = NEW.request_id;
  IF req_type <> 'pvr' THEN
    RAISE EXCEPTION 'pvr_access_grants must reference a pvr request (got %)', req_type;
  END IF;
  IF req_status <> 'accepted' THEN
    RAISE EXCEPTION 'pvr_access_grants must reference an accepted request (got %)', req_status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_pvr_grant_request_type
  BEFORE INSERT ON pvr_access_grants
  FOR EACH ROW EXECUTE FUNCTION enforce_pvr_grant_request_type();

-- TRIGGER 7: visit_requests must reference a request of type='visit'
CREATE OR REPLACE FUNCTION enforce_visit_request_type()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE req_type request_type;
BEGIN
  SELECT request_type INTO req_type FROM requests WHERE id = NEW.request_id;
  IF req_type <> 'visit' THEN
    RAISE EXCEPTION 'visit_requests must reference a visit request (got %)', req_type;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_visit_request_type
  BEFORE INSERT ON visit_requests
  FOR EACH ROW EXECUTE FUNCTION enforce_visit_request_type();

-- FUNCTION: consume_pitch_allowance — atomic increment with limit check
CREATE OR REPLACE FUNCTION consume_pitch_allowance(p_artist_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  period_start_val DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  period_end_val   DATE := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  used INT; lim INT;
BEGIN
  INSERT INTO artist_pitch_allowances (artist_id, period_start, period_end, pitch_limit, pitches_used)
  VALUES (p_artist_id, period_start_val, period_end_val, 3, 0)
  ON CONFLICT (artist_id, period_start) DO NOTHING;

  SELECT pitches_used, pitch_limit INTO used, lim
    FROM artist_pitch_allowances
   WHERE artist_id = p_artist_id AND period_start = period_start_val
     FOR UPDATE;

  IF used >= lim THEN
    RAISE EXCEPTION 'Monthly pitch limit of % reached for artist %', lim, p_artist_id;
  END IF;

  UPDATE artist_pitch_allowances SET pitches_used = pitches_used + 1
   WHERE artist_id = p_artist_id AND period_start = period_start_val;
END;
$$;

-- SEED: taxonomy_terms — Mediums
INSERT INTO taxonomy_terms (id, category, label) VALUES
  (gen_random_uuid(),'medium','Painting'),(gen_random_uuid(),'medium','Drawing'),
  (gen_random_uuid(),'medium','Printmaking'),(gen_random_uuid(),'medium','Photography'),
  (gen_random_uuid(),'medium','Sculpture'),(gen_random_uuid(),'medium','Ceramics'),
  (gen_random_uuid(),'medium','Textile / Fibre'),(gen_random_uuid(),'medium','Jewellery / Metalwork'),
  (gen_random_uuid(),'medium','Glass'),(gen_random_uuid(),'medium','Video / Film'),
  (gen_random_uuid(),'medium','Performance'),(gen_random_uuid(),'medium','Digital / New Media'),
  (gen_random_uuid(),'medium','Installation'),(gen_random_uuid(),'medium','Mixed Media'),
  (gen_random_uuid(),'medium','Collage / Assemblage'),(gen_random_uuid(),'medium','Illustration'),
  (gen_random_uuid(),'medium','Street Art / Muralism'),(gen_random_uuid(),'medium','Sound Art'),
  (gen_random_uuid(),'medium','Other')
ON CONFLICT (category, label) DO NOTHING;

-- SEED: taxonomy_terms — Aesthetics
INSERT INTO taxonomy_terms (id, category, label) VALUES
  (gen_random_uuid(),'aesthetic','Abstract'),(gen_random_uuid(),'aesthetic','Figurative'),
  (gen_random_uuid(),'aesthetic','Conceptual'),(gen_random_uuid(),'aesthetic','Minimalist'),
  (gen_random_uuid(),'aesthetic','Surrealist'),(gen_random_uuid(),'aesthetic','Expressionist'),
  (gen_random_uuid(),'aesthetic','Geometric'),(gen_random_uuid(),'aesthetic','Landscape / Plein Air'),
  (gen_random_uuid(),'aesthetic','Portrait'),(gen_random_uuid(),'aesthetic','Still Life'),
  (gen_random_uuid(),'aesthetic','Political / Activist'),(gen_random_uuid(),'aesthetic','Feminist'),
  (gen_random_uuid(),'aesthetic','Ecological / Environmental'),(gen_random_uuid(),'aesthetic','Postcolonial / Diasporic'),
  (gen_random_uuid(),'aesthetic','Psychedelic'),(gen_random_uuid(),'aesthetic','Dark / Gothic'),
  (gen_random_uuid(),'aesthetic','Playful / Whimsical'),(gen_random_uuid(),'aesthetic','Craft-led'),
  (gen_random_uuid(),'aesthetic','Process-led'),(gen_random_uuid(),'aesthetic','Text-based'),
  (gen_random_uuid(),'aesthetic','Archive / Document'),(gen_random_uuid(),'aesthetic','Participatory'),
  (gen_random_uuid(),'aesthetic','Site-specific')
ON CONFLICT (category, label) DO NOTHING;

-- SEED: taxonomy_terms — Interests
INSERT INTO taxonomy_terms (id, category, label) VALUES
  (gen_random_uuid(),'interest','Emerging Artists'),(gen_random_uuid(),'interest','Mid-Career Artists'),
  (gen_random_uuid(),'interest','Established Artists'),(gen_random_uuid(),'interest','LGBTQ+ Artists'),
  (gen_random_uuid(),'interest','Artists of Colour'),(gen_random_uuid(),'interest','Women Artists'),
  (gen_random_uuid(),'interest','South Asian Art'),(gen_random_uuid(),'interest','African Contemporary'),
  (gen_random_uuid(),'interest','Latin American Art'),(gen_random_uuid(),'interest','Indigenous Art'),
  (gen_random_uuid(),'interest','Outsider Art'),(gen_random_uuid(),'interest','Self-taught Artists'),
  (gen_random_uuid(),'interest','UK-based Artists'),(gen_random_uuid(),'interest','International Artists'),
  (gen_random_uuid(),'interest','Digital Art NFT'),(gen_random_uuid(),'interest','Sustainable Practice'),
  (gen_random_uuid(),'interest','Community-engaged Practice')
ON CONFLICT (category, label) DO NOTHING;

-- SEED: interaction_permissions
INSERT INTO interaction_permissions (from_role, to_role, mode) VALUES
  ('artist','gallery','pitch_only'),
  ('artist','art_professional','request_only'),
  ('artist','collector','blocked'),
  ('gallery','artist','open'),
  ('gallery','art_professional','request_only'),
  ('gallery','collector','blocked'),
  ('art_professional','artist','open'),
  ('art_professional','gallery','open'),
  ('art_professional','collector','blocked'),
  ('collector','artist','request_only'),
  ('collector','gallery','request_only'),
  ('collector','art_professional','blocked')
ON CONFLICT (from_role, to_role) DO NOTHING;

-- Partial unique indexes for artist_aesthetics
CREATE UNIQUE INDEX IF NOT EXISTS uq_artist_aesthetic_term
  ON artist_aesthetics (artist_id, aesthetic_id) WHERE aesthetic_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_artist_aesthetic_custom
  ON artist_aesthetics (artist_id, lower(custom_label)) WHERE custom_label IS NOT NULL;
ALTER TABLE artist_aesthetics
  ADD CONSTRAINT chk_aesthetic_xor CHECK (
    (aesthetic_id IS NOT NULL AND custom_label IS NULL) OR
    (aesthetic_id IS NULL AND custom_label IS NOT NULL)
  );
