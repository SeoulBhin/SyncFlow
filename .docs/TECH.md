# SyncFlow - 기술 명세서 (TECH)

---

## 1. 실시간 협업 — 동시 수정 · 라이브 커서 · 음성 채팅 · 메신저 · 일정 관리

### 1.1 동시 수정 기능
- **기술**: Socket.IO (WebSocket) + CRDT (Conflict-free Replicated Data Types)
- **구현**: TipTap Collaboration Extension (Yjs 기반 CRDT) 활용
- **동작**: 여러 팀원이 같은 문서·코드를 동시에 편집하면 변경 사항이 즉시 반영
- **성능 목표**: 10명 동시 편집 시 200ms 이내 동기화
- **관련 기술**: Delta Sync (변경분만 전송), 디바운싱(Debouncing), Redis 실시간 상태 캐싱

### 1.2 라이브 커서 기능
- **기술**: Socket.IO (WebSocket)
- **동작**: 팀원의 마우스 움직임과 텍스트 선택 영역이 화면에 실시간 표시
- **표시 정보**: 사용자 이름 라벨 + 커서 색상 구분
- **성능 목표**: 커서 위치 100ms 이내 전파
- **적용 범위**: 문서 에디터 + 코드 에디터 모두

### 1.3 내장 음성 채팅
- **기술**: LiveKit (오픈소스 WebRTC 서버)
- **동작**: 별도 앱 없이 작업 페이지 안에서 바로 음성 대화
- **그룹 컨텍스트**: 하단 툴바에서 선택한 활성 그룹의 음성 채널에 접속. 그룹 전환 시 기존 음성 연결 자동 해제 후 새 그룹 접속
- **세부 기능**:
  - 마이크 음소거/해제
  - 마이크 입력 볼륨(감도) 조절
  - 스피커 출력 볼륨 조절 (전체/개별)
  - 참여자 목록 표시: 작업 페이지에서도 하단 툴바에 현재 음성 접속자 아바타/이름을 간략히 표시
  - 음성 활동 표시기 (말하는 사람 시각적 표시)
  - 오디오 장치 선택 (마이크/스피커 변경)
  - 접속 중인 그룹명 배지 표시 (음성 패널 헤더 + 하단 툴바 중앙)
- **인프라**: LiveKit Server (GCP 셀프 호스팅), TURN 서버 (방화벽 환경 대응)
- **음질 보장**: 적응형 비트레이트, Echo Cancellation, Noise Suppression

### 1.4 메신저 — 두 가지 모드

#### 공통 기능 (그룹 페이지·작업 페이지 모두 동일)
- **기술**: Socket.IO (WebSocket) + LiveKit (1:1 음성 통화)
- **그룹 컨텍스트**: 활성 그룹의 채널만 표시. DM은 그룹과 무관하게 항상 접근 가능
- **세부 기능**:
  - 1:1 메시지: 멤버 클릭 → 대화 창 열기
  - 그룹 채팅 채널: 활성 그룹의 전체 채팅 + 프로젝트별 채팅
  - 1:1 음성 통화: 대화 창에서 전화 아이콘 클릭으로 바로 음성 통화
  - 새 메시지 배지 (읽지 않은 메시지 수 표시)
  - 이모지 반응, 파일 공유, @멘션

#### UI 형태만 다름
- **그룹 페이지**: 디스코드 스타일 풀 사이즈 — 활성 그룹 채널 목록 + 큰 메시지 창으로 편하게 소통
- **작업 페이지** (문서·코드 등): 하단 우측 메시지 아이콘 → 미니 팝업 (활성 그룹 채널 + DM)
- **원칙**: 기능은 어디서든 100% 동일, UI 형태만 다름

### 1.5 일정 관리
- **기술**: 자체 구현 (외부 라이브러리 없이 순수 React + TailwindCSS)
- **동작**: 프로젝트 마감일·우선순위·할 일 목록을 팀원과 함께 관리
- **그룹 컨텍스트**: 그룹별 필터로 전체 또는 특정 그룹의 할 일만 표시
- **4가지 뷰 지원**:
  - **칸반 보드**: To-Do / In Progress / Done 3열, 드래그앤드롭으로 상태 변경
  - **캘린더 뷰**: 월간 그리드, 날짜별 할 일 표시, 오늘 강조, 월 이동
  - **간트 차트**: 좌측 태스크 목록 + 우측 타임라인 막대, 우선순위 색상 구분
  - **리스트/테이블 뷰**: 정렬/필터 가능한 테이블, 마일스톤 진행률 바
