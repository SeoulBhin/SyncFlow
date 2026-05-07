# SyncFlow - 백엔드 개발 가이드

> **외부 개발자를 위한 완전 독립 개발 가이드.**
> 이 문서만으로 각 파트를 독립적으로 구현할 수 있어야 한다.

---

## 읽어야 할 문서

| 문서 | 용도 | 반드시 읽을 것 |
|------|------|--------------|
| 이 문서 (Do.md) | 파트별 구현 상세 | ✅ 담당 파트 |
| [TECH.md](./TECH.md) §6 | API 엔드포인트 전체 목록 | ✅ |
| [ERD.md](./ERD.md) | DB 스키마 SQL (CREATE TABLE) | ✅ |
| [PROJECT.md](./PROJECT.md) | 프로젝트 개요, 권한 모델 | 권장 |
| `README.md` (루트) | 프로젝트 구조, 명령어, 코드 스타일, 진행 현황 | ✅ |
| `UI.md` (루트) | 프론트 UI 기능 + Mock 데이터 전환 가이드 | 프론트 연동 시 |

---

## 현재 상태

### 프론트엔드 (UI 100% 완료)
- React 19 + TypeScript + TailwindCSS v4 + Vite 7.3
- Zustand 13개 store, React Router v7
- **모든 UI가 Mock 데이터(`src/constants/index.ts`)로 동작 중**
- 백엔드 API가 준비되면 Store 내부만 수정하여 연동 (컴포넌트 변경 없음)

### 백엔드 (인증 + 설정 완료, 나머지 진행 중)
- NestJS 11 (`backend/`), TypeScript
- Docker Compose: PostgreSQL(pgvector 16) + Redis(7-alpine)
- Vite 프록시: `/api` → `localhost:3000`, `/socket.io` → ws
- **14개 모듈 폴더 생성 완료**
- **구현 완료**: `auth`(JWT + Google/GitHub/Kakao OAuth + 회원가입 + 토큰 갱신 + 비밀번호 재설정 + 프로필), `settings`(테마/알림/비밀번호 변경)
- **미착수 (12개 모듈)**: `groups`, `projects`, `pages`, `tasks`, `schedules`, `channels`, `messages`, `ai`, `voice-chat`, `screen-share`, `subscriptions`, `common`

### 백엔드 폴더 구조
```
backend/src/
├── main.ts                    # NestFactory, /api 프리픽스, CORS, ValidationPipe, cookie-parser
├── app.module.ts              # ConfigModule + TypeORM (auth, settings 등록 완료)
├── app.controller.ts          # Hello World (제거 가능)
├── auth/                      # ✅ 구현 완료 (JWT + Google/GitHub/Kakao OAuth)
├── settings/                  # ✅ 구현 완료 (테마/알림/비밀번호)
├── groups/                    # 빈 폴더
├── projects/                  # 빈 폴더
├── pages/                     # 빈 폴더
├── tasks/                     # 빈 폴더
├── schedules/                 # 빈 폴더
├── channels/                  # 빈 폴더
├── messages/                  # 빈 폴더
├── ai/                        # 빈 폴더
├── voice-chat/                # 빈 폴더
├── screen-share/              # 빈 폴더
├── subscriptions/             # 빈 폴더
└── common/
    ├── decorators/            # 빈 폴더
    ├── entities/              # 빈 폴더
    ├── guards/                # 빈 폴더
    └── interceptors/          # 빈 폴더
```

---

## 개발 규칙

### NestJS 모듈 구조 (각 모듈 필수 파일)
```
backend/src/{모듈명}/
├── {모듈명}.module.ts          # @Module 선언
├── {모듈명}.controller.ts      # @Controller, API 엔드포인트
├── {모듈명}.service.ts         # 비즈니스 로직
├── dto/
│   ├── create-{모듈명}.dto.ts  # 생성 요청 DTO (class-validator)
│   └── update-{모듈명}.dto.ts  # 수정 요청 DTO
└── entities/
    └── {모듈명}.entity.ts      # TypeORM Entity (@Entity)
```

### 코드 스타일
- Prettier: 세미콜론 없음, 싱글 쿼트, 2-space, trailing comma, 100자 폭
- `npm run lint` 통과 필수
- **Entity는 ERD.md의 CREATE TABLE과 1:1 매핑**
- DTO에는 `class-validator` 데코레이터 필수 (`@IsString()`, `@IsUUID()` 등)
- 응답은 Entity 직접 반환 (별도 응답 DTO는 필요 시에만)

