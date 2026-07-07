-- CreateTable
CREATE TABLE "landing_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "draft" JSONB NOT NULL,
    "published_revision_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "landing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_revisions" (
    "id" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "published_by" TEXT,
    "published_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "landing_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "landing_configs_key_key" ON "landing_configs"("key");

-- CreateIndex
CREATE INDEX "landing_revisions_published_at_idx" ON "landing_revisions"("published_at");
