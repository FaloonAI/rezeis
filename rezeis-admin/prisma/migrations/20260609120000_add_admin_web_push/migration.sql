-- CreateTable
CREATE TABLE "admin_web_push_subscriptions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh_key" TEXT NOT NULL,
    "auth_key" TEXT NOT NULL,
    "user_agent" TEXT,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_web_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_web_push_subscriptions_endpoint_key" ON "admin_web_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "admin_web_push_subscriptions_admin_id_idx" ON "admin_web_push_subscriptions"("admin_id");

-- AddForeignKey
ALTER TABLE "admin_web_push_subscriptions" ADD CONSTRAINT "admin_web_push_subscriptions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
