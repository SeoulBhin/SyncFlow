# SyncFlow - 기술 명세서

> 순수 기술 사양 문서. 프로젝트 개요·기능 설명은 [PROJECT.md](./PROJECT.md), DB 스키마는 [ERD.md](./ERD.md) 참조.

---

## 1. 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│                        Client                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ React 19 +  │  │ Monaco       │  │ LiveKit Client  │ │
│  │ TypeScript  │  │ Editor       │  │ (음성/WebRTC)   │ │
│  │ TipTap      │  │ (코드 편집)  │  │                 │ │
│  │ (문서 편집) │  │              │  │                 │ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬─────────┘ │
│         │                │                   │           │
│         └────────┬───────┘                   │           │
│                  │                           │           │
│         Socket.IO Client              LiveKit SDK        │
└──────────────────┼───────────────────────────┼───────────┘
                   │ WSS                       │ WSS
┌──────────────────┼───────────────────────────┼───────────┐
│                  │        GCP Server         │           │
│  ┌───────────────▼───────────────────┐       │           │
│  │      Node.js + NestJS 11          │       │           │
│  │  ┌──────────┐  ┌───────────────┐  │  ┌───▼────────┐  │
│  │  │ REST API │  │ Socket.IO     │  │  │ LiveKit    │  │
│  │  │          │  │ Server        │  │  │ Server     │  │
│  │  │ - Auth   │  │ - 실시간 편집 │  │  │ - 음성채팅 │  │
│  │  │ - CRUD   │  │ - 라이브 커서 │  │  │ - WebRTC   │  │
│  │  │ - RAG AI │  │ - 채팅/스레드 │  │  │ - STT 연동 │  │
│  │  └────┬─────┘  └──────┬────────┘  │  └────────────┘  │
│  │       │               │           │                   │
│  └───────┼───────────────┼───────────┘                   │
│          │               │                               │
│  ┌───────▼───────────────▼─────────┐  ┌───────────────┐  │
│  │      PostgreSQL + pgvector       │  │    Docker      │  │
│  │  - Users, Groups, Documents     │  │  코드 실행     │  │
│  │  - Tasks, Messages, Meetings    │  │  샌드박스      │  │
│  │  - Embeddings (벡터 768-dim)    │  │                │  │
│  └─────────────────────────────────┘  └───────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │    Redis     │  │ Cloud Storage │  │ Gemini API    │  │
│  │  세션/캐시   │  │  파일 업로드  │  │  + RAG 파이프 │  │
│  └──────────────┘  └───────────────┘  │  라인         │  │
│                                       └───────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 2. 기술 스택 상세

### 프론트엔드

| 기술 | 용도 | 버전/비고 |
|------|------|-----------|
| React | UI 프레임워크 | 19 |
| TypeScript | 타입 안전성 | 5.9 |
| Vite | 빌드 도구 | 7.3 |
| TipTap | 문서 WYSIWYG 에디터 | ProseMirror 기반, Yjs Collaboration |
| Monaco Editor | 코드 에디터 | VS Code 엔진, y-monaco 바인딩 |
| Socket.IO Client | 실시간 통신 | WebSocket |
| LiveKit Client SDK | 음성 채팅 + 화면 공유 | WebRTC |
| TailwindCSS | 스타일링 | v4 |
| Zustand | 상태 관리 | 5, 9개 store |
| React Router | 라우팅 | v7 |

### 백엔드

| 기술 | 용도 | 버전/비고 |
|------|------|-----------|
| Node.js | 런타임 | 20 LTS |
| NestJS | REST API + WebSocket | 11, `backend/` 폴더 |
| TypeORM | PostgreSQL ORM | `@nestjs/typeorm` |
| Socket.IO Server | 실시간 이벤트 | `@nestjs/websockets` |
| Passport.js | 인증 (JWT + OAuth) | `@nestjs/passport` |
| Dockerode | Docker API (코드 실행) | |
| Hocuspocus | Yjs CRDT 서버 | TipTap 공식 권장 |
| livekit-server-sdk | LiveKit 토큰 생성 | |

### 데이터베이스 & 캐시

| 기술 | 용도 |
|------|------|
| PostgreSQL 15+ (pgvector) | 주 DB + 벡터 유사도 검색 (768-dim) |
| Redis 7 | 세션, 캐시, Socket.IO pub/sub |

### 인프라

| 기술 | 용도 |
|------|------|
| Google Cloud Platform | Compute Engine, Cloud Storage, Cloud SQL |
| Docker | 코드 실행 샌드박스 (언어별 이미지) |
| LiveKit Server | WebRTC 음성 + 화면 공유 (GCP 셀프 호스팅) |
| Nginx | 리버스 프록시, SSL 종료 |