### 환경 변수
```bash
# backend/.env (backend/.env.example 참조)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=syncflow
DATABASE_PASSWORD=syncflow1234
DATABASE_NAME=syncflow
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
REDIS_HOST=localhost
REDIS_PORT=6379
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
GEMINI_API_KEY=
GCS_BUCKET_NAME=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=ws://localhost:7880
FRONTEND_URL=http://localhost:5174
```

### 명령어
```bash
cd backend
npm run start:dev     # NestJS watch mode (localhost:3000)
npm run build         # 빌드
npm run lint          # ESLint
npm run test          # Jest 단위 테스트
npm run test:e2e      # E2E 테스트

# 인프라
npm run docker:up     # PostgreSQL + Redis 시작 (루트에서)
npm run docker:down   # 중지
```
## 팀원별 역할 분배 

| 역할 | 담당 파트 | 핵심 기술 |
|------|----------|----------|
| **김명준** (리드) | Oauth + 설정, DB + 그룹/프로젝트
| **김봉만** |  회의 STT + 문서 에디터 + 대시보드
| **남궁훈 C** | 일정/할 일 + AI RAG파이프라인 구축
| **이도현** | 실시간 음성/화면/문서 + 메신저 + 인프라 
| **프론트엔드** 김경빈 | UI 유지보수 + API 연동 + 인프라
---

## 파트 의존성 & 개발 순서

```
Part 1 (DB 마이그레이션)
  └→ Part 2 (인증) ──────────────────────────┐
       └→ Part 3 (그룹/프로젝트/페이지) ──────┤
            ├→ Part 4 (대시보드)              │
            ├→ Part 7 (작업 관리)             │ 모든 파트가
            ├→ Part 8 (메신저/스레드)         │ Part 2 인증에 의존
            ├→ Part 9 (음성/화면공유)         │
            ├→ Part 5 (문서 실시간 편집)      │
            └→ Part 11 (AI RAG) ──────────────┤
                 └→ Part 10 (AI 회의) ────────┘
  Part 12 (구독) — Part 2 이후 독립 가능
  Part 13 (설정) — Part 2 이후 독립 가능
  Part 6 (코드 실행) — 후순위, 독립 가능
```

**권장 개발 순서**: Part 1 → 2 → 3 → 8 → 7 → 11 → 10 → 5 → 9 → 4 → 12 → 13 → 6

---

## Part 1. DB 마이그레이션

> P0 — 모든 파트의 전제 조건

### 할 일
1. `npm run docker:up`으로 PostgreSQL + Redis 시작
2. PostgreSQL에 pgvector 확장 설치: `CREATE EXTENSION IF NOT EXISTS vector;`
3. ERD.md의 CREATE TABLE 문을 순서대로 실행 (FK 의존성 순서)
4. `app.module.ts`에서 `synchronize: true`가 개발 환경에서만 켜져 있는지 확인

### 테이블 생성 순서 (FK 의존성)
```
1. organizations
2. users
3. groups (→ users)
4. group_members (→ users, groups)
5. invite_codes (→ groups)
6. projects (→ groups)
7. project_members (→ projects, users)
8. pages (→ projects)
9. page_versions (→ pages, users)
10. channels (→ groups, projects)
11. channel_members (→ channels, users)
12. messages (→ channels, users)
13. message_reactions (→ messages, users)
14. tasks (→ projects, users, meetings)
15. task_assignees (→ tasks, users)
16. custom_field_definitions (→ projects)
17. custom_field_values (→ tasks, custom_field_definitions)
18. schedules (→ projects)
19. meetings (→ groups)
20. meeting_participants (→ meetings, users)
21. meeting_transcripts (→ meetings)
22. meeting_action_items (→ meetings)
23. meeting_summaries (→ meetings)
24. ai_conversations (→ users, projects)
25. ai_messages (→ ai_conversations)
26. document_embeddings (→ pages) — pgvector
27. subscriptions (→ organizations)
28. payments (→ organizations)
29. user_settings (→ users)
```

### 완료 조건
- `psql`에서 `\dt`로 29개 테이블 확인
- `SELECT * FROM pg_extension WHERE extname = 'vector';` 성공

---

## Part 2. 인증 시스템 ✅ 구현 완료

> P0 — 모든 보호 API의 기반. 이것 없으면 다른 파트 개발 불가.
>
> **구현 완료**: 회원가입, JWT 로그인/갱신/로그아웃, Google/GitHub/Kakao OAuth, 비밀번호 재설정, 프로필 수정. `backend/src/auth/` 참조.

