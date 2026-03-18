# SyncFlow - 백엔드 개발 가이드

> 백엔드 개발자를 위한 **핵심 구현 가이드**.
> API 엔드포인트 전체 목록은 [TECH.md](./TECH.md) §6, DB 스키마는 [ERD.md](./ERD.md) 참조.

---

## 현재 상태

### 프론트엔드 (98% 완료)
- React 19 + TypeScript + TailwindCSS v4 + Vite 7.3
- Zustand 13개 store (useThreadStore, useCustomFieldStore 추가), React Router v7
- UI 83/84개 항목 목업 데이터로 동작 확인 완료 (99%)
- Slack 스타일 UI 리팩토링 완료: 통합 사이드바, Cmd+K 검색, 하단 액션바
- 칸반 커스텀 컬럼(최대 7개), 서브태스크 체크리스트, 액션아이템 리뷰 스크린 구현 완료
- 칸반 퀵액션 (인라인 편집, 커버 컬러, 빈 보드 가이드) 완료
- 커스텀 필드 (6종 타입, 리스트뷰 동적 컬럼, 모달 편집, 다중 담당자) 완료
- 스레딩 UI (ThreadPanel, hover 액션바, 답글 달기) 완료
- AI 통합 (Cmd+K AI 감지, @AI 봇 응답, 제안 칩, 컨텍스트 배너) 완료
- 문서 블록 시스템 (슬래시 커맨드 13종, 콜아웃/토글 커스텀 노드) 완료
- 외부 조직 공유 채널 (Slack Connect 방식: 초대 모달, 조직 배지, 멤버 그룹핑) 완료
- 미완료 1건: 고급 필터(기본만)

### 백엔드 (초기 설정 완료)
- NestJS 11 프로젝트 (`backend/`)
- 주요 라이브러리 설치 완료 (TypeORM, JWT, Passport, Socket.IO, LiveKit SDK, Gemini AI, Dockerode, ioredis 등)
- Docker Compose: PostgreSQL(pgvector 16) + Redis(7-alpine) — 정상 구동 확인
- Vite 프록시: `/api` → `localhost:3000`, `/socket.io` → ws
- 14개 모듈 폴더 생성 완료 (전부 비어있음)
- **API/기능 구현은 미착수** — Hello World만 응답하는 상태

---

## Part 1. 프로젝트 초기 설정

> P0 — 가장 먼저 진행

**상태**: NestJS, Docker Compose, 환경변수 설정 완료

**남은 작업**:
- ERD.md 기반 DB 마이그레이션 실행 (27개 테이블 + meeting 5개)
- CI/CD 기본 파이프라인 (선택)

---

## Part 2. 인증 시스템

> P0 — 모든 기능의 기반

**프론트 파일**: `LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx`, `ProfilePage.tsx`, `useAuthStore.ts`

**핵심 구현 사항**:
- Access Token 15분, Refresh Token 7일 (httpOnly 쿠키)
- bcrypt salt rounds: 12
- OAuth: Authorization Code → 백엔드 토큰 교환 → JWT 발급
- 프론트 연동: `useAuthStore.login()` → `POST /api/auth/login` 교체, Axios interceptor에서 401 시 refresh

---

## Part 3. 그룹/프로젝트/페이지

> P0 — 핵심 데이터 구조

**프론트 파일**: `Sidebar.tsx`, `GroupPage.tsx`, `CreateGroupModal.tsx`, `JoinGroupModal.tsx`, `MemberPanel.tsx`

**핵심 구현 사항**:
- 그룹 생성 시 nanoid로 8자리 초대 코드 자동 발급
- 멤버 역할: Owner/Admin/Member/Guest 4단계
- 페이지 타입: `document` | `code`, content는 JSONB (TipTap JSON 또는 코드 텍스트)
- 사이드바 트리: `sort_order` 기반 정렬, 드래그 reorder API

---

## Part 4. 대시보드

> P1

**`GET /api/dashboard` 응답 구조**:
```json
{
  "groups": [],
  "recentPages": [],
  "myTasks": [],
  "upcomingMeetings": []
}
```

---

## Part 5. 문서 에디터 — 실시간 협업

> P0 — 핵심 기능

**프론트 파일**: `DocumentEditorPage.tsx`