- **세부 기능**:
  - 할 일 CRUD: 제목, 설명, 시작일/마감일, 우선순위(긴급/높음/보통/낮음), 담당자 선택, 삭제 확인
  - 우선순위 설정: 4단계 색상 구분
  - 담당자 지정: 그룹 멤버 드롭다운 선택
  - 진행 상태 관리: To-Do / In Progress / Done
  - 마일스톤 진행률 바 (리스트 뷰)

---

## 2. 올인원 작업 환경 — 문서 에디터 · 코드 에디터 · AI 어시스턴트

### 2.1 문서 에디터 (입→출력)
- **기술**: TipTap (ProseMirror 기반 WYSIWYG 에디터)
- **동작**: 리치 텍스트 편집, 작성 결과를 즉시 확인하며 동시 편집
- **세부 기능**:
  - WYSIWYG 리치 텍스트 편집 (서식, 표, 이미지 삽입 등)
  - 실시간 동시 편집 (Yjs CRDT 기반)
  - 라이브 커서 표시
  - 자동 저장
  - PDF 내보내기
  - DOCX 내보내기
  - 파일 업로드 (이미지, 첨부파일)
  - 버전 히스토리 (편집 이력 확인 및 복원)

### 2.2 코드 에디터 (입→출력)
- **기술**: Monaco Editor (VS Code 엔진)
- **동작**: 코드 작성 후 바로 실행, 콘솔 출력을 즉시 확인
- **지원 언어**: Python, JavaScript, Java, C, C++, HTML, CSS (7개)
- **코드 실행 환경**: Docker 컨테이너 기반 샌드박스
  - 각 실행 요청마다 독립된 컨테이너 생성
  - 리소스 제한: CPU 1코어, 메모리 256MB, 실행 시간 30초, 디스크 100MB
  - 네트워크 격리: 외부 네트워크 접근 차단
  - 읽기 전용 파일시스템: 사용자 코드만 임시 마운트
  - 실행 후 컨테이너 즉시 삭제
- **출력 방식**:
  - 콘솔 언어 (Python, Java, C, C++ 등): stdout/stderr 콘솔 출력창에 즉시 표시
  - 웹 언어 (HTML/CSS/JS, React 등): 결과물을 새 브라우저 창으로 띄워 실제 동작 확인
- **세부 기능**:
  - 구문 강조 (Syntax Highlighting)
  - 실시간 코드 동시 편집
  - 라이브 커서 (코드)
  - 기본 코드 자동 완성
  - 라인 번호 표시
  - 다크/라이트 테마 전환
- **다중 언어 관리**: 언어별 Docker 이미지 사전 빌드, 이미지 캐싱, 컨테이너 풀(Pool)로 cold start 최소화

### 2.3 AI 어시스턴트 (문서 + 코드 모두 지원)
- **기술**: Google Gemini API + RAG 파이프라인 (pgvector)
- **동작**: 문서 작성 보조(초안 생성·문장 다듬기) + 코드 에러 분석/해결
- **RAG (Retrieval-Augmented Generation) 파이프라인**:
  - **① 벡터 임베딩 파이프라인**
    - 문서/코드 저장 시 텍스트를 청크(Chunk) 단위로 분할 (512~1024 토큰)
    - 각 청크를 Google Embedding API로 벡터(768차원)로 변환
    - PostgreSQL + pgvector 확장에 벡터 저장
    - 문서 수정 시 해당 청크의 임베딩 자동 업데이트
  - **② 컨텍스트 자동 수집 및 검색**
    - 사용자가 AI 질문 시 자동 수집: 현재 열린 문서/코드, 콘솔 에러 로그, pgvector 코사인 유사도 검색으로 관련 문서 Top-K개
    - 수집된 컨텍스트를 구조화된 프롬프트로 조합
  - **③ 프롬프트 엔지니어링**
    - System Prompt → Context Section (RAG 결과) → Current Work → User Query
    - 토큰 제한 내 가장 관련도 높은 컨텍스트 우선 배치
