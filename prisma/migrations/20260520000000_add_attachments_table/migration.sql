-- 문서 페이지 첨부파일 테이블
-- 로컬 DB에는 TypeORM synchronize가 이미 만들어둔 상태일 수 있으므로
-- IF NOT EXISTS / 조건부 ALTER 로 idempotent 하게 작성한다.

CREATE TABLE IF NOT EXISTS "attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pageId" UUID NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" VARCHAR(100),
    "size" BIGINT NOT NULL,
    "uploadedBy" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),
    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "attachments_pageId_idx" ON "attachments"("pageId");

-- FK 는 IF NOT EXISTS 가 없으므로 DO 블록으로 존재 여부 확인 후 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'attachments_pageId_fkey'
          AND table_name = 'attachments'
    ) THEN
        ALTER TABLE "attachments"
            ADD CONSTRAINT "attachments_pageId_fkey"
            FOREIGN KEY ("pageId") REFERENCES "pages"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
