-- Migration: fix_user_delete_cascades
-- ON DELETE RESTRICT → SET NULL 변경: 유저 계정 삭제 시 FK 위반 방지
-- 작성자가 삭제돼도 콘텐츠(그룹, 페이지, 메시지 등)는 보존되도록 nullable + SET NULL 처리

-- 1. groups.created_by: NOT NULL → nullable + SET NULL
ALTER TABLE "groups" ALTER COLUMN "created_by" DROP NOT NULL;
ALTER TABLE "groups" DROP CONSTRAINT IF EXISTS "groups_created_by_fkey";
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. pages.created_by: NOT NULL → nullable + SET NULL
ALTER TABLE "pages" ALTER COLUMN "created_by" DROP NOT NULL;
ALTER TABLE "pages" DROP CONSTRAINT IF EXISTS "pages_created_by_fkey";
ALTER TABLE "pages" ADD CONSTRAINT "pages_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. page_versions.created_by: NOT NULL → nullable + SET NULL
ALTER TABLE "page_versions" ALTER COLUMN "created_by" DROP NOT NULL;
ALTER TABLE "page_versions" DROP CONSTRAINT IF EXISTS "page_versions_created_by_fkey";
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. messages.user_id: NOT NULL → nullable + SET NULL
--    author_name 컬럼에 작성자 이름이 이미 캐시되어 있으므로 메시지 내용은 보존됨
ALTER TABLE "messages" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_user_id_fkey";
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. file_uploads.user_id: NOT NULL → nullable + SET NULL
ALTER TABLE "file_uploads" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "file_uploads" DROP CONSTRAINT IF EXISTS "file_uploads_user_id_fkey";
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. payments.user_id: NOT NULL → nullable + SET NULL (결제 기록 보존)
ALTER TABLE "payments" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_user_id_fkey";
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. tasks.created_by: 이미 nullable, RESTRICT → SET NULL
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_created_by_fkey";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. schedules.created_by: 이미 nullable, RESTRICT → SET NULL
ALTER TABLE "schedules" DROP CONSTRAINT IF EXISTS "schedules_created_by_fkey";
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
