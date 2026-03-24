# SyncFlow - ERD (Entity-Relationship Diagram)  qqqq

> DB 스키마 설계 문서. 백엔드 개발 시 이 문서를 기반으로 테이블을 생성합니다.
> PostgreSQL 15+ / pgvector 확장 사용

---

## 주요 테이블 목록

| 테이블 | 설명 |
|--------|------|
| users | 사용자 정보, 인증, 프로필 |
| groups | 그룹(워크스페이스) |
| group_members | 그룹-사용자 관계, 역할 (Owner/Admin/Member/Guest) |
| invite_codes | 초대 코드 (그룹별) |
| projects | 프로젝트 |
| pages | 문서/코드 페이지 |
| page_versions | 페이지 버전 히스토리 |
| tasks | 할 일 (커스텀 상태, 서브태스크, 회의 출처) |
| schedules | 일정 (시작일, 종료일) |
| channels | 채팅 채널 (그룹 전체, 프로젝트별, 1:1 DM) |
| channel_members | 채널-사용자 관계, 권한 오버라이드 |
| messages | 채팅 메시지 (스레드 지원) |
| message_reactions | 메시지 이모지 반응 |
| **meetings** | **회의 세션 (채널 연동, 상태 관리)** |
| **meeting_participants** | **회의 참석자** |
| **meeting_transcripts** | **STT 텍스트 (화자별, 타임스탬프)** |
| **meeting_summaries** | **AI 회의록 (요약, 문서 페이지 연동)** |
| **meeting_action_items** | **회의 액션 아이템 (확인 후 작업 등록)** |
| ai_conversations | AI 대화 세션 |
| ai_messages | AI 대화 메시지 (질문/답변) |
| embeddings | 문서/코드 벡터 임베딩 (pgvector, 768차원) |
| subscriptions | 구독/결제 정보 |
| payments | 결제 이력 |
| notifications | 알림 내역 |
| user_settings | 사용자별 설정 (테마, 알림 등) |
| oauth_accounts | 소셜 로그인 연동 계정 |
| file_uploads | 업로드된 파일 메타데이터 |

---

## ERD 개략도

