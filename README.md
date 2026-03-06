# SyncFlow

실시간 협업 플랫폼 — 문서, 코드, 일정을 하나의 공간에서.

> 계명대학교 컴퓨터공학과 졸업 프로젝트 | 팀: 4학년의 무게 <br>
> 팀장 - 김경빈(SeoulBhin)<br>
> 조원 - 김명준(kkmmjj12)<br>
> 조원 - 김봉만(b_many)<br>
> 조원 - 이도현(di593488)<br>
> 조원 - <br>

## 로컬 개발 환경 실행

### 사전 요구사항

- Node.js 20+
- npm 9+
- Docker Desktop (PostgreSQL + Redis)

### 설치 및 실행

```bash
# 1. Docker로 PostgreSQL + Redis 실행
docker compose up -d

# 2. 프론트엔드 의존성 설치 + 개발 서버 실행 (http://localhost:5174)
npm install
npm run dev

# 3. 백엔드 의존성 설치 + 개발 서버 실행 (http://localhost:3000)
cd backend
npm install
npm run start:dev
```

테스터 계정 tester1@test.com / test1234

### 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 프론트엔드 개발 서버 (Vite, HMR) |
| `npm run dev:backend` | 백엔드 개발 서버 (NestJS, watch mode) |
| `npm run dev:all` | 프론트 + 백엔드 동시 실행 |
| `npm run build` | 프론트엔드 빌드 |
| `npm run build:backend` | 백엔드 빌드 |
| `npm run lint` | ESLint 코드 검사 |
| `npm run docker:up` | PostgreSQL + Redis 컨테이너 실행 |
| `npm run docker:down` | 컨테이너 중지 |

## 기술 스택

### 프론트엔드
- **빌드**: Vite + React + TypeScript
- **CSS**: TailwindCSS v4 (@tailwindcss/vite)
- **상태 관리**: Zustand (9개 store)
- **라우팅**: React Router v7
- **에디터**: TipTap (문서), Monaco Editor (코드)
- **아이콘**: lucide-react

### 백엔드
- **프레임워크**: NestJS (TypeScript)
- **ORM**: TypeORM + PostgreSQL (pgvector)
- **캐시**: Redis (ioredis)
- **인증**: JWT + Passport.js (Google/GitHub/Kakao OAuth)
- **실시간**: Socket.IO (@nestjs/websockets)
- **음성/화면**: LiveKit (WebRTC)
- **AI**: Google Gemini API + RAG (pgvector)
- **코드 실행**: Dockerode (Docker 컨테이너 샌드박스)

### 인프라
- Docker Compose (PostgreSQL + Redis 개발 환경)
- GCP (배포 예정)

## 프로젝트 구조

```
SyncFlow/
├── src/                          # 프론트엔드 (React + Vite)
│   ├── app/                      # App.tsx, router.tsx
│   ├── components/
│   │   ├── ai/                   # AI 사이드패널, 사용량 카드
│   │   ├── auth/                 # 소셜 로그인 버튼
│   │   ├── chat/                 # 미니 채팅 팝업
│   │   ├── common/               # Button, Card, Input, Toast, Skeleton
│   │   ├── layout/               # AppLayout, Sidebar, BottomToolbar
│   │   ├── screen-share/         # 화면 공유 패널
│   │   ├── tasks/                # 칸반, 캘린더, 간트, 리스트 뷰
│   │   └── voice-chat/           # 음성 채팅 패널
│   ├── pages/
│   │   ├── auth/                 # 로그인, 회원가입, 비밀번호 재설정, 프로필
│   │   ├── billing/              # 구독 플랜, 결제 내역
│   │   ├── dashboard/            # 대시보드
│   │   ├── editor/               # 문서 에디터, 코드 에디터
│   │   ├── group/                # 그룹 관리
│   │   ├── landing/              # 랜딩 페이지
│   │   ├── messenger/            # 메신저 (풀사이즈)
│   │   ├── settings/             # 설정
│   │   └── tasks/                # 일정/할 일
│   ├── stores/                   # Zustand (9개 store)
│   ├── hooks/                    # 커스텀 훅
│   ├── styles/                   # TailwindCSS
│   ├── types/                    # 타입 정의
│   ├── utils/                    # 유틸리티
│   └── constants/                # 상수, 목업 데이터
│
├── backend/                      # 백엔드 (NestJS)
│   ├── src/
│   │   ├── main.ts               # 앱 진입점 (CORS, ValidationPipe)
│   │   ├── app.module.ts         # 루트 모듈 (ConfigModule, TypeORM)
│   │   ├── auth/                 # 인증 (JWT, OAuth)
│   │   ├── groups/               # 그룹 관리
│   │   ├── projects/             # 프로젝트
│   │   ├── pages/                # 페이지 (문서/코드)
│   │   ├── tasks/                # 할 일
│   │   ├── schedules/            # 일정
│   │   ├── channels/             # 채팅 채널
│   │   ├── messages/             # 메시지
│   │   ├── ai/                   # AI 어시스턴트 (RAG)
│   │   ├── voice-chat/           # 음성 채팅 (LiveKit)
│   │   ├── screen-share/         # 화면 공유
│   │   ├── subscriptions/        # 구독/결제
│   │   ├── settings/             # 설정
│   │   └── common/               # Guard, Decorator, Entity
│   ├── .env.example              # 환경변수 템플릿
│   └── package.json
│
├── docker-compose.yml            # PostgreSQL(pgvector) + Redis
├── vite.config.ts                # Vite + /api 프록시
├── .docs/                        # 프로젝트 문서
│   ├── PROJECT.md                # 프로젝트 소개
│   ├── TECH.md                   # 기술 명세서
│   ├── ERD.md                    # DB 스키마
│   ├── Do.md                     # 백엔드 개발 가이드
│   └── checklist.md              # 기능 체크리스트 (173항목)
└── package.json
```

