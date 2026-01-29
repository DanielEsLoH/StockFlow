-- CreateEnum: SubscriptionStatus
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED');

-- CreateEnum: SubscriptionPeriod
CREATE TYPE "SubscriptionPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- Create new SubscriptionPlan enum with new values
CREATE TYPE "SubscriptionPlan_new" AS ENUM ('EMPRENDEDOR', 'PYME', 'PRO', 'PLUS');

-- Update tenants table to use the new enum
ALTER TABLE "tenants" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "tenants" ALTER COLUMN "plan" TYPE "SubscriptionPlan_new"
    USING (CASE "plan"::text
        WHEN 'FREE' THEN 'EMPRENDEDOR'
        WHEN 'BASIC' THEN 'PYME'
        WHEN 'PRO' THEN 'PRO'
        WHEN 'ENTERPRISE' THEN 'PLUS'
        ELSE 'EMPRENDEDOR'
    END)::"SubscriptionPlan_new";

-- Drop old enum and rename new one
DROP TYPE "SubscriptionPlan";
ALTER TYPE "SubscriptionPlan_new" RENAME TO "SubscriptionPlan";

-- Make plan nullable and update defaults for tenant limits
ALTER TABLE "tenants" ALTER COLUMN "plan" DROP NOT NULL;
ALTER TABLE "tenants" ALTER COLUMN "max_users" SET DEFAULT 1;
ALTER TABLE "tenants" ALTER COLUMN "max_products" SET DEFAULT 100;
ALTER TABLE "tenants" ALTER COLUMN "max_invoices" SET DEFAULT 50;

-- Add new notification types
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'USER_VERIFIED_EMAIL';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'USER_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_ACTIVATED';

-- AlterTable: Add approval fields to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "approved_by_id" TEXT;

-- CreateTable: subscriptions
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3) NOT NULL,
    "period_type" "SubscriptionPeriod" NOT NULL,
    "activated_by_id" TEXT,
    "suspended_at" TIMESTAMP(3),
    "suspended_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_end_date_idx" ON "subscriptions"("end_date");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_tenant_id_fkey') THEN
        ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Migrate existing tenants with plans to subscriptions table
INSERT INTO "subscriptions" ("id", "tenant_id", "plan", "status", "start_date", "end_date", "period_type", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    "id",
    "plan",
    'ACTIVE',
    "created_at",
    "created_at" + INTERVAL '1 year',
    'ANNUAL',
    NOW(),
    NOW()
FROM "tenants"
WHERE "plan" IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM "subscriptions" WHERE "subscriptions"."tenant_id" = "tenants"."id");