```
┌─────────────────┐
│     users        │
├─────────────────┤
│ id (PK, UUID)    │
│ email (UNIQUE)   │
│ password_hash    │──────────────────────────────────┐
│ name             │                                   │
│ avatar_url       │     ┌─────────────────┐           │
│ status_message   │     │ oauth_accounts   │           │
│ role (enum)      │     ├─────────────────┤           │
│ email_verified   │     │ id (PK)          │           │
│ created_at       │     │ user_id (FK)  ───┤           │
│ updated_at       │     │ provider (enum)  │           │
└──────┬──────────┘     │ provider_id      │           │
       │                │ provider_email   │           │
       │                │ created_at       │           │
       │                └─────────────────┘           │
       │                                               │
       │         ┌─────────────────┐                   │
       │         │     groups       │                   │
       │         ├─────────────────┤                   │
       │         │ id (PK, UUID)    │                   │
       │         │ name             │                   │
       │         │ description      │                   │
       │         │ created_by (FK)──┤                   │
       │         │ created_at       │                   │
       │         │ updated_at       │                   │
       │         └──────┬──────────┘                   │
       │                │                               │
       │    ┌───────────┼───────────┐                   │
       │    │                       │                   │
       │    ▼                       ▼                   │
┌──────┴──────────┐   ┌─────────────────┐              │
│ group_members    │   │ invite_codes     │              │
├─────────────────┤   ├─────────────────┤              │
│ id (PK)          │   │ id (PK)          │              │
│ user_id (FK)     │   │ group_id (FK)    │              │
│ group_id (FK)    │   │ code (UNIQUE, 8) │              │
│ role (enum)      │   │ is_active        │              │
│ joined_at        │   │ created_at       │              │
│ updated_at       │   │ expires_at       │              │
└─────────────────┘   └─────────────────┘              │
                                                        │
┌─────────────────┐   ┌─────────────────┐              │
│   projects       │   │     pages        │              │
├─────────────────┤   ├─────────────────┤              │
│ id (PK, UUID)    │   │ id (PK, UUID)    │              │
│ group_id (FK)    │   │ project_id (FK)  │              │
│ name             │   │ title            │              │
│ description      │   │ type (enum)      │  doc / code  │
│ deadline         │   │ content (JSONB)  │              │
│ sort_order       │   │ language         │              │
│ created_at       │   │ sort_order       │              │
│ updated_at       │   │ created_by (FK)──┘              │
└──────┬──────────┘   │ created_at       │
       │              │ updated_at       │
       │              └──────┬──────────┘
       │                     │
       │              ┌──────▼──────────┐
       │              │ page_versions    │
       │              ├─────────────────┤
       │              │ id (PK)          │
       │              │ page_id (FK)     │
       │              │ content (JSONB)  │
       │              │ created_by (FK)  │
       │              │ created_at       │
       │              └─────────────────┘
       │
       ├──────────────────────────────────────────┐
       │                                          │
┌──────▼──────────┐                        ┌──────▼──────────┐
│     tasks        │                        │   schedules      │
├─────────────────┤                        ├─────────────────┤
│ id (PK, UUID)    │                        │ id (PK, UUID)    │
│ project_id (FK)  │                        │ project_id (FK)  │
│ title            │                        │ title            │
│ description      │                        │ start_date       │
│ status (enum)    │  todo/progress/done    │ end_date         │
│ priority (enum)  │  urgent/high/mid/low   │ all_day          │
│ assignee_id (FK) │                        │ created_by (FK)  │
│ due_date         │                        │ created_at       │
│ sort_order       │                        │ updated_at       │
│ created_by (FK)  │                        └─────────────────┘
│ created_at       │
│ updated_at       │
└─────────────────┘

┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   channels       │   │ channel_members  │   │   messages       │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ id (PK, UUID)    │   │ id (PK)          │   │ id (PK, UUID)    │
│ group_id (FK)    │   │ channel_id (FK)  │   │ channel_id (FK)  │
│ project_id (FK)  │   │ user_id (FK)     │   │ user_id (FK)     │
│ type (enum)      │   │ last_read_at     │   │ content (TEXT)   │
│  group/project   │   │ joined_at        │   │ type (enum)      │
│  /dm             │   └─────────────────┘   │  text/file/system│
│ name             │                          │ file_url         │
│ created_at       │   ┌─────────────────┐   │ is_edited        │
└─────────────────┘   │message_reactions │   │ parent_id (FK)   │
                      ├─────────────────┤   │ created_at       │
                      │ id (PK)          │   │ updated_at       │
                      │ message_id (FK)  │   └─────────────────┘
                      │ user_id (FK)     │
                      │ emoji            │
                      │ created_at       │
                      └─────────────────┘

┌─────────────────┐   ┌─────────────────┐
│ai_conversations  │   │  ai_messages     │
├─────────────────┤   ├─────────────────┤
│ id (PK, UUID)    │   │ id (PK, UUID)    │
│ user_id (FK)     │   │ conversation_id  │
│ project_id (FK)  │   │   (FK)           │
│ title            │   │ role (enum)      │
│ created_at       │   │  user/assistant  │
│ updated_at       │   │ content (TEXT)   │
└─────────────────┘   │ referenced_files │
                      │   (TEXT[])       │
                      │ tokens_used      │
                      │ created_at       │
                      └─────────────────┘

┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  embeddings      │   │ subscriptions    │   │   payments       │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ id (PK)          │   │ id (PK, UUID)    │   │ id (PK, UUID)    │
│ page_id (FK)     │   │ user_id (FK)     │   │ user_id (FK)     │
│ chunk_index      │   │ plan (enum)      │   │ subscription_id  │
│ content (TEXT)   │   │  free/pro/team   │   │   (FK)           │
│ vector           │   │ status (enum)    │   │ amount           │
│  (vector(768))   │   │  active/expired  │   │ currency         │
│ metadata (JSONB) │   │  /cancelled      │   │ status (enum)    │
│ created_at       │   │ period (enum)    │   │  paid/pending    │
│ updated_at       │   │  monthly/yearly  │   │  /failed/refunded│
└─────────────────┘   │ current_period   │   │ method           │
                      │   _start         │   │ description      │
                      │ current_period   │   │ pg_transaction_id│
                      │   _end           │   │ created_at       │
                      │ created_at       │   └─────────────────┘
                      │ updated_at       │
                      └─────────────────┘

┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ notifications    │   │ user_settings    │   │ file_uploads     │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ id (PK, UUID)    │   │ id (PK)          │   │ id (PK, UUID)    │
│ user_id (FK)     │   │ user_id (FK, UQ) │   │ user_id (FK)     │
│ type (enum)      │   │ theme (enum)     │   │ original_name    │
│  message/task    │   │ notify_message   │   │ stored_path      │
│  /mention/system │   │   (BOOL)         │   │ mime_type        │
│ title            │   │ notify_task      │   │ size_bytes       │
│ content          │   │   (BOOL)         │   │ page_id (FK)     │
│ link             │   │ notify_deadline  │   │ message_id (FK)  │
│ is_read          │   │   (BOOL)         │   │ created_at       │
│ created_at       │   │ notify_browser   │   └─────────────────┘
└─────────────────┘   │   (BOOL)         │
                      │ updated_at       │
                      └─────────────────┘
```

