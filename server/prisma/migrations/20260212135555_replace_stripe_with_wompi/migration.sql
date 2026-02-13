/*
  Warnings:

  - You are about to drop the column `stripe_customer_id` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_subscription_id` on the `tenants` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR');

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "stripe_customer_id",
DROP COLUMN "stripe_subscription_id",
ADD COLUMN     "wompi_customer_email" TEXT,
ADD COLUMN     "wompi_payment_source_id" TEXT;

-- CreateTable
CREATE TABLE "billing_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "wompi_transaction_id" TEXT,
    "wompi_reference" TEXT,
    "plan" "SubscriptionPlan" NOT NULL,
    "period" "SubscriptionPeriod" NOT NULL,
    "amount_in_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "status" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method_type" TEXT,
    "failure_reason" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_transactions_wompi_transaction_id_key" ON "billing_transactions"("wompi_transaction_id");

-- CreateIndex
CREATE INDEX "billing_transactions_tenant_id_idx" ON "billing_transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "billing_transactions_wompi_transaction_id_idx" ON "billing_transactions"("wompi_transaction_id");

-- CreateIndex
CREATE INDEX "billing_transactions_status_idx" ON "billing_transactions"("status");

-- CreateIndex
CREATE INDEX "billing_transactions_tenant_id_created_at_idx" ON "billing_transactions"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
