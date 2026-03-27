-- CreateEnum
CREATE TYPE "InvoiceNumberReservationStatus" AS ENUM ('RESERVED', 'USED', 'EXPIRED');

-- CreateTable
CREATE TABLE "invoice_number_reservations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "status" "InvoiceNumberReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "invoice_number_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_number_reservations_tenant_id_status_idx" ON "invoice_number_reservations"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "invoice_number_reservations_tenant_id_device_id_idx" ON "invoice_number_reservations"("tenant_id", "device_id");

-- CreateIndex
CREATE INDEX "invoice_number_reservations_expires_at_idx" ON "invoice_number_reservations"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_number_reservations_tenant_id_invoice_number_key" ON "invoice_number_reservations"("tenant_id", "invoice_number");

-- AddForeignKey
ALTER TABLE "invoice_number_reservations" ADD CONSTRAINT "invoice_number_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
