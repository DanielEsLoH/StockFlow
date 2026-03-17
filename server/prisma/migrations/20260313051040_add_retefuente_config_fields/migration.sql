-- AlterTable
ALTER TABLE "accounting_configs" ADD COLUMN     "rete_fuente_min_base" DECIMAL(12,2) NOT NULL DEFAULT 523740,
ADD COLUMN     "rete_fuente_purchase_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.025;
