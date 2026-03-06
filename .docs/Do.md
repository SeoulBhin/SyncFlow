# SyncFlow - 백엔드 개발 가이드

> 이 문서는 백엔드 개발자가 참고할 **작업 가이드**입니다.
> 프론트엔드 UI는 목업 데이터로 완성되어 있으며, 백엔드 API를 연동하면 실제 동작합니다.

---

## 현재 상태 요약

### 프론트엔드 (완료)
- React + TypeScript + TailwindCSS + Vite
- Zustand 상태 관리 (8개 store)
- 모든 UI 페이지 목업 데이터로 동작 확인 완료 (40개 중 40개 완료, 100%)
- Zustand 상태 관리 (9개 store — auth, chat, theme, sidebar, toast, voiceChat, screenShare, AI, **groupContext**)
- 라우터: react-router-dom v6 (BrowserRouter)
- **그룹 컨텍스트 시스템**: 하단 툴바에서 활성 그룹을 선택하면 채팅/음성/화면공유가 해당 그룹 범위로 자동 전환 (디스코드 서버 전환 방식)

### 백엔드 (초기 설정 완료)
- **NestJS 프로젝트 생성 완료** (`backend/` 폴더)
- **설치된 라이브러리**: @nestjs/config, @nestjs/typeorm, typeorm, pg, @nestjs/jwt, @nestjs/passport, passport, passport-jwt, bcrypt, @nestjs/websockets, @nestjs/platform-socket.io, socket.io, livekit-server-sdk, @google/generative-ai, dockerode, nanoid, ioredis, class-validator, class-transformer, @google-cloud/storage, nodemailer, multer
- **환경변수**: `.env` + `.env.example` 생성 완료
- **Docker Compose**: PostgreSQL(pgvector) + Redis 구성 완료 (`docker-compose.yml`)
- **Vite 프록시**: `/api` → `localhost:3000`, `/socket.io` → ws 프록시 설정 완료
- **모듈 폴더 구조**: auth, groups, projects, pages, tasks, channels, messages, schedules, ai, voice-chat, screen-share, subscriptions, settings, common 생성 완료
- 체크리스트 기준 133개 항목 중 API/기능 구현은 미착수

### 그룹 컨텍스트 시스템 (프론트 구현 완료)
- **Store**: `useGroupContextStore.ts` — 활성 그룹 ID/이름 관리
- **하단 툴바**: 그룹 선택기 드롭다운 추가 (디스코드 서버 전환 방식)
- **동작**: 그룹 전환 시 음성 해제, 화면공유 중지, 채팅 채널 필터링
- **영향받는 Store**: `useVoiceChatStore` (connectedGroupId/Name), `useScreenShareStore` (sharingGroupId/Name), `useChatStore`
- **백엔드 필요**: 음성/화면공유 Room을 groupId별로 생성, 채널 목록 API에서 groupId 필터 지원

---

## 파트별 작업 가이드

---

### Part 1. 프로젝트 초기 설정 및 인프라

> **담당**: 백엔드 리드 또는 인프라 담당
> **우선순위**: P0 (가장 먼저 진행)

#### 해야 할 일
1. ~~**NestJS 프로젝트 생성**~~  완료 (`backend/` 단일 프로젝트)
2. ~~**PostgreSQL + pgvector 설정**~~  완료 (Docker Compose: `pgvector/pgvector:pg16`)
3. ~~**Redis 서버 설정**~~  완료 (Docker Compose: `redis:7-alpine`)
4. **ERD 기반 DB 마이그레이션** — `ERD.md`의 SQL 스키마 참조 (미착수)
5. ~~**환경변수 설정**~~  완료 (`.env` + `.env.example`)
6. ~~**Docker Compose 개발 환경**~~  완료 (`docker-compose.yml`)
7. **CI/CD 기본 파이프라인** (선택)

#### 필요 라이브러리
```
# 프레임워크
@nestjs/core @nestjs/common @nestjs/platform-express
@nestjs/config                    # 환경변수 관리

# 데이터베이스
@nestjs/typeorm typeorm pg        # PostgreSQL ORM
pgvector                          # 벡터 확장 (npm: pgvector)
ioredis @nestjs/cache-manager     # Redis

# 유틸
class-validator class-transformer # DTO 유효성 검증
uuid                              # UUID 생성
```

