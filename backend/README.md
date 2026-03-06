# SyncFlow Backend

NestJS 기반 백엔드 서버

## 실행 방법

```bash
# 1. 루트에서 Docker Compose 실행 (PostgreSQL + Redis)
cd ..
docker compose up -d

# 2. 의존성 설치
npm install

# 3. 환경변수 설정
cp .env.example .env
# .env 파일에서 필요한 값 수정

# 4. 개발 서버 실행 (watch mode)
npm run start:dev
```

서버: http://localhost:3000 (API prefix: `/api`)

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run start:dev` | 개발 서버 (watch mode) |
| `npm run start:prod` | 프로덕션 서버 |
| `npm run build` | 빌드 |
| `npm run test` | 유닛 테스트 |
| `npm run test:e2e` | E2E 테스트 |

## 모듈 구조

| 모듈 | 설명 |
|------|------|
| `auth/` | 인증 (JWT, OAuth: Google/GitHub/Kakao) |
| `groups/` | 그룹 CRUD, 초대, 멤버 관리 |
| `projects/` | 프로젝트 CRUD |
| `pages/` | 페이지 (문서/코드) CRUD |
| `tasks/` | 할 일 CRUD, 상태/우선순위 |
| `schedules/` | 일정 CRUD |
| `channels/` | 채팅 채널 |
| `messages/` | 채팅 메시지 (Socket.IO) |
| `ai/` | AI 어시스턴트 (Gemini + RAG) |
| `voice-chat/` | 음성 채팅 (LiveKit 토큰) |
| `screen-share/` | 화면 공유 |
| `subscriptions/` | 구독/결제 |
| `settings/` | 사용자 설정 |
| `common/` | Guard, Decorator, Entity, Interceptor |

## 환경변수

`.env.example` 참조
