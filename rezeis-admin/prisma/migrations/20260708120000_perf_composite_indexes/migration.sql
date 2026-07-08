-- Composite indexes for the hottest filtered queries (equality column first,
-- range column last). Additive only — no data change, no behavior change.

-- CreateIndex
CREATE INDEX "subscriptions_status_expires_at_idx" ON "subscriptions"("status", "expires_at");

-- CreateIndex
CREATE INDEX "transactions_status_created_at_idx" ON "transactions"("status", "created_at");

-- CreateIndex
CREATE INDEX "user_notification_events_user_id_type_created_at_idx" ON "user_notification_events"("user_id", "type", "created_at");
