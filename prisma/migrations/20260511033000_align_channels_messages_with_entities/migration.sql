-- AlterTable
ALTER TABLE "channel_members" ADD COLUMN     "user_name" VARCHAR(100) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "description" TEXT,
ADD COLUMN     "invite_code" VARCHAR(6);

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "author_name" VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reply_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "channels_invite_code_key" ON "channels"("invite_code");
