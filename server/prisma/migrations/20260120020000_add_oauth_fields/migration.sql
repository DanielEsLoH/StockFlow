-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'GITHUB');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "google_id" TEXT;
ALTER TABLE "users" ADD COLUMN "github_id" TEXT;
ALTER TABLE "users" ADD COLUMN "auth_provider" "AuthProvider" NOT NULL DEFAULT 'EMAIL';

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");