### 외부 API

| 기술 | 용도 |
|------|------|
| Google Gemini API | AI 텍스트 생성 (RAG 기반) |
| Google Embedding API | 텍스트 → 768차원 벡터 임베딩 |
| Google Cloud STT / Whisper | 음성 → 텍스트 변환 |
| Google/GitHub/Kakao OAuth | 소셜 로그인 |

---

## 3. 회의 AI 파이프라인 아키텍처

```
[LiveKit 음성 스트림]
       │
       ▼
[STT API (Google STT / Whisper)]
       │
       ├──→ [Socket.IO: meeting:transcript] ──→ [클라이언트 실시간 자막]
       │
       ▼
[화자 분리 + 텍스트 축적 → meeting_transcripts 테이블]
       │
       ├──→ [RAG 검색] ──→ [Socket.IO: meeting:suggestion] ──→ [관련 자료 제안]
       │
       ▼ (회의 종료 시)
[전체 텍스트 + RAG 컨텍스트 → Gemini API]
       │
       ├──→ [회의록 자동 생성] ──→ [meeting_summaries + pages 테이블]
       │
       └──→ [액션 아이템 추출] ──→ [meeting_action_items 테이블]
                                        │
                                        ▼
                              [사용자 리뷰 스크린]
                              (편집 / 확인 / 삭제)
                                        │
                                        ▼
                              [confirmed=true → tasks 테이블 일괄 등록]
                              (task.meeting_id로 회의 출처 추적)
```

### STT 파이프라인 사양

| 항목 | 사양 |
|------|------|
| 스트리밍 방식 | LiveKit 음성 스트림 → 서버 STT → Socket.IO 실시간 전송 |
| 화자 분리 | STT API Speaker Diarization 활용 |
| 성능 목표 | 발화 후 2초 이내 텍스트 표시 |
| 회의록 구조 | 참석자, 주제별 요약, 결정 사항, 액션 아이템(담당자/마감일) |
| 액션아이템 추출 | Gemini API 프롬프트 기반 NLP — 작업 제목, 담당자(멘션), 마감일, 우선순위 |

---

## 4. RAG 파이프라인 아키텍처

```
[문서/코드 저장 시]
       │
       ▼
[텍스트 청킹 (512~1024 토큰)]
       │
       ▼
[Google Embedding API → 768차원 벡터]
       │
       ▼
[pgvector embeddings 테이블 저장]
       │ (문서 수정 시 해당 청크 재임베딩)

[사용자 질문 시]
       │
       ▼
[질문 임베딩] ──→ [pgvector 코사인 유사도 검색 → Top-K 청크]
                                                       │
[현재 열린 파일] ──────────────────────────────────────┤
                                                       ▼
                                               [프롬프트 구성]
                                               System → RAG Context → Current File → Query
                                                       │
                                                       ▼
                                               [Gemini API → SSE 스트리밍 응답]
```

---

## 5. UI 아키텍처 사양

### 5.1 네비게이션 — Slack 스타일 통합 사이드바

| 요소 | 사양 |
|------|------|
| 사이드바 구조 | 조직 선택기 → 즐겨찾기 → 채널(접힘) → DM(접힘) → 프로젝트(접힘) |
| 퀵 서처 | Cmd+K 단축키, 채널/DM/프로젝트/페이지 통합 검색 |
| 배지 | 읽지 않은 메시지 수, 접속 상태(online/offline) 표시 |
| 하단 툴바 | 순수 액션바: 회의 시작, 음성, 화면공유, 채팅 토글 (채널 피커 제거) |

### 5.2 스레딩 — Slack 스타일 단일 레벨

| 요소 | 사양 |
|------|------|
| 데이터 모델 | messages.parent_message_id (NULL = 메인), reply_count 가상 필드 |
| UI | 메인 채널 + 오른쪽 스레드 패널 분리 |
| 인디케이터 | "N개 답글" 클릭 → 스레드 패널 오픈 |

### 5.3 작업 관리 강화

| 요소 | 사양 |
|------|------|
| 커스텀 상태 | 5-7 컬럼, 채널별 설정 가능 (task_statuses 설정 또는 JSONB) |
| 서브태스크 | tasks.parent_task_id 자기 참조, 체크리스트 UI |
| 고급 필터 | 담당자 / 우선순위 / 날짜 범위 / 키워드 복합 필터 |
| 회의 연동 | tasks.meeting_id로 출처 추적, "회의에서 생성" 배지 |

### 5.4 작업-소통 연동

| 요소 | 사양 |
|------|------|
| 채팅 임베드 | #작업명 입력 시 작업 카드 임베드 |
| 메시지→작업 | 메시지 우클릭 → "작업 생성" 컨텍스트 메뉴 |
| 자동 알림 | 작업 상태 변경 시 관련 채널에 시스템 메시지 자동 발송 |