### 생성할 파일
```
backend/src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── dto/
│   ├── register.dto.ts         # email, password, name
│   ├── login.dto.ts            # email, password
│   ├── forgot-password.dto.ts  # email
│   ├── reset-password.dto.ts   # token, newPassword
│   └── update-profile.dto.ts   # name?, avatar?
├── entities/
│   └── user.entity.ts          # ERD users 테이블
├── strategies/
│   ├── jwt.strategy.ts         # Passport JWT 전략
│   └── jwt-refresh.strategy.ts # Refresh Token 전략
└── guards/
    └── jwt-auth.guard.ts       # @UseGuards(JwtAuthGuard)

backend/src/common/
├── decorators/
│   └── current-user.decorator.ts  # @CurrentUser() 파라미터 데코레이터
└── guards/
    └── roles.guard.ts             # @Roles('admin') 역할 체크
```

### API 엔드포인트
```
POST   /api/auth/register              → { user, accessToken, refreshToken }
POST   /api/auth/login                 → { user, accessToken, refreshToken }
POST   /api/auth/refresh               → { accessToken }
POST   /api/auth/logout                → 204
POST   /api/auth/forgot-password       → { message }
POST   /api/auth/reset-password        → { message }
GET    /api/auth/me                    → { user }  [인증 필요]
PUT    /api/auth/profile               → { user }  [인증 필요]
POST   /api/auth/profile/avatar        → { avatarUrl }  [인증 필요, multipart]
GET    /api/auth/oauth/:provider       → 302 redirect
GET    /api/auth/oauth/:provider/cb    → { user, accessToken, refreshToken }
```

### 구현 상세
```
Access Token:  JWT, 만료 15분, Authorization: Bearer 헤더
Refresh Token: JWT, 만료 7일, httpOnly 쿠키 (Secure, SameSite=Lax)
비밀번호:      bcrypt, salt rounds: 12
OAuth:         Google, GitHub, Kakao — Authorization Code Flow
               백엔드에서 토큰 교환 → users 테이블 upsert → JWT 발급

@CurrentUser() 데코레이터:
  req.user에서 { id, email, name, role } 추출

JwtAuthGuard:
  모든 보호 API에 @UseGuards(JwtAuthGuard) 적용
  401 반환 시 프론트 Axios interceptor가 refresh 시도

RolesGuard:
  @Roles('owner', 'admin') 데코레이터와 함께 사용
  그룹 내 역할 체크는 GroupMemberGuard로 별도 구현 (Part 3)
```

### 프론트 연동 포인트
```
프론트 Store: src/stores/useAuthStore.ts
현재 Mock:    MOCK_USERS, MOCK_PASSWORD='test1234'로 로그인 흉내
연동 후:      login() → POST /api/auth/login
             localStorage에 accessToken 저장
             Axios interceptor에서 자동 첨부
```

### 완료 조건
- Postman/curl로 register → login → /api/auth/me 정상 응답
- 잘못된 토큰으로 /api/auth/me 호출 시 401
- refresh 토큰으로 새 accessToken 발급 성공

---

## Part 3. 그룹/프로젝트/페이지

> P0 — 핵심 데이터 구조. 대부분의 기능이 이 구조 위에 동작.

### 생성할 파일
```
backend/src/groups/
├── groups.module.ts
├── groups.controller.ts
├── groups.service.ts
├── dto/
│   ├── create-group.dto.ts      # name, description, visibility('public'|'private'), isExternal?
│   ├── update-group.dto.ts
│   └── join-group.dto.ts        # code
├── entities/
│   ├── group.entity.ts          # ERD groups 테이블
│   ├── group-member.entity.ts   # ERD group_members 테이블
│   └── invite-code.entity.ts    # ERD invite_codes 테이블
└── guards/
    └── group-member.guard.ts    # 그룹 멤버인지 + 역할 체크

backend/src/projects/
├── projects.module.ts
├── projects.controller.ts
├── projects.service.ts
├── dto/
│   ├── create-project.dto.ts    # groupId, name, description, deadline?
│   └── update-project.dto.ts
├── entities/
│   ├── project.entity.ts        # ERD projects 테이블
│   └── project-member.entity.ts # ERD project_members 테이블

backend/src/pages/
├── pages.module.ts
├── pages.controller.ts
├── pages.service.ts
├── dto/
│   ├── create-page.dto.ts       # projectId, title, type('document'|'code'), language?
│   └── update-page.dto.ts
├── entities/
│   ├── page.entity.ts           # ERD pages 테이블
│   └── page-version.entity.ts   # ERD page_versions 테이블
```

