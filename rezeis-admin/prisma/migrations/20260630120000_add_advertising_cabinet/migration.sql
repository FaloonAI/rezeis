-- Advertising cabinet: marketing attribution layered beside referral/partner.
-- Additive only — new enums, new tables, and nullable columns on existing
-- tables with safe defaults. No destructive change.

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "AdPlatform" AS ENUM ('TELEGRAM', 'TELEGRAM_ADS', 'YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'VK', 'WEBSITE', 'INFLUENCER', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AdOwnerType" AS ENUM ('COMPANY', 'PARTNER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AdPlacementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AdRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'COUNTERED', 'ACCEPTED', 'ACTIVE', 'REJECTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AdSignupBonusType" AS ENUM ('NONE', 'TRIAL', 'TARIFF');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AdConversionStatus" AS ENUM ('ATTRIBUTED', 'REVERTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AdClickSurface" AS ENUM ('BOT', 'MINIAPP', 'WEB');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── New columns on existing tables ───────────────────────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "acquisition_placement_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "acquisition_at" TIMESTAMPTZ(3);
CREATE INDEX IF NOT EXISTS "users_acquisition_placement_id_idx" ON "users"("acquisition_placement_id");

-- ── ad_campaigns ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ad_campaigns" (
  "id"         TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "status"     "AdPlacementStatus" NOT NULL DEFAULT 'DRAFT',
  "notes"      TEXT,
  "created_by" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ad_campaigns_status_idx" ON "ad_campaigns"("status");

-- ── ad_placements ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ad_placements" (
  "id"                      TEXT NOT NULL,
  "campaign_id"             TEXT NOT NULL,
  "platform"                "AdPlatform" NOT NULL,
  "channel"                 TEXT,
  "owner_type"              "AdOwnerType" NOT NULL DEFAULT 'COMPANY',
  "partner_id"              TEXT,
  "tracking_code"           TEXT NOT NULL,
  "attribution_window_days" INTEGER NOT NULL DEFAULT 30,
  "promo_code_id"           TEXT,
  "spend_amount"            INTEGER,
  "spend_currency"          TEXT,
  "signup_bonus_type"       "AdSignupBonusType" NOT NULL DEFAULT 'NONE',
  "signup_bonus"            JSONB,
  "status"                  "AdPlacementStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at"              TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"              TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ad_placements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ad_placements_tracking_code_key" ON "ad_placements"("tracking_code");
CREATE INDEX IF NOT EXISTS "ad_placements_campaign_id_idx" ON "ad_placements"("campaign_id");
CREATE INDEX IF NOT EXISTS "ad_placements_partner_id_idx" ON "ad_placements"("partner_id");
CREATE INDEX IF NOT EXISTS "ad_placements_status_idx" ON "ad_placements"("status");
CREATE INDEX IF NOT EXISTS "ad_placements_platform_idx" ON "ad_placements"("platform");

DO $$ BEGIN
  ALTER TABLE "ad_placements"
    ADD CONSTRAINT "ad_placements_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── ad_placement_requests ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ad_placement_requests" (
  "id"                      TEXT NOT NULL,
  "partner_id"              TEXT NOT NULL,
  "platforms"               "AdPlatform"[] NOT NULL DEFAULT ARRAY[]::"AdPlatform"[],
  "channel"                 TEXT,
  "notes"                   TEXT,
  "proposed_window_days"    INTEGER NOT NULL,
  "approved_window_days"    INTEGER,
  "self_funded_budget_note" TEXT,
  "status"                  "AdRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_by"             TEXT,
  "reviewed_at"             TIMESTAMPTZ(3),
  "campaign_id"             TEXT,
  "created_at"              TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"              TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ad_placement_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ad_placement_requests_partner_id_idx" ON "ad_placement_requests"("partner_id");
CREATE INDEX IF NOT EXISTS "ad_placement_requests_status_idx" ON "ad_placement_requests"("status");

-- ── ad_clicks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ad_clicks" (
  "id"           TEXT NOT NULL,
  "placement_id" TEXT NOT NULL,
  "campaign_id"  TEXT NOT NULL,
  "telegram_id"  BIGINT,
  "user_id"      TEXT,
  "surface"      "AdClickSurface" NOT NULL DEFAULT 'BOT',
  "is_new_user"  BOOLEAN NOT NULL DEFAULT false,
  "occurred_at"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ad_clicks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ad_clicks_placement_id_occurred_at_idx" ON "ad_clicks"("placement_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "ad_clicks_campaign_id_idx" ON "ad_clicks"("campaign_id");
CREATE INDEX IF NOT EXISTS "ad_clicks_user_id_idx" ON "ad_clicks"("user_id");

DO $$ BEGIN
  ALTER TABLE "ad_clicks"
    ADD CONSTRAINT "ad_clicks_placement_id_fkey"
    FOREIGN KEY ("placement_id") REFERENCES "ad_placements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── ad_conversions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ad_conversions" (
  "id"             TEXT NOT NULL,
  "placement_id"   TEXT NOT NULL,
  "campaign_id"    TEXT NOT NULL,
  "user_id"        TEXT NOT NULL,
  "transaction_id" TEXT NOT NULL,
  "amount"         INTEGER NOT NULL,
  "currency"       TEXT NOT NULL,
  "status"         "AdConversionStatus" NOT NULL DEFAULT 'ATTRIBUTED',
  "occurred_at"    TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ad_conversions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ad_conversions_user_id_key" ON "ad_conversions"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ad_conversions_transaction_id_key" ON "ad_conversions"("transaction_id");
CREATE INDEX IF NOT EXISTS "ad_conversions_placement_id_idx" ON "ad_conversions"("placement_id");
CREATE INDEX IF NOT EXISTS "ad_conversions_campaign_id_idx" ON "ad_conversions"("campaign_id");
CREATE INDEX IF NOT EXISTS "ad_conversions_status_idx" ON "ad_conversions"("status");

DO $$ BEGIN
  ALTER TABLE "ad_conversions"
    ADD CONSTRAINT "ad_conversions_placement_id_fkey"
    FOREIGN KEY ("placement_id") REFERENCES "ad_placements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
