-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COGS');

-- CreateEnum
CREATE TYPE "AccountNature" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "JournalEntrySource" AS ENUM ('MANUAL', 'INVOICE_SALE', 'INVOICE_CANCEL', 'PAYMENT_RECEIVED', 'PURCHASE_RECEIVED', 'STOCK_ADJUSTMENT', 'PERIOD_CLOSE');

-- CreateEnum
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'CLOSING', 'CLOSED');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('CHECKING', 'SAVINGS');

-- CreateEnum
CREATE TYPE "BankStatementStatus" AS ENUM ('IMPORTED', 'PARTIALLY_RECONCILED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'MANUALLY_MATCHED');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AccountType" NOT NULL,
    "nature" "AccountNature" NOT NULL,
    "parent_id" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system_account" BOOLEAN NOT NULL DEFAULT false,
    "is_bank_account" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_periods" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "closed_at" TIMESTAMP(3),
    "closed_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "period_id" TEXT,
    "entry_number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "source" "JournalEntrySource" NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "invoice_id" TEXT,
    "payment_id" TEXT,
    "purchase_order_id" TEXT,
    "stock_movement_id" TEXT,
    "total_debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_lines" (
    "id" TEXT NOT NULL,
    "journal_entry_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "description" TEXT,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "journal_entry_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cash_account_id" TEXT,
    "bank_account_id" TEXT,
    "accounts_receivable_id" TEXT,
    "inventory_account_id" TEXT,
    "accounts_payable_id" TEXT,
    "iva_por_pagar_id" TEXT,
    "iva_descontable_id" TEXT,
    "revenue_account_id" TEXT,
    "cogs_account_id" TEXT,
    "inventory_adjustment_id" TEXT,
    "rete_fuente_received_id" TEXT,
    "rete_fuente_payable_id" TEXT,
    "auto_generate_entries" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_type" "BankAccountType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "initial_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "status" "BankStatementStatus" NOT NULL DEFAULT 'IMPORTED',
    "total_lines" INTEGER NOT NULL DEFAULT 0,
    "matched_lines" INTEGER NOT NULL DEFAULT 0,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imported_by_id" TEXT,
    "reconciled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statement_lines" (
    "id" TEXT NOT NULL,
    "statement_id" TEXT NOT NULL,
    "line_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2),
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matched_journal_entry_id" TEXT,
    "matched_payment_id" TEXT,
    "matched_at" TIMESTAMP(3),
    "matched_by_id" TEXT,

    CONSTRAINT "bank_statement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_tenant_id_idx" ON "accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "accounts_tenant_id_type_idx" ON "accounts"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "accounts_tenant_id_parent_id_idx" ON "accounts"("tenant_id", "parent_id");

-- CreateIndex
CREATE INDEX "accounts_tenant_id_is_active_idx" ON "accounts"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_tenant_id_code_key" ON "accounts"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "accounting_periods_tenant_id_idx" ON "accounting_periods"("tenant_id");

-- CreateIndex
CREATE INDEX "accounting_periods_tenant_id_status_idx" ON "accounting_periods"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_periods_tenant_id_start_date_end_date_key" ON "accounting_periods"("tenant_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_idx" ON "journal_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_date_idx" ON "journal_entries"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_source_idx" ON "journal_entries"("tenant_id", "source");

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_status_idx" ON "journal_entries"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_created_at_idx" ON "journal_entries"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "journal_entries_invoice_id_idx" ON "journal_entries"("invoice_id");

-- CreateIndex
CREATE INDEX "journal_entries_payment_id_idx" ON "journal_entries"("payment_id");

-- CreateIndex
CREATE INDEX "journal_entries_purchase_order_id_idx" ON "journal_entries"("purchase_order_id");

-- CreateIndex
CREATE INDEX "journal_entries_stock_movement_id_idx" ON "journal_entries"("stock_movement_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_tenant_id_entry_number_key" ON "journal_entries"("tenant_id", "entry_number");

-- CreateIndex
CREATE INDEX "journal_entry_lines_journal_entry_id_idx" ON "journal_entry_lines"("journal_entry_id");

-- CreateIndex
CREATE INDEX "journal_entry_lines_account_id_idx" ON "journal_entry_lines"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_configs_tenant_id_key" ON "accounting_configs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_account_id_key" ON "bank_accounts"("account_id");

-- CreateIndex
CREATE INDEX "bank_accounts_tenant_id_idx" ON "bank_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "bank_accounts_tenant_id_is_active_idx" ON "bank_accounts"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_tenant_id_account_number_key" ON "bank_accounts"("tenant_id", "account_number");

-- CreateIndex
CREATE INDEX "bank_statements_tenant_id_idx" ON "bank_statements"("tenant_id");

-- CreateIndex
CREATE INDEX "bank_statements_bank_account_id_idx" ON "bank_statements"("bank_account_id");

-- CreateIndex
CREATE INDEX "bank_statements_tenant_id_status_idx" ON "bank_statements"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "bank_statement_lines_statement_id_idx" ON "bank_statement_lines"("statement_id");

-- CreateIndex
CREATE INDEX "bank_statement_lines_matched_journal_entry_id_idx" ON "bank_statement_lines"("matched_journal_entry_id");

-- CreateIndex
CREATE INDEX "bank_statement_lines_statement_id_status_idx" ON "bank_statement_lines"("statement_id", "status");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "accounting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_cash_account_id_fkey" FOREIGN KEY ("cash_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_accounts_receivable_id_fkey" FOREIGN KEY ("accounts_receivable_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_inventory_account_id_fkey" FOREIGN KEY ("inventory_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_accounts_payable_id_fkey" FOREIGN KEY ("accounts_payable_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_iva_por_pagar_id_fkey" FOREIGN KEY ("iva_por_pagar_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_iva_descontable_id_fkey" FOREIGN KEY ("iva_descontable_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_revenue_account_id_fkey" FOREIGN KEY ("revenue_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_cogs_account_id_fkey" FOREIGN KEY ("cogs_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_inventory_adjustment_id_fkey" FOREIGN KEY ("inventory_adjustment_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_rete_fuente_received_id_fkey" FOREIGN KEY ("rete_fuente_received_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_rete_fuente_payable_id_fkey" FOREIGN KEY ("rete_fuente_payable_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "bank_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_matched_journal_entry_id_fkey" FOREIGN KEY ("matched_journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