### 5.5 권한 모델

| 역할 | 권한 |
|------|------|
| Owner | 전체 관리, 조직 삭제, 소유권 이전 |
| Admin | 멤버 관리, 채널 관리, 설정 변경, AI 무료 |
| Member | 문서/코드 편집, 작업/일정 관리, 메신저/음성 |
| Guest | 초대된 채널만 접근, 읽기 중심 |
| 채널별 오버라이드 | channel_members.permission_override JSONB |

---

## 6. API 엔드포인트 (단일 소스)

### 인증

```
POST   /api/auth/register              회원가입
POST   /api/auth/login                 로그인 (JWT 발급)
POST   /api/auth/refresh               토큰 갱신
POST   /api/auth/logout                Refresh Token 무효화
POST   /api/auth/forgot-password       비밀번호 재설정 링크 발송
POST   /api/auth/reset-password        새 비밀번호 설정
GET    /api/auth/me                    현재 사용자 정보
PUT    /api/auth/profile               프로필 수정
POST   /api/auth/profile/avatar        프로필 사진 업로드
GET    /api/auth/oauth/:provider       OAuth 시작
GET    /api/auth/oauth/:provider/cb    OAuth 콜백
```

### 그룹

```
POST   /api/groups                     그룹 생성 (자동 초대코드)
GET    /api/groups                     내 그룹 목록
GET    /api/groups/:id                 그룹 상세
PUT    /api/groups/:id                 그룹 설정 변경
DELETE /api/groups/:id                 그룹 삭제 (Owner만)
POST   /api/groups/:id/regenerate-code 초대 코드 재발급
POST   /api/groups/join                초대 코드로 참여
GET    /api/groups/:id/members         멤버 목록
PUT    /api/groups/:id/members/:uid    멤버 역할 변경
DELETE /api/groups/:id/members/:uid    멤버 강퇴
```

### 프로젝트 / 페이지

```
POST   /api/projects                   프로젝트 생성
GET    /api/groups/:id/projects        그룹 내 프로젝트 목록
GET    /api/projects/:id               프로젝트 상세
PUT    /api/projects/:id               프로젝트 수정
DELETE /api/projects/:id               프로젝트 삭제

POST   /api/pages                      페이지 생성 (document | code)
GET    /api/projects/:id/pages         페이지 목록 (트리)
GET    /api/pages/:id                  페이지 상세 (content 포함)
PUT    /api/pages/:id                  페이지 내용 저장
PUT    /api/pages/:id/title            제목 변경
PUT    /api/pages/:id/reorder          순서 변경
DELETE /api/pages/:id                  페이지 삭제
```

### 작업 / 일정

```
POST   /api/tasks                      할 일 생성
GET    /api/projects/:id/tasks         프로젝트 내 할 일 목록
GET    /api/tasks/:id                  할 일 상세
PUT    /api/tasks/:id                  할 일 수정
PUT    /api/tasks/:id/status           상태 변경 (칸반 드래그)
PUT    /api/tasks/:id/reorder          순서 변경
DELETE /api/tasks/:id                  할 일 삭제

POST   /api/schedules                  일정 생성
GET    /api/projects/:id/schedules     일정 목록
PUT    /api/schedules/:id              일정 수정
DELETE /api/schedules/:id              일정 삭제
```

### 채팅 / 메시지

```
GET    /api/groups/:id/channels        채널 목록
POST   /api/channels                   채널 생성 (DM 시작)
GET    /api/channels/:id               채널 정보

GET    /api/channels/:id/messages      메시지 목록 (cursor 페이지네이션)
POST   /api/channels/:id/messages      메시지 전송
PUT    /api/messages/:id               메시지 수정
DELETE /api/messages/:id               메시지 삭제
GET    /api/messages/:id/thread        스레드 메시지 목록

POST   /api/messages/:id/reactions     이모지 반응
DELETE /api/messages/:id/reactions/:e   반응 취소
PUT    /api/channels/:id/read          읽음 처리
GET    /api/channels/:id/search?q=     메시지 검색
```

### 코드 실행

```
POST   /api/code/execute               코드 실행
GET    /api/code/languages             지원 언어 목록
GET    /api/code/result/:id            웹 결과 조회 (HTML/CSS/JS)
```

### 회의 AI

```
POST   /api/meetings                   회의 세션 생성
PUT    /api/meetings/:id/end           회의 종료 → 회의록 트리거
GET    /api/meetings/:id               회의 상세
GET    /api/meetings/:id/transcript    STT 전체 텍스트
GET    /api/meetings/:id/summary       AI 회의록
GET    /api/meetings/:id/action-items  액션 아이템 목록
PUT    /api/meetings/:id/action-items/:aid  액션 아이템 편집
POST   /api/meetings/:id/action-items/confirm  확인 → 작업 일괄 등록
GET    /api/projects/:id/meetings      프로젝트 회의 이력
```