**핵심 구현 사항**:
1. Hocuspocus 서버 설정 (Yjs CRDT, TipTap 공식 권장)
2. TipTap Collaboration Extension + Awareness Protocol (라이브 커서)
3. 문서 자동 저장: Hocuspocus → PostgreSQL pages.content (디바운싱)
4. Socket.IO Redis 어댑터 (다중 서버 스케일링)
5. 이미지/파일 업로드 → Cloud Storage
6. PDF 내보내기 (puppeteer), DOCX 내보내기 (docx)
7. page_versions 테이블로 버전 히스토리

**아키텍처**: `[클라이언트 TipTap] ←→ [Hocuspocus] ←→ [PostgreSQL] + [Redis pub/sub]`

---

## Part 6. 코드 에디터 + Docker 실행

> ⏸️ **후순위** — 킬러 피처(AI 회의) 및 핵심 기능 구현 후 진행. 프론트 UI는 완료 상태

**프론트 파일**: `CodeEditorPage.tsx`

**핵심 구현 사항**:
1. 언어별 Docker 이미지 빌드: python:3.11-slim, node:20-slim, openjdk:17-slim, gcc:latest
2. 보안: CPU 1코어, 메모리 256MB, 30초 타임아웃, 네트워크 차단, 실행 후 즉시 삭제
3. 웹 결과(HTML/CSS/JS): 임시 정적 서버 → iframe/새 탭
4. y-monaco 바인딩으로 코드 동시 편집
5. 컨테이너 풀 관리 (P1): 사전 워밍, cold start 최소화

---

## Part 7. 작업/일정 관리

> P0~P1

**프론트 파일**: `TasksPage.tsx`, `KanbanBoard.tsx`, `CalendarView.tsx`, `GanttChart.tsx`, `ListView.tsx`, `TaskModal.tsx`

**핵심 구현 사항**:
- 커스텀 상태 컬럼: 기본 3개(todo/in_progress/done) + 채널별 추가 가능
- 서브태스크: tasks.parent_task_id 자기 참조
- 회의 출처: tasks.meeting_id → "회의에서 생성" 배지
- 칸반 드래그: `PUT /api/tasks/:id/status` + `PUT /api/tasks/:id/reorder`
- 고급 필터: assignee, priority, date range, keyword 복합 쿼리
- **커스텀 필드**: custom_field_definitions 테이블 (id, name, type, options JSONB) + custom_field_values 테이블 (task_id, field_id, value JSONB) 추가 필요
- **다중 담당자**: task_assignees 조인 테이블 (task_id, user_id) 추가 필요

---

## Part 8. 메신저 — 채팅 + 스레드

> P0

**프론트 파일**: `ChannelView.tsx`, `ThreadPanel.tsx`, `useThreadStore.ts`

**프론트엔드 스레드 UI 완료 상태**:
- ThreadPanel 컴포넌트: 부모 메시지 강조 + 답글 목록 + 답글 입력 (Enter 전송)
- 메시지 hover 액션바: 답글 달기, 작업으로 전환, 이모지 반응
- "N개 답글" 클릭 → DetailPanel 스레드 모드 오픈
- @AI 멘션 시 mock AI 봇 응답 (1.5초 딜레이)

**핵심 구현 사항**:
- 스레드: messages.parent_message_id, `GET /api/messages/:id/thread`
- 채널 목록: groupId 파라미터로 필터, DM은 그룹 무관
- cursor 기반 페이지네이션 (messages.created_at 역순)
- Socket.IO: `chat:message`, `chat:typing`, `chat:read`, `chat:reaction`
- 작업 연동: #작업명 파싱 → 작업 카드 임베드, 메시지→작업 전환 API

---

## Part 9. 음성 채팅 + 화면 공유

> P0

**프론트 파일**: `BottomToolbar.tsx`, `VoiceChatPanel.tsx`

**핵심 구현 사항**:
1. LiveKit 서버: Docker `livekit/livekit-server`, TURN 서버 (방화벽 대응)
2. `POST /api/livekit/token` → roomName: `voice-{groupId}`, participantName
3. 프론트 LiveKit SDK: `@livekit/components-react` + `livekit-client`
4. 화면 공유: `localParticipant.setScreenShareEnabled(true)`
5. Follow Me: Socket.IO 뷰포트 동기화 브로드캐스트
6. 그룹 전환 시 disconnect → 새 그룹 connect

---

## Part 10. AI 회의 어시스턴트 — 킬러 피처

> P0 — **프로젝트 핵심 차별화 기능**