#### 환경변수 예시
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/syncflow
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
GEMINI_API_KEY=...
GCS_BUCKET=syncflow-uploads
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

#### 프론트 연동 포인트
- ~~프론트엔드 Vite 프록시 설정~~  완료: `vite.config.ts`에서 `/api` → `localhost:3000`, `/socket.io` → ws 프록시
- ~~CORS 설정~~  완료: `main.ts`에서 `http://localhost:5174` 허용

---

### Part 2. 인증 시스템 (AUTH)

> **담당**: 1명
> **체크리스트**: AUTH-01 ~ AUTH-10 (10개 항목)
> **우선순위**: P0 — 모든 기능의 기반

#### 프론트엔드 현재 상태
| 항목 | 상태 | 설명 |
|------|------|------|
| 로그인 페이지 | UI 완료 | `src/pages/auth/LoginPage.tsx` — 이메일/비밀번호 폼, 목업 로그인 (tester1~4, 비번: test1234) |
| 회원가입 페이지 | UI 완료 | `src/pages/auth/RegisterPage.tsx` — 이름/이메일/비밀번호/확인 폼 |
| 비밀번호 재설정 | UI 완료 | `src/pages/auth/ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx` |
| 프로필 관리 | UI 완료 | `src/pages/auth/ProfilePage.tsx` — 아바타 업로드, 이름/상태 변경 |
| 소셜 로그인 버튼 | UI 완료 | `src/components/auth/SocialLoginButtons.tsx` — Google, GitHub, 카카오 버튼 |
| 인증 상태 관리 | Store 완료 | `src/stores/useAuthStore.ts` — `{ isAuthenticated, user, login(), logout() }` |

#### 해야 할 일
```
1. POST /api/auth/register        — 회원가입 (이메일 중복 검사, bcrypt 해싱)
2. POST /api/auth/login            — 로그인 (JWT Access + Refresh 발급)
3. POST /api/auth/refresh          — Access Token 갱신
4. POST /api/auth/logout           — Refresh Token 무효화
5. POST /api/auth/forgot-password  — 이메일로 재설정 링크 발송
6. POST /api/auth/reset-password   — 새 비밀번호 설정 (토큰 검증)
7. GET  /api/auth/me               — 현재 로그인 사용자 정보
8. PUT  /api/auth/profile          — 프로필 수정 (이름, 상태 메시지)
9. POST /api/auth/profile/avatar   — 프로필 사진 업로드 (Cloud Storage)
10. GET  /api/auth/oauth/google     — Google OAuth 시작
11. GET  /api/auth/oauth/google/callback
12. GET  /api/auth/oauth/github     — GitHub OAuth 시작
13. GET  /api/auth/oauth/github/callback
14. GET  /api/auth/oauth/kakao      — Kakao OAuth 시작
15. GET  /api/auth/oauth/kakao/callback
16. POST /api/auth/verify-email     — 이메일 인증 (선택)
```

#### 필요 라이브러리
```
@nestjs/jwt @nestjs/passport       # JWT + 인증
passport passport-jwt               # JWT 전략
passport-google-oauth20             # Google OAuth
passport-github2                    # GitHub OAuth
passport-kakao                      # Kakao OAuth
bcrypt @types/bcrypt                # 비밀번호 해싱
nodemailer @types/nodemailer        # 이메일 발송 (비밀번호 재설정)
multer @nestjs/platform-express     # 파일 업로드
@google-cloud/storage               # GCS 파일 저장
```

#### 프론트 연동 시 변경 포인트
- `useAuthStore.ts`의 `login()` → `POST /api/auth/login` 호출로 교체
- `LoginPage.tsx`의 `handleLogin()` → API 호출 + 토큰 저장
- Axios interceptor에서 Access Token 자동 첨부, 401 시 refresh 시도

#### 주요 기술 사항
- **Access Token**: 15분 만료, Authorization 헤더
- **Refresh Token**: 7일 만료, httpOnly 쿠키 (또는 localStorage)
- **비밀번호**: bcrypt (salt rounds: 12)
- **OAuth 플로우**: Authorization Code → 백엔드에서 토큰 교환 → JWT 발급

---

### Part 3. 그룹/프로젝트/페이지 관리 (GRP)

> **담당**: 1명
> **체크리스트**: GRP-01 ~ GRP-14 (14개 항목)
> **우선순위**: P0 — 핵심 데이터 구조