### API 엔드포인트
```
POST   /api/groups                     그룹 생성 (초대 코드 자동 발급)
GET    /api/groups                     내 그룹 목록 (public 그룹은 별도 검색 API)
GET    /api/groups/:id                 그룹 상세
PUT    /api/groups/:id                 그룹 설정 변경  [owner/admin]
DELETE /api/groups/:id                 그룹 삭제  [owner]
POST   /api/groups/:id/regenerate-code 초대 코드 재발급  [owner/admin]
POST   /api/groups/join                초대 코드로 참여
GET    /api/groups/:id/members         멤버 목록
PUT    /api/groups/:id/members/:uid    멤버 역할 변경  [owner/admin]
DELETE /api/groups/:id/members/:uid    멤버 강퇴  [owner/admin]
GET    /api/groups/search?q=           public 그룹 검색

POST   /api/projects                   프로젝트 생성
GET    /api/groups/:id/projects        그룹 내 프로젝트 목록
GET    /api/projects/:id               프로젝트 상세
PUT    /api/projects/:id               프로젝트 수정
DELETE /api/projects/:id               프로젝트 삭제

POST   /api/pages                      페이지 생성
GET    /api/projects/:id/pages         페이지 목록
GET    /api/pages/:id                  페이지 상세 (content 포함)
PUT    /api/pages/:id                  페이지 내용 저장
PUT    /api/pages/:id/title            제목 변경
DELETE /api/pages/:id                  페이지 삭제
```

### 권한 로직 (GroupMemberGuard)
```typescript
// 접근 판단 순서:
// 1. 조직 Owner/Admin → 무조건 허용
// 2. group_members에 존재 → role에 따라 허용
// 3. public 그룹 → GET만 허용 (참여 유도)
// 4. private 그룹 → 거부
//
// 프로젝트 접근:
// 1~2와 동일 + project_members 테이블 추가 체크
// project_members.role = 'viewer' → 읽기만
// project_members.role = 'member' → 편집 가능
```

### 프론트 연동 포인트
```
프론트:     src/components/layout/SlackSidebar.tsx (채널 목록)
            src/pages/group/GroupPage.tsx (프로젝트/멤버)
            src/components/layout/SidebarProjectList.tsx (페이지 트리)
현재 Mock:  MOCK_CHANNELS, MOCK_PROJECTS, MOCK_PAGES, MOCK_ORG_MEMBERS
Store:      useGroupContextStore (activeOrgId, activeGroupId)
            useSidebarStore (activeProjectId)
```

### 완료 조건
- 그룹 생성 → 초대 코드 발급 → 다른 유저가 코드로 참여
- 프로젝트 CRUD → 페이지 CRUD
- public 그룹 검색 → 참여
- Owner가 멤버 역할 변경/강퇴

---

## Part 4. 대시보드

> P1 — Part 2, 3 완료 후

### API
```
GET /api/dashboard → {
  groups: Group[],              // 내 그룹 목록 (최근 활동순)
  recentPages: Page[],          // 최근 편집 페이지 (최대 7개)
  myTasks: Task[],              // 나에게 할당된 작업 (미완료)
  upcomingMeetings: Meeting[]   // 예정 회의 (24시간 이내)
}
```

### 프론트 연동 포인트
```
프론트: src/pages/dashboard/DashboardPage.tsx
Mock:   MOCK_GROUPS, MOCK_RECENT_PAGES, MOCK_MY_TASKS, MOCK_MEETINGS
```

---

## Part 5. 문서 에디터 — 실시간 협업

> P0 — 핵심 기능

### 아키텍처
```
[프론트 TipTap + Yjs] ←WebSocket→ [Hocuspocus 서버] ←→ [PostgreSQL pages.content]
                                                      ←→ [Redis pub/sub (스케일링)]
```

### 구현 사항
1. **Hocuspocus** 서버 설정 (Yjs CRDT 동기화, TipTap 공식 권장)
2. TipTap `Collaboration` + `CollaborationCursor` Extension 연결
3. 자동 저장: Hocuspocus `onStoreDocument` 훅 → pages.content 업데이트 (디바운싱)
4. 인증: Hocuspocus `onAuthenticate` 훅 → JWT 토큰 검증
5. 이미지/파일: GCS 업로드 → URL 반환
6. 버전 히스토리: `page_versions` 테이블, 저장 시 스냅샷
7. PDF 내보내기: puppeteer, DOCX: docx 라이브러리

### 프론트 연동 포인트
```
프론트: src/pages/editor/DocumentEditorPage.tsx
현재:   MOCK_DOC_CONTENT 고정 HTML로 렌더링
연동:   TipTap에 Collaboration Extension 추가, WebSocket URL 전달
```

