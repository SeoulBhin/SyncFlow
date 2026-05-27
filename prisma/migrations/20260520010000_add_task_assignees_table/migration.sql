-- 다중 담당자(task_assignees) 테이블
-- TypeORM Entity(backend/src/tasks/entities/task-assignee.entity.ts)는 있었으나
-- Prisma 마이그레이션이 누락되어 프로덕션에서 GET /api/tasks 시 500 발생.
-- 로컬은 TypeORM synchronize 가 만들었을 수 있으므로 IF NOT EXISTS 로 idempotent 작성.

CREATE TABLE IF NOT EXISTS "task_assignees" (
    "id" SERIAL NOT NULL,
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "task_assignees_task_id_user_id_key"
    ON "task_assignees"("task_id", "user_id");
CREATE INDEX IF NOT EXISTS "task_assignees_task_id_idx"
    ON "task_assignees"("task_id");
CREATE INDEX IF NOT EXISTS "task_assignees_user_id_idx"
    ON "task_assignees"("user_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'task_assignees_task_id_fkey'
          AND table_name = 'task_assignees'
    ) THEN
        ALTER TABLE "task_assignees"
            ADD CONSTRAINT "task_assignees_task_id_fkey"
            FOREIGN KEY ("task_id") REFERENCES "tasks"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
