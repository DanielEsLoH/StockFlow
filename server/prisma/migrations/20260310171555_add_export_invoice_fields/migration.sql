-- AlterEnum
ALTER TYPE "DianDocumentType" ADD VALUE 'FACTURA_EXPORTACION';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "destination_country" TEXT,
ADD COLUMN     "incoterms" TEXT,
ADD COLUMN     "is_export" BOOLEAN NOT NULL DEFAULT false;