---

## Part 6. 코드 에디터 + Docker 실행

> ⏸️ **후순위** — 킬러 피처 구현 후 진행

### 구현 사항
1. 언어별 Docker 이미지: python:3.11-slim, node:20-slim, openjdk:17-slim, gcc:latest
2. 보안: CPU 1코어, 메모리 256MB, 30초 타임아웃, 네트워크 차단, 즉시 삭제
3. `POST /api/code/execute` → { language, code } → { output, error, executionTime }
4. HTML/CSS/JS: 임시 정적 파일 → iframe URL 반환

### 프론트 연동 포인트
```
프론트: src/pages/editor/CodeEditorPage.tsx
현재:   MOCK_CODE_SAMPLES 고정 코드 + 빈 콘솔
```

---

## Part 7. 작업/일정 관리

> P0~P1

### 생성할 파일
```
backend/src/tasks/
├── tasks.module.ts
├── tasks.controller.ts
├── tasks.service.ts
├── dto/
│   ├── create-task.dto.ts       # projectId, title, description, priority, status,
│   │                            # assigneeId, assigneeIds[], startDate, dueDate
│   ├── update-task.dto.ts
│   └── task-filter.dto.ts       # status?, priority?, assigneeId?, dateFrom?, dateTo?, keyword?
├── entities/
│   ├── task.entity.ts           # ERD tasks 테이블
│   ├── task-assignee.entity.ts  # ERD task_assignees (다중 담당자)
│   ├── custom-field-definition.entity.ts
│   └── custom-field-value.entity.ts
```

### API
```
POST   /api/tasks                      작업 생성 (assigneeIds[] 포함)
GET    /api/projects/:id/tasks         프로젝트 작업 목록 (필터/정렬 쿼리)
GET    /api/tasks/me                   내 작업 (대시보드용)
GET    /api/tasks/:id                  작업 상세 (서브태스크, 커스텀필드, 담당자 포함)
PUT    /api/tasks/:id                  작업 수정
PUT    /api/tasks/:id/status           상태 변경 (칸반 드래그)
DELETE /api/tasks/:id                  작업 삭제

GET    /api/projects/:id/custom-fields      커스텀 필드 정의 목록
POST   /api/projects/:id/custom-fields      커스텀 필드 생성
PUT    /api/tasks/:id/custom-fields         작업의 커스텀 필드 값 저장
```

### 필터 쿼리 예시
```
GET /api/projects/p1/tasks?status=in-progress&priority=high&assignee=u1&dateFrom=2026-03-01&dateTo=2026-03-31&keyword=결제&sort=dueDate&order=asc
```

### 커스텀 필드 스키마
```sql
-- 프로젝트별 필드 정의
custom_field_definitions: { id, project_id, name, type, options JSONB }
-- type: 'text' | 'number' | 'select' | 'date' | 'person' | 'progress'
-- options (select 타입): [{ "label": "프론트엔드", "color": "bg-blue-100 text-blue-700" }]

-- 작업별 필드 값
custom_field_values: { id, task_id, field_id, value JSONB }
-- value: "텍스트" | 42 | "2026-03-15" | ["u1","u2"] | 75
```

### 프론트 연동 포인트
```
프론트: src/pages/tasks/TasksPage.tsx (4개 뷰 공유)
Store:  useCustomFieldStore (fields, values)
Mock:   MOCK_TASKS, MOCK_CUSTOM_FIELD_DEFINITIONS, MOCK_CUSTOM_FIELD_VALUES
```

---

## Part 8. 메신저 — 채팅 + 스레드

> P0

### 생성할 파일
```
backend/src/channels/
├── channels.module.ts
├── channels.controller.ts
├── channels.service.ts
├── entities/
│   ├── channel.entity.ts
│   └── channel-member.entity.ts

backend/src/messages/
├── messages.module.ts
├── messages.controller.ts
├── messages.service.ts
├── messages.gateway.ts          # @WebSocketGateway — Socket.IO
├── dto/
│   ├── create-message.dto.ts    # channelId, content, parentId?, fileUrl?
│   └── message-reaction.dto.ts  # emoji
├── entities/
│   ├── message.entity.ts
│   └── message-reaction.entity.ts
```

