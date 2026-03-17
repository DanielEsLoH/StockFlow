-- CreateEnum
CREATE TYPE "PhysicalCountStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "physical_inventory_counts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "status" "PhysicalCountStatus" NOT NULL DEFAULT 'DRAFT',
    "count_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "started_by_id" TEXT,
    "completed_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physical_inventory_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_count_items" (
    "id" TEXT NOT NULL,
    "count_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "system_quantity" INTEGER NOT NULL,
    "physical_quantity" INTEGER NOT NULL,
    "variance" INTEGER NOT NULL DEFAULT 0,
    "counted_by_id" TEXT,
    "counted_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physical_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "physical_inventory_counts_tenant_id_idx" ON "physical_inventory_counts"("tenant_id");
CREATE INDEX "physical_inventory_counts_tenant_id_status_idx" ON "physical_inventory_counts"("tenant_id", "status");
CREATE INDEX "physical_inventory_counts_warehouse_id_idx" ON "physical_inventory_counts"("warehouse_id");

-- CreateIndex
CREATE INDEX "physical_count_items_count_id_idx" ON "physical_count_items"("count_id");
CREATE INDEX "physical_count_items_tenant_id_idx" ON "physical_count_items"("tenant_id");
CREATE UNIQUE INDEX "physical_count_items_count_id_product_id_key" ON "physical_count_items"("count_id", "product_id");

-- AddForeignKey
ALTER TABLE "physical_inventory_counts" ADD CONSTRAINT "physical_inventory_counts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "physical_inventory_counts" ADD CONSTRAINT "physical_inventory_counts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "physical_inventory_counts" ADD CONSTRAINT "physical_inventory_counts_started_by_id_fkey" FOREIGN KEY ("started_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "physical_inventory_counts" ADD CONSTRAINT "physical_inventory_counts_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_count_items" ADD CONSTRAINT "physical_count_items_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "physical_inventory_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "physical_count_items" ADD CONSTRAINT "physical_count_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "physical_count_items" ADD CONSTRAINT "physical_count_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "physical_count_items" ADD CONSTRAINT "physical_count_items_counted_by_id_fkey" FOREIGN KEY ("counted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