---

## 상세 스키마 (SQL)

### users
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),          -- NULL if social-only account
  name          VARCHAR(100) NOT NULL,
  avatar_url    TEXT,
  status_message VARCHAR(200),
  role          VARCHAR(20) NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin', 'member', 'tester')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
```

### oauth_accounts
```sql
CREATE TABLE oauth_accounts (
  id             SERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider       VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'github', 'kakao')),
  provider_id    VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_id)
);
CREATE INDEX idx_oauth_user ON oauth_accounts(user_id);
```

### groups
```sql
CREATE TABLE groups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL,
  description       TEXT,
  visibility        VARCHAR(10) NOT NULL DEFAULT 'public'
                    CHECK (visibility IN ('public', 'private')),
  is_external       BOOLEAN NOT NULL DEFAULT FALSE,
  connected_org_ids UUID[],           -- 외부 공유 채널: 연결된 조직 ID 배열
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### group_members
```sql
CREATE TABLE group_members (
  id        SERIAL PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role      VARCHAR(20) NOT NULL DEFAULT 'member'
            CHECK (role IN ('owner', 'admin', 'member', 'guest')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, group_id)
);
CREATE INDEX idx_gm_group ON group_members(group_id);
CREATE INDEX idx_gm_user ON group_members(user_id);
```

### invite_codes
```sql
CREATE TABLE invite_codes (
  id         SERIAL PRIMARY KEY,
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  code       VARCHAR(8) NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX idx_invite_code ON invite_codes(code) WHERE is_active = TRUE;
```

### projects
```sql
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  deadline    DATE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_projects_group ON projects(group_id);
```

### project_members (프로젝트별 외부 뷰어 초대)
```sql
CREATE TABLE project_members (
  id          SERIAL PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL DEFAULT 'viewer'
              CHECK (role IN ('admin', 'member', 'viewer')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);
CREATE INDEX idx_pm_project ON project_members(project_id);
CREATE INDEX idx_pm_user ON project_members(user_id);
```

> **용도**: 그룹에 참여하지 않은 사용자(예: CTO, PM, 외부 검토자)가 특정 프로젝트만 열람/참여할 수 있도록 한다. 그룹 멤버는 별도 추가 없이 자동 접근.

### pages
```sql
CREATE TABLE pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       VARCHAR(300) NOT NULL,
  type        VARCHAR(10) NOT NULL CHECK (type IN ('document', 'code')),
  content     JSONB,                   -- TipTap JSON (doc) or code text (code)
  language    VARCHAR(20),             -- python, javascript, java, c, cpp, html, css
  sort_order  INT NOT NULL DEFAULT 0,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pages_project ON pages(project_id);
```

