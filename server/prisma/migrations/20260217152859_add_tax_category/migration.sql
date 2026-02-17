-- CreateEnum
CREATE TYPE "TaxCategory" AS ENUM ('GRAVADO_19', 'GRAVADO_5', 'EXENTO', 'EXCLUIDO');

-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "tax_category" "TaxCategory" NOT NULL DEFAULT 'GRAVADO_19';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "tax_category" "TaxCategory" NOT NULL DEFAULT 'GRAVADO_19';
