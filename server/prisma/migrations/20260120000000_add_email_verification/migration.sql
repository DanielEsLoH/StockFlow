-- AlterTable: Add email verification fields to users table
ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "verification_token" TEXT;
ALTER TABLE "users" ADD COLUMN "verification_token_expiry" TIMESTAMP(3);

-- CreateIndex: Add unique constraint on verification_token
CREATE UNIQUE INDEX "users_verification_token_key" ON "users"("verification_token");