- **세부 기능**:
  - AI 문서 작성 지원: 프로젝트 맥락 이해한 초안 생성, 문장 다듬기
  - AI 코드 디버깅 지원: 프로젝트 내 코드/문서 참조하여 에러 분석
  - AI 질문하기 버튼: 작업 중 즉시 AI에게 질문
  - AI 대화 히스토리
- **과금**: 구독형 결제 모델, Admin/Tester 계정 무료
- **비용 관리**: 사용자별 일일/월간 호출 횟수 제한, RAG 검색 결과 캐싱, 프롬프트 최적화

---

## 3. 화면 공유 & 프레젠테이션 모드

### 3.1 화면 공유
- **기술**: WebRTC (LiveKit 확장 또는 브라우저 Screen Capture API)
- **동작**: 작업 중인 화면을 팀원에게 실시간 전송
- **그룹 컨텍스트**: 활성 그룹 멤버에게만 화면 공유. 그룹 전환 시 공유 자동 중지. 상단 배너에 공유 중인 그룹명 표시
- **UI**: 하단 툴바의 화면 공유 버튼(모니터 아이콘)으로 즉시 시작 — 문서·코드 작업 중 페이지 이동 없이 사용
- **공유 옵션**: 전체 화면 / 특정 창 / 브라우저 탭 선택 가능

### 3.2 Follow Me 모드
- **기술**: Socket.IO (WebSocket) 기반 뷰포트 동기화
- **동작**: 발표자의 스크롤/클릭을 모든 팀원 화면이 자동 추적
- **활용**: 발표, 시연, 코드 리뷰 시 발표자 화면을 모든 참여자가 동일하게 확인

### 3.3 선택적 공유
- **기술**: Screen Capture API (getDisplayMedia)
- **동작**: 전체 화면, 특정 애플리케이션 창, 브라우저 탭 중 선택하여 공유
- **활용**: 필요한 화면만 선택적으로 공유하여 프라이버시 보호

### 3.4 음성 채팅 결합 프레젠테이션
- **기술**: LiveKit (음성) + WebRTC (화면 공유) 통합
- **동작**: 화면 공유 + 음성 채팅을 결합하여 Zoom 없이 발표/시연/코드 리뷰 수행
- **장점**: 별도 화상회의 앱 없이 작업 문서 안에서 발표 환경 구현

---

## 4. 사용자 관리 및 인증

### 4.1 이메일/비밀번호 인증
- **기술**: JWT (Access Token + Refresh Token)
- **보안**: 비밀번호 bcrypt 해싱, HTTPS 필수
- **기능**: 회원가입, 로그인, 비밀번호 재설정, 세션 관리
- **프론트엔드 UI (구현 완료)**:
  - 로그인 페이지: 이메일/비밀번호 폼, 유효성 검증, 목업 로그인(tester1~4)
  - 회원가입 페이지: 이름/이메일/비밀번호/확인 폼, 유효성 검증, 목업 가입
  - 비밀번호 재설정: 이메일 입력 → 발송 완료 화면, 새 비밀번호 입력 폼 (토큰 파라미터 수신 대응)
  - 프로필 관리: 프로필 사진 업로드(미리보기), 닉네임 변경, 상태 메시지 편집
  - 사용자 메뉴: AppLayout 상단 헤더에 아바타+이름 드롭다운 (프로필 관리, 로그아웃)

### 4.2 OAuth 소셜 로그인
- **기술**: Passport.js + OAuth 2.0
- **지원**: Google, GitHub, Kakao
- **프론트엔드 UI (구현 완료)**: Google/GitHub/Kakao 소셜 로그인 버튼

### 4.3 그룹 및 권한 관리
- **기능**: 그룹(워크스페이스) 생성, 초대 코드 발급/참여, 멤버 관리
- **역할**: Admin (관리자) / Member (멤버) / Tester (테스터)
- **Admin 권한**: 그룹 생성, 초대 코드 발급, 멤버 관리, AI 무료 사용
- **Member 권한**: 문서/코드 편집, 일정 관리, 메신저/음성 채팅, AI 결제 후 사용