**핵심 구현 사항 (3 Phase)**:

**Phase 1 — STT 파이프라인**:
1. STT API 선정/테스트 (Google Cloud STT vs Whisper)
2. LiveKit 음성 스트림 → STT 파이프라인 연결
3. 화자 분리 (Speaker Diarization)
4. Socket.IO `meeting:transcript` 실시간 전송
5. meetings, meeting_participants, meeting_transcripts 테이블 CRUD

**Phase 2 — 회의록 + 작업 자동 등록**:
6. 회의 종료 → STT 전체 텍스트 + RAG 컨텍스트 → Gemini → 회의록 생성
7. 액션 아이템 추출 (Gemini 프롬프트 엔지니어링)
8. **액션아이템 리뷰 스크린**: meeting_action_items에 저장 → 사용자 편집/확인 → confirmed=true인 항목만 tasks 테이블에 일괄 등록 (meeting_id 포함)
9. 회의록을 pages 테이블에 문서 페이지로 자동 생성

**Phase 3 — 실시간 제안**:
10. 실시간 STT → RAG 검색 → `meeting:suggestion` 관련 자료 제안
11. 회의 이력 조회 API + UI

---

## Part 11. AI 어시스턴트 — RAG 파이프라인

> P0

**프론트 파일**: `AISidePanel.tsx`, `useAIStore.ts`, `AIContextBanner.tsx`, `SearchModal.tsx`

**프론트엔드 인라인 AI 완료 상태**:
- Cmd+K 검색에서 AI 질문 패턴 감지 → "AI에게 질문하기" 1순위 표시
- @AI 채널 멘션 시 mock 봇 응답
- AI 패널 제안 칩 ("이 문서 요약해줘" 등)
- AIContextBanner: 회의 종료 시 "회의록 생성할까요?" 배너

**핵심 구현 사항 (3 Phase)**:

**Phase 1 — 기본 AI 채팅**:
1. `POST /api/ai/chat` → Gemini API + SSE 스트리밍
2. ai_conversations, ai_messages CRUD
3. 사용자별 사용량 추적 (일일/월간)
4. **인라인 AI 엔드포인트 추가**: `POST /api/ai/inline-query` — Cmd+K에서 직접 질문, @AI 채널 멘션 응답

**Phase 2 — RAG**:
4. 벡터 임베딩: 문서/코드 저장 시 청킹 → Embedding API → pgvector
5. 문서 수정 시 해당 청크 재임베딩
6. 코사인 유사도 검색 → Top-K 컨텍스트 추출
7. 프롬프트: System → RAG Context → Current File → User Query

**Phase 3 — 고급 기능**:
8. @파일 멘션 시 전체 내용 컨텍스트 포함
9. Admin/Tester 무료 사용
10. RAG 캐싱 (Redis)

---

## Part 12. 구독 결제

> P1

**프론트 파일**: `PricingPage.tsx`, `BillingHistoryPage.tsx`

**플랜 구조**:

| 플랜 | 월간 | AI 일일 | 프로젝트 | 멤버 |
|------|------|---------|----------|------|
| 무료 | 0원 | 10회 | 3개 | 5명 |
| Pro | 12,000원 | 100회 | 무제한 | 30명 |
| Team | 29,000원 | 무제한 | 무제한 | 무제한 |

PG사: Toss Payments 또는 Stripe (미결정)

---

## Part 13. 설정/프로필

> P1~P2

**프론트 파일**: `SettingsPage.tsx`

테마, 알림, 비밀번호 변경, 소셜 연동/해제, 계정 탈퇴.

---

## 프론트엔드 API 연동 패턴

### Axios 설정
```typescript
// src/lib/axios.ts
const api = axios.create({ baseURL: '/api', timeout: 10000 })

// Request: Access Token 자동 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response: 401 시 refresh → 실패 시 로그아웃
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

| 문서 | 역할 |
|------|------|
| [PROJECT.md](./PROJECT.md) | 프로젝트 개요, 경쟁 포지셔닝, 설계 결정 |
| [TECH.md](./TECH.md) | 기술 사양, API 엔드포인트, 아키텍처 |
| [ERD.md](./ERD.md) | DB 스키마 (27개 테이블), SQL |
| [checklist.md](./checklist.md) | 기능 체크리스트 (185개 항목) |

---

*마지막 업데이트: 2026-03-18*
