-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "connected_org_ids" UUID[] DEFAULT ARRAY[]::UUID[],
ADD COLUMN     "is_external" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visibility" VARCHAR(10) NOT NULL DEFAULT 'public';
