-- AlterTable
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMPTZ;
