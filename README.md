# SyncFlow

실시간 협업 플랫폼 — 문서, 코드, 일정을 하나의 공간에서.

> 계명대학교 컴퓨터공학과 졸업 프로젝트 | 팀: 4학년의 무게

## 로컬 개발 환경 실행

### 사전 요구사항

- Node.js 18+
- npm 9+

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (기본 http://localhost:5173)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과물 미리보기
npm run preview
```

테스터 계정 tester1@test.com / test1234

### 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | Vite 개발 서버 실행 (HMR 지원) |
| `npm run build` | TypeScript 타입 체크 + 프로덕션 빌드 |
| `npm run preview` | 빌드 결과물 로컬 서버로 미리보기 |
| `npm run lint` | ESLint 코드 검사 |

## 현재 구현된 기능

### 랜딩 페이지 & 공통 레이아웃 (UI-01 ~ UI-08)

- **랜딩 페이지** — 히어로 배너, 핵심 기능 3가지 카드, CTA 섹션
- **사이드바 네비게이션** — 그룹/프로젝트/페이지 트리 (펼침 260px / 접힘 60px / 모바일 오버레이)
- **하단 공통 툴바** — 음성 채팅, 화면 공유, Follow Me, 참여자 목록, 채팅 버튼
- **다크모드** — 라이트/다크/시스템 3단계 토글 (`<html class="dark">` 전략)
- **반응형 레이아웃** — 모바일(~639px), 태블릿(640~1023px), 데스크톱(1024px+)
- **로딩/에러 처리** — Skeleton UI, 404 페이지, 에러 페이지
- **토스트 알림** — success/error/warning/info 4가지 타입, 자동 소멸(4초)
- **브라우저 알림** — Notification API 기본 구조 (useNotification 훅)

### 페이지 라우팅

| 경로 | 페이지 | 레이아웃 |
|------|--------|----------|
| `/` | 랜딩 페이지 | PublicLayout |
| `/login` | 로그인 (플레이스홀더) | PublicLayout |
| `/register` | 회원가입 (플레이스홀더) | PublicLayout |
| `/dashboard` | 대시보드 | AppLayout (사이드바+툴바) |
| `*` | 404 페이지 | PublicLayout |

## 기술 스택

- **빌드**: Vite + React + TypeScript
- **CSS**: TailwindCSS v4 (@tailwindcss/vite 플러그인)
- **상태 관리**: Zustand
- **라우팅**: React Router v7
- **아이콘**: lucide-react

## 프로젝트 구조

```
src/
├── app/            App.tsx, router.tsx
├── components/
│   ├── common/     Button, Card, ThemeToggle, Skeleton, ErrorFallback, Toast
│   └── layout/     PublicLayout, AppLayout, Navbar, Sidebar, BottomToolbar
├── pages/
│   ├── landing/    LandingPage, HeroSection, FeatureCards, CTASection
│   ├── auth/       LoginPage, RegisterPage (플레이스홀더)
│   ├── dashboard/  DashboardPage
│   └── errors/     NotFoundPage, ErrorPage
├── stores/         useThemeStore, useSidebarStore, useToastStore, useAuthStore
├── hooks/          useMediaQuery, useSystemTheme, useNotification
├── styles/         app.css (TailwindCSS + 커스텀 테마)
├── types/          index.ts
├── utils/          cn.ts
└── constants/      index.ts
```