#### 프론트엔드 현재 상태
| 항목 | 상태 | 파일 |
|------|------|------|
| 사이드바 (그룹/프로젝트/페이지 트리) | UI 완료 | `src/components/layout/Sidebar.tsx` |
| 그룹 생성 모달 | UI 완료 | `src/pages/group/GroupPage.tsx` 내 모달 |
| 초대 코드 입력 | UI 완료 | 대시보드 + 모달 |
| 멤버 관리 패널 | UI 완료 | 그룹 페이지 내 멤버 목록 |
| 프로젝트 생성/설정 | UI 완료 | 프로젝트 모달 |
| 페이지 CRUD | UI 완료 | 사이드바 트리 + 모달 |

#### API 엔드포인트
```
[그룹]
POST   /api/groups                    — 그룹 생성 (자동 초대코드 발급)
GET    /api/groups                    — 내 그룹 목록
GET    /api/groups/:id                — 그룹 상세 정보
PUT    /api/groups/:id                — 그룹 설정 변경 (이름, 설명)
DELETE /api/groups/:id                — 그룹 삭제 (Admin만)
POST   /api/groups/:id/regenerate-code — 초대 코드 재발급
POST   /api/groups/join               — 초대 코드로 그룹 참여
GET    /api/groups/:id/members        — 멤버 목록 (온라인 상태 포함)
PUT    /api/groups/:id/members/:userId — 멤버 역할 변경 (Admin만)
DELETE /api/groups/:id/members/:userId — 멤버 강퇴 (Admin만)

[프로젝트]
POST   /api/projects                  — 프로젝트 생성
GET    /api/groups/:id/projects       — 그룹 내 프로젝트 목록
GET    /api/projects/:id              — 프로젝트 상세
PUT    /api/projects/:id              — 프로젝트 수정 (이름, 마감일)
DELETE /api/projects/:id              — 프로젝트 삭제

[페이지]
POST   /api/pages                     — 페이지 생성 (type: document | code)
GET    /api/projects/:id/pages        — 프로젝트 내 페이지 목록 (트리)
GET    /api/pages/:id                 — 페이지 상세 (content 포함)
PUT    /api/pages/:id                 — 페이지 내용 저장
PUT    /api/pages/:id/title           — 페이지 제목 변경
PUT    /api/pages/:id/reorder         — 페이지 순서 변경
DELETE /api/pages/:id                 — 페이지 삭제
```

#### 필요 라이브러리
```
nanoid                             # 초대 코드 생성 (8자리)
```

---

### Part 4. 대시보드 (DASH)

> **담당**: Part 3 담당자와 동일 (데이터 구조 공유)
> **체크리스트**: DASH-01 ~ DASH-04 (4개 항목)
> **우선순위**: P1

#### API 엔드포인트
```
GET  /api/dashboard                  — 대시보드 종합 데이터
  응답: {
    groups: [...],                    — 내 그룹 카드 (멤버 수, 최근 활동)
    recentPages: [...],               — 최근 작업 페이지 (최대 7개)
    myTasks: [...],                   — 나에게 배정된 할 일 (우선순위 정렬)
  }
```

---

### Part 5. 문서 에디터 — 실시간 협업 (DOC)

> **담당**: 1명 (실시간 통신 전문)
> **체크리스트**: DOC-01 ~ DOC-15 (15개 항목)
> **우선순위**: P0 (핵심 기능)

#### 프론트엔드 현재 상태
| 항목 | 상태 | 파일 |
|------|------|------|
| TipTap 에디터 | UI 완료 | `src/pages/editor/DocumentEditorPage.tsx` |
| 서식 툴바 | UI 완료 | 볼드/이탤릭/밑줄/H1~H3/목록/인용문/구분선/표/코드블록 |
| 라이브 커서 UI | UI 완료 | 커서 오버레이 + 이름 라벨 (Yjs 연동 대기) |
| 자동 저장 표시 | UI 완료 | "저장 중..." / "저장 완료" |
| 내보내기 UI | UI 완료 | PDF/DOCX 드롭다운 |
| 버전 히스토리 UI | UI 완료 | 사이드패널 타임라인 목록 |

