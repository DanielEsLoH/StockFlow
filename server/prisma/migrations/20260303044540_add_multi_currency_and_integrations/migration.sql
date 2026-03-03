-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('COP', 'USD', 'EUR', 'MXN', 'PEN', 'BRL');

-- CreateEnum
CREATE TYPE "IntegrationPlatform" AS ENUM ('SHOPIFY', 'MERCADOLIBRE', 'WOOCOMMERCE');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('PENDING', 'CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BOTH');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "currency" "CurrencyCode" NOT NULL DEFAULT 'COP',
ADD COLUMN     "exchange_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
ADD COLUMN     "total_in_base_currency" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "currency" "CurrencyCode" NOT NULL DEFAULT 'COP',
ADD COLUMN     "exchange_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
ADD COLUMN     "total_in_base_currency" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "currency" "CurrencyCode" NOT NULL DEFAULT 'COP',
ADD COLUMN     "exchange_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
ADD COLUMN     "total_in_base_currency" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "default_currency" "CurrencyCode" NOT NULL DEFAULT 'COP';

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "from_currency" "CurrencyCode" NOT NULL,
    "to_currency" "CurrencyCode" NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "platform" "IntegrationPlatform" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "name" TEXT NOT NULL,
    "shop_url" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMP(3),
    "webhook_secret" TEXT,
    "sync_direction" "SyncDirection" NOT NULL DEFAULT 'BOTH',
    "sync_products" BOOLEAN NOT NULL DEFAULT true,
    "sync_orders" BOOLEAN NOT NULL DEFAULT true,
    "sync_inventory" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_mappings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "external_sku" TEXT,
    "external_url" TEXT,
    "sync_direction" "SyncDirection" NOT NULL DEFAULT 'BOTH',
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "direction" "SyncDirection" NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "entity_type" TEXT NOT NULL,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "processed_items" INTEGER NOT NULL DEFAULT 0,
    "failed_items" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exchange_rates_tenant_id_from_currency_to_currency_idx" ON "exchange_rates"("tenant_id", "from_currency", "to_currency");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_tenant_id_from_currency_to_currency_effectiv_key" ON "exchange_rates"("tenant_id", "from_currency", "to_currency", "effective_date");

-- CreateIndex
CREATE INDEX "integrations_tenant_id_platform_idx" ON "integrations"("tenant_id", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_tenant_id_platform_shop_url_key" ON "integrations"("tenant_id", "platform", "shop_url");

-- CreateIndex
CREATE INDEX "product_mappings_tenant_id_integration_id_idx" ON "product_mappings"("tenant_id", "integration_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_mappings_integration_id_external_id_key" ON "product_mappings"("integration_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_mappings_integration_id_product_id_key" ON "product_mappings"("integration_id", "product_id");

-- CreateIndex
CREATE INDEX "sync_logs_tenant_id_integration_id_created_at_idx" ON "sync_logs"("tenant_id", "integration_id", "created_at");

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_mappings" ADD CONSTRAINT "product_mappings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_mappings" ADD CONSTRAINT "product_mappings_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_mappings" ADD CONSTRAINT "product_mappings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