### REST API
```
GET    /api/groups/:id/channels        채널 목록 (group/project/dm 타입 구분)
POST   /api/channels                   채널 생성 or DM 시작
GET    /api/channels/:id/messages      메시지 목록 (cursor 페이지네이션)
POST   /api/channels/:id/messages      메시지 전송
PUT    /api/messages/:id               메시지 수정
DELETE /api/messages/:id               메시지 삭제
GET    /api/messages/:id/thread        스레드 답글 목록
POST   /api/messages/:id/reactions     이모지 반응 추가
DELETE /api/messages/:id/reactions/:e   반응 취소
PUT    /api/channels/:id/read          읽음 처리
```

### Socket.IO 이벤트
```typescript
// 클라이언트 → 서버
'chat:join'      { channelId }              // 채널 입장
'chat:leave'     { channelId }              // 채널 퇴장
'chat:message'   { channelId, content, parentId? }  // 메시지 전송
'chat:typing'    { channelId }              // 입력 중
'chat:reaction'  { messageId, emoji }       // 이모지 반응

// 서버 → 클라이언트
'chat:message'   { message }                // 새 메시지 브로드캐스트
'chat:typing'    { channelId, userId, userName }  // 입력 중 브로드캐스트
'chat:read'      { channelId, userId }      // 읽음 브로드캐스트
'chat:reaction'  { messageId, emoji, userId } // 반응 브로드캐스트
```

### 커서 페이지네이션
```
GET /api/channels/ch1/messages?cursor=2026-03-18T14:30:00Z&limit=30
→ { messages: [...], nextCursor: "2026-03-18T14:00:00Z", hasMore: true }
```

### @AI 멘션 처리
```
메시지 content에 "@AI" 포함 감지 시:
1. 메시지 정상 저장
2. AI 서비스 호출 (Part 11)
3. AI 응답을 system 메시지로 같은 채널에 삽입
4. Socket.IO로 브로드캐스트
```

### 프론트 연동 포인트
```
프론트: src/pages/channel/ChannelView.tsx
        src/components/thread/ThreadPanel.tsx
Store:  useChatStore, useThreadStore
Mock:   MOCK_MESSAGES, MOCK_THREAD_REPLIES, MOCK_CHAT_CHANNELS, MOCK_DMS
```

---

## Part 9. 음성 채팅 + 화면 공유

> P0

### 구현 사항
```
1. LiveKit 서버: Docker `livekit/livekit-server`
2. POST /api/livekit/token → { token }
   - roomName: `voice-{groupId}`
   - participantName: user.name
   - 권한: canPublish, canSubscribe, canPublishData
3. TURN 서버 설정 (방화벽 환경 대응)
```

### 프론트 연동 포인트
```
프론트: src/components/voice-chat/VoiceChatPanel.tsx
        src/components/screen-share/ScreenSharePanel.tsx
Store:  useVoiceChatStore, useScreenShareStore
현재:   mock 상태 (connected/disconnected 토글만)
연동:   LiveKit @livekit/components-react + livekit-client SDK
```

---

## Part 10. AI 회의 어시스턴트 — 킬러 피처

> P0 — **프로젝트 핵심 차별화 기능. Part 9(LiveKit) + Part 11(RAG) 필요.**

### 생성할 파일
```
backend/src/ai/meetings/          # 회의 AI 전용 하위 모듈
├── meeting-ai.service.ts         # STT 파이프라인 + 회의록 생성
├── stt.service.ts                # STT API 래퍼 (Google STT or Whisper)
├── meeting-summary.service.ts    # Gemini → 회의록 + 액션아이템 추출

backend/src/ai/                   # 기존 ai/ 안에 meetings/ 포함
├── entities/
│   ├── meeting.entity.ts
│   ├── meeting-participant.entity.ts
│   ├── meeting-transcript.entity.ts
│   ├── meeting-summary.entity.ts
│   └── meeting-action-item.entity.ts
```

### API
```
POST   /api/meetings                        회의 세션 생성
PUT    /api/meetings/:id/end                회의 종료 → 회의록 생성 트리거
GET    /api/meetings/:id                    회의 상세
GET    /api/meetings/:id/transcript         STT 전체 텍스트
GET    /api/meetings/:id/summary            AI 회의록
GET    /api/meetings/:id/action-items       액션 아이템 목록
PUT    /api/meetings/:id/action-items/:aid  액션 아이템 편집
POST   /api/meetings/:id/action-items/confirm  확인된 항목 → tasks 일괄 등록
GET    /api/projects/:id/meetings           프로젝트 회의 이력
```

### 3 Phase 구현

**Phase 1 — STT 파이프라인**:
```
LiveKit 음성 스트림
  → STT API (Google Cloud Speech-to-Text 또는 Whisper)
  → 화자 분리 (Speaker Diarization)
  → meeting_transcripts 테이블 저장
  → Socket.IO 'meeting:transcript' 실시간 전송
```