#### 해야 할 일
```
1. Socket.IO 서버 설정 (NestJS Gateway)
2. Yjs CRDT 서버 (y-websocket 또는 Hocuspocus)
3. TipTap Collaboration Extension 연동
4. 문서 내용 자동 저장 (디바운싱 → DB)
5. 라이브 커서 실시간 전파 (Awareness Protocol)
6. 이미지/파일 업로드 → Cloud Storage
7. PDF 내보내기 (puppeteer 또는 pdf-lib)
8. DOCX 내보내기 (docx 라이브러리)
9. 버전 히스토리 (page_versions 테이블)
```

#### 필요 라이브러리
```
# 실시간 편집
@nestjs/websockets @nestjs/platform-socket.io
socket.io                          # Socket.IO 서버
@hocuspocus/server                 # Yjs CRDT 서버 (TipTap 공식 권장)
@hocuspocus/extension-database     # DB 연동
yjs y-protocols                    # CRDT 코어

# Socket.IO Redis 어댑터 (다중 서버 스케일링)
@socket.io/redis-adapter

# 내보내기
puppeteer                          # PDF 생성 (HTML → PDF)
docx                               # DOCX 생성

# 파일 업로드
@google-cloud/storage              # GCS
multer                             # 파일 업로드
```

#### Socket.IO 이벤트
```
[문서]
document:join(pageId)               — 페이지 입장 (room join)
document:leave(pageId)              — 페이지 퇴장
document:update(delta)              — Yjs 변경분 동기화 (CRDT)
document:cursor(position)           — 커서 위치 브로드캐스트
document:save-status(status)        — 저장 상태 알림

[Yjs Awareness]
awareness:update(states)            — 온라인 사용자 커서/선택 상태
```

#### 아키텍처 참고
```
[클라이언트 TipTap] ←→ [Hocuspocus Server] ←→ [PostgreSQL pages.content]
                                ↕
                         [Redis] (pub/sub, 상태 캐시)
```

---

### Part 6. 코드 에디터 + Docker 실행 (CODE)

> **담당**: 1명 (Docker/컨테이너 전문)
> **체크리스트**: CODE-01 ~ CODE-15 (15개 항목)
> **우선순위**: P0 (핵심 기능)

#### 프론트엔드 현재 상태
| 항목 | 상태 | 파일 |
|------|------|------|
| Monaco Editor | UI 완료 | `src/pages/editor/CodeEditorPage.tsx` |
| 언어 선택 드롭다운 | UI 완료 | Python/JS/Java/C/C++/HTML/CSS |
| 실행 버튼 + 스피너 | UI 완료 | 실행 중 로딩, 타임아웃 카운터 |
| 콘솔 출력 패널 | UI 완료 | stdout/stderr 구분, 리사이즈 |
| 라이브 커서 | UI 완료 | Monaco 위 오버레이 (Yjs 연동 대기) |

#### 해야 할 일
```
1. Docker 이미지 빌드 (언어별)
   - python:3.11-slim
   - node:20-slim (JavaScript)
   - openjdk:17-slim (Java)
   - gcc:latest (C/C++)

2. 코드 실행 API
   POST /api/code/execute
   Body: { language, code, stdin? }
   Response: { stdout, stderr, exitCode, executionTime }

3. 보안 격리
   - CPU: 1 코어
   - 메모리: 256MB
   - 실행 시간: 30초
   - 네트워크: 차단
   - 파일시스템: 읽기 전용 + 임시 마운트
   - 실행 후 컨테이너 즉시 삭제

4. 웹 결과 (HTML/CSS/JS)
   - 코드를 임시 정적 서버로 서빙
   - iframe 또는 새 탭으로 표시

5. 코드 동시 편집 (Yjs + Monaco)
   - y-monaco 바인딩
   - Socket.IO로 Yjs 동기화

6. 컨테이너 풀 관리 (P1)
   - 사전 워밍된 컨테이너 풀
   - cold start 최소화
```

#### 필요 라이브러리
```
dockerode @types/dockerode         # Docker API
tar-stream                         # 코드 파일을 컨테이너에 주입
```

#### API 엔드포인트
```
POST /api/code/execute             — 코드 실행
GET  /api/code/languages           — 지원 언어 목록
GET  /api/code/result/:id          — 웹 결과 조회 (HTML/CSS/JS)
```

---

### Part 7. 일정/할 일 관리 (TASK)

> **담당**: 1명
> **체크리스트**: TASK-01 ~ TASK-11 (11개 항목)
> **우선순위**: P0~P1

