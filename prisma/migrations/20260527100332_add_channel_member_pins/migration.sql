/*
  Warnings:

  - Made the column `content` on table `ai_knowledge` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ai_knowledge" ALTER COLUMN "content" SET NOT NULL;

-- AlterTable
ALTER TABLE "channel_members" ADD COLUMN     "is_pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pin_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinned_at" TIMESTAMPTZ;
