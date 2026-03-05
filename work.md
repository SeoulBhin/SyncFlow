# SyncFlow - 프레임워크 & 라이브러리 버전 정보

> 팀원 간 개발 환경 통일을 위한 버전 공유 문서
> 마지막 업데이트: 2026-03-05

## Runtime Dependencies

| 패키지 | 버전 | 용도 |
|--------|------|------|
| react | ^19.2.0 | UI 라이브러리 |
| react-dom | ^19.2.0 | React DOM 렌더러 |
| react-router-dom | ^7.13.1 | 클라이언트 사이드 라우팅 |
| zustand | ^5.0.11 | 전역 상태 관리 |
| lucide-react | ^0.577.0 | 아이콘 라이브러리 |

## Dev Dependencies

| 패키지 | 버전 | 용도 |
|--------|------|------|
| vite | ^7.3.1 | 빌드 도구 / 개발 서버 |
| typescript | ~5.9.3 | 타입 시스템 |
| tailwindcss | ^4.2.1 | CSS 프레임워크 |
| @tailwindcss/vite | ^4.2.1 | TailwindCSS Vite 플러그인 |
| @vitejs/plugin-react | ^5.1.1 | React Fast Refresh |
| eslint | ^9.39.1 | 코드 린터 |
| typescript-eslint | ^8.48.0 | TypeScript ESLint 파서/플러그인 |
| eslint-plugin-react-hooks | ^7.0.1 | React Hooks 린트 규칙 |
| eslint-plugin-react-refresh | ^0.4.24 | React Refresh 린트 규칙 |
| @types/react | ^19.2.7 | React 타입 정의 |
| @types/react-dom | ^19.2.3 | React DOM 타입 정의 |
| @types/node | ^24.10.1 | Node.js 타입 정의 |

## 개발 환경

| 항목 | 권장 |
|------|------|
| Node.js | 18+ (LTS 권장) |
| npm | 9+ |
| OS | Windows / macOS / Linux |
| IDE | VS Code (권장 확장: ESLint, Tailwind CSS IntelliSense, Prettier) |

## 설정 파일

| 파일 | 설명 |
|------|------|
| `vite.config.ts` | Vite 설정 (TailwindCSS 플러그인, `@` 경로 별칭) |
| `tsconfig.app.json` | TypeScript 설정 (`@/*` → `./src/*` 경로 매핑) |
| `.prettierrc` | Prettier 코드 포맷팅 설정 |

## 참고

- TailwindCSS v4는 PostCSS 설정 없이 `@tailwindcss/vite` 플러그인으로 동작합니다.
- 경로 별칭 `@/`는 `src/` 디렉토리를 가리킵니다.
- 다크모드는 `class` 전략을 사용합니다 (`<html class="dark">`).