#### 프론트엔드 현재 상태
| 항목 | 상태 | 파일 |
|------|------|------|
| 할 일 CRUD 모달 | UI 완료 | `src/components/tasks/TaskModal.tsx` — 제목/설명/상태/우선순위/담당자/시작일/마감일/삭제 확인 |
| 칸반 보드 뷰 | UI 완료 | `src/components/tasks/KanbanBoard.tsx` — To-Do/In Progress/Done 3열, 드래그앤드롭 |
| 캘린더 뷰 | UI 완료 | `src/components/tasks/CalendarView.tsx` — 월간 그리드, 날짜별 할 일 표시, 월 이동 |
| 간트 차트 뷰 | UI 완료 | `src/components/tasks/GanttChart.tsx` — 타임라인 막대, 우선순위 색상, 주말 구분 |
| 리스트/테이블 뷰 | UI 완료 | `src/components/tasks/ListView.tsx` — 정렬/필터, 마일스톤 진행률 바 |
| 일정/할 일 페이지 | UI 완료 | `src/pages/tasks/TasksPage.tsx` — 4개 뷰 탭 전환, **그룹별 필터** |
| 그룹 필터 | UI 완료 | 그룹 컨텍스트에 따라 할 일 필터링 (전체/그룹별) |

#### API 엔드포인트
```
[할 일]
POST   /api/tasks                    — 할 일 생성
GET    /api/projects/:id/tasks       — 프로젝트 내 할 일 목록
GET    /api/tasks/:id                — 할 일 상세
PUT    /api/tasks/:id                — 할 일 수정 (제목, 설명, 상태, 우선순위, 담당자, 마감일)
PUT    /api/tasks/:id/status         — 상태 변경 (칸반 드래그)
PUT    /api/tasks/:id/reorder        — 순서 변경
DELETE /api/tasks/:id                — 할 일 삭제

[일정]
POST   /api/schedules               — 일정 생성
GET    /api/projects/:id/schedules   — 프로젝트 내 일정 목록
GET    /api/schedules/:id            — 일정 상세
PUT    /api/schedules/:id            — 일정 수정
DELETE /api/schedules/:id            — 일정 삭제
```

---

### Part 8. 메신저 — 채팅 (MSG)

> **담당**: Part 5 담당자와 공유 (Socket.IO 기반)
> **체크리스트**: MSG-01 ~ MSG-12 (12개 항목)
> **우선순위**: P0

#### 프론트엔드 현재 상태
| 항목 | 상태 | 파일 |
|------|------|------|
| 채팅 풀사이즈 | UI 완료 | `src/pages/messenger/MessengerPage.tsx` — **활성 그룹 채널만 표시** |
| 미니 팝업 채팅 | UI 완료 | `src/components/chat/ChatPopup.tsx` — **활성 그룹 채널만 표시**, DM은 항상 접근 가능 |
| 이모지/멘션/파일첨부 | UI 완료 | 목업 동작 |
| 채팅 store | 완료 | `src/stores/useChatStore.ts` |
| 그룹 컨텍스트 | 완료 | 하단 툴바에서 그룹 선택 시 채널 목록 자동 필터링 |

#### API 엔드포인트
```
[채널]
GET    /api/groups/:id/channels      — 그룹 내 채널 목록
POST   /api/channels                 — 채널 생성 (DM 시작)
GET    /api/channels/:id             — 채널 정보

[메시지]
GET    /api/channels/:id/messages    — 메시지 목록 (페이지네이션, cursor 기반)
POST   /api/channels/:id/messages    — 메시지 전송
PUT    /api/messages/:id             — 메시지 수정
DELETE /api/messages/:id             — 메시지 삭제

[부가 기능]
POST   /api/messages/:id/reactions   — 이모지 반응
DELETE /api/messages/:id/reactions/:emoji — 반응 취소
PUT    /api/channels/:id/read        — 읽음 처리 (last_read_at 업데이트)
GET    /api/channels/:id/search?q=   — 메시지 검색
```

#### Socket.IO 이벤트
```
chat:message(channelId, message)     — 새 메시지 실시간 전송
chat:typing(channelId, userId)       — 입력 중 표시
chat:read(channelId, userId)         — 읽음 상태 업데이트
chat:reaction(messageId, emoji)      — 이모지 반응
```

