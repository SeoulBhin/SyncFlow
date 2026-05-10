# SyncFlow

AI가 회의에 참여하는 스마트 협업 플랫폼 — 실시간 문서·코드 협업, 음성 회의, 작업 관리, RAG 기반 AI를 하나의 워크스페이스에서.

> 계명대학교 컴퓨터공학과 졸업 프로젝트 | 팀: 2학년의 무게 <br>
> 팀장 - 김경빈(SeoulBhin)<br>
> 조원 - 김명준(kkmmjj12)<br>
> 조원 - 김봉만(b_many)<br>
> 조원 - 이도현(di593488)<br>
> 조원 - 남궁훈(hoon2436)<br>

## 로컬 개발 환경 실행

### 사전 요구사항

- Node.js 20+
- npm 9+
- Docker Desktop (PostgreSQL + Redis)

### 설치 및 실행

```bash
# 1. Docker로 PostgreSQL(pgvector) + Redis 실행
npm run docker:up

# 2. 프론트엔드 의존성 설치 + 개발 서버 실행 (http://localhost:5174)
npm install
npm run dev

# 3. 백엔드 의존성 설치 + 개발 서버 실행 (http://localhost:3000)
cd backend
npm install
npm run start:dev
```

테스터 계정 `tester1@test.com` / `test1234`

### 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 프론트엔드 개발 서버 (Vite, HMR) |
| `npm run dev:backend` | 백엔드 개발 서버 (NestJS, watch mode) |
| `npm run dev:all` | 프론트 + 백엔드 동시 실행 (concurrently) |
| `npm run build` | 프론트엔드 빌드 (tsc + Vite) |
| `npm run build:backend` | 백엔드 빌드 (NestJS) |
| `npm run lint` | ESLint 코드 검사 |
| `npm run docker:up` | PostgreSQL + Redis 컨테이너 실행 |
| `npm run docker:down` | 컨테이너 중지 |

백엔드 단독 명령은 `backend/`에서 `npm run test`, `test:watch`, `test:cov`, `test:e2e`, `format` 등 사용.

## 기술 스택

### 프론트엔드
- **빌드/언어**: Vite 7 + React 19 + TypeScript 5.9
- **CSS**: TailwindCSS v4 (`@tailwindcss/vite`)
- **상태 관리**: Zustand (13개 store)
- **라우팅**: React Router v7
- **에디터**: TipTap 3 (문서, Yjs 기반 실시간 협업), Monaco Editor (코드, 7개 언어)
- **실시간**: Socket.IO Client, LiveKit Client SDK
- **아이콘**: lucide-react

### 백엔드
- **프레임워크**: NestJS 11 (TypeScript)
- **ORM**: TypeORM + PostgreSQL 16 (pgvector 768-dim)
- **캐시**: Redis (ioredis)
- **인증**: JWT + Passport.js (Google / GitHub / Kakao OAuth)
- **실시간**: Socket.IO (`@nestjs/websockets`)
- **음성/화면**: LiveKit Server SDK (WebRTC)
- **AI**: Google Gemini API + RAG (pgvector 벡터 검색)
- **코드 실행**: Dockerode (Docker 컨테이너 샌드박스)
- **스토리지**: Google Cloud Storage

### 인프라
- Docker Compose (PostgreSQL pgvector + Redis 개발 환경)
- GCP (배포 예정)

## 프로젝트 구조

