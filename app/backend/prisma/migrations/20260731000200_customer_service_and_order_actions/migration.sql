-- Ticket lifecycle conversion. Existing guest rows remain guest rows.
ALTER TYPE "ContactMessageStatus" RENAME TO "ContactMessageStatus_old";
CREATE TYPE "ContactMessageStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
ALTER TABLE "contact_messages" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "contact_messages"
  ALTER COLUMN "status" TYPE "ContactMessageStatus"
  USING (
    CASE "status"::text
      WHEN 'NEW' THEN 'OPEN'
      WHEN 'REVIEWED' THEN 'IN_PROGRESS'
      WHEN 'ARCHIVED' THEN 'RESOLVED'
    END
  )::"ContactMessageStatus";
ALTER TABLE "contact_messages" ALTER COLUMN "status" SET DEFAULT 'OPEN';
DROP TYPE "ContactMessageStatus_old";

ALTER TABLE "contact_messages"
  ADD COLUMN "user_id" UUID,
  ADD COLUMN "status_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "resolved_at" TIMESTAMP(3);

UPDATE "contact_messages"
SET "status_updated_at" = COALESCE("reviewed_at", "updated_at"),
    "resolved_at" = CASE
      WHEN "status" = 'RESOLVED' THEN COALESCE("reviewed_at", "updated_at")
      ELSE NULL
    END;

ALTER TABLE "contact_messages" DROP COLUMN "reviewed_at";
CREATE INDEX "contact_messages_user_id_idx" ON "contact_messages"("user_id");
ALTER TABLE "contact_messages"
  ADD CONSTRAINT "contact_messages_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD COLUMN "cancelled_at" TIMESTAMP(3),
  ADD COLUMN "cancellation_reason" TEXT,
  ADD COLUMN "cancelled_by" TEXT;

CREATE TYPE "ReturnRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TABLE "return_requests" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "user_id" UUID,
  "guest_email" CITEXT,
  "status" "ReturnRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "resolution_note" TEXT,
  "resolved_by_user_id" UUID,
  "resolved_at" TIMESTAMP(3),
  "refund_confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "return_requests_order_id_key" ON "return_requests"("order_id");
CREATE INDEX "return_requests_user_id_idx" ON "return_requests"("user_id");
CREATE INDEX "return_requests_status_idx" ON "return_requests"("status");
CREATE INDEX "return_requests_created_at_idx" ON "return_requests"("created_at");
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_resolved_by_user_id_fkey"
  FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "reviews"
    GROUP BY "user_id", "product_id" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate user/product reviews must be resolved before Phase 4 migration';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "addresses" WHERE "is_default_shipping"
    GROUP BY "user_id" HAVING COUNT(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM "addresses" WHERE "is_default_billing"
    GROUP BY "user_id" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple default addresses must be resolved before Phase 4 migration';
  END IF;
END $$;

CREATE UNIQUE INDEX "reviews_user_id_product_id_key" ON "reviews"("user_id", "product_id");
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range_check" CHECK ("rating" BETWEEN 1 AND 5);
CREATE UNIQUE INDEX "addresses_one_default_shipping_per_user"
  ON "addresses"("user_id") WHERE "is_default_shipping";
CREATE UNIQUE INDEX "addresses_one_default_billing_per_user"
  ON "addresses"("user_id") WHERE "is_default_billing";
