-- COD is the only supported payment method. Do not reinterpret existing data.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "payments" WHERE "provider" <> 'COD') THEN
    RAISE EXCEPTION 'Non-COD payment rows must be removed or corrected before COD-only migration';
  END IF;
  IF EXISTS (SELECT 1 FROM "payments" WHERE "status"::text NOT IN ('UNPAID', 'PAID', 'REFUNDED'))
     OR EXISTS (SELECT 1 FROM "orders" WHERE "payment_status"::text NOT IN ('UNPAID', 'PAID', 'REFUNDED')) THEN
    RAISE EXCEPTION 'Unsupported payment statuses must be resolved before COD-only migration';
  END IF;
END $$;

ALTER TABLE "payments"
  DROP COLUMN "provider",
  DROP COLUMN "provider_payment_id",
  DROP COLUMN "provider_session_id",
  DROP COLUMN "raw_webhook_event_id";
DROP TYPE "PaymentProvider";

ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED');
ALTER TABLE "orders" ALTER COLUMN "payment_status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "payment_status" TYPE "PaymentStatus" USING "payment_status"::text::"PaymentStatus";
ALTER TABLE "payments" ALTER COLUMN "status" TYPE "PaymentStatus" USING "status"::text::"PaymentStatus";
ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'UNPAID';
DROP TYPE "PaymentStatus_old";