#### 그룹 컨텍스트 참고
- 프론트에서 `useGroupContextStore`로 활성 그룹 관리
- 채널 목록 API 호출 시 `groupId` 파라미터로 해당 그룹 채널만 반환
- DM은 그룹과 무관하게 항상 접근 가능
- 미니 채팅 팝업(`ChatPopup.tsx`)과 풀사이즈 메신저(`MessengerPage.tsx`) 모두 활성 그룹 기준으로 채널 필터링

---

### Part 9. 음성 채팅 + 화면 공유 (VOICE, SCREEN)

> **담당**: 1명 (WebRTC/LiveKit 전문)
> **체크리스트**: VOICE-01~08, SCREEN-01~07 (15개 항목)
> **우선순위**: P0

#### 프론트엔드 현재 상태
| 항목 | 상태 | 파일 |
|------|------|------|
| 음성 채팅 UI | UI 완료 | `src/components/layout/BottomToolbar.tsx` + `src/components/voice-chat/VoiceChatPanel.tsx` |
| 참여자 목록 | UI 완료 | 아바타 + 음성 활동 표시 + **접속 그룹명 배지** |
| 화면 공유 UI | UI 완료 | 공유 버튼 + Follow Me 토글 + 비디오 영역 + **공유 그룹명 배지** |
| Store | 완료 | `useVoiceChatStore.ts` (connectedGroupId/Name), `useScreenShareStore.ts` (sharingGroupId/Name) |
| 그룹 컨텍스트 | 완료 | 하단 툴바 그룹 선택기에서 그룹 전환 시 음성 자동 해제, 화면공유 자동 중지 |

#### 해야 할 일
```
1. LiveKit 서버 설정 (GCP 셀프 호스팅)
   - Docker: livekit/livekit-server
   - TURN 서버 설정 (방화벽 환경 대응)

2. LiveKit 토큰 발급 API
   POST /api/livekit/token
   Body: { roomName, participantName }
   Response: { token }

3. 프론트엔드 LiveKit SDK 연동
   - @livekit/components-react
   - livekit-client

4. 화면 공유 (LiveKit Screen Share)
   - localParticipant.setScreenShareEnabled(true)

5. Follow Me 모드 (Socket.IO)
   - 발표자 뷰포트 동기화 이벤트 브로드캐스트

6. 그룹 컨텍스트 연동
   - 프론트에서 connect(groupId, groupName) 호출 → groupId별 Room 생성
   - LiveKit room 이름: `voice-{groupId}`, `screen-{groupId}`
   - 한 사용자가 동시에 2개 그룹 음성 접속 불가 (프론트에서 전환 시 disconnect → connect)
```

#### 필요 라이브러리
```
# 백엔드
livekit-server-sdk                 # LiveKit 토큰 생성

# 프론트엔드 (추가 설치 필요)
@livekit/components-react          # React 컴포넌트
livekit-client                     # LiveKit 클라이언트 SDK
```

---

### Part 10. AI 어시스턴트 — RAG 파이프라인 (AI)

> **담당**: 1명 (AI/ML 전문)
> **체크리스트**: AI-01 ~ AI-10 (10개 항목)
> **우선순위**: P0 (핵심 차별화 기능)

#### 프론트엔드 현재 상태
| 항목 | 상태 | 파일 |
|------|------|------|
| AI 사이드패널 | UI 완료 | `src/components/ai/AISidePanel.tsx` |
| 프로젝트 컨텍스트 선택 | UI 완료 | 프로젝트 드롭다운 + 파일 목록 |
| @파일명 멘션 | UI 완료 | 파일 자동완성 드롭다운 |
| 스트리밍 응답 | UI 완료 | 글자 단위 스트리밍 효과 |
| AI 사용량 표시 | UI 완료 | `src/components/ai/AIUsageCard.tsx` |
| Store | 완료 | `src/stores/useAIStore.ts` (RAG 대응) |

