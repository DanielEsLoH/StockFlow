-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('SERVICIOS_PUBLICOS', 'ARRIENDO', 'HONORARIOS', 'SEGUROS', 'PAPELERIA', 'MANTENIMIENTO', 'TRANSPORTE', 'PUBLICIDAD', 'IMPUESTOS_TASAS', 'ASEO_CAFETERIA', 'OTROS');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JournalEntrySource" ADD VALUE 'PURCHASE_PAYMENT';
ALTER TYPE "JournalEntrySource" ADD VALUE 'EXPENSE_PAID';

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "expense_id" TEXT;

-- CreateTable
CREATE TABLE "purchase_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "expense_number" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "supplier_id" TEXT,
    "account_id" TEXT,
    "cost_center_id" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rete_fuente" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "payment_method" "PaymentMethod",
    "payment_reference" TEXT,
    "payment_date" TIMESTAMP(3),
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "invoice_number" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "created_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_payments_tenant_id_idx" ON "purchase_payments"("tenant_id");

-- CreateIndex
CREATE INDEX "purchase_payments_purchase_order_id_idx" ON "purchase_payments"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_payments_tenant_id_payment_date_idx" ON "purchase_payments"("tenant_id", "payment_date");

-- CreateIndex
CREATE INDEX "purchase_payments_tenant_id_method_idx" ON "purchase_payments"("tenant_id", "method");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_status_idx" ON "expenses"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_category_idx" ON "expenses"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_issue_date_idx" ON "expenses"("tenant_id", "issue_date");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_tenant_id_expense_number_key" ON "expenses"("tenant_id", "expense_number");

-- CreateIndex
CREATE INDEX "journal_entries_expense_id_idx" ON "journal_entries"("expense_id");

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