### page_versions
```sql
CREATE TABLE page_versions (
  id         SERIAL PRIMARY KEY,
  page_id    UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  content    JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pv_page ON page_versions(page_id);
```

### tasks
```sql
CREATE TABLE tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,  -- 서브태스크
  meeting_id     UUID REFERENCES meetings(id) ON DELETE SET NULL,  -- 회의 출처 추적
  title          VARCHAR(300) NOT NULL,
  description    TEXT,
  status         VARCHAR(30) NOT NULL DEFAULT 'todo',  -- 커스텀 상태 허용 (기본: todo/in_progress/done)
  priority       VARCHAR(10) NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  assignee_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  start_date     DATE,
  due_date       DATE,
  sort_order     INT NOT NULL DEFAULT 0,
  created_by     UUID NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_meeting ON tasks(meeting_id);
```

### schedules
```sql
CREATE TABLE schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       VARCHAR(300) NOT NULL,
  start_date  TIMESTAMPTZ NOT NULL,
  end_date    TIMESTAMPTZ NOT NULL,
  all_day     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_schedules_project ON schedules(project_id);
```

### channels
```sql
CREATE TABLE channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  type        VARCHAR(10) NOT NULL CHECK (type IN ('group', 'project', 'dm')),
  name        VARCHAR(100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_channels_group ON channels(group_id);
```

### channel_members
```sql
CREATE TABLE channel_members (
  id                  SERIAL PRIMARY KEY,
  channel_id          UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at        TIMESTAMPTZ,
  permission_override JSONB,  -- 채널별 권한 오버라이드 (예: {"can_write": false})
  joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel_id, user_id)
);
```

### messages
```sql
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  type        VARCHAR(10) NOT NULL DEFAULT 'text'
              CHECK (type IN ('text', 'file', 'system')),
  file_url    TEXT,
  is_edited   BOOLEAN NOT NULL DEFAULT FALSE,
  parent_id   UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_channel ON messages(channel_id, created_at);
```

### message_reactions
```sql
CREATE TABLE message_reactions (
  id         SERIAL PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);
```

### meetings
```sql
CREATE TABLE meetings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id   UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title        VARCHAR(300) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'scheduled'
               CHECK (status IN ('scheduled', 'in_progress', 'ended')),
  scheduled_at TIMESTAMPTZ,
  started_at   TIMESTAMPTZ,
  ended_at     TIMESTAMPTZ,
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_meetings_channel ON meetings(channel_id);
CREATE INDEX idx_meetings_status ON meetings(status);
```

### meeting_participants
```sql
CREATE TABLE meeting_participants (
  id         SERIAL PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at    TIMESTAMPTZ,
  UNIQUE (meeting_id, user_id)
);
CREATE INDEX idx_mp_meeting ON meeting_participants(meeting_id);
```

### meeting_transcripts
```sql
CREATE TABLE meeting_transcripts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  speaker_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  text         TEXT NOT NULL,
  timestamp_ms INT NOT NULL,  -- 회의 시작 기준 밀리초 오프셋
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mt_meeting ON meeting_transcripts(meeting_id, timestamp_ms);
```

### meeting_summaries
```sql
CREATE TABLE meeting_summaries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
  summary    JSONB NOT NULL,  -- { topics: [], decisions: [], attendees: [] }
  page_id    UUID REFERENCES pages(id) ON DELETE SET NULL,  -- 생성된 문서 페이지
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### meeting_action_items
```sql
CREATE TABLE meeting_action_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  title       VARCHAR(300) NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date    DATE,
  task_id     UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- 확인 후 생성된 작업
  confirmed   BOOLEAN NOT NULL DEFAULT FALSE,  -- 사용자 확인 여부
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mai_meeting ON meeting_action_items(meeting_id);
```

### ai_conversations
```sql
CREATE TABLE ai_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  title       VARCHAR(200) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_conv_user ON ai_conversations(user_id);
```

### ai_messages
```sql
CREATE TABLE ai_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role             VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content          TEXT NOT NULL,
  referenced_files TEXT[],               -- 참조된 파일 경로 배열
  tokens_used      INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_msg_conv ON ai_messages(conversation_id, created_at);
