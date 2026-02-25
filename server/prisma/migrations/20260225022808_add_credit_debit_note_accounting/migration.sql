-- CreateEnum
CREATE TYPE "RemissionStatus" AS ENUM ('DRAFT', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupportDocumentStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CollectionReminderType" AS ENUM ('BEFORE_DUE', 'ON_DUE', 'AFTER_DUE', 'MANUAL');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JournalEntrySource" ADD VALUE 'CREDIT_NOTE';
ALTER TYPE "JournalEntrySource" ADD VALUE 'DEBIT_NOTE';

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "dian_document_id" TEXT;

-- AlterTable
ALTER TABLE "journal_entry_lines" ADD COLUMN     "cost_center_id" TEXT;

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "user_id" TEXT,
    "warehouse_id" TEXT,
    "invoice_id" TEXT,
    "remission_number" TEXT NOT NULL,
    "status" "RemissionStatus" NOT NULL DEFAULT 'DRAFT',
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivery_date" TIMESTAMP(3),
    "delivery_address" TEXT,
    "transport_info" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remission_items" (
    "id" TEXT NOT NULL,
    "remission_id" TEXT NOT NULL,
    "product_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "notes" TEXT,

    CONSTRAINT "remission_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "user_id" TEXT,
    "document_number" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier_name" TEXT NOT NULL,
    "supplier_document" TEXT NOT NULL,
    "supplier_doc_type" TEXT NOT NULL DEFAULT 'CC',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "withholdings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "SupportDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "dian_cude" TEXT,
    "dian_xml" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_document_items" (
    "id" TEXT NOT NULL,
    "support_document_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "support_document_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_reminders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "type" "CollectionReminderType" NOT NULL,
    "channel" "ReminderChannel" NOT NULL DEFAULT 'EMAIL',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withholding_certificates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "total_base" DECIMAL(12,2) NOT NULL,
    "total_withheld" DECIMAL(12,2) NOT NULL,
    "withholding_type" TEXT NOT NULL DEFAULT 'RENTA',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withholding_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cost_centers_tenant_id_idx" ON "cost_centers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_tenant_id_code_key" ON "cost_centers"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "remissions_tenant_id_idx" ON "remissions"("tenant_id");

-- CreateIndex
CREATE INDEX "remissions_customer_id_idx" ON "remissions"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "remissions_tenant_id_remission_number_key" ON "remissions"("tenant_id", "remission_number");

-- CreateIndex
CREATE INDEX "support_documents_tenant_id_idx" ON "support_documents"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_documents_tenant_id_document_number_key" ON "support_documents"("tenant_id", "document_number");

-- CreateIndex
CREATE INDEX "collection_reminders_tenant_id_idx" ON "collection_reminders"("tenant_id");

-- CreateIndex
CREATE INDEX "collection_reminders_invoice_id_idx" ON "collection_reminders"("invoice_id");

-- CreateIndex
CREATE INDEX "collection_reminders_status_scheduled_at_idx" ON "collection_reminders"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "withholding_certificates_tenant_id_idx" ON "withholding_certificates"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "withholding_certificates_tenant_id_certificate_number_key" ON "withholding_certificates"("tenant_id", "certificate_number");

-- CreateIndex
CREATE UNIQUE INDEX "withholding_certificates_tenant_id_supplier_id_year_withhol_key" ON "withholding_certificates"("tenant_id", "supplier_id", "year", "withholding_type");

-- CreateIndex
CREATE INDEX "journal_entries_dian_document_id_idx" ON "journal_entries"("dian_document_id");

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_dian_document_id_fkey" FOREIGN KEY ("dian_document_id") REFERENCES "dian_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remissions" ADD CONSTRAINT "remissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remissions" ADD CONSTRAINT "remissions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remissions" ADD CONSTRAINT "remissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remissions" ADD CONSTRAINT "remissions_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remissions" ADD CONSTRAINT "remissions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remission_items" ADD CONSTRAINT "remission_items_remission_id_fkey" FOREIGN KEY ("remission_id") REFERENCES "remissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remission_items" ADD CONSTRAINT "remission_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_documents" ADD CONSTRAINT "support_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_documents" ADD CONSTRAINT "support_documents_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_documents" ADD CONSTRAINT "support_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_document_items" ADD CONSTRAINT "support_document_items_support_document_id_fkey" FOREIGN KEY ("support_document_id") REFERENCES "support_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_reminders" ADD CONSTRAINT "collection_reminders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_reminders" ADD CONSTRAINT "collection_reminders_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_reminders" ADD CONSTRAINT "collection_reminders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withholding_certificates" ADD CONSTRAINT "withholding_certificates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withholding_certificates" ADD CONSTRAINT "withholding_certificates_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
