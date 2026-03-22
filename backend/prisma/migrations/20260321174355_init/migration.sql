-- CreateEnum
CREATE TYPE "UrlStatus" AS ENUM ('active', 'disabled', 'deleted');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "key_prefix" VARCHAR(12) NOT NULL,
    "name" VARCHAR(100),
    "last_used" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "urls" (
    "id" BIGSERIAL NOT NULL,
    "short_url" VARCHAR(16) NOT NULL,
    "long_url" TEXT NOT NULL,
    "user_id" BIGINT,
    "status" "UrlStatus" NOT NULL DEFAULT 'active',
    "password_hash" VARCHAR(255),
    "og_title" TEXT,
    "og_description" TEXT,
    "og_image" TEXT,
    "og_fetched_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,

    CONSTRAINT "urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics" (
    "id" BIGSERIAL NOT NULL,
    "short_url" VARCHAR(16) NOT NULL,
    "clicked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "source" VARCHAR(20) NOT NULL DEFAULT 'direct',
    "referrer" VARCHAR(500),
    "country" VARCHAR(2),
    "city" VARCHAR(100),
    "device" VARCHAR(20),
    "browser" VARCHAR(50),
    "os" VARCHAR(50),
    "ab_variant" VARCHAR(10),

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_tests" (
    "id" BIGSERIAL NOT NULL,
    "short_url" VARCHAR(16) NOT NULL,
    "variants" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_rules" (
    "id" BIGSERIAL NOT NULL,
    "short_url" VARCHAR(16) NOT NULL,
    "rule_type" VARCHAR(20) NOT NULL,
    "condition" VARCHAR(50) NOT NULL,
    "target_url" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "short_url" VARCHAR(16),
    "endpoint" TEXT NOT NULL,
    "secret" VARCHAR(64) NOT NULL,
    "events" TEXT[] DEFAULT ARRAY['click']::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_reports" (
    "id" BIGSERIAL NOT NULL,
    "short_url" VARCHAR(16) NOT NULL,
    "reason" VARCHAR(100),
    "reported_by" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "url_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "title" VARCHAR(100),
    "description" TEXT,
    "theme" VARCHAR(20) NOT NULL DEFAULT 'default',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_links" (
    "id" BIGSERIAL NOT NULL,
    "collection_id" BIGINT NOT NULL,
    "short_url" VARCHAR(16) NOT NULL,
    "label" VARCHAR(100),
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "urls_short_url_key" ON "urls"("short_url");

-- CreateIndex
CREATE INDEX "urls_short_url_idx" ON "urls"("short_url");

-- CreateIndex
CREATE INDEX "urls_long_url_idx" ON "urls"("long_url");

-- CreateIndex
CREATE INDEX "urls_user_id_idx" ON "urls"("user_id");

-- CreateIndex
CREATE INDEX "analytics_short_url_idx" ON "analytics"("short_url");

-- CreateIndex
CREATE INDEX "analytics_clicked_at_idx" ON "analytics"("clicked_at");

-- CreateIndex
CREATE UNIQUE INDEX "ab_tests_short_url_key" ON "ab_tests"("short_url");

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "urls" ADD CONSTRAINT "urls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_short_url_fkey" FOREIGN KEY ("short_url") REFERENCES "urls"("short_url") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_short_url_fkey" FOREIGN KEY ("short_url") REFERENCES "urls"("short_url") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_short_url_fkey" FOREIGN KEY ("short_url") REFERENCES "urls"("short_url") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_short_url_fkey" FOREIGN KEY ("short_url") REFERENCES "urls"("short_url") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_links" ADD CONSTRAINT "collection_links_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_links" ADD CONSTRAINT "collection_links_short_url_fkey" FOREIGN KEY ("short_url") REFERENCES "urls"("short_url") ON DELETE CASCADE ON UPDATE CASCADE;