### 4.4 구독 결제 시스템
- **기술**: Toss Payments 또는 Stripe (미결정)
- **모델**: AI 기능 유료 구독 (월/연 결제)
- **예외**: Admin + Tester 계정 무료

---

## 5. UI/UX

### 5.1 디자인 시스템
- **스타일**: 뮤트 + 미니멀리즘 (깔끔하고 구조화된 디자인)
- **기술**: TailwindCSS (확정)
- **공통 컴포넌트 (구현 완료)**: Button (4 variant, 3 size), Card (hoverable), Input (아이콘, 에러), Toast, Skeleton, ErrorFallback, ThemeToggle, UserMenu (아바타 드롭다운), ChatPopup (미니 채팅 팝업)

### 5.5 그룹 컨텍스트 시스템 (구현 완료)
- **방식**: 디스코드 "서버 전환" 방식 — 하단 툴바에서 활성 그룹을 선택하면 모든 기능이 해당 그룹 범위로 동작
- **Store**: `useGroupContextStore` (Zustand) — `activeGroupId`, `activeGroupName`
- **동작**:
  - 하단 툴바 좌측 그룹 선택기 드롭다운으로 그룹 전환
  - 그룹 전환 시: 음성 채팅 자동 연결 해제, 화면 공유 자동 중지
  - 채팅(풀/미니): 활성 그룹 채널만 표시, DM은 항상 접근 가능
  - 음성 채팅: 선택된 그룹 음성방에 접속, 그룹명 배지 표시
  - 화면 공유: 선택된 그룹에 공유, 배너에 그룹명 표시
  - 할 일: 그룹별 필터 (전체/그룹별 전환)

### 5.2 다크모드
- **기능**: 라이트/다크 테마 전환 지원

### 5.3 반응형 디자인
- **대응**: 모바일 (320px) / 태블릿 / 데스크톱 (2560px) — 3개 브레이크포인트
- **모바일 브라우저**: iOS Safari, Android Chrome

### 5.4 접근성
- **기능**: 키보드 네비게이션, 적절한 색상 대비

---

## 6. 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│                        Client                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ React +     │  │ Monaco       │  │ LiveKit Client  │ │
│  │ TypeScript  │  │ Editor       │  │ (음성 채팅)     │ │
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
│  │      Node.js + NestJS             │       │           │
│  │  ┌──────────┐  ┌───────────────┐  │  ┌───▼────────┐  │
│  │  │ REST API │  │ Socket.IO     │  │  │ LiveKit    │  │
│  │  │          │  │ Server        │  │  │ Server     │  │
│  │  │ - Auth   │  │ - 실시간 편집 │  │  │ - 음성채팅 │  │
│  │  │ - CRUD   │  │ - 라이브 커서 │  │  │ - WebRTC   │  │
│  │  │ - RAG AI │  │ - 채팅       │  │  │            │  │
│  │  └────┬─────┘  └──────┬────────┘  │  └────────────┘  │
│  │       │               │           │                   │
│  └───────┼───────────────┼───────────┘                   │
│          │               │                               │
│  ┌───────▼───────────────▼─────────┐  ┌───────────────┐  │
│  │      PostgreSQL + pgvector       │  │    Docker      │  │
│  │  - Users, Groups, Documents     │  │  코드 실행     │  │
│  │  - Tasks, Messages, AI History  │  │  샌드박스      │  │
│  │  - Embeddings (벡터 임베딩)     │  │                │  │
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

## 7. 기술 스택 상세

