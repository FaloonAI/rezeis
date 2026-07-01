-- External end-user auth (web cabinet): provider config + identity links.

-- Enum of supported end-user external providers.
CREATE TYPE "ExternalAuthProvider" AS ENUM ('TELEGRAM', 'GOOGLE', 'YANDEX', 'MAILRU');

-- Provider configuration (one row per provider). Secrets AES-256-GCM encrypted.
CREATE TABLE "external_auth_provider_configs" (
    "id" TEXT NOT NULL,
    "provider" "ExternalAuthProvider" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "display_name" TEXT NOT NULL,
    "client_id" TEXT,
    "client_secret_enc" TEXT,
    "use_pkce" BOOLEAN NOT NULL DEFAULT true,
    "scopes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "external_auth_provider_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_auth_provider_configs_provider_key"
    ON "external_auth_provider_configs" ("provider");

-- Linked external identities for end users.
CREATE TABLE "user_oauth_links" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "ExternalAuthProvider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "provider_email" TEXT,
    "provider_name" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "profile_data" JSONB NOT NULL DEFAULT '{}',
    "linked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(3),
    CONSTRAINT "user_oauth_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_oauth_links_provider_provider_user_id_key"
    ON "user_oauth_links" ("provider", "provider_user_id");

CREATE INDEX "user_oauth_links_user_id_idx" ON "user_oauth_links" ("user_id");
CREATE INDEX "user_oauth_links_provider_idx" ON "user_oauth_links" ("provider");

ALTER TABLE "user_oauth_links"
    ADD CONSTRAINT "user_oauth_links_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed Telegram as permanent / default-on (reuses the bot token; no client
-- id/secret needed). OAuth providers are created on demand from the admin UI.
INSERT INTO "external_auth_provider_configs" ("id", "provider", "is_enabled", "display_name", "use_pkce", "created_at", "updated_at")
VALUES ('extauth_telegram_seed', 'TELEGRAM', true, 'Telegram', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("provider") DO NOTHING;