#### 해야 할 일 (순서대로)
```
Phase 1: 기본 AI 채팅
1. POST /api/ai/chat — Gemini API 호출 + 스트리밍 응답 (SSE)
2. AI 대화 세션 CRUD (ai_conversations, ai_messages)
3. 사용자별 사용량 추적 (일일/월간 한도)

Phase 2: RAG 파이프라인
4. 벡터 임베딩 파이프라인
   - 문서/코드 저장 시 텍스트 → 청크 분할 (512~1024 토큰)
   - Google Embedding API → 768차원 벡터
   - pgvector에 저장

5. 임베딩 자동 업데이트
   - 페이지 내용 변경 시 해당 청크 재임베딩

6. 컨텍스트 검색
   - 사용자 질문 → 임베딩 → pgvector 코사인 유사도 검색 → Top-K

7. 프롬프트 구성
   System Prompt → RAG Context → Current File → User Query

Phase 3: 고급 기능
8. @파일 멘션 시 해당 파일 전체 내용을 컨텍스트에 포함
9. Admin/Tester 무료 사용 처리
10. RAG 검색 결과 캐싱 (Redis)
```

#### API 엔드포인트
```
[대화]
POST   /api/ai/chat                  — AI 질문 (SSE 스트리밍)
GET    /api/ai/conversations         — 대화 목록
POST   /api/ai/conversations         — 새 대화 생성
GET    /api/ai/conversations/:id     — 대화 메시지 목록
DELETE /api/ai/conversations/:id     — 대화 삭제

[RAG]
POST   /api/ai/projects/:id/index    — 프로젝트 파일 인덱싱 (벡터 임베딩)
GET    /api/ai/projects/:id/files    — 인덱싱된 파일 목록
POST   /api/ai/projects/:id/search   — 벡터 유사도 검색

[사용량]
GET    /api/ai/usage                 — 사용량 조회 (일일/월간)
```

#### 필요 라이브러리
```
@google/generative-ai              # Gemini API SDK
langchain @langchain/google-genai  # LangChain (선택, RAG 파이프라인 추상화)
```

#### RAG 아키텍처
```
[사용자 질문]
      │
      ▼
[질문 임베딩] ──→ [pgvector 코사인 유사도 검색] ──→ [Top-K 청크]
                                                          │
[현재 열린 파일] ─────────────────────────────────────────┤
                                                          ▼
                                                  [프롬프트 구성]
                                                          │
                                                          ▼
                                                  [Gemini API]
                                                          │
                                                          ▼
                                                  [SSE 스트리밍 응답]
```

---

### Part 11. 구독 결제 시스템 (PAY)

> **담당**: 1명 (Part 2 담당자와 공유 가능)
> **체크리스트**: PAY-01 ~ PAY-04 (4개 항목)
> **우선순위**: P1

#### 프론트엔드 현재 상태
| 항목 | 상태 | 파일 |
|------|------|------|
| 구독 플랜 페이지 | UI 완료 | `src/pages/billing/PricingPage.tsx` — 무료/Pro/Team 비교 |
| 결제 내역 페이지 | UI 완료 | `src/pages/billing/BillingHistoryPage.tsx` — 이력 테이블 |
| 설정 페이지 구독 배지 | UI 완료 | `src/pages/settings/SettingsPage.tsx` |

#### API 엔드포인트
```
GET    /api/subscriptions/plans       — 플랜 정보 조회
GET    /api/subscriptions/me          — 내 구독 상태
POST   /api/subscriptions/checkout    — 결제 시작 (PG사 결제 URL 반환)
POST   /api/subscriptions/webhook     — PG사 웹훅 (결제 완료/실패)
PUT    /api/subscriptions/cancel      — 구독 취소
GET    /api/payments                  — 결제 내역 목록
GET    /api/payments/:id/receipt      — 영수증 다운로드
```

#### 필요 라이브러리
```
# Toss Payments 또는 Stripe (택 1)
@tosspayments/payment-sdk          # Toss Payments
# 또는
stripe                              # Stripe
```

#### 플랜 구조
| 플랜 | 월간 | 연간 | AI 일일 | AI 월간 | 프로젝트 | 멤버 |
|------|------|------|---------|---------|----------|------|
| 무료 | 0원 | 0원 | 10회 | 100회 | 3개 | 5명 |
| Pro | 12,000원 | 9,900원 | 100회 | 3,000회 | 무제한 | 30명 |
| Team | 29,000원 | 24,000원 | 무제한 | 무제한 | 무제한 | 무제한 |

---

### Part 12. 설정/프로필 백엔드 (SET)

> **담당**: Part 2 담당자
> **체크리스트**: SET-01 ~ SET-05 (5개 항목)
> **우선순위**: P1~P2

