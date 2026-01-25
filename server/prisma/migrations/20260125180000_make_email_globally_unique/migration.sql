-- Make email globally unique across all tenants
-- This prevents the same email from being registered in multiple tenants

-- First, drop the composite unique constraint (tenantId, email)
DROP INDEX IF EXISTS "users_tenant_id_email_key";

-- Add a globally unique constraint on email
-- NOTE: If there are existing duplicate emails across tenants, this migration will fail.
-- You must first resolve duplicates before applying this migration.
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
