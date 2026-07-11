-- Quest PARTNER_TASK per-partner HMAC secrets (panel-managed, env fallback).
-- Additive nullable-default column; existing rows keep working with '{}'.
ALTER TABLE "settings" ADD COLUMN "quest_partner_settings" JSONB NOT NULL DEFAULT '{}';