### AI 어시스턴트

```
POST   /api/ai/chat                    AI 질문 (SSE 스트리밍)
GET    /api/ai/conversations           대화 목록
POST   /api/ai/conversations           새 대화 생성
GET    /api/ai/conversations/:id       대화 메시지 목록
DELETE /api/ai/conversations/:id       대화 삭제

POST   /api/ai/projects/:id/index     프로젝트 인덱싱 (벡터 임베딩)
GET    /api/ai/projects/:id/files      인덱싱된 파일 목록
POST   /api/ai/projects/:id/search    벡터 유사도 검색
GET    /api/ai/usage                   사용량 조회
```

### 음성 / 화면 공유

```
POST   /api/livekit/token              LiveKit 접속 토큰 발급
```

### 구독 / 결제

```
GET    /api/subscriptions/plans        플랜 정보
GET    /api/subscriptions/me           내 구독 상태
POST   /api/subscriptions/checkout     결제 시작
POST   /api/subscriptions/webhook      PG사 웹훅
PUT    /api/subscriptions/cancel       구독 취소
GET    /api/payments                   결제 내역
```

### 설정

```
GET    /api/settings                   사용자 설정 조회
PUT    /api/settings/theme             테마 변경
PUT    /api/settings/notifications     알림 설정
PUT    /api/settings/password          비밀번호 변경
PUT    /api/settings/social/:provider  소셜 연동/해제
DELETE /api/settings/account           계정 탈퇴
```

### 대시보드

```
GET    /api/dashboard                  종합 데이터 (그룹, 최근 페이지, 내 작업, 예정 회의)
```

---

## 7. Socket.IO 이벤트

```
[문서 편집]
document:join(pageId)                 페이지 입장
document:leave(pageId)                페이지 퇴장
document:update(delta)                Yjs 변경분 동기화
document:cursor(position)             커서 위치 브로드캐스트
document:save-status(status)          저장 상태 알림

[채팅]
chat:message(channelId, message)      새 메시지 전송
chat:typing(channelId, userId)        입력 중 표시
chat:read(channelId, userId)          읽음 상태
chat:reaction(messageId, emoji)       이모지 반응

[회의]
meeting:start(meetingId)              회의 시작
meeting:end(meetingId)                회의 종료
meeting:transcript(text, speaker)     실시간 STT 텍스트
meeting:suggestion(documents)         관련 자료 제안

[Yjs Awareness]
awareness:update(states)              온라인 사용자 커서/선택 상태
```

---

## 8. 보안

| 영역 | 기술/방안 |
|------|-----------|
| 인증 | JWT (Access 15분 + Refresh 7일), HTTPS 필수 |
| 비밀번호 | bcrypt (salt rounds: 12) |
| 코드 실행 | Docker 격리, CPU 1코어, 메모리 256MB, 30초 타임아웃, 네트워크 차단 |
| 입력 검증 | class-validator DTO, XSS/SQL Injection/CSRF 방지 |
| OAuth | Authorization Code → 백엔드 토큰 교환 → JWT 발급 |
| 권한 | 4역할(Owner/Admin/Member/Guest) + 채널별 오버라이드 |

---

## 9. 백엔드 모듈 구조

```
backend/src/
├── main.ts                    # CORS, ValidationPipe, /api prefix
├── app.module.ts              # ConfigModule, TypeORM
├── auth/                      # JWT, OAuth, 프로필
├── groups/                    # CRUD, 초대, 멤버, 권한
├── projects/                  # 프로젝트 CRUD
├── pages/                     # 문서/코드 페이지
├── tasks/                     # 할 일 (커스텀 상태, 서브태스크)
├── schedules/                 # 일정
├── channels/                  # 채팅 채널
├── messages/                  # 메시지, 스레드, 반응
├── meetings/                  # 회의 세션, STT, 회의록, 액션아이템
├── ai/                        # RAG, Gemini, 임베딩
├── voice-chat/                # LiveKit 토큰
├── screen-share/              # 화면 공유
├── subscriptions/             # 구독/결제
├── settings/                  # 사용자 설정
└── common/                    # entities, guards, decorators, interceptors
```

---

## 10. 개발 환경

```bash
# Docker로 PostgreSQL + Redis 실행
docker compose up -d

# 백엔드 (localhost:3000)
cd backend && npm run start:dev

# 프론트엔드 (localhost:5174, /api → :3000 프록시)
npm run dev
```

---

*마지막 업데이트: 2026-03-11*
