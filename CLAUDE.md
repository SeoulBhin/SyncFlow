# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SyncFlow는 AI가 회의에 참여하는 스마트 협업 플랫폼이다. 킬러 피처는 AI 회의 어시스턴트(STT + RAG 기반 회의록 자동 생성 + 작업 자동 등록)이며, 실시간 문서 동시 편집, 음성 회의, 작업 관리, RAG AI, 코드 실행을 하나의 플랫폼에서 제공한다. 경쟁군은 Jira+Confluence+Slack+Zoom 스택이며, 타겟은 기업/조직 팀 협업이다. 프론트엔드 UI는 완성 상태이며 백엔드 API 구현이 진행 중이다.

## 개발 현황 (2026-05-11 기준)

- **프론트엔드**: Slack 패턴 정렬 진행 중. mock 비움 + 실제 API 연동 단계.
- **백엔드**: AppModule 13개 모듈, API ~90개, Socket.IO Gateway 2개, Hocuspocus(`ws://localhost:1234`).
  - **완료**: `auth`(테스터 자동 시드 포함), `settings`, `groups`(visibility/초대코드/공개검색/탈퇴/삭제), `projects`(자동 채팅방 생성), `pages`, `tasks`(컬럼 정렬 완료), `channels`(DM/project/일반 가시성 분리, 멤버 관리, 토픽 수정), `messages`, `document`, `meetings`(visibility/참여자/시작·종료·삭제 권한), `dashboard`(DM 제외), `upload`, `livekit`
  - **미착수**: `ai`(RAG), `schedules`, `subscriptions`
- **마이그레이션 적용**: `provider_access_token`, `add_group_visibility`, `align_channels_messages_with_entities`, `add_meetings_tables`, `align_tasks_with_entity`, `add_project_members`, `add_meeting_visibility_participants`
- **테스터 계정**: `tester1@test.com` / `tester2@test.com` / `tester3@test.com` (비번 모두 `test1234`). dev 부팅 시 자동 시드 (production 제외).
- **백엔드 개발 가이드**: `.docs/Do.md`

## 백엔드 개발 시 반드시 읽을 문서

| 문서 | 역할 |
|------|------|
| `.docs/Do.md` | **개발 가이드 (파트별 상세 구현 명세, 생성할 파일, API, 완료 조건)** |
| `.docs/TECH.md` §6 | API 엔드포인트 전체 목록 (~80개) |
| `.docs/ERD.md` | DB 스키마 SQL (29개 테이블, CREATE TABLE 문) |
| `.docs/PROJECT.md` | 프로젝트 개요, **가시성 & 권한 모델** |
| `UI.md` | 프론트 UI 기능 목록, **Mock 데이터 → API 전환 가이드** |

## Commands

### Frontend (Root)
```bash
npm run dev           # Vite dev server (localhost:5174)
npm run build         # TypeScript check + Vite production build
npm run lint          # ESLint
npm run preview       # Production build preview
```

### Backend (backend/)
```bash
cd backend
npm run start:dev     # NestJS watch mode (localhost:3000)
npm run build         # NestJS build
npm run lint          # ESLint with auto-fix
npm run format        # Prettier format
npm run test          # Jest unit tests
npm run test:watch    # Jest watch mode
npm run test:cov      # Jest coverage
npm run test:e2e      # E2E tests
```

### Both together
```bash
npm run dev:all       # Concurrently runs frontend + backend
```

### Infrastructure
```bash
npm run docker:up     # PostgreSQL (pgvector 16) + Redis (7-alpine)
npm run docker:down   # Stop containers
```

## Architecture

**Monorepo 구조:** 루트에 Vite+React 프론트엔드, `backend/`에 NestJS 백엔드가 분리되어 있다.

### Frontend (src/)
- **React 19 + TypeScript 5.9 + Vite 7.3**
- **상태 관리:** Zustand 5 — 13개 스토어 (`src/stores/`)
- **라우팅:** React Router v7 (`src/app/router.tsx`)
- **스타일링:** TailwindCSS v4
- **에디터:** TipTap (문서, Yjs 기반 실시간 협업), Monaco (코드, 7개 언어)
- **실시간:** Socket.IO Client, LiveKit Client SDK (음성/WebRTC)
- **Path alias:** `@/` → `src/`
- **사이드바 주의:** `AppLayout`이 실제로 import하는 사이드바는 **`SlackSidebar`**(`src/components/layout/SlackSidebar.tsx`)다. 동일 디렉토리의 `Sidebar.tsx`는 어디서도 import되지 않는 dead component이므로 사이드바 관련 변경은 항상 `SlackSidebar`에 적용해야 한다.