| 계층 | 기술 | 버전/비고 |
|------|------|-----------|
| **프론트엔드** | React | 18+ |
| | TypeScript | 5+ |
| | TipTap | 문서 WYSIWYG 에디터 (ProseMirror 기반) |
| | Monaco Editor | 코드 에디터 (VS Code 엔진) |
| | Socket.IO Client | 실시간 통신 |
| | LiveKit Client SDK | 음성 채팅 + 화면 공유 |
| | TailwindCSS v4 | 스타일링 (뮤트 + 미니멀리즘) |
| **백엔드** | Node.js | 20 LTS |
| | NestJS | REST API + WebSocket 서버 (확정) |
| | TypeORM | PostgreSQL ORM |
| | Socket.IO Server | 실시간 이벤트 |
| | Passport.js | 인증 (JWT + OAuth) |
| | Dockerode | Docker API 연동 (코드 실행) |
| **데이터베이스** | PostgreSQL + pgvector | 15+ (벡터 유사도 검색 지원) |
| | Redis | 세션, 캐시, 실시간 상태 관리 |
| **인프라** | Google Cloud Platform | Compute Engine, Cloud Storage, Cloud SQL |
| | Docker | 코드 실행 샌드박스 |
| | LiveKit Server | WebRTC 음성 채팅 + 화면 공유 서버 |
| | Nginx | 리버스 프록시, SSL 종료 |
| **외부 API** | Google Gemini API | AI 어시스턴트 (RAG 기반) |
| | Google Embedding API | 텍스트 → 벡터 임베딩 변환 |
| | Google OAuth 2.0 | 소셜 로그인 |
| | GitHub OAuth | 소셜 로그인 |
| | Kakao OAuth | 소셜 로그인 |

---

## 8. API 설계 (주요 엔드포인트)

```
[인증]
POST   /api/auth/register        - 회원가입
POST   /api/auth/login            - 로그인 (JWT 발급)
POST   /api/auth/refresh          - 토큰 갱신
POST   /api/auth/oauth/:provider  - 소셜 로그인
POST   /api/auth/forgot-password  - 비밀번호 재설정

[그룹]
POST   /api/groups               - 그룹 생성 (초대 코드 자동 발급)
POST   /api/groups/join          - 초대 코드로 참여
GET    /api/groups/:id           - 그룹 정보 조회
GET    /api/groups/:id/members   - 멤버 목록
DELETE /api/groups/:id/members/:userId - 멤버 내보내기

[프로젝트/페이지]
POST   /api/projects             - 프로젝트 생성
GET    /api/projects/:id/pages   - 페이지 목록
POST   /api/pages                - 페이지 생성 (문서/코드)
GET    /api/pages/:id            - 페이지 조회
PUT    /api/pages/:id            - 페이지 수정
DELETE /api/pages/:id            - 페이지 삭제

[코드 실행]
POST   /api/code/execute         - 코드 실행 요청
GET    /api/code/languages       - 지원 언어 목록

[할 일/일정]
POST   /api/tasks                - 할 일 생성
PUT    /api/tasks/:id            - 할 일 수정
GET    /api/projects/:id/tasks   - 할 일 목록
POST   /api/schedules            - 일정 등록
GET    /api/projects/:id/schedules - 일정 조회

[AI]
POST   /api/ai/chat              - AI 질문
POST   /api/ai/document-assist   - AI 문서 작성 보조
GET    /api/ai/history           - AI 대화 이력

[결제]
GET    /api/subscription/plans   - 구독 플랜 조회
POST   /api/subscription/create  - 구독 결제

[Socket.IO Events]
- document:join / document:leave
- document:update / document:cursor
- code:update / code:cursor
- chat:message / chat:typing
- voice:join / voice:leave
```

---

## 9. 인프라 및 기술 스택

### 프론트엔드

| 기술 | 용도 | 비고 |
|------|------|------|
| React | UI 프레임워크 | 18+ |
| TypeScript | 타입 안전성 | 5+ |
| TipTap | 문서 WYSIWYG 에디터 | ProseMirror 기반 |
| Monaco Editor | 코드 에디터 | VS Code 엔진 |
| Socket.IO Client | 실시간 통신 | WebSocket |
| LiveKit Client SDK | 음성 채팅 + 화면 공유 | WebRTC |
| TailwindCSS v4 | 스타일링 | 확정 |

### 백엔드

