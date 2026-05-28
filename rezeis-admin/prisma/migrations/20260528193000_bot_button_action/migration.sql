-- Add per-reply-button action routing.
--
-- Operators can now bind any reply-keyboard button to one of:
--   CALLBACK    (default — emit `callback_data` for handler dispatch)
--   URL         (open external HTTPS URL)
--   WEBAPP      (open Telegram Mini App)
--   SCREEN      (jump to a BotFlowScreen by shortId)
--   SUPPORT_URL (open t.me/<handle>?text=<prefill> to support chat)
--
-- Existing rows default to CALLBACK so back-compat with the legacy
-- reserved ids (cabinet / invite / rules / help) is preserved without
-- a data migration. Reiwa uses the new fields when present and falls
-- back to its built-in BUTTON_KIND_MAP otherwise.

-- 1. Enum type for the action.
CREATE TYPE "BotButtonAction" AS ENUM (
  'CALLBACK',
  'URL',
  'WEBAPP',
  'SCREEN',
  'SUPPORT_URL'
);

-- 2. Columns on bot_buttons.
ALTER TABLE "bot_buttons"
  ADD COLUMN "action_type"   "BotButtonAction" NOT NULL DEFAULT 'CALLBACK',
  ADD COLUMN "action_target" TEXT;