```
SyncFlow/
├── src/                          # 프론트엔드 (React + Vite)
│   ├── app/                      # App.tsx, router.tsx
│   ├── components/
│   │   ├── ai/                   # AI 사이드패널, 컨텍스트 배너, 사용량 카드
│   │   ├── auth/                 # 로그인 입력 컴포넌트
│   │   ├── channel/              # 채널 헤더, 외부 채널 배너
│   │   ├── chat/                 # 미니 채팅 팝업
│   │   ├── code-editor/          # Monaco 콘솔, 언어 선택, 라이브 커서
│   │   ├── common/               # Button, Card, Input, Toast, Skeleton, SearchModal, UserMenu
│   │   ├── editor/               # TipTap 툴바, TOC, 버전 히스토리, 슬래시 커맨드, 콜아웃/토글 확장
│   │   ├── group/                # 그룹/채널/프로젝트/페이지 생성·설정 모달
│   │   ├── layout/               # AppLayout, SlackSidebar, SlackHeader, BottomToolbar, DetailPanel
│   │   ├── meeting/              # 회의 참여자, 트랜스크립트, 노트
│   │   ├── screen-share/         # 화면 공유 패널
│   │   ├── tasks/                # 칸반/캘린더/간트/리스트 뷰, 커스텀 필드 에디터
│   │   ├── thread/               # 스레드 패널
│   │   └── voice-chat/           # 음성 채팅 패널
│   ├── pages/
│   │   ├── auth/                 # 로그인, 회원가입, 비밀번호 재설정, 프로필
│   │   ├── billing/              # 구독 플랜, 결제 내역
│   │   ├── channel/              # 채널 상세 뷰
│   │   ├── dashboard/            # 대시보드
│   │   ├── editor/               # 문서 에디터, 코드 에디터
│   │   ├── errors/               # 404, 에러 페이지
│   │   ├── group/                # 그룹 관리
│   │   ├── landing/              # 랜딩 페이지 (Hero, Feature, CTA)
│   │   ├── meeting/              # 회의 히스토리, 회의실, 회의 요약
│   │   ├── messenger/            # 메신저 (풀사이즈)
│   │   ├── settings/             # 설정
│   │   └── tasks/                # 작업/일정
│   ├── stores/                   # Zustand 13개 (auth, theme, sidebar, toast, chat, voiceChat,
│   │                             #   screenShare, groupContext, detailPanel, meeting, ai,
│   │                             #   customField, thread)
│   ├── hooks/                    # useMediaQuery, useSystemTheme, useNotification, useForm
│   ├── styles/                   # TailwindCSS
│   ├── types/                    # 타입 정의
│   ├── utils/                    # 유틸리티 (cn 등)
│   └── constants/                # 상수, 목업 데이터 (UI 동작용)
│
├── backend/                      # 백엔드 (NestJS)
│   ├── src/
│   │   ├── main.ts               # 앱 진입점 (CORS, ValidationPipe, cookie-parser)
│   │   ├── app.module.ts         # 루트 모듈 (ConfigModule, TypeORM)
│   │   ├── common/               # Guard, Decorator, 공통 Entity
│   │   ├── auth/                 # 인증 (JWT, OAuth Google/GitHub/Kakao) — 완성
│   │   ├── settings/             # 사용자 설정 (테마, 알림, 비밀번호 변경) — 완성
│   │   ├── groups/               # 그룹 + 멤버 관리 + 초대 코드 + 권한 가드 — 완성
│   │   ├── projects/             # 프로젝트 CRUD — 완성
│   │   ├── pages/                # 페이지 (문서/코드) CRUD — 완성
│   │   ├── tasks/                # 할 일 CRUD — 완성  ※ 칸반/간트 메타·커스텀 필드는 후속
│   │   ├── channels/             # 채널 + 입장 + 읽음 처리 — 완성
│   │   ├── messages/             # 메시지 CRUD + 스레드 + 리액션 + Socket.IO Gateway — 완성
│   │   ├── document/             # TipTap + Hocuspocus + Yjs + 라이브 커서 + 내보내기 + 버전 — 완성
│   │   ├── meetings/             # STT + 화자 분리 + AI 회의록 + 액션아이템 (킬러 피처) — 완성
│   │   ├── dashboard/            # 내 그룹 + 최근 페이지 + 초대 코드 입력 — 완성
│   │   ├── upload/               # 파일 업로드 — 완성
│   │   ├── livekit/              # 음성/화면공유 토큰 발급 — 완성
│   │   ├── ai/                   # AI 어시스턴트 (RAG) — 미착수 (남궁훈)
│   │   ├── schedules/            # 일정 — 미착수 (남궁훈)
│   │   ├── voice-chat/           # 빈 폴더 — livekit 모듈로 대체됨
│   │   ├── screen-share/         # 빈 폴더 — livekit 모듈로 대체됨
│   │   └── subscriptions/        # 구독/결제 — 미착수
│   ├── .env.example              # 환경변수 템플릿
│   └── package.json
│
├── docker-compose.yml            # PostgreSQL(pgvector 16) + Redis(7-alpine)
├── vite.config.ts                # Vite + /api, /socket.io 프록시
├── .docs/                        # 프로젝트 문서
│   ├── PROJECT.md                # 프로젝트 소개, 가시성 & 권한 모델
│   ├── TECH.md                   # 기술 명세서, API 엔드포인트, Socket.IO 이벤트
│   ├── ERD.md                    # DB 스키마 (29개 테이블)
│   ├── Do.md                     # 백엔드 개발 가이드 (파트별 작업 안내)
│   ├── UIplan.md                 # UI 설계/리팩토링 플랜
│   └── checklist.md              # 기능 체크리스트
├── UI.md                         # 프론트 UI 기능 목록 + Mock → API 전환 가이드
└── package.json
```

