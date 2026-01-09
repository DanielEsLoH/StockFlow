-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CC', 'NIT', 'RUT', 'PASSPORT', 'CE', 'DNI', 'OTHER');

-- AlterTable: Add notes column
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- AlterTable: Convert document_type from String to DocumentType enum
-- First, add a temporary column with the enum type
ALTER TABLE "customers" ADD COLUMN "document_type_new" "DocumentType";

-- Convert existing values (CC is the default for existing records)
UPDATE "customers" SET "document_type_new" =
  CASE
    WHEN "document_type" = 'CC' THEN 'CC'::"DocumentType"
    WHEN "document_type" = 'NIT' THEN 'NIT'::"DocumentType"
    WHEN "document_type" = 'RUT' THEN 'RUT'::"DocumentType"
    WHEN "document_type" = 'PASSPORT' THEN 'PASSPORT'::"DocumentType"
    WHEN "document_type" = 'CE' THEN 'CE'::"DocumentType"
    WHEN "document_type" = 'DNI' THEN 'DNI'::"DocumentType"
    ELSE 'OTHER'::"DocumentType"
  END;

-- Drop the old column and rename the new one
ALTER TABLE "customers" DROP COLUMN "document_type";
ALTER TABLE "customers" RENAME COLUMN "document_type_new" TO "document_type";

-- Set the default value
ALTER TABLE "customers" ALTER COLUMN "document_type" SET DEFAULT 'CC'::"DocumentType";
ALTER TABLE "customers" ALTER COLUMN "document_type" SET NOT NULL;

-- DropIndex: Remove old indexes
DROP INDEX IF EXISTS "customers_tenant_id_idx";
DROP INDEX IF EXISTS "customers_tenant_id_document_number_idx";

-- CreateIndex: Add new index on tenantId and name
CREATE INDEX "customers_tenant_id_name_idx" ON "customers"("tenant_id", "name");
