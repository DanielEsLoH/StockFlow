-- CreateEnum
CREATE TYPE "InvoiceSource" AS ENUM ('MANUAL', 'POS');

-- CreateEnum
CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "POSSessionStatus" AS ENUM ('ACTIVE', 'CLOSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('OPENING', 'CLOSING', 'SALE', 'REFUND', 'CASH_IN', 'CASH_OUT');

-- CreateEnum
CREATE TYPE "DianDocumentType" AS ENUM ('FACTURA_ELECTRONICA', 'NOTA_CREDITO', 'NOTA_DEBITO');

-- CreateEnum
CREATE TYPE "DianDocumentStatus" AS ENUM ('PENDING', 'GENERATED', 'SIGNED', 'SENT', 'ACCEPTED', 'REJECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "TaxResponsibility" AS ENUM ('O_13', 'O_15', 'O_23', 'O_47', 'R_99_PN');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "source" "InvoiceSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "CashRegisterStatus" NOT NULL DEFAULT 'CLOSED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cash_register_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "POSSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "opening_amount" DECIMAL(10,2) NOT NULL,
    "closing_amount" DECIMAL(10,2),
    "expected_amount" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_register_movements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "sale_id" TEXT,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod",
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_register_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_sales" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "sale_number" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference" TEXT,
    "card_last_four" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_dian_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "dv" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "tax_responsibilities" "TaxResponsibility"[],
    "economic_activity" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "city_code" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "department_code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'CO',
    "country_code" TEXT NOT NULL DEFAULT 'CO',
    "postal_code" TEXT,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "test_mode" BOOLEAN NOT NULL DEFAULT true,
    "software_id" TEXT,
    "software_pin" TEXT,
    "technical_key" TEXT,
    "certificate_file" BYTEA,
    "certificate_password" TEXT,
    "resolution_number" TEXT,
    "resolution_date" TIMESTAMP(3),
    "resolution_prefix" TEXT,
    "resolution_range_from" INTEGER,
    "resolution_range_to" INTEGER,
    "current_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_dian_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dian_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "document_type" "DianDocumentType" NOT NULL,
    "document_number" TEXT NOT NULL,
    "cufe" TEXT,
    "cude" TEXT,
    "qr_code" TEXT,
    "status" "DianDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "xml_content" TEXT,
    "signed_xml" TEXT,
    "pdf_content" BYTEA,
    "dian_response" JSONB,
    "dian_track_id" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dian_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_registers_tenant_id_idx" ON "cash_registers"("tenant_id");

-- CreateIndex
CREATE INDEX "cash_registers_warehouse_id_idx" ON "cash_registers"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_registers_tenant_id_code_key" ON "cash_registers"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "pos_sessions_tenant_id_idx" ON "pos_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "pos_sessions_cash_register_id_idx" ON "pos_sessions"("cash_register_id");

-- CreateIndex
CREATE INDEX "pos_sessions_user_id_idx" ON "pos_sessions"("user_id");

-- CreateIndex
CREATE INDEX "pos_sessions_tenant_id_status_idx" ON "pos_sessions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "pos_sessions_tenant_id_opened_at_idx" ON "pos_sessions"("tenant_id", "opened_at");

-- CreateIndex
CREATE INDEX "cash_register_movements_tenant_id_idx" ON "cash_register_movements"("tenant_id");

-- CreateIndex
CREATE INDEX "cash_register_movements_session_id_idx" ON "cash_register_movements"("session_id");

-- CreateIndex
CREATE INDEX "cash_register_movements_sale_id_idx" ON "cash_register_movements"("sale_id");

-- CreateIndex
CREATE INDEX "cash_register_movements_tenant_id_created_at_idx" ON "cash_register_movements"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sales_invoice_id_key" ON "pos_sales"("invoice_id");

-- CreateIndex
CREATE INDEX "pos_sales_tenant_id_idx" ON "pos_sales"("tenant_id");

-- CreateIndex
CREATE INDEX "pos_sales_session_id_idx" ON "pos_sales"("session_id");

-- CreateIndex
CREATE INDEX "pos_sales_tenant_id_created_at_idx" ON "pos_sales"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sales_tenant_id_sale_number_key" ON "pos_sales"("tenant_id", "sale_number");

-- CreateIndex
CREATE INDEX "sale_payments_sale_id_idx" ON "sale_payments"("sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_dian_configs_tenant_id_key" ON "tenant_dian_configs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "dian_documents_cufe_key" ON "dian_documents"("cufe");

-- CreateIndex
CREATE UNIQUE INDEX "dian_documents_cude_key" ON "dian_documents"("cude");

-- CreateIndex
CREATE INDEX "dian_documents_tenant_id_idx" ON "dian_documents"("tenant_id");

-- CreateIndex
CREATE INDEX "dian_documents_cufe_idx" ON "dian_documents"("cufe");

-- CreateIndex
CREATE INDEX "dian_documents_status_idx" ON "dian_documents"("status");

-- CreateIndex
CREATE INDEX "dian_documents_tenant_id_document_type_idx" ON "dian_documents"("tenant_id", "document_type");

-- CreateIndex
CREATE INDEX "dian_documents_tenant_id_created_at_idx" ON "dian_documents"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_source_idx" ON "invoices"("tenant_id", "source");

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "pos_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "pos_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "pos_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "pos_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_dian_configs" ADD CONSTRAINT "tenant_dian_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dian_documents" ADD CONSTRAINT "dian_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dian_documents" ADD CONSTRAINT "dian_documents_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