```

### embeddings (pgvector)
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
  id          SERIAL PRIMARY KEY,
  page_id     UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content     TEXT NOT NULL,
  vector      vector(768) NOT NULL,     -- Google Embedding 768차원
  metadata    JSONB,                     -- { language, file_path, ... }
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_emb_page ON embeddings(page_id);
CREATE INDEX idx_emb_vector ON embeddings USING ivfflat (vector vector_cosine_ops)
  WITH (lists = 100);
```

### subscriptions
```sql
CREATE TABLE subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                 VARCHAR(10) NOT NULL DEFAULT 'free'
                       CHECK (plan IN ('free', 'pro', 'team')),
  status               VARCHAR(15) NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'expired', 'cancelled')),
  period               VARCHAR(10) CHECK (period IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sub_user ON subscriptions(user_id);
```

### payments
```sql
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  subscription_id   UUID REFERENCES subscriptions(id),
  amount            INT NOT NULL,              -- 원 단위
  currency          VARCHAR(3) NOT NULL DEFAULT 'KRW',
  status            VARCHAR(10) NOT NULL
                    CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  method            VARCHAR(50),               -- '카카오페이', '신용카드 **** 1234'
  description       VARCHAR(200),
  pg_transaction_id VARCHAR(100),              -- PG사 거래 ID
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pay_user ON payments(user_id);
```

### notifications
```sql
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(20) NOT NULL
             CHECK (type IN ('message', 'task', 'mention', 'deadline', 'system')),
  title      VARCHAR(200) NOT NULL,
  content    TEXT,
  link       VARCHAR(500),
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_user ON notifications(user_id, is_read, created_at DESC);
```

### user_settings
```sql
CREATE TABLE user_settings (
  id               SERIAL PRIMARY KEY,
  user_id          UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme            VARCHAR(10) NOT NULL DEFAULT 'system'
                   CHECK (theme IN ('light', 'dark', 'system')),
  notify_message   BOOLEAN NOT NULL DEFAULT TRUE,
  notify_task      BOOLEAN NOT NULL DEFAULT TRUE,
  notify_deadline  BOOLEAN NOT NULL DEFAULT FALSE,
  notify_browser   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### file_uploads
```sql
CREATE TABLE file_uploads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  original_name VARCHAR(300) NOT NULL,
  stored_path   TEXT NOT NULL,              -- Cloud Storage 경로
  mime_type     VARCHAR(100),
  size_bytes    BIGINT NOT NULL,
  page_id       UUID REFERENCES pages(id) ON DELETE SET NULL,
  message_id    UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_files_page ON file_uploads(page_id);
```

---

## 테이블 관계 요약

| 관계 | 설명 |
|------|------|
| users 1:N group_members | 사용자는 여러 그룹에 소속 |
| groups 1:N group_members | 그룹은 여러 멤버 보유 (Owner/Admin/Member/Guest) |
| groups 1:N invite_codes | 그룹은 여러 초대 코드 발급 가능 |
| groups 1:N projects | 그룹 안에 여러 프로젝트 |
| projects 1:N project_members | 프로젝트별 외부 뷰어/멤버 초대 (그룹 미참여자도 가능) |
| projects 1:N pages | 프로젝트 안에 여러 페이지 |
| pages 1:N page_versions | 페이지마다 버전 히스토리 |
| pages 1:N embeddings | 페이지 내용을 청크별 벡터 저장 |
| projects 1:N tasks | 프로젝트에 여러 할 일 |
| tasks 1:N tasks | 서브태스크 (parent_task_id 자기 참조) |
| meetings 1:N tasks | 회의에서 생성된 작업 (meeting_id) |
| projects 1:N schedules | 프로젝트에 여러 일정 |
| groups 1:N channels | 그룹에 여러 채팅 채널 |
| channels 1:N messages | 채널에 여러 메시지 |
| messages 1:N messages | 스레드 (parent_id 자기 참조) |
| channels 1:N channel_members | 채널에 여러 멤버 (권한 오버라이드 JSONB) |
| channels 1:N meetings | 채널에 여러 회의 세션 |
| meetings 1:N meeting_participants | 회의에 여러 참석자 |
| meetings 1:N meeting_transcripts | 회의 STT 텍스트 (화자별) |
| meetings 1:1 meeting_summaries | 회의당 하나의 AI 요약 |
| meetings 1:N meeting_action_items | 회의에서 추출된 액션 아이템 |
| users 1:N oauth_accounts | 사용자에 여러 소셜 계정 연동 |
| users 1:N ai_conversations | 사용자별 AI 대화 세션 |
| ai_conversations 1:N ai_messages | 대화에 여러 메시지 |
| users 1:1 subscriptions | 사용자당 하나의 활성 구독 |
| users 1:N payments | 사용자의 결제 이력 |
| users 1:1 user_settings | 사용자별 설정 |

---

## 초기 DB 생성 스크립트 (전체)

> 아래 SQL을 순서대로 실행하면 모든 테이블이 생성됩니다.
> PostgreSQL 15+ / pgvector 확장 필요

```sql
-- ============================================================
-- SyncFlow 전체 DB 초기화 스크립트
-- 실행 순서가 중요합니다 (외래 키 의존성)
-- ============================================================

