-- CreateEnum
CREATE TYPE "CreditNoteReason" AS ENUM ('DEVOLUCION_PARCIAL', 'ANULACION', 'DESCUENTO', 'AJUSTE_PRECIO', 'OTRO');

-- CreateEnum
CREATE TYPE "DebitNoteReason" AS ENUM ('INTERESES', 'GASTOS', 'CAMBIO_VALOR', 'OTRO');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('TERMINO_FIJO', 'TERMINO_INDEFINIDO', 'OBRA_O_LABOR', 'PRESTACION_SERVICIOS');

-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('ORDINARIO', 'INTEGRAL');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ARLRiskLevel" AS ENUM ('LEVEL_I', 'LEVEL_II', 'LEVEL_III', 'LEVEL_IV', 'LEVEL_V');

-- CreateEnum
CREATE TYPE "PayrollPeriodType" AS ENUM ('MONTHLY', 'BIWEEKLY');

-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('OPEN', 'CALCULATING', 'CALCULATED', 'APPROVED', 'SENT_TO_DIAN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PayrollEntryStatus" AS ENUM ('DRAFT', 'CALCULATED', 'APPROVED', 'SENT', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OvertimeType" AS ENUM ('HED', 'HEN', 'HDD', 'HDN', 'HEDDF', 'HENDF');

-- CreateEnum
CREATE TYPE "PayrollDocumentType" AS ENUM ('NOMINA_INDIVIDUAL', 'NOMINA_AJUSTE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JournalEntrySource" ADD VALUE 'PAYROLL_APPROVED';
ALTER TYPE "JournalEntrySource" ADD VALUE 'PAYROLL_ADJUSTMENT';

-- AlterTable
ALTER TABLE "accounting_configs" ADD COLUMN     "payroll_contributions_id" TEXT,
ADD COLUMN     "payroll_expense_id" TEXT,
ADD COLUMN     "payroll_payable_id" TEXT,
ADD COLUMN     "payroll_provisions_id" TEXT,
ADD COLUMN     "payroll_retentions_id" TEXT;

-- AlterTable
ALTER TABLE "dian_documents" ADD COLUMN     "credit_note_reason" TEXT,
ADD COLUMN     "original_dian_document_id" TEXT;

-- AlterTable
ALTER TABLE "tenant_dian_configs" ADD COLUMN     "credit_note_current_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "credit_note_prefix" TEXT,
ADD COLUMN     "debit_note_current_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "debit_note_prefix" TEXT;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "max_employees" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL DEFAULT 'CC',
    "document_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "city_code" TEXT,
    "department" TEXT,
    "department_code" TEXT,
    "contract_type" "ContractType" NOT NULL,
    "salary_type" "SalaryType" NOT NULL DEFAULT 'ORDINARIO',
    "base_salary" DECIMAL(12,2) NOT NULL,
    "auxilio_transporte" BOOLEAN NOT NULL DEFAULT false,
    "arl_risk_level" "ARLRiskLevel" NOT NULL DEFAULT 'LEVEL_I',
    "eps_name" TEXT,
    "eps_code" TEXT,
    "afp_name" TEXT,
    "afp_code" TEXT,
    "caja_name" TEXT,
    "caja_code" TEXT,
    "bank_name" TEXT,
    "bank_account_type" TEXT,
    "bank_account_number" TEXT,
    "cost_center" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period_type" "PayrollPeriodType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "payment_date" TIMESTAMP(3),
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "total_devengados" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_deducciones" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_neto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "approved_at" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "entry_number" TEXT NOT NULL,
    "status" "PayrollEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "base_salary" DECIMAL(12,2) NOT NULL,
    "salary_type" "SalaryType" NOT NULL,
    "days_worked" INTEGER NOT NULL DEFAULT 30,
    "sueldo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "auxilio_transporte" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "horas_extras" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bonificaciones" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "comisiones" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "viaticos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "incapacidad" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "licencia" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vacaciones" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "prima_servicios" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cesantias" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "intereses_cesantias" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otros_devengados" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_devengados" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "salud_empleado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pension_empleado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fondo_solidaridad" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "retencion_fuente" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sindicato" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "libranzas" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otras_deducciones" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_deducciones" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "salud_empleador" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pension_empleador" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "arl_empleador" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "caja_empleador" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sena_empleador" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "icbf_empleador" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "provision_prima" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "provision_cesantias" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "provision_intereses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "provision_vacaciones" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_neto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cune" TEXT,
    "dian_document_type" "PayrollDocumentType",
    "dian_status" "DianDocumentStatus",
    "xml_content" TEXT,
    "signed_xml" TEXT,
    "dian_track_id" TEXT,
    "dian_response" JSONB,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "overtime_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "original_entry_id" TEXT,

    CONSTRAINT "payroll_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "smmlv" DECIMAL(12,2) NOT NULL DEFAULT 1423500,
    "auxilio_transporte_val" DECIMAL(12,2) NOT NULL DEFAULT 200000,
    "uvt_value" DECIMAL(12,2) NOT NULL DEFAULT 49799,
    "payroll_prefix" TEXT,
    "payroll_current_number" INTEGER NOT NULL DEFAULT 1,
    "adjustment_prefix" TEXT,
    "adjustment_current_number" INTEGER NOT NULL DEFAULT 1,
    "payroll_software_id" TEXT,
    "payroll_software_pin" TEXT,
    "payroll_test_set_id" TEXT,
    "default_period_type" "PayrollPeriodType" NOT NULL DEFAULT 'MONTHLY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employees_tenant_id_idx" ON "employees"("tenant_id");

-- CreateIndex
CREATE INDEX "employees_tenant_id_status_idx" ON "employees"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "employees_tenant_id_contract_type_idx" ON "employees"("tenant_id", "contract_type");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenant_id_document_number_key" ON "employees"("tenant_id", "document_number");

-- CreateIndex
CREATE INDEX "payroll_periods_tenant_id_idx" ON "payroll_periods"("tenant_id");

-- CreateIndex
CREATE INDEX "payroll_periods_tenant_id_status_idx" ON "payroll_periods"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "payroll_periods_tenant_id_start_date_idx" ON "payroll_periods"("tenant_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_tenant_id_start_date_end_date_key" ON "payroll_periods"("tenant_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_entries_cune_key" ON "payroll_entries"("cune");

-- CreateIndex
CREATE INDEX "payroll_entries_tenant_id_idx" ON "payroll_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "payroll_entries_period_id_idx" ON "payroll_entries"("period_id");

-- CreateIndex
CREATE INDEX "payroll_entries_employee_id_idx" ON "payroll_entries"("employee_id");

-- CreateIndex
CREATE INDEX "payroll_entries_tenant_id_status_idx" ON "payroll_entries"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "payroll_entries_tenant_id_dian_status_idx" ON "payroll_entries"("tenant_id", "dian_status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_entries_tenant_id_entry_number_key" ON "payroll_entries"("tenant_id", "entry_number");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_configs_tenant_id_key" ON "payroll_configs"("tenant_id");

-- AddForeignKey
ALTER TABLE "dian_documents" ADD CONSTRAINT "dian_documents_original_dian_document_id_fkey" FOREIGN KEY ("original_dian_document_id") REFERENCES "dian_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_payroll_expense_id_fkey" FOREIGN KEY ("payroll_expense_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_payroll_payable_id_fkey" FOREIGN KEY ("payroll_payable_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_payroll_retentions_id_fkey" FOREIGN KEY ("payroll_retentions_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_payroll_contributions_id_fkey" FOREIGN KEY ("payroll_contributions_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_payroll_provisions_id_fkey" FOREIGN KEY ("payroll_provisions_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_original_entry_id_fkey" FOREIGN KEY ("original_entry_id") REFERENCES "payroll_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_configs" ADD CONSTRAINT "payroll_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
