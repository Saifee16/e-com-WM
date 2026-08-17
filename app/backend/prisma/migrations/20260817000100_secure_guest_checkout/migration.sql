-- Preserve idempotency isolation for customers and introduce the same scope
-- for the server-derived guest-cart principal.
ALTER TABLE "orders" ADD COLUMN "guest_id" TEXT;

DROP INDEX "orders_idempotency_key_key";

CREATE INDEX "orders_guest_id_idx" ON "orders"("guest_id");
CREATE UNIQUE INDEX "orders_user_id_idempotency_key_key" ON "orders"("user_id", "idempotency_key");
CREATE UNIQUE INDEX "orders_guest_id_idempotency_key_key" ON "orders"("guest_id", "idempotency_key");
