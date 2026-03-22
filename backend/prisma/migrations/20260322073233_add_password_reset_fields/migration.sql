-- AlterTable
ALTER TABLE "users" ADD COLUMN     "reset_token_expires_at" TIMESTAMPTZ,
ADD COLUMN     "reset_token_hash" VARCHAR(255);
