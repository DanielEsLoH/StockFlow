-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DianDocumentType" ADD VALUE 'DOCUMENTO_EQUIVALENTE';
ALTER TYPE "DianDocumentType" ADD VALUE 'NOTA_AJUSTE';

-- AlterTable
ALTER TABLE "tenant_dian_configs" ADD COLUMN     "pos_current_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pos_note_current_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pos_note_prefix" TEXT,
ADD COLUMN     "pos_resolution_date" TIMESTAMP(3),
ADD COLUMN     "pos_resolution_number" TEXT,
ADD COLUMN     "pos_resolution_prefix" TEXT,
ADD COLUMN     "pos_resolution_range_from" INTEGER,
ADD COLUMN     "pos_resolution_range_to" INTEGER;
