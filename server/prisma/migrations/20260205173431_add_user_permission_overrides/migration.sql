-- CreateTable
CREATE TABLE "user_permission_overrides" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "granted_by" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_permission_overrides_tenant_id_idx" ON "user_permission_overrides"("tenant_id");

-- CreateIndex
CREATE INDEX "user_permission_overrides_user_id_idx" ON "user_permission_overrides"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permission_overrides_user_id_permission_key" ON "user_permission_overrides"("user_id", "permission");

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
