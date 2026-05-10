# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SyncFlow는 AI가 회의에 참여하는 스마트 협업 플랫폼이다. 킬러 피처는 AI 회의 어시스턴트(STT + RAG 기반 회의록 자동 생성 + 작업 자동 등록)이며, 실시간 문서 동시 편집, 음성 회의, 작업 관리, RAG AI, 코드 실행을 하나의 플랫폼에서 제공한다. 경쟁군은 Jira+Confluence+Slack+Zoom 스택이며, 타겟은 기업/조직 팀 협업이다. 프론트엔드 UI는 완성 상태이며 백엔드 API 구현이 진행 중이다.

## 개발 현황

- **프론트엔드**: 완료. Mock 데이터(`src/constants/index.ts`)로 동작. API 연동 시 Store만 수정.
- **백엔드**: AppModule 등록 13개 모듈, API ~70개 매핑, Socket.IO Gateway 2개(Messages·Meetings), Hocuspocus(`ws://localhost:1234`) 구동. 2026-05-11 통합 부팅 검증 완료.
  - **구현 완성** (13개 모듈): `auth`, `settings`, `groups`, `projects`, `pages`, `tasks`, `channels`, `messages`, `document`, `meetings`, `dashboard`, `upload`, `livekit`
    <!-- 부분 구현 메모 -->
    <!-- - livekit: 토큰 발급 API만 구현. 미디어 전송·화면공유·참가자 관리는 LiveKit SFU가 처리. 회의 세션 DB 기록·화면공유 권한 분리·녹화는 후순위 -->
    <!-- - dashboard: DASH-01~03 완료. DASH-04(Task 관련)는 연동 보류 -->
    <!-- - meetings: MTG 12건 중 9건 완료(75%). MTG-08, MTG-12는 RAG 의존 -->
    <!-- - settings: 테마/알림/비밀번호/소셜연동/계정삭제 중 SET-04, SET-05 일부 미완 -->
    <!-- - tasks: 기본 CRUD 구현. 칸반/간트/캘린더 메타·커스텀 필드·일정 연동은 남궁훈 파트로 후속 -->
  - **미착수** (4개 폴더, 빈 상태): `ai`(RAG), `schedules`, `subscriptions`, `voice-chat`/`screen-share`(LiveKit으로 흡수돼 별도 모듈 불필요)
- **백엔드 개발 가이드**: `.docs/Do.md` — 파트별 생성할 파일, API 스펙, 완료 조건이 상세히 명시되어 있음

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
- **NestJS 11 + TypeScript** — AppModule에 등록된 13개 모듈: `auth`, `settings`, `groups`, `projects`, `pages`, `tasks`, `channels`, `messages`, `document`, `meetings`, `dashboard`, `upload`, `livekit`
- **현재 구현 완성:**
  - `auth` — JWT + Google/GitHub/Kakao OAuth, 회원가입, 토큰 갱신, 비밀번호 재설정, 프로필
  - `settings` — 테마, 알림, 비밀번호 변경, 소셜 연동, 계정 삭제
  - `groups` / `projects` / `pages` — CRUD + 멤버 관리 + 초대 코드 + 권한 가드
  - `channels` / `messages` — 채팅 권한, 스레드, 파일 업로드, Socket.IO Gateway(`chat:join/leave/message/typing/reaction`, `@AI` 멘션 자동 응답)
  - `document` — TipTap 기반 + Hocuspocus + Yjs 라이브 커서 + PresenceAvatars + PDF/DOCX 내보내기 + 버전 히스토리
  - `meetings` — STT 파이프라인(Google STT + 화자 분리), 실시간 자막, AI 회의록 자동 생성, 액션아이템 추출/Task 등록 (킬러 피처)
  - `tasks` — Task CRUD (list/get/create/update/delete)
  - `dashboard` — 내 그룹, 최근 페이지, 초대 코드 입력
  - `upload` — 파일 업로드
  - `livekit` — `POST /api/livekit/token` 음성/화면공유용 LiveKit JWT 발급 (TTL 4h, roomJoin/canPublish/canSubscribe/canPublishData 권한)
- **미착수 (빈 폴더):** `ai`(RAG), `schedules`, `subscriptions`, `voice-chat`/`screen-share`(역할은 `livekit` 모듈이 대체)
- **DB:** TypeORM + PostgreSQL 16 (pgvector 768-dim) · Prisma 마이그레이션 22개 모델 적용 (회의 AI 5개 schema.prisma 추가 필요)
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
- **Mock 데이터:** 현재 프론트엔드는 `src/constants/index.ts`의 mock 데이터로 동작. 백엔드 API 구현 시 Store 내부만 수정하여 연동 (컴포넌트 코드 변경 없음). 상세는 `UI.md` "Mock 데이터 & 백엔드 전환 가이드" 섹션 참조.
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
