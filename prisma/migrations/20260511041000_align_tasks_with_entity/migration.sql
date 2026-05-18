-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_created_by_fkey";

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "assignee" VARCHAR(100),
ADD COLUMN     "source_action_item_id" UUID,
ADD COLUMN     "source_meeting_id" UUID,
ALTER COLUMN "project_id" DROP NOT NULL,
ALTER COLUMN "created_by" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "tasks_source_meeting_id_idx" ON "tasks"("source_meeting_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