### Backend (backend/src/)
- **NestJS 11 + TypeScript**
- **모듈별 완료 상태** (간략):
  - `auth` — OAuth(Google/GitHub/Kakao) + 회원가입/로그인 + JWT + 토큰 갱신. **dev 부팅 시 tester1~3 자동 시드** (`AuthService.seedTestUsersIfDev`)
  - `groups` — CRUD + visibility(public/private) + 8자리 초대코드 + `POST /:id/join` + `POST /:id/join-public` + `POST /:id/leave` + 멤버 role(owner/admin/member/guest)
  - `projects` — CRUD + project_members + **생성 시 type='project' 채널 자동 생성**
  - `channels` — type별(channel/dm/project) 흐름. DM은 본인 멤버만 노출, 같은 두 사람 중복 생성 차단, leave/delete. 채널 멤버 추가/제거/목록, 토픽 수정
  - `messages` — CRUD + 스레드 + 리액션 + Socket.IO Gateway
  - `meetings` — 회의 방 생성(즉시 시작 X) + start/end/delete 권한 + visibility + meeting_participants. STT/요약/액션아이템→Task
  - `dashboard` — 내 채널(DM 제외) + 최근 페이지 + 회의
  - `pages`, `tasks`, `document`, `upload`, `livekit`, `settings` — CRUD/기본 흐름 OK
- **미착수**: `ai`(RAG), `schedules`, `subscriptions`
- **DB**: PostgreSQL 16(pgvector 768-dim) + Redis. Prisma 마이그레이션 7건 적용 (groups/channels/messages/tasks/meetings/project_members 정합성 fix 포함)
- **캐싱:** Redis (ioredis)
- **인증:** JWT + Passport (Google/GitHub/Kakao OAuth)
- **코드 실행:** Docker 샌드박스 (Dockerode) — 후순위
- **AI:** Google Gemini API + RAG 파이프라인 (pgvector 768-dim) — RAG 미착수
- **음성/화면:** LiveKit Server SDK + Server (`livekit.yaml`)
- **실시간 협업:** Hocuspocus 서버(`ws://localhost:1234`, DocumentService 자동 시작)

### Vite Proxy
프론트엔드 dev 서버가 `/api` → `localhost:3000`, `/socket.io` → `localhost:3000`으로 프록시한다.

## Code Style

- **Prettier:** 세미콜론 없음, 싱글 쿼트, 2-space 탭, trailing comma, 100자 폭 (`.prettierrc`)
- **ESLint:** Flat config, TypeScript + React Hooks + React Refresh 플러그인
- **언어:** 항상 한국어로 응답. 코드 식별자와 기술 용어는 원문 유지

## Key Patterns

- **Group Context System:** Discord 서버 전환 방식 — `useGroupContextStore`로 현재 그룹 컨텍스트 관리, 하단 툴바에서 전환
- **컴포넌트 구조:** `components/common/`에 재사용 UI, 기능별 폴더에 도메인 컴포넌트
- **Mock 데이터:** `src/constants/index.ts`의 모든 `MOCK_*`는 빈 배열/객체로 비워둠 (실제 API 연동 모드). 데모 모드 복원이 필요하면 git history 참조. type 정의는 보존.
- **Slack 정렬 로드맵:** UI.md 끝 "Slack 정렬 로드맵" 섹션 참조 — Phase 0~3 + 도메인별 매트릭스. 새 작업은 항상 그 표에서 다음 카드를 뽑는다.
- **멀티뷰 패턴:** 작업 관리에서 칸반/캘린더/간트/리스트 4개 뷰가 동일 데이터 모델 공유
- **권한 모델:** 조직 역할(Owner/Admin/Member/Guest) + 그룹 가시성(public/private) + 프로젝트별 Viewer 초대. 상세는 `.docs/PROJECT.md` "가시성 & 권한 모델" 참조.

## Backend Module Pattern

각 NestJS 모듈의 표준 파일 구조:
```
backend/src/{모듈명}/
├── {모듈명}.module.ts          # @Module
├── {모듈명}.controller.ts      # API 엔드포인트
├── {모듈명}.service.ts         # 비즈니스 로직
├── dto/                        # class-validator DTO
└── entities/                   # TypeORM Entity (ERD.md와 1:1 매핑)
```

Entity는 `.docs/ERD.md`의 CREATE TABLE과 반드시 일치시킨다. DTO에는 `class-validator` 데코레이터 필수.

## Documentation

| 문서 | 역할 | 대상 |
|------|------|------|
| `.docs/Do.md` | **백엔드 구현 가이드** — 파트별 상세 스펙, 생성 파일, 완료 조건 | 백엔드 개발자 필수 |
| `.docs/TECH.md` | 기술 사양 — API 엔드포인트(§6), Socket.IO 이벤트(§7), 보안(§8) | 백엔드 개발자 필수 |
| `.docs/ERD.md` | DB 스키마 SQL — 29개 테이블 CREATE TABLE, 관계도 | 백엔드 개발자 필수 |
| `.docs/PROJECT.md` | 프로젝트 개요, 경쟁 포지셔닝, **가시성 & 권한 모델** | 전체 |
| `.docs/UIplan.md` | UI 설계/리팩토링 플랜 | UI 작업 시 |
| `.docs/checklist.md` | 기능 체크리스트 (UI + 백엔드) | 전체 |
| `UI.md` | 프론트 UI 기능 전체 목록, **Mock → API 전환 가이드** | 프론트-백엔드 연동 시 |
| `README.md` | 설치, 실행, 프로젝트 구조, 개발 일지 | 전체 |

## Environment Variables

백엔드는 `backend/.env`가 필요하다. `backend/.env.example` 참조:
- DB/Redis 연결, JWT 시크릿, OAuth 클라이언트 키, Gemini API 키, GCS 버킷, LiveKit 설정