| 기술 | 용도 | 비고 |
|------|------|------|
| Node.js | 런타임 | 20 LTS |
| NestJS | REST API + WebSocket 서버 | 확정, `backend/` 폴더 |
| TypeORM | PostgreSQL ORM | `@nestjs/typeorm` |
| Socket.IO Server | 실시간 이벤트 | `@nestjs/websockets` |
| Passport.js | 인증 (JWT + OAuth) | `@nestjs/passport` |
| Dockerode | Docker API 연동 (코드 실행) | |

### 데이터베이스

| 기술 | 용도 | 비고 |
|------|------|------|
| PostgreSQL + pgvector | 주 DB + 벡터 유사도 검색 | 15+ |
| Redis | 세션, 캐시, 실시간 상태 관리 | |

### 인프라/배포

| 기술 | 용도 | 비고 |
|------|------|------|
| Google Cloud Platform | 배포 환경 | Compute Engine, Cloud Storage, Cloud SQL |
| Docker | 코드 실행 샌드박스 | 언어별 이미지 사전 빌드 |
| LiveKit Server | WebRTC 음성 채팅 + 화면 공유 서버 | GCP 셀프 호스팅 |
| Nginx | 리버스 프록시, SSL 종료 | |

### 외부 API

| 기술 | 용도 |
|------|------|
| Google Gemini API | AI 어시스턴트 (RAG 기반) |
| Google Embedding API | 텍스트 → 벡터 임베딩 변환 |
| Google OAuth 2.0 | 소셜 로그인 |
| GitHub OAuth | 소셜 로그인 |
| Kakao OAuth | 소셜 로그인 |

---

## 10. 백엔드 프로젝트 구조

```
backend/
├── src/
│   ├── main.ts                    # 앱 진입점 (CORS, ValidationPipe, /api prefix)
│   ├── app.module.ts              # 루트 모듈 (ConfigModule, TypeORM)
│   ├── app.controller.ts          # 헬스 체크
│   ├── app.service.ts
│   ├── auth/                      # 인증 모듈 (JWT, OAuth, 프로필)
│   ├── groups/                    # 그룹 모듈 (CRUD, 초대, 멤버)
│   ├── projects/                  # 프로젝트 모듈
│   ├── pages/                     # 페이지 모듈 (문서/코드)
│   ├── tasks/                     # 할 일 모듈
│   ├── schedules/                 # 일정 모듈
│   ├── channels/                  # 채팅 채널 모듈
│   ├── messages/                  # 메시지 모듈
│   ├── ai/                        # AI 어시스턴트 모듈 (RAG)
│   ├── voice-chat/                # 음성 채팅 모듈 (LiveKit)
│   ├── screen-share/              # 화면 공유 모듈
│   ├── subscriptions/             # 구독/결제 모듈
│   ├── settings/                  # 설정 모듈
│   └── common/                    # 공통 유틸
│       ├── entities/              # 공유 Entity
│       ├── guards/                # Auth Guard 등
│       ├── decorators/            # 커스텀 데코레이터
│       └── interceptors/          # 인터셉터
├── .env                           # 환경변수 (gitignore)
├── .env.example                   # 환경변수 예시
├── docker-compose.yml             # (루트) PostgreSQL + Redis
├── nest-cli.json
├── package.json
└── tsconfig.json
```

### 개발 환경 실행
```bash
# 1. Docker로 PostgreSQL + Redis 실행
docker compose up -d

# 2. 백엔드 서버 실행
cd backend && npm run start:dev

# 3. 프론트엔드 서버 실행 (Vite 프록시로 /api → localhost:3000)
npm run dev
```

---

## 11. 보안

| 영역 | 기술/방안 |
|------|-----------|
| 인증 | JWT (Access + Refresh Token), HTTPS 필수 |
| 코드 실행 | Docker 컨테이너 격리, CPU/메모리/시간/네트워크 제한 |
| 데이터 보호 | 비밀번호 bcrypt 해싱, 민감 데이터 암호화 |
| 입력 검증 | XSS, SQL Injection, CSRF 방지 |
| OAuth | 소셜 로그인 토큰 안전 관리 |

---

*기능 요구사항 상세는 [REQUIREMENTS.md](./REQUIREMENTS.md), 프로젝트 소개는 [PROJECT.md](./PROJECT.md) 참조*

*마지막 업데이트: 2026-03-06*