#### API 엔드포인트
```
GET    /api/settings                 — 사용자 설정 조회
PUT    /api/settings/theme           — 테마 변경
PUT    /api/settings/notifications   — 알림 설정 변경
PUT    /api/settings/password        — 비밀번호 변경 (현재 비밀번호 확인)
PUT    /api/settings/social/:provider — 소셜 계정 연동/해제
DELETE /api/settings/account         — 계정 탈퇴 (확인 텍스트 검증)
```

---

## 팀원별 역할 분배 제안

| 역할 | 담당 파트 | 핵심 기술 |
|------|----------|----------|
| **백엔드 A** (리드) | Part 1 (인프라) + Part 2 (인증) + Part 11 (결제) + Part 12 (설정) | NestJS, JWT, OAuth, PG |
| **백엔드 B** | Part 3 (그룹/프로젝트) + Part 4 (대시보드) + Part 7 (일정/할 일) | NestJS, TypeORM, REST API |
| **백엔드 C** | Part 5 (문서 에디터) + Part 8 (메신저) | Socket.IO, Yjs/Hocuspocus, CRDT |
| **백엔드 D** | Part 6 (코드 에디터 + Docker) + Part 9 (음성/화면) | Docker, LiveKit, WebRTC |
| **프론트엔드** (김경빈) | UI 유지보수 + API 연동 + Part 10 (AI) 프론트 | React, API 연동, Gemini |

> 팀 인원 5명 중 프론트 1명(김경빈)은 이미 UI 작업 완료.
> 나머지 4명이 백엔드를 분담하되, AI RAG 파이프라인은 가장 자신 있는 사람이 맡으면 좋습니다.

---

## 개발 우선순위 로드맵

```
[1주차] ─────────────────────────────────────────────────
  Part 1: NestJS 초기 설정, DB 마이그레이션, Docker Compose
  Part 2: 회원가입/로그인 API (JWT)

[2주차] ─────────────────────────────────────────────────
  Part 2: OAuth 소셜 로그인, 프로필 관리
  Part 3: 그룹/프로젝트/페이지 CRUD API

[3주차] ─────────────────────────────────────────────────
  Part 5: Socket.IO 서버 + Yjs/Hocuspocus (문서 실시간 편집)
  Part 6: Docker 코드 실행 환경 구축 + 실행 API
  Part 8: 채팅 메시지 API + Socket.IO 이벤트

[4주차] ─────────────────────────────────────────────────
  Part 7: 할 일/일정 API
  Part 9: LiveKit 서버 설정 + 음성/화면 공유
  Part 10 Phase 1: 기본 AI 채팅 (Gemini API)

[5주차] ─────────────────────────────────────────────────
  Part 10 Phase 2: RAG 파이프라인 (벡터 임베딩 + 검색)
  Part 11: 결제 시스템 연동
  프론트-백 통합 테스트 시작

[6주차] ─────────────────────────────────────────────────
  버그 수정, 성능 최적화, GCP 배포
  Part 10 Phase 3: RAG 고급 기능
  최종 테스트 및 발표 준비
```

---

## 프론트엔드 API 연동 가이드

### Axios 설정 (프론트에서 구현 필요)
```typescript
// src/lib/axios.ts
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// Request: Access Token 자동 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response: 401 시 Refresh Token으로 갱신
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // POST /api/auth/refresh → 새 Access Token
      // 실패 시 로그아웃 처리
    }
    return Promise.reject(error)
  }
)
```

### Store 변경 패턴
```typescript
// 변경 전 (목업)
login(user: User) { set({ isAuthenticated: true, user }) }

// 변경 후 (API 연동)
async login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password })
  localStorage.setItem('accessToken', data.accessToken)
  set({ isAuthenticated: true, user: data.user })
}
```

---

## 참고 문서

| 문서 | 설명 |
|------|------|
| [PROJECT.md](./PROJECT.md) | 프로젝트 소개, 핵심 기능, 경쟁사 분석 |
| [TECH.md](./TECH.md) | 기술 명세서, 시스템 아키텍처, API 설계 |
| [ERD.md](./ERD.md) | DB 스키마 설계, 상세 SQL, 테이블 관계 |
| [checklist.md](./checklist.md) | 전체 기능 체크리스트 (173개 항목) |

---

*마지막 업데이트: 2026-03-06*
*팀명: 4학년의 무게 | 계명대학교 컴퓨터공학과*