## 진행 현황

| 카테고리 | 진행률 |
|----------|--------|
| 프론트엔드 UI | 40/40 (100%) |
| 백엔드 초기 설정 | 완료 |
| 백엔드 API/기능 | 미착수 |
| 전체 | 43/173 (25%) |

## 개발 일지

### 2026-03-05 (1일차)
- 프론트엔드 프로젝트 생성 (React + Vite + TypeScript + TailwindCSS v4)
- 랜딩 페이지, 공통 레이아웃 (사이드바, 하단 툴바, 다크모드, 반응형) 구현
- 로그인/회원가입 페이지 UI + 테스터 계정 목업 로그인
- 대시보드, 그룹/프로젝트/페이지 관리 UI
- 문서 에디터 (TipTap), 코드 에디터 (Monaco Editor) UI
- 메신저 (풀사이즈 + 미니 팝업), 음성 채팅, 화면 공유 UI
- AI 사이드패널, 설정, 구독/결제 페이지 UI
- Zustand store 8개 구성 (auth, chat, theme, sidebar, toast, voiceChat, screenShare, AI)

### 2026-03-06 (2일차)
- 인증 관련 추가 UI (비밀번호 재설정, 프로필 관리, 소셜 로그인 버튼)
- 일정/할 일 UI 5종 구현 (칸반 보드, 캘린더, 간트 차트, 리스트/테이블, CRUD 모달)
- 그룹 컨텍스트 시스템 구현 (디스코드 서버 전환 방식 — 그룹 전환 시 채팅/음성/화면공유 자동 전환)
- Zustand store 9번째 추가 (groupContext)
- **프론트엔드 UI 40/40 (100%) 완료**
- NestJS 백엔드 프로젝트 생성 (`backend/`)
- 필수 라이브러리 전체 설치 (TypeORM, JWT, Passport, Socket.IO, LiveKit SDK, Gemini SDK 등)
- Docker Compose 구성 (PostgreSQL pgvector + Redis)
- Vite 프록시 설정 (`/api`, `/socket.io`)
- 백엔드 모듈 폴더 구조 생성 (12개 모듈)

### 앞으로 해야 할 일
- **ERD 기반 DB 마이그레이션** — Entity 생성 + TypeORM synchronize
- **인증 API**  — 회원가입, 로그인(JWT), OAuth(Google/GitHub/Kakao), 프로필
- **그룹/프로젝트/페이지 CRUD API** 
- **실시간 문서/코드 편집**  — Socket.IO + Yjs/Hocuspocus
- **Docker 코드 실행 환경**  — 언어별 이미지, 샌드박스 실행 API
- **할 일/일정 API** 
- **채팅 메시지 API + Socket.IO** 
- **음성/화면 공유**  — LiveKit 서버 + 토큰 API
- **AI RAG 파이프라인**  — Gemini API + pgvector 벡터 검색
- **구독 결제**  — Toss Payments 또는 Stripe
- **프론트-백 API 연동** — 목업 데이터 → 실제 API 호출로 교체
- **GCP 배포** — Compute Engine, Cloud SQL, Nginx

## 문서

- [PROJECT.md](.docs/PROJECT.md) — 프로젝트 소개, 핵심 기능
- [TECH.md](.docs/TECH.md) — 기술 명세서, 시스템 아키텍처
- [ERD.md](.docs/ERD.md) — DB 스키마 설계
- [Do.md](.docs/Do.md) — 백엔드 개발 가이드 (파트별 작업 안내)
- [checklist.md](.docs/checklist.md) — 전체 기능 체크리스트
