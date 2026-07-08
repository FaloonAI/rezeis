-- Composite indexes for the hottest filtered queries (equality column first,
-- range column last). Additive only — no data change, no behavior change.
--
-- Hardened after a production deploy aborted this migration (P3009): building
-- an index on a populated table can exceed a configured statement/lock timeout.
--   * `IF NOT EXISTS` makes a re-apply safe (idempotent) once the failed
--     migration record is rolled back — no "relation already exists" on retry.
--   * Clearing the per-statement/lock timeouts lets the index build finish on a
--     large table instead of being killed mid-build. Scoped to this migration's
--     connection; the app uses its own pool afterwards.

SET statement_timeout = 0;
SET lock_timeout = 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_status_expires_at_idx" ON "subscriptions"("status", "expires_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transactions_status_created_at_idx" ON "transactions"("status", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_notification_events_user_id_type_created_at_idx" ON "user_notification_events"("user_id", "type", "created_at");