**Phase 2 — 회의록 + 작업 자동 등록**:
```
회의 종료 시:
  1. meeting_transcripts 전체 조합
  2. RAG 컨텍스트 (프로젝트 문서/이전 회의록) 추출
  3. Gemini API 호출:
     프롬프트: "다음 회의 내용을 요약하고 액션아이템을 추출하세요"
     입력: 트랜스크립트 + RAG 컨텍스트
     출력: { summary, actionItems: [{ title, assignee, dueDate }] }
  4. meeting_summaries + meeting_action_items 저장
  5. 프론트 액션아이템 리뷰 스크린:
     → 사용자가 편집/확인
     → POST /confirm → confirmed=true인 항목만 tasks 테이블에 일괄 등록
     → tasks.meeting_id 설정 → "회의에서 생성" 배지
```

**Phase 3 — 실시간 제안**:
```
실시간 STT 텍스트 수신 시:
  → 키워드 추출 → RAG 벡터 검색
  → 관련 문서/이전 회의록 조회
  → Socket.IO 'meeting:suggestion' 전송
```

### 프론트 연동 포인트
```
프론트: src/pages/meeting/MeetingRoomPage.tsx (실시간 트랜스크립트)
        src/pages/meeting/MeetingSummaryPage.tsx (회의록 + 액션아이템 리뷰)
Store:  useMeetingStore
Mock:   MOCK_MEETINGS (transcript, actionItems 포함)
```

---

## Part 11. AI 어시스턴트 — RAG 파이프라인

> P0

### 생성할 파일
```
backend/src/ai/
├── ai.module.ts
├── ai.controller.ts
├── ai.service.ts                # Gemini API 호출, SSE 스트리밍
├── rag.service.ts               # 벡터 임베딩, 검색, 프롬프트 조합
├── embedding.service.ts         # 문서 청킹 → 임베딩 → pgvector 저장
├── dto/
│   ├── chat.dto.ts              # content, conversationId?, referencedFiles?[]
│   └── search.dto.ts            # query, projectId
├── entities/
│   ├── ai-conversation.entity.ts
│   ├── ai-message.entity.ts
│   └── document-embedding.entity.ts  # pgvector 768-dim
```

### API
```
POST   /api/ai/chat                    AI 질문 (SSE 스트리밍 응답)
POST   /api/ai/inline-query            Cmd+K, @AI 멘션용 빠른 질문
GET    /api/ai/conversations           대화 목록
POST   /api/ai/conversations           새 대화
GET    /api/ai/conversations/:id       대화 메시지
DELETE /api/ai/conversations/:id       대화 삭제
POST   /api/ai/projects/:id/index      프로젝트 인덱싱 (전체 벡터 임베딩)
GET    /api/ai/projects/:id/files      인덱싱된 파일 목록
POST   /api/ai/projects/:id/search     벡터 유사도 검색
GET    /api/ai/usage                   사용량 조회
```

### RAG 파이프라인 상세
```
1. 인덱싱 (문서/코드 저장 시):
   페이지 content → 청킹 (500자 단위, 50자 오버랩)
   → Gemini Embedding API → 768차원 벡터
   → document_embeddings 테이블 (pgvector)

2. 검색 (질문 시):
   사용자 쿼리 → Embedding API → 쿼리 벡터
   → pgvector 코사인 유사도 검색 (Top-5)
   → 관련 문서 청크 추출

3. 프롬프트 조합:
   System Prompt
   + RAG Context (검색된 문서 청크)
   + @파일 전체 내용 (명시적 참조 시)
   + User Query

4. 응답:
   Gemini API → SSE 스트리밍 → 프론트에 실시간 전달
```

### SSE 스트리밍 구현
```typescript
// Controller
@Post('chat')
@Sse()
async chat(@Body() dto: ChatDto, @CurrentUser() user: User) {
  // Server-Sent Events로 실시간 텍스트 전송
  return this.aiService.streamChat(dto, user)
}
```

### 사용량 제한
```
무료: 10회/일, 300회/월
Pro:  100회/일, 3000회/월
Team: 무제한
조직 Owner/Admin: 무제한 (개발/테스트용)
```

### 프론트 연동 포인트
```
프론트: src/components/ai/AISidePanel.tsx (채팅, 제안 칩)
        src/components/common/SearchModal.tsx (Cmd+K AI 감지)
        src/pages/channel/ChannelView.tsx (@AI 멘션)
Store:  useAIStore (messages, conversations, projects, usage)
Mock:   MOCK_RAG_RESPONSES (useAIStore 내부)
```