-- 0. 확장 설치
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "vector";      -- pgvector

-- ============================================================
-- 1. users (최상위 - 다른 테이블이 참조)
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255),
  name            VARCHAR(100) NOT NULL,
  avatar_url      TEXT,
  status_message  VARCHAR(200),
  role            VARCHAR(20) NOT NULL DEFAULT 'member'
                  CHECK (role IN ('admin', 'member', 'tester')),
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- 2. oauth_accounts
-- ============================================================
CREATE TABLE oauth_accounts (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'github', 'kakao')),
  provider_id     VARCHAR(255) NOT NULL,
  provider_email  VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_id)
);
CREATE INDEX idx_oauth_user ON oauth_accounts(user_id);

-- ============================================================
-- 3. user_settings
-- ============================================================
CREATE TABLE user_settings (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme           VARCHAR(10) NOT NULL DEFAULT 'system'
                  CHECK (theme IN ('light', 'dark', 'system')),
  notify_message  BOOLEAN NOT NULL DEFAULT TRUE,
  notify_task     BOOLEAN NOT NULL DEFAULT TRUE,
  notify_deadline BOOLEAN NOT NULL DEFAULT FALSE,
  notify_browser  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. groups
-- ============================================================
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. group_members
-- ============================================================
CREATE TABLE group_members (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL DEFAULT 'member'
              CHECK (role IN ('owner', 'admin', 'member', 'guest')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, group_id)
);
CREATE INDEX idx_gm_group ON group_members(group_id);
CREATE INDEX idx_gm_user ON group_members(user_id);

-- ============================================================
-- 6. invite_codes
-- ============================================================
CREATE TABLE invite_codes (
  id          SERIAL PRIMARY KEY,
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  code        VARCHAR(8) NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ
);
CREATE INDEX idx_invite_code ON invite_codes(code) WHERE is_active = TRUE;

-- ============================================================
-- 7. projects
-- ============================================================
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  deadline    DATE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_projects_group ON projects(group_id);

-- ============================================================
-- 8. pages
-- ============================================================
CREATE TABLE pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       VARCHAR(300) NOT NULL,
  type        VARCHAR(10) NOT NULL CHECK (type IN ('document', 'code')),
  content     JSONB,
  language    VARCHAR(20),
  sort_order  INT NOT NULL DEFAULT 0,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pages_project ON pages(project_id);

-- ============================================================
-- 9. page_versions
-- ============================================================
CREATE TABLE page_versions (
  id          SERIAL PRIMARY KEY,
  page_id     UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  content     JSONB NOT NULL,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pv_page ON page_versions(page_id);

-- ============================================================
-- 10. tasks (서브태스크 + 회의 출처 + 커스텀 상태)
-- ============================================================
CREATE TABLE tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  meeting_id     UUID,  -- FK는 meetings 생성 후 ALTER로 추가
  title          VARCHAR(300) NOT NULL,
  description    TEXT,
  status         VARCHAR(30) NOT NULL DEFAULT 'todo',
  priority       VARCHAR(10) NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  assignee_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  start_date     DATE,
  due_date       DATE,
  sort_order     INT NOT NULL DEFAULT 0,
  created_by     UUID NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_meeting ON tasks(meeting_id);

-- ============================================================
-- 11. schedules
-- ============================================================
CREATE TABLE schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       VARCHAR(300) NOT NULL,
  start_date  TIMESTAMPTZ NOT NULL,
  end_date    TIMESTAMPTZ NOT NULL,
  all_day     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_schedules_project ON schedules(project_id);

-- ============================================================
-- 12. channels
-- ============================================================
CREATE TABLE channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  type        VARCHAR(10) NOT NULL CHECK (type IN ('group', 'project', 'dm')),
  name        VARCHAR(100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_channels_group ON channels(group_id);

-- ============================================================
-- 13. channel_members (권한 오버라이드 포함)
-- ============================================================
CREATE TABLE channel_members (
  id                  SERIAL PRIMARY KEY,
  channel_id          UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at        TIMESTAMPTZ,
  permission_override JSONB,
  joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel_id, user_id)
);

-- ============================================================
-- 14. messages
-- ============================================================
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  type        VARCHAR(10) NOT NULL DEFAULT 'text'
              CHECK (type IN ('text', 'file', 'system')),
  file_url    TEXT,
  is_edited   BOOLEAN NOT NULL DEFAULT FALSE,
  parent_id   UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_channel ON messages(channel_id, created_at);

-- ============================================================
-- 15. message_reactions
-- ============================================================
CREATE TABLE message_reactions (
  id          SERIAL PRIMARY KEY,
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji       VARCHAR(10) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

-- ============================================================
-- 16. ai_conversations
-- ============================================================
CREATE TABLE ai_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  title       VARCHAR(200) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_conv_user ON ai_conversations(user_id);

-- ============================================================
-- 17. ai_messages
-- ============================================================
CREATE TABLE ai_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role             VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content          TEXT NOT NULL,
  referenced_files TEXT[],
  tokens_used      INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_msg_conv ON ai_messages(conversation_id, created_at);

-- ============================================================
-- 18. embeddings (pgvector)
-- ============================================================
CREATE TABLE embeddings (
  id          SERIAL PRIMARY KEY,
  page_id     UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content     TEXT NOT NULL,
  vector      vector(768) NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_emb_page ON embeddings(page_id);
-- ivfflat 인덱스는 데이터가 충분히 쌓인 후 생성 권장 (최소 1000행 이상)
-- CREATE INDEX idx_emb_vector ON embeddings USING ivfflat (vector vector_cosine_ops)
--   WITH (lists = 100);

-- ============================================================
-- 19. subscriptions
-- ============================================================
CREATE TABLE subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                 VARCHAR(10) NOT NULL DEFAULT 'free'
                       CHECK (plan IN ('free', 'pro', 'team')),
  status               VARCHAR(15) NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'expired', 'cancelled')),
  period               VARCHAR(10) CHECK (period IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sub_user ON subscriptions(user_id);

-- ============================================================
-- 20. payments
-- ============================================================
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  subscription_id   UUID REFERENCES subscriptions(id),
  amount            INT NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'KRW',
  status            VARCHAR(10) NOT NULL
                    CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  method            VARCHAR(50),
  description       VARCHAR(200),
  pg_transaction_id VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pay_user ON payments(user_id);

-- ============================================================
-- 21. notifications
-- ============================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL
              CHECK (type IN ('message', 'task', 'mention', 'deadline', 'system')),
  title       VARCHAR(200) NOT NULL,
  content     TEXT,
  link        VARCHAR(500),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- 22. file_uploads
-- ============================================================
CREATE TABLE file_uploads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  original_name VARCHAR(300) NOT NULL,
  stored_path   TEXT NOT NULL,
  mime_type     VARCHAR(100),
  size_bytes    BIGINT NOT NULL,
  page_id       UUID REFERENCES pages(id) ON DELETE SET NULL,
  message_id    UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_files_page ON file_uploads(page_id);

-- ============================================================
-- 23. meetings
-- ============================================================
CREATE TABLE meetings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id   UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title        VARCHAR(300) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'scheduled'
               CHECK (status IN ('scheduled', 'in_progress', 'ended')),
  scheduled_at TIMESTAMPTZ,
  started_at   TIMESTAMPTZ,
  ended_at     TIMESTAMPTZ,
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_meetings_channel ON meetings(channel_id);
CREATE INDEX idx_meetings_status ON meetings(status);

-- tasks.meeting_id FK 추가
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_meeting
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL;

-- ============================================================
-- 24. meeting_participants
-- ============================================================
CREATE TABLE meeting_participants (
  id         SERIAL PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at    TIMESTAMPTZ,
  UNIQUE (meeting_id, user_id)
);
CREATE INDEX idx_mp_meeting ON meeting_participants(meeting_id);

-- ============================================================
-- 25. meeting_transcripts
-- ============================================================
CREATE TABLE meeting_transcripts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  speaker_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  text         TEXT NOT NULL,
  timestamp_ms INT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mt_meeting ON meeting_transcripts(meeting_id, timestamp_ms);

-- ============================================================
-- 26. meeting_summaries
-- ============================================================
CREATE TABLE meeting_summaries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
  summary    JSONB NOT NULL,
  page_id    UUID REFERENCES pages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 27. meeting_action_items
-- ============================================================
CREATE TABLE meeting_action_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  title       VARCHAR(300) NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date    DATE,
  task_id     UUID REFERENCES tasks(id) ON DELETE SET NULL,
  confirmed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mai_meeting ON meeting_action_items(meeting_id);

-- ============================================================
-- 초기 데이터: 테스터 계정 (비밀번호: test1234 / bcrypt)
-- ============================================================
-- bcrypt hash for 'test1234' (salt rounds: 12)
-- 실제 사용 시 서버에서 bcrypt로 해싱한 값을 사용하세요
INSERT INTO users (id, email, password_hash, name, role, email_verified) VALUES
  (gen_random_uuid(), 'tester1@syncflow.com', '$2b$12$LJ3m4ys3Lk0TSwHIeNsPYu0MWR.XL9m2BzJ8Kx1vTjXrXhRgS7udi', 'Tester 1', 'tester', TRUE),
  (gen_random_uuid(), 'tester2@syncflow.com', '$2b$12$LJ3m4ys3Lk0TSwHIeNsPYu0MWR.XL9m2BzJ8Kx1vTjXrXhRgS7udi', 'Tester 2', 'tester', TRUE),
  (gen_random_uuid(), 'tester3@syncflow.com', '$2b$12$LJ3m4ys3Lk0TSwHIeNsPYu0MWR.XL9m2BzJ8Kx1vTjXrXhRgS7udi', 'Tester 3', 'tester', TRUE),
  (gen_random_uuid(), 'tester4@syncflow.com', '$2b$12$LJ3m4ys3Lk0TSwHIeNsPYu0MWR.XL9m2BzJ8Kx1vTjXrXhRgS7udi', 'Tester 4', 'tester', TRUE);

-- 테스터 계정에 무료 구독 부여
INSERT INTO subscriptions (user_id, plan, status)
  SELECT id, 'free', 'active' FROM users WHERE role = 'tester';

-- 테스터 계정에 기본 설정 생성
INSERT INTO user_settings (user_id)
  SELECT id FROM users WHERE role = 'tester';

-- ============================================================
-- 완료! 27개 테이블 + 테스터 초기 데이터 생성됨
-- ============================================================
```

> **참고**: 위 bcrypt 해시는 예시입니다. 실제 배포 시 서버에서 `bcrypt.hash('test1234', 12)`로 생성한 해시를 사용하세요.

---

*마지막 업데이트: 2026-03-11*