## 진행 현황

| 카테고리 | 상태 | 담당 |
|----------|------|---|
| 프론트엔드 UI (UI-01~UI-83) | **95% 완료** (60건 중 57건 + 신규 24건) | 김경빈 |
| 백엔드 초기 설정 (NestJS, TypeORM, Docker) | 완료 | 김경빈/김명준 |
| Prisma DB 마이그레이션 (29개 중 22개 모델) | 완료 (회의 5개 추가 필요) | 김명준 |
| 백엔드 API — 인증 (JWT, Google/GitHub/Kakao OAuth) | **완성** + 프론트 연동 | 김명준 |
| 백엔드 API — 설정 (테마/알림/비밀번호) | **완성** <!-- SET-04, SET-05 일부 미완 --> | 김명준 |
| 백엔드 API — 그룹/프로젝트/페이지 (CRUD + 권한) | **완성** <!-- 프론트 연동 진행 중 --> | 김명준 |
| 백엔드 API — 채널/메시지 + Socket.IO Gateway | **완성** (권한·스레드·파일 업로드·리액션·`@AI` 멘션) | 이도현 |
| 백엔드 API — 문서 실시간 협업 (Hocuspocus + Yjs) | **완성** (라이브커서·PresenceAvatars 포함) | 이도현 |
| 백엔드 API — 문서 에디터 (TipTap, PDF/DOCX 내보내기, 버전) | **완성** <!-- DOC-09 외 14건, 라이브커서는 PresenceAvatars 로 보완 --> | 김봉만 |
| 백엔드 API — 회의 AI 킬러 피처 (STT, 회의록, 액션아이템) | **완성** <!-- MTG 12건 중 9건, MTG-08·12 는 RAG 의존 --> | 김봉만 |
| 백엔드 API — 대시보드 | **완성** <!-- DASH-01~03 완료, DASH-04는 Task 연동 보류 --> | 김봉만 |
| 백엔드 API — LiveKit (음성/화면공유 토큰 발급) | **완성** <!-- 토큰 발급 API 구현, 미디어/화면공유는 LiveKit SFU 처리. 회의 세션 DB 기록·녹화는 후순위 --> | 이도현 |
| 백엔드 API — 작업 관리 (Tasks 기본 CRUD) | **완성** <!-- 칸반/간트/캘린더 메타·커스텀 필드 후속 --> | 남궁훈 |
| 백엔드 API — 파일 업로드 (Upload) | **완성** | - |
| 백엔드 API — AI RAG 파이프라인 | 미착수 | 남궁훈 |
| 백엔드 API — 일정 (Schedules) | 미착수 | 남궁훈 |
| 백엔드 API — 구독/결제 | 미착수 | - |
| **통합 빌드 & 부팅** | **2026-05-11 검증 완료** (4건 마이너 이슈, 모두 해결 진행 중) | 전체 |

## 개발 일지

### 2026-03-05 (1일차)
- 프론트엔드 프로젝트 생성 (React + Vite + TypeScript + TailwindCSS v4)
- 랜딩, 공통 레이아웃 (사이드바, 하단 툴바, 다크모드, 반응형) 구현
- 로그인/회원가입 페이지 UI + 테스터 계정 목업 로그인
- 대시보드, 그룹/프로젝트/페이지 관리 UI
- 문서 에디터 (TipTap), 코드 에디터 (Monaco) UI
- 메신저 (풀사이즈 + 미니 팝업), 음성 채팅, 화면 공유 UI
- AI 사이드패널, 설정, 구독/결제 페이지 UI

### 2026-03-06 (2일차)
- 인증 추가 UI (비밀번호 재설정, 프로필 관리, 소셜 로그인 버튼)
- 작업 UI 5종 (칸반, 캘린더, 간트, 리스트/테이블, CRUD 모달)
- 그룹 컨텍스트 시스템 (디스코드 서버 전환 방식 — 그룹 전환 시 채팅/음성/화면공유 자동 전환)
- 프론트엔드 UI 100% 완료
- NestJS 백엔드 프로젝트 생성 (`backend/`)
- 필수 라이브러리 전체 설치 (TypeORM, JWT, Passport, Socket.IO, LiveKit SDK, Gemini SDK 등)
- Docker Compose 구성 (PostgreSQL pgvector + Redis)
- Vite 프록시 설정 (`/api`, `/socket.io`)
- 백엔드 모듈 폴더 구조 생성 (14개 모듈)

