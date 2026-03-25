-- CreateEnum
CREATE TYPE "SystemAdminNotificationType" AS ENUM ('NEW_USER_REGISTRATION', 'SUBSCRIPTION_CHANGE', 'PLAN_UPGRADE', 'PLAN_DOWNGRADE', 'PLAN_SUSPENDED', 'PLAN_REACTIVATED', 'USER_SUSPENDED', 'SYSTEM_ALERT');

-- CreateTable
CREATE TABLE "system_admin_notifications" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT,
    "type" "SystemAdminNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "link" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_admin_notifications_admin_id_read_idx" ON "system_admin_notifications"("admin_id", "read");

-- CreateIndex
CREATE INDEX "system_admin_notifications_created_at_idx" ON "system_admin_notifications"("created_at");

-- AddForeignKey
ALTER TABLE "system_admin_notifications" ADD CONSTRAINT "system_admin_notifications_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "system_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
