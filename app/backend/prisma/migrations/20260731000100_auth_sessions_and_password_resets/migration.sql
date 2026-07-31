-- Refresh-token realm separation and rotation metadata.
CREATE TYPE "SessionRealm" AS ENUM ('CUSTOMER', 'ADMIN');

ALTER TABLE "refresh_tokens"
  ADD COLUMN "realm" "SessionRealm" NOT NULL DEFAULT 'CUSTOMER',
  ADD COLUMN "revoked_reason" TEXT;

CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");
CREATE UNIQUE INDEX "refresh_tokens_replaced_by_token_id_key" ON "refresh_tokens"("replaced_by_token_id");

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_replaced_by_token_id_fkey"
  FOREIGN KEY ("replaced_by_token_id") REFERENCES "refresh_tokens"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "password_reset_tokens" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "requested_by_ip" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
