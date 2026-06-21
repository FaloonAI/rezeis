-- Panel-managed Remnawave expired-profile cleanup policy.
-- `{ deleteEnabled: boolean, graceDays: number }` — defaults applied in code
-- (deletion ON, 3-day grace) so an empty object keeps the safe behaviour.
ALTER TABLE "settings" ADD COLUMN "remnawave_cleanup_settings" JSONB NOT NULL DEFAULT '{}';
