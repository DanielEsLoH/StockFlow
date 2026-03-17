-- AlterTable
ALTER TABLE "accounting_configs" ADD COLUMN "rete_ica_account_id" TEXT,
ADD COLUMN "rete_ica_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
ADD COLUMN "rete_ica_min_base" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "rete_ica_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rete_iva_account_id" TEXT,
ADD COLUMN "rete_iva_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
ADD COLUMN "rete_iva_min_base" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "rete_iva_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_rete_ica_account_id_fkey" FOREIGN KEY ("rete_ica_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_rete_iva_account_id_fkey" FOREIGN KEY ("rete_iva_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
