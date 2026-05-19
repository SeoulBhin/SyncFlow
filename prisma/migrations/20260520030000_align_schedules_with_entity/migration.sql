-- schedules 테이블을 TypeORM Schedule Entity 와 정합.
-- 기존 Prisma init 마이그레이션은 start_date/end_date 등 잘못된 컬럼명을 만들어
-- Entity(start_at/end_at) 가 쿼리 시 errorMissingColumn 발생.
--
-- 전제: schedules 모듈이 "미착수" 상태라 데이터가 비어 있음 (CLAUDE.md 참조).
-- 안전 확인: 적용 전 SELECT COUNT(*) FROM schedules; 가 0 이어야 함.
-- 만약 데이터가 있다면 본 마이그레이션은 컬럼 손실을 유발하므로 사전 백업 필요.

-- 1) 옛 NOT NULL 제약 해제 (Entity 가 nullable 이므로 신규 INSERT 호환)
ALTER TABLE "schedules" ALTER COLUMN "project_id" DROP NOT NULL;
ALTER TABLE "schedules" ALTER COLUMN "created_by" DROP NOT NULL;

-- 2) Entity 에 없는 잘못된 컬럼 제거
ALTER TABLE "schedules" DROP COLUMN IF EXISTS "start_date";
ALTER TABLE "schedules" DROP COLUMN IF EXISTS "end_date";

-- 3) 누락된 10 개 컬럼 추가
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "start_at"    TIMESTAMPTZ;
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "end_at"      TIMESTAMPTZ;
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "repeat"      VARCHAR(20) NOT NULL DEFAULT 'none';
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "color"       VARCHAR(20);
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "location"    VARCHAR(300);
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "attendees"   JSONB;
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "group_id"    UUID;
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "task_id"     UUID;
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "meeting_id"  UUID;

-- 4) 인덱스 (Entity 의 @Index 와 정합)
CREATE INDEX IF NOT EXISTS "schedules_group_id_idx"   ON "schedules"("group_id");
CREATE INDEX IF NOT EXISTS "schedules_created_by_idx" ON "schedules"("created_by");
