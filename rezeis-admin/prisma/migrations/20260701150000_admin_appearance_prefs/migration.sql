-- Per-admin ACTIVE appearance selection (theme/glass/effects/density), so the
-- chosen look follows the operator across devices instead of resetting to
-- defaults from empty localStorage on a new browser.
ALTER TABLE "admin_users" ADD COLUMN "appearance_prefs" JSONB;