---

## Part 12. 구독 결제

> P1 — Part 2 이후 독립 가능

### 플랜
| 플랜 | 월간 | AI 일일 | 프로젝트 | 멤버 |
|------|------|---------|----------|------|
| 무료 | 0원 | 10회 | 3개 | 5명 |
| Pro | 12,000원 | 100회 | 무제한 | 30명 |
| Team | 29,000원 | 무제한 | 무제한 | 무제한 |

### API
```
GET    /api/subscriptions/plans        플랜 정보
GET    /api/subscriptions/me           내 구독
POST   /api/subscriptions/checkout     결제 시작
POST   /api/subscriptions/webhook      PG사 웹훅
PUT    /api/subscriptions/cancel       구독 취소
GET    /api/payments                   결제 내역
```

### 프론트: `src/pages/billing/PricingPage.tsx`, `BillingHistoryPage.tsx`

---

## Part 13. 설정/프로필 ✅ 구현 완료

> P1~P2 — Part 2 이후 독립 가능
>
> **구현 완료**: 테마(light/dark/system), 알림 설정, 비밀번호 변경. `backend/src/settings/` 참조.

### API
```
GET    /api/settings                   사용자 설정
PUT    /api/settings/theme             테마 (light/dark/system)
PUT    /api/settings/notifications     알림 설정
PUT    /api/settings/password          비밀번호 변경
PUT    /api/settings/social/:provider  소셜 연동/해제
DELETE /api/settings/account           계정 탈퇴
```

### 프론트: `src/pages/settings/SettingsPage.tsx`, `useThemeStore`

---

## app.module.ts 최종 구조

모든 파트 완료 시 `app.module.ts`에 등록할 모듈:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ ... }),
    AuthModule,          // Part 2
    GroupsModule,        // Part 3
    ProjectsModule,      // Part 3
    PagesModule,         // Part 3
    TasksModule,         // Part 7
    SchedulesModule,     // Part 7
    ChannelsModule,      // Part 8
    MessagesModule,      // Part 8
    VoiceChatModule,     // Part 9
    ScreenShareModule,   // Part 9
    AiModule,            // Part 10 + 11
    SubscriptionsModule, // Part 12
    SettingsModule,      // Part 13
  ],
})
export class AppModule {}
```

---

## 프론트엔드 API 연동 패턴

### 1단계: Axios 설정 파일 생성

```typescript
// src/lib/api.ts
import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 10000 })

// Request: Access Token 자동 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response: 401 시 refresh → 실패 시 로그아웃
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const { data } = await axios.post('/api/auth/refresh')
        localStorage.setItem('accessToken', data.accessToken)
        error.config.headers.Authorization = `Bearer ${data.accessToken}`
        return api(error.config) // 원래 요청 재시도
      } catch {
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
```

### 2단계: Store 수정 패턴

```typescript
// 변경 전 (Mock)
import { MOCK_TASKS } from '@/constants'
tasks: MOCK_TASKS,

// 변경 후 (API)
tasks: [],
fetchTasks: async (projectId: string) => {
  const { data } = await api.get(`/projects/${projectId}/tasks`)
  set({ tasks: data })
},
createTask: async (task: CreateTaskDto) => {
  const { data } = await api.post('/tasks', task)
  set((s) => ({ tasks: [...s.tasks, data] }))
},
```

### 3단계: constants/index.ts 정리
```
삭제: MOCK_* 데이터 상수들
유지: 인터페이스/타입 (→ src/types/로 이동, Mock 접두사 제거)
유지: EMOJI_LIST, MEETING_NOTES_TEMPLATE 등 로컬 상수
```

---

## 참고 문서

| 문서 | 역할 |
|------|------|
| [PROJECT.md](./PROJECT.md) | 프로젝트 개요, 경쟁 포지셔닝, **가시성 & 권한 모델** |
| [TECH.md](./TECH.md) | 기술 사양, **API 엔드포인트 전체 목록 (§6)**, Socket.IO 이벤트 (§7) |
| [ERD.md](./ERD.md) | **DB 스키마 SQL** (29개 테이블), 관계도 |
| [UIplan.md](./UIplan.md) | UI 설계/리팩토링 플랜 |
| [checklist.md](./checklist.md) | 기능 체크리스트 |
| `README.md` (루트) | 설치, 실행, 프로젝트 구조, 진행 현황, 개발 일지 |
| `UI.md` (루트) | 프론트 UI 기능 목록, **Mock 데이터 전환 가이드** |

---

*마지막 업데이트: 2026-05-07*