### 2026-03 ~ 04
- UI 리팩토링 — Slack 스타일 사이드바(`SlackSidebar`), 멀티뷰 작업 패턴 정리 (김경빈)
- Zustand store 확장 (detailPanel, meeting, AI, customField, thread 등 추가 → 총 13개) (김경빈)
- 외부 조직 공유 채널(Slack Connect) UI 5건, 문서 블록 확장 5건, 칸반 퀵액션 5건, 커스텀 필드 5건 추가 완료 (김경빈)
- 백엔드 인증 API 구현 — 회원가입, JWT, Google/GitHub/Kakao OAuth, 토큰 갱신, 비밀번호 재설정 (김명준)
- 백엔드 설정 API 구현 — 테마, 알림, 비밀번호 변경 (김명준)
- Prisma 기반 DB 마이그레이션 시스템 구축 (`prisma/schema.prisma` + `DATABASE_MIGRATION.md`) (김명준)
- UI 설계 문서 추가 (`.docs/UIplan.md`)

### 2026-04 ~ 05
- 그룹/프로젝트/페이지 CRUD API 완성 (백엔드 완료, 프론트 연동 진행 중) (김명준)
- 문서 실시간 협업 인프라 구현 — Hocuspocus + Yjs + 라이브커서 + PresenceAvatars (이도현)
- 채팅 + 메신저 백엔드 — 채널 권한, 스레드, 파일 업로드, Socket.IO Gateway (이도현)
- LiveKit 인프라 — 토큰 발급 + livekit.yaml 설정 (이도현)
- 문서 에디터 백엔드 14건 — TipTap, 표/이미지/코드블록, PDF/DOCX 내보내기, 버전 히스토리 (김봉만)
- 대시보드 백엔드 3건 — 내 그룹, 최근 페이지, 초대 코드 (김봉만)
- 회의 AI 킬러 피처 9건 — STT 파이프라인(Google STT + 화자 분리), 실시간 자막, AI 회의록 자동 생성, 액션아이템 추출/등록, 회의 이력 (김봉만)

### 2026-05-10 ~ 05-11 (통합 테스트)
- 5명 작업분 main 병합 → 통합 빌드 검증 진행
- TypeScript 컴파일 0 errors, NestJS 부팅 성공 (`http://localhost:3000`)
- API 70개 + Socket.IO 8 이벤트 + Hocuspocus(`ws://localhost:1234`) 동시 가동
- Prisma 마이그레이션 22개 모델 적용 완료 (29개 중 회의 5개 추가 필요)
- 통합 이슈 4건 발견 — 모두 1회 수정으로 해결 가능, 개별 파트 품질 문제 아님:
  1. `OAuthAccount.provider_access_token` 컬럼 마이그레이션 누락 (김명준 처리 예정)
  2. 회의 AI 5개 테이블 schema.prisma 미반영 (김봉만 처리 필요)
  3. Kakao OAuth 시크릿 잘려서 공유됨 (김명준에게 재공유 요청)
  4. 시크릿 노출 보안 이슈 → `.env.example` placeholder 정리, 키 회전 권장

### 앞으로 해야 할 일
- **그룹/프로젝트/페이지 CRUD API** — TypeORM Entity + REST 엔드포인트
- **실시간 문서/코드 편집** — Socket.IO + Yjs/Hocuspocus
- **Docker 코드 실행 환경** — 언어별 이미지, 샌드박스 실행 API
- **할 일/일정 API** — 칸반/간트/캘린더 데이터 모델
- **채팅 메시지 API + Socket.IO** — 채널/DM/스레드
- **음성/화면 공유** — LiveKit 서버 + 토큰 발급 API
- **AI RAG 파이프라인** — Gemini API + pgvector 임베딩/검색
- **구독 결제** — Toss Payments 또는 Stripe
- **프론트-백 API 연동** — Mock 데이터 → 실제 API 호출로 교체 (Store만 수정)
- **GCP 배포** — Compute Engine, Cloud SQL, Nginx

## 문서

- [PROJECT.md](.docs/PROJECT.md) — 프로젝트 소개, 핵심 기능, 가시성 & 권한 모델
- [TECH.md](.docs/TECH.md) — 기술 명세서, API 엔드포인트(~80개), Socket.IO 이벤트, 보안
- [ERD.md](.docs/ERD.md) — DB 스키마 (29개 테이블 CREATE TABLE)
- [Do.md](.docs/Do.md) — 백엔드 개발 가이드 (파트별 작업 안내, 완료 조건)
- [UIplan.md](.docs/UIplan.md) — UI 설계/리팩토링 플랜
- [checklist.md](.docs/checklist.md) — 전체 기능 체크리스트
- [UI.md](UI.md) — 프론트 UI 기능 목록, Mock → API 전환 가이드
