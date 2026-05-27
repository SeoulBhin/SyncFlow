-- 전수 대조 결과 발견한 누락 5건 일괄 처리
-- 1) tasks 테이블에 group_id / start_date / parent_task_id / tags / completed_at 컬럼 추가
-- 2) custom_field_definitions 테이블 신규
-- 3) custom_field_values 테이블 신규
-- 4) ai_chat_history 테이블 신규
-- 5) ai_knowledge 테이블 신규
--
-- 로컬은 TypeORM synchronize 가 이미 만들었을 수 있으므로 IF NOT EXISTS 로 idempotent.

-- 1) tasks 컬럼 추가
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "group_id" UUID;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "start_date" DATE;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "parent_task_id" UUID;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "tags" JSONB;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "tasks_group_id_idx" ON "tasks"("group_id");
CREATE INDEX IF NOT EXISTS "tasks_parent_task_id_idx" ON "tasks"("parent_task_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'tasks_parent_task_id_fkey'
          AND table_name = 'tasks'
    ) THEN
        ALTER TABLE "tasks"
            ADD CONSTRAINT "tasks_parent_task_id_fkey"
            FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 2) custom_field_definitions
CREATE TABLE IF NOT EXISTS "custom_field_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "options" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "custom_field_definitions_project_id_idx"
    ON "custom_field_definitions"("project_id");

-- 3) custom_field_values
CREATE TABLE IF NOT EXISTS "custom_field_values" (
    "id" SERIAL NOT NULL,
    "task_id" UUID NOT NULL,
    "field_id" UUID NOT NULL,
    "value" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "custom_field_values_task_id_field_id_key"
    ON "custom_field_values"("task_id", "field_id");
CREATE INDEX IF NOT EXISTS "custom_field_values_task_id_idx"
    ON "custom_field_values"("task_id");
CREATE INDEX IF NOT EXISTS "custom_field_values_field_id_idx"
    ON "custom_field_values"("field_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'custom_field_values_task_id_fkey'
          AND table_name = 'custom_field_values'
    ) THEN
        ALTER TABLE "custom_field_values"
            ADD CONSTRAINT "custom_field_values_task_id_fkey"
            FOREIGN KEY ("task_id") REFERENCES "tasks"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'custom_field_values_field_id_fkey'
          AND table_name = 'custom_field_values'
    ) THEN
        ALTER TABLE "custom_field_values"
            ADD CONSTRAINT "custom_field_values_field_id_fkey"
            FOREIGN KEY ("field_id") REFERENCES "custom_field_definitions"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 4) ai_chat_history (TypeORM @CreateDateColumn 기본 → timestamp without tz)
CREATE TABLE IF NOT EXISTS "ai_chat_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "group_id" UUID,
    "channel_id" UUID,
    "role" VARCHAR(10) NOT NULL,
    "content" TEXT NOT NULL,
    "source_ids" JSONB,
    "token_count" INT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_chat_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_chat_history_session_id_idx" ON "ai_chat_history"("session_id");
CREATE INDEX IF NOT EXISTS "ai_chat_history_user_id_idx" ON "ai_chat_history"("user_id");
CREATE INDEX IF NOT EXISTS "ai_chat_history_group_id_idx" ON "ai_chat_history"("group_id");

-- 5) ai_knowledge
CREATE TABLE IF NOT EXISTS "ai_knowledge" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID,
    "source_type" VARCHAR(20) NOT NULL,
    "source_id" UUID,
    "title" VARCHAR(500),
    "content" TEXT,
    "embedding" TEXT,
    "chunk_index" INT NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_knowledge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_knowledge_group_id_idx" ON "ai_knowledge"("group_id");
