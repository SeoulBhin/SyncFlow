# SyncFlow: 올인원 실시간 협업 플랫폼

**RISE 캡스톤디자인 과제 제안서**

| 항목 | 내용 |
|------|------|
| 프로젝트명 | SyncFlow (싱크플로우) |
| 대학교 / 학과 | 계명대학교 컴퓨터공학과 |
| 팀명 | 4학년의 무게 |
| 팀장 | 김경빈 |
| 팀원 | 김명준, 김봉만, 남궁훈, 이도현 |
| 지도교수 | 박세진 교수님 |
| 개발 기간 | 약 3개월 |

---

## 1. Introduction

### 1.1 프로젝트 개요

SyncFlow(싱크플로우)는 문서 작성, 코드 편집 및 실행, 일정/할 일 관리, 메신저/음성 채팅, AI 어시스턴트, 화면 공유 및 프레젠테이션 기능을 하나의 웹 플랫폼에 통합한 **올인원(All-in-one) 실시간 협업 툴**이다. 기존의 팀 프로젝트 환경에서는 기획서 작성(Notion, Google Docs), 소통(Discord, Slack), 코딩(VS Code, Replit), AI 질의(ChatGPT), 발표 및 화면 공유(Zoom) 등 4~5개의 서로 다른 도구를 동시에 사용해야 하는 문제가 존재한다. SyncFlow는 이러한 분산된 작업 환경을 하나의 통합 플랫폼으로 제공함으로써 도구 간 컨텍스트 전환 비용을 제거하고, 실시간 협업의 효율성을 극대화하는 것을 목표로 한다.

### 1.2 프로젝트 범위

본 프로젝트는 웹 기반 SPA(Single Page Application)로 개발되며, 프론트엔드(React 19 + TypeScript 5.9 + Vite 7), 백엔드(NestJS 11), 데이터베이스(PostgreSQL 16 + pgvector + Redis 7), 실시간 통신(Socket.IO 4.8 + LiveKit), AI 파이프라인(Google Gemini + pgvector RAG), 컨테이너 기반 코드 실행 환경(Docker) 등 풀스택 아키텍처를 포괄한다. 최종적으로 GCP(Google Cloud Platform)에 배포하여 실제 서비스 운영이 가능한 수준의 완성도를 목표로 한다.

### 1.3 RISE 사업과의 연관성

본 프로젝트는 RISE(지역혁신중심 대학지원체계) 사업의 핵심 목표인 **지역 산업과 대학 연계 인재 양성**에 부합한다. 대구·경북 지역의 SW/IT 산업 생태계에서 팀 기반 협업 역량은 핵심 요구사항이며, SyncFlow는 이러한 협업 역량을 실질적으로 강화할 수 있는 플랫폼이다. 특히 대학생 팀 프로젝트, 스타트업 초기 팀, 코딩 교육 현장 등 지역 내 다양한 협업 시나리오에 직접 적용 가능하다.

---

## 2. Motivation & Contribution

### 2.1 문제 인식 (Motivation)

현재 대학생 및 소규모 팀의 협업 환경에는 다음과 같은 구조적 문제가 존재한다.

**문제 1: 도구 간 컨텍스트 전환 비용**

일반적인 팀 프로젝트에서는 기획(Notion) → 소통(Discord) → 코딩(VS Code) → AI 질의(ChatGPT) → 발표(Zoom) 순서로 최소 4~5개의 도구를 동시에 사용한다. 각 도구 간 전환 시 작업 흐름이 끊기며, 이는 집중력 저하와 생산성 감소로 직결된다. 연구에 따르면 컨텍스트 전환 후 원래 작업에 다시 집중하기까지 평균 23분이 소요된다(Mark et al., "The Cost of Interrupted Work", 2008).

**문제 2: 실시간 협업 시 의사소통 단절**

문서를 공동 편집하면서 디스코드로 대화하고, 코드를 수정하면서 슬랙으로 소통하는 등 작업 컨텍스트와 소통 채널이 분리되어 있다. 이로 인해 "지금 어디 보고 있어?", "몇 번째 줄 말하는 거야?" 등의 비효율적 대화가 반복적으로 발생한다.

**문제 3: 개발 환경 설정의 진입 장벽**

팀 프로젝트에서 코드를 함께 작성하려면 각 팀원이 동일한 개발 환경(언어 런타임, 패키지, IDE 등)을 구성해야 한다. 이 과정에서 OS 차이, 버전 충돌, 경로 문제 등이 발생하며, 특히 비전공자나 초보자에게는 심각한 진입 장벽이 된다.

**문제 4: AI 질의 시 프로젝트 맥락 단절**

기존 AI 도구(ChatGPT, Gemini 등)는 독립적인 외부 서비스로, 사용자가 매번 관련 코드나 문서를 복사하여 문맥을 전달해야 한다. 특히 파일 간 의존성이 있는 오류(예: 1번 파일의 오류로 인해 2번 파일에서 에러 발생)를 분석하려면 여러 파일을 수동으로 복사해야 하는 비효율이 존재한다.

### 2.2 기여 (Contribution)

본 프로젝트의 학술적·기술적·사회적 기여는 다음과 같다.

**기술적 기여**

- **통합 실시간 협업 아키텍처 설계**: Socket.IO 기반 CRDT 동시 편집, LiveKit WebRTC 음성/화면 공유, 메신저를 단일 플랫폼에 통합하는 아키텍처를 설계하고 구현한다.
- **브라우저 기반 안전한 코드 실행 환경**: Docker 컨테이너 샌드박스를 활용하여 7개 프로그래밍 언어(Python, JavaScript, Java, C, C++, HTML, CSS)의 코드를 브라우저에서 안전하게 실행하는 시스템을 구축한다.
- **RAG 기반 컨텍스트 인식 AI 어시스턴트**: pgvector를 활용한 벡터 검색과 Google Gemini API를 결합하여, 프로젝트 내 모든 문서와 코드를 자동으로 참조하는 AI 어시스턴트를 개발한다. 파일 간 의존성 오류를 자동으로 추적하여 실제 수정이 필요한 파일을 안내하는 것을 목표로 한다.

**사회적 기여**

- **지역 대학생 협업 역량 강화**: 대구·경북 지역 대학생들이 별도 비용 없이 고품질 협업 환경을 활용할 수 있다.
- **코딩 교육 접근성 향상**: 비전공자 및 초보자가 개발 환경 설치 없이 웹 브라우저만으로 코딩을 시작할 수 있다.
- **원격 협업 인프라 제공**: 물리적 거리에 구애받지 않는 실시간 협업 환경을 제공하여, 지역 내 분산된 팀의 생산성을 높인다.

---

## 3. Goal

### 3.1 최종 목표

브라우저 하나로 **기획 → 소통 → 개발 → 관리 → 발표**의 전 과정을 수행할 수 있는 올인원 실시간 협업 플랫폼을 개발하여, 기존 4~5개 도구의 기능을 단일 플랫폼으로 통합한다.

### 3.2 핵심 기능 3가지

**① 실시간 협업 — 동시 수정 · 라이브 커서 · 음성 대화 · 일정 관리**

Socket.IO + CRDT + LiveKit 기반으로 동시 편집·라이브 커서·음성 채팅·메신저·일정 관리를 하나의 페이지 안에 통합한다. 디스코드(소통) + 노션(문서) + 캘린더(일정)를 한 화면에 통합하여, 별도 도구 없이 모든 협업이 이루어지는 환경을 구현한다.

**② 문서 에디터 · 코드 에디터 · AI 어시스턴트를 하나로 통합**

TipTap 문서 에디터 + Monaco 코드 에디터 + Docker 샌드박스 실행 + Gemini RAG AI를 통합하여, 브라우저 하나로 기획→코딩→실행→디버깅을 수행한다. 코드 실행 결과를 즉시 콘솔에 출력하고, 웹 프로젝트는 새 브라우저 창으로 결과를 표시한다. AI 어시스턴트는 RAG 기반으로 프로젝트 맥락을 인식하여, 1번 파일의 오류가 2번 파일 실행 시 영향을 미칠 때 1번 파일의 수정이 필요함을 안내하는 것을 목표로 한다.

**③ 화면 공유 & 프레젠테이션 모드**

WebRTC 화면 공유 + Follow Me 뷰포트 동기화 + 내장 음성 채팅을 결합하여, Zoom 없이 작업 문서 안에서 바로 발표·시연·코드 리뷰를 수행한다.

### 3.3 세부 목표

| 번호 | 목표 | 성공 기준 |
|------|------|-----------|
| G1 | 실시간 동시 문서 편집 | 3명 이상이 동일 문서를 동시에 편집 시 충돌 없이 실시간 반영 |
| G2 | 브라우저 기반 코드 실행 | 7개 언어(Python, JS, Java, C, C++, HTML, CSS) 최소 3개 언어 코드를 3초 이내에 실행 및 결과 반환 |
| G3 | 내장 음성 채팅 및 화면 공유 | 별도 앱 없이 작업 페이지 안에서 음성 대화 + 화면 공유 가능 |
| G4 | RAG 기반 AI 어시스턴트 | 프로젝트 내 문서/코드를 참조하여 문맥에 맞는 답변 제공, 파일 간 오류 추적 |
| G5 | 통합 일정/할 일 관리 | 칸반 보드, 캘린더, 간트 차트, 리스트 뷰 4종 제공 |
| G6 | GCP 클라우드 배포 | 실제 서비스 운영 가능한 수준으로 배포 완료 |

### 3.4 정량적 목표

- 기존 대비 **도구 전환 횟수 80% 이상 감소** (4~5개 → 1개)
- 동시 편집 시 **지연 시간(latency) 500ms 이하** 유지
- 코드 실행 결과 반환 시간 **평균 3초 이내**
- AI 어시스턴트 응답 시간 **평균 5초 이내**
- 사용자 만족도 조사(SUS 점수) **70점 이상** 달성

---

## 4. Related Works

### 4.1 문서 협업 도구

**Notion**은 WYSIWYG 문서 편집, 데이터베이스, 칸반 보드 등 다양한 기능을 제공하는 대표적인 문서 협업 도구이다. 그러나 코드 실행 기능이 없으며, 실시간 음성 채팅이나 화면 공유를 지원하지 않는다. **Google Docs**는 실시간 동시 편집에 강점이 있으나, 코드 편집 및 실행, 프로젝트 관리 기능이 부재하다.

| 기능 | Notion | Google Docs | SyncFlow |
|------|--------|-------------|----------|
| 문서 동시 편집 | O | O | O |
| 코드 편집 | 표시만 | X | O (7개 언어) |
| 코드 실행 | X | X | O (Docker) |
| 음성 채팅 | X | X | O (WebRTC) |
| 화면 공유 | X | X | O |
| AI 어시스턴트 | O (외부 연동) | O (Gemini) | O (RAG 기반) |
| 일정 관리 | O | X | O (4종 뷰) |

### 4.2 소통 도구

**Discord**는 음성/영상 채팅, 텍스트 메신저, 화면 공유 등 풍부한 소통 기능을 제공한다. 그러나 문서 편집이나 코드 실행 기능은 없으며, 작업 컨텍스트와 소통 채널이 완전히 분리되어 있다. **Slack**도 유사한 한계를 가진다. **Zoom**은 화면 공유와 영상 통화에 특화되어 있으나, 문서 협업이나 코드 실행은 지원하지 않는다.

| 기능 | Discord | Slack | Zoom | SyncFlow |
|------|---------|-------|------|----------|
| 텍스트 채팅 | O | O | O | O |
| 음성 채팅 | O | O (허들) | O | O |
| 화면 공유 | O | O | O | O |
| 문서 편집 | X | X | X | O |
| 코드 실행 | X | X | X | O |
| 작업 내 통합 | X | X | X | O |

### 4.3 온라인 코딩 도구

**Replit**은 브라우저 기반 IDE로 다양한 언어의 코드 작성 및 실행을 지원하며, 실시간 협업 기능도 제공한다. 그러나 기획 문서 작성, 일정 관리, 음성 채팅 등의 기능은 없다. **CodeSandbox**도 웹 개발에 특화된 온라인 IDE로, 프로젝트 관리 기능은 제공하지 않는다.

| 기능 | Replit | CodeSandbox | SyncFlow |
|------|--------|-------------|----------|
| 코드 편집 | O | O | O |
| 코드 실행 | O | O | O |
| 실시간 협업 | O | O | O |
| 문서 편집 | X | X | O |
| 음성/화면 공유 | X | X | O |
| 일정 관리 | X | X | O |
| AI 어시스턴트 | O (제한적) | X | O (RAG) |

### 4.4 AI 도구

**ChatGPT**, **Google Gemini** 등의 AI 도구는 강력한 자연어 처리와 코드 생성 능력을 보유하고 있다. 그러나 이들은 독립적인 외부 도구로, 작업 중인 프로젝트의 문맥을 자동으로 파악하지 못한다. 사용자가 매번 관련 코드나 문서를 복사하여 붙여넣어야 하며, 파일 간 의존성 오류를 추적하려면 여러 파일을 수동으로 복사해야 하는 비효율이 존재한다.

### 4.5 SyncFlow의 차별점 요약

SyncFlow는 위의 네 가지 카테고리(문서 협업, 소통, 코딩, AI)의 핵심 기능을 **단일 플랫폼에 통합**함으로써 기존 도구들의 한계를 극복한다. 특히 다음 세 가지가 핵심 차별점이다:

1. **작업 컨텍스트 내 통합 소통**: 문서/코드를 편집하는 동일 화면에서 음성 채팅, 메신저, 화면 공유가 가능
2. **브라우저 기반 코드 실행**: Docker 샌드박스를 활용한 안전한 코드 실행으로 개발 환경 설치 불필요
3. **RAG 기반 컨텍스트 인식 AI**: 프로젝트 내 모든 문서와 코드를 벡터 임베딩하여 문맥에 맞는 AI 지원 제공. 파일 간 오류 의존성을 자동 추적

---

## 5. Technical Difficulties

### 5.1 실시간 동시 편집 충돌 해결 (CRDT)

**난이도: 상**

여러 사용자가 동일한 문서를 동시에 편집할 때 발생하는 충돌을 해결해야 한다. 단순한 "마지막 쓰기 우선(Last Write Wins)" 방식은 데이터 손실을 야기한다. 이를 해결하기 위해 **CRDT(Conflict-free Replicated Data Type)** 알고리즘을 적용한다.

- **기술적 과제**: Yjs 라이브러리를 TipTap 에디터 및 Monaco 에디터와 통합하고, Socket.IO를 통해 변경사항을 실시간으로 동기화해야 한다. 네트워크 지연, 오프라인 편집 후 재연결, 대용량 문서에서의 성능 등을 고려해야 한다.
- **해결 방안**: Yjs + Hocuspocus 서버를 활용하여 CRDT 기반 동기화를 구현하고, WebSocket 연결 상태에 따른 오프라인 큐잉 메커니즘을 설계한다. Delta Sync(변경분만 전송)와 디바운싱으로 네트워크 부하를 최소화한다.

### 5.2 Docker 기반 안전한 코드 실행 환경

**난이도: 상**

사용자가 입력한 임의의 코드를 서버에서 실행하는 것은 심각한 보안 위험을 수반한다. 무한 루프, 메모리 폭주, 파일 시스템 접근, 네트워크 악용 등의 위협에 대비해야 한다.

- **기술적 과제**: 각 코드 실행 요청마다 격리된 Docker 컨테이너를 생성하고, CPU/메모리/시간 제한을 설정하며, 네트워크 및 파일 시스템 접근을 차단해야 한다. 또한 7개 언어별 런타임 이미지를 준비하고, 컨테이너 생성/삭제의 오버헤드를 최소화해야 한다.
- **해결 방안**: Dockerode 라이브러리를 활용하여 프로그래밍 가능한 컨테이너 관리를 구현한다. 언어별 경량 Docker 이미지를 사전 빌드하고, 컨테이너 풀(pool)을 운영하여 콜드 스타트를 최소화한다. CPU 1코어, 메모리 256MB, 실행 시간 30초 제한, 네트워크 차단, read-only 파일 시스템으로 보안을 강화한다.

### 5.3 RAG 파이프라인 구축 (pgvector + Gemini)

**난이도: 중상**

일반적인 AI 챗봇과 달리, 프로젝트 내 문서와 코드의 문맥을 이해하는 AI를 구현해야 한다. 특히 파일 간 의존성 오류를 추적하여 실제 수정이 필요한 파일을 안내하는 기능이 핵심 과제이다.

- **기술적 과제**: 프로젝트 내 모든 문서와 코드를 청크(chunk) 단위로 분할하고, 벡터 임베딩(768차원)을 생성하여 pgvector에 저장해야 한다. 사용자 질문 시 관련 청크를 코사인 유사도 검색으로 추출하고, 이를 Gemini API 프롬프트에 주입하여 문맥에 맞는 답변을 생성해야 한다. 임베딩 업데이트 타이밍, 검색 정확도, 응답 지연 시간 등이 과제이다.
- **해결 방안**: 문서/코드 저장 시 비동기적으로 512~1024 토큰 단위로 청크를 분할하고, Google Embedding API로 벡터를 생성하여 pgvector에 저장한다. 문서 수정 시 해당 청크만 Delta 업데이트한다. 코사인 유사도 기반 검색으로 상위 K개의 관련 청크를 추출하고, 구조화된 프롬프트(System → Context → Current Work → User Query)로 Gemini API에 전달한다. 검색 결과 캐싱으로 비용을 최적화한다.

### 5.4 WebRTC 기반 음성 채팅 및 화면 공유

**난이도: 중**

브라우저 간 P2P 미디어 스트리밍은 NAT 트래버설, 코덱 호환성, 대역폭 적응 등 복잡한 문제를 수반한다.

- **기술적 과제**: STUN/TURN 서버 구성, 다자간 통화 시 SFU(Selective Forwarding Unit) 아키텍처, 화면 공유 스트림과 음성 스트림의 동시 관리, Follow Me 모드에서의 뷰포트 동기화 등이 도전 과제이다.
- **해결 방안**: 오픈소스 WebRTC 서버인 **LiveKit**을 활용하여 SFU 기반 다자간 통화를 구현한다. LiveKit은 STUN/TURN, 코덱 협상, 대역폭 적응을 자동으로 처리하므로 개발 복잡도를 크게 줄일 수 있다. Follow Me 모드는 Socket.IO를 통해 발표자의 스크롤/클릭 이벤트를 참가자에게 브로드캐스트하고, 디바운싱(100ms)으로 네트워크 부하를 최소화한다. 적응형 비트레이트로 화면 공유 품질을 자동 조절한다.

### 5.5 대규모 실시간 이벤트 처리 및 확장성

**난이도: 중**

다수의 WebSocket 연결, 실시간 문서 동기화, 채팅 메시지, 음성/화면 스트리밍이 동시에 발생하는 환경에서 서버의 안정성과 확장성을 확보해야 한다.

- **기술적 과제**: Socket.IO 연결 수 증가에 따른 메모리 사용량 관리, Redis Pub/Sub을 활용한 다중 서버 인스턴스 간 이벤트 동기화, 데이터베이스 쿼리 최적화 등이 필요하다.
- **해결 방안**: Redis를 Socket.IO 어댑터로 사용하여 수평 확장을 지원하고, 이벤트 스로틀링/디바운싱으로 불필요한 트래픽을 제어한다. PostgreSQL 인덱싱과 Redis 캐싱을 조합하여 읽기 성능을 최적화한다.

---

## 6. System Design

### 6.1 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  React 19│ │  TipTap  │ │  Monaco  │ │  LiveKit │          │
│  │  + Zustand│ │  Editor  │ │  Editor  │ │  Client  │          │
│  │  + Router│ │  (문서)  │ │  (코드)  │ │  (음성)  │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       │             │            │             │                 │
│       └─────────────┴────────────┴─────────────┘                │
│                         │ HTTP/WSS                               │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (NestJS 11)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Auth    │ │  Groups  │ │  Pages   │ │  Tasks   │          │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │          │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤          │
│  │ Messages │ │ Channels │ │    AI    │ │  Voice   │          │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │          │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤          │
│  │ Screen   │ │Subscript.│ │ Settings │ │ Projects │          │
│  │  Share   │ │  Module  │ │  Module  │ │  Module  │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       └─────────────┴────────────┴─────────────┘                │
│                         │                                        │
└─────────────────────────┼───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │ PostgreSQL │  │   Redis    │  │  LiveKit   │
   │ 16         │  │  7         │  │  (WebRTC   │
   │ (pgvector) │  │  (Cache/   │  │   Server)  │
   │            │  │   Pub/Sub) │  │            │
   └────────────┘  └────────────┘  └────────────┘

   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │  Docker    │  │  Google    │  │  Google    │
   │  Sandbox   │  │  Gemini    │  │  Cloud     │
   │  (Code     │  │  API       │  │  Storage   │
   │   Runner)  │  │  + RAG     │  │            │
   └────────────┘  └────────────┘  └────────────┘
```

### 6.2 프론트엔드 설계

**기술 스택**: React 19 + TypeScript 5.9 + Vite 7.3 + TailwindCSS v4

**상태 관리**: Zustand 5를 활용한 9개 독립 store 구성

| Store | 역할 |
|-------|------|
| authStore | 사용자 인증 상태, 로그인/로그아웃 |
| chatStore | 메신저 메시지, 채널 목록 |
| themeStore | 다크모드/라이트모드 전환 |
| sidebarStore | 사이드바 열림/닫힘 상태 |
| toastStore | 알림 토스트 메시지 관리 |
| voiceChatStore | 음성 채팅 상태 (연결, 음소거 등) |
| screenShareStore | 화면 공유 상태 |
| aiStore | AI 사이드패널 상태, 대화 이력 |
| groupContextStore | 그룹 전환 시 전체 컨텍스트 동기화 |

**라우팅 구조**: React Router v7 기반

```
/                       → 랜딩 페이지
/login, /register       → 인증
/forgot-password        → 비밀번호 재설정
/dashboard              → 대시보드
/groups                 → 그룹 관리
/editor/:pageId         → 문서/코드 에디터
/tasks                  → 일정/할 일
/messenger              → 메신저
/settings               → 설정
/billing                → 구독/결제
/profile                → 프로필 관리
```

**그룹 컨텍스트 시스템**: Discord의 서버 전환 방식을 참고하여, 하단 툴바에서 활성 그룹을 선택하면 채팅, 음성 채팅, 화면 공유 등 모든 실시간 기능이 자동으로 해당 그룹의 컨텍스트로 전환된다.

**Path Alias**: `@/` → `src/` (vite.config.ts, tsconfig.app.json 설정)

### 6.3 백엔드 설계

**기술 스택**: NestJS 11 + TypeORM 0.3 + PostgreSQL 16(pgvector) + Redis 7 + Socket.IO 4.8

**모듈 구조** (12개 모듈):

| 모듈 | 설명 | 주요 API |
|------|------|----------|
| Auth | JWT + OAuth 인증 | POST /api/auth/login, /register, /oauth/:provider |
| Groups | 그룹 CRUD, 초대 코드 | GET/POST/PUT/DELETE /api/groups |
| Projects | 프로젝트 CRUD | GET/POST/PUT/DELETE /api/projects |
| Pages | 문서/코드 페이지 CRUD | GET/POST/PUT/DELETE /api/pages |
| Tasks | 할 일 CRUD | GET/POST/PUT/DELETE /api/tasks |
| Schedules | 일정 CRUD | GET/POST/PUT/DELETE /api/schedules |
| Channels | 채팅 채널 관리 | GET/POST /api/channels |
| Messages | 메시지 CRUD + 실시간 | GET/POST /api/messages + Socket.IO |
| AI | RAG 기반 AI 응답 | POST /api/ai/chat, /api/ai/document-assist |
| VoiceChat | LiveKit 토큰 발급 | POST /api/voice/token |
| ScreenShare | 화면 공유 세션 관리 | POST /api/screen/start, /stop |
| Subscriptions | 구독/결제 관리 | GET/POST /api/subscriptions |

**인증 흐름**:
```
Client → POST /api/auth/login (email, password)
       → Server: bcrypt 비밀번호 검증
       → Server: JWT Access Token (15분) + Refresh Token (7일) 발급
       → Client: Access Token을 Authorization 헤더에 포함하여 API 요청
       → 만료 시: POST /api/auth/refresh로 자동 갱신
```

**OAuth 소셜 로그인**: Google, GitHub, Kakao — Passport.js Strategy 적용

### 6.4 데이터베이스 설계

**PostgreSQL 16 + pgvector** 기반 주요 테이블:

```
Users
├── id (UUID, PK)
├── email (UNIQUE)
├── password_hash
├── display_name
├── avatar_url
├── status_message
├── oauth_provider
├── oauth_id
├── created_at
└── updated_at

Groups
├── id (UUID, PK)
├── name
├── description
├── invite_code (UNIQUE)
├── owner_id (FK → Users)
├── created_at
└── updated_at

GroupMembers
├── group_id (FK → Groups)
├── user_id (FK → Users)
├── role (owner/admin/member)
└── joined_at

Projects
├── id (UUID, PK)
├── group_id (FK → Groups)
├── name
├── description
└── created_at

Pages
├── id (UUID, PK)
├── project_id (FK → Projects)
├── title
├── type (document/code)
├── content (JSONB)
├── language (코드 페이지의 경우)
├── version
└── updated_at

Tasks
├── id (UUID, PK)
├── project_id (FK → Projects)
├── title, description
├── status (todo/in_progress/done)
├── priority (low/medium/high/urgent)
├── assignee_id (FK → Users)
├── start_date, due_date
└── created_at

Schedules
├── id (UUID, PK)
├── project_id (FK → Projects)
├── title, description
├── start_date, end_date
├── all_day (BOOLEAN)
└── created_at

Channels
├── id (UUID, PK)
├── group_id (FK → Groups)
├── name, type (text/voice)
└── created_at

Messages
├── id (UUID, PK)
├── channel_id (FK → Channels)
├── sender_id (FK → Users)
├── content
├── type (text/file/code)
└── created_at

AIConversations
├── id (UUID, PK)
├── user_id (FK → Users)
├── page_id (FK → Pages, nullable)
├── role (user/assistant)
├── content
└── created_at

Embeddings (pgvector)
├── id (UUID, PK)
├── page_id (FK → Pages)
├── chunk_index
├── chunk_text
├── embedding (vector(768))
└── created_at

Subscriptions
├── id (UUID, PK)
├── user_id (FK → Users)
├── plan (free/pro/team)
├── status (active/cancelled/expired)
├── started_at
└── expires_at
```

### 6.5 실시간 통신 설계

**Socket.IO 이벤트 구조**:

| 이벤트 | 방향 | 설명 |
|--------|------|------|
| doc:join / doc:leave | Client ↔ Server | 문서 편집 세션 입장/퇴장 |
| doc:update | Client → Server → Clients | CRDT 문서 변경사항 브로드캐스트 |
| cursor:move | Client → Server → Clients | 라이브 커서 위치 동기화 |
| code:update / code:cursor | Client ↔ Server | 코드 편집 동기화 |
| message:send | Client → Server → Clients | 채팅 메시지 전송 |
| message:receive | Server → Client | 새 메시지 수신 알림 |
| chat:typing | Client → Server → Clients | 타이핑 표시기 |
| task:update | Client → Server → Clients | 할 일 상태 변경 동기화 |
| voice:join / voice:leave | Client ↔ Server | 음성 채팅 입장/퇴장 |
| follow:sync | Server → Clients | Follow Me 모드 뷰포트 동기화 |

**Redis 활용**:
- Socket.IO 어댑터: 다중 서버 인스턴스 간 이벤트 브로드캐스트
- 세션 캐시: 사용자 온라인 상태 및 접속 중인 페이지 정보
- Rate Limiting: API 요청 제한
- RAG 검색 결과 캐싱: AI 응답 비용 최적화

### 6.6 AI 파이프라인 설계

```
[사용자 질문]
     │
     ▼
[자동 컨텍스트 수집]
  - 현재 열린 문서/코드
  - 콘솔 에러 로그
     │
     ▼
[질문 벡터 임베딩 생성] (Google Embedding API, 768차원)
     │
     ▼
[pgvector 코사인 유사도 검색] → 상위 K개 관련 청크 추출
     │
     ▼
[프롬프트 구성]
  - System: "당신은 SyncFlow 프로젝트 어시스턴트입니다..."
  - Context: [검색된 문서/코드 청크 — 관련도 높은 순 배치]
  - Current Work: [현재 열린 페이지 내용]
  - User: [사용자 질문]
     │
     ▼
[Google Gemini API 호출]
     │
     ▼
[응답 반환 + 참조 문서 링크 포함]
  - 파일 간 오류 의존성 발견 시 수정 필요 파일 안내
```

### 6.7 코드 실행 환경 설계

```
[사용자 코드 제출] (language, code, stdin)
     │
     ▼
[NestJS Code Runner Service]
     │
     ▼
[Dockerode: 컨테이너 생성]
  - 이미지: syncflow-runner-{language}
  - 제한: CPU 1코어, 메모리 256MB, 시간 30초, 디스크 100MB
  - 네트워크: none (격리)
  - 파일시스템: read-only (코드 파일만 마운트)
     │
     ▼
[코드 실행 + stdout/stderr 캡처]
     │
     ▼
[결과 반환 + 컨테이너 즉시 삭제]
  - 콘솔 언어: stdout/stderr 콘솔 출력
  - 웹 언어: 새 브라우저 창으로 결과 표시
```

**지원 언어 및 Docker 이미지**:

| 언어 | 이미지 | 실행 방식 |
|------|--------|-----------|
| Python | python:3.12-slim | python main.py |
| JavaScript | node:20-slim | node main.js |
| Java | eclipse-temurin:21-jdk | javac + java Main |
| C | gcc:13-slim | gcc + ./a.out |
| C++ | gcc:13-slim | g++ + ./a.out |
| HTML/CSS/JS | node:20-slim | 정적 서버 → iframe/새 창 표시 |

---

## 7. Demo Scenario

### 시나리오: "대학생 팀 프로젝트 — 웹 개발 과제 수행"

4명의 팀원(기획자 A, 디자이너 B, 개발자 C, 개발자 D)이 SyncFlow를 활용하여 웹 개발 팀 과제를 수행하는 과정을 시연한다.

### Demo 1: 팀 구성 및 프로젝트 생성 (2분)

1. **팀장 A**가 SyncFlow에 소셜 로그인(Google)으로 가입한다.
2. A가 **"웹개발 3조"** 그룹을 생성하고, 초대 코드를 복사한다.
3. 팀원 B, C, D가 초대 코드로 그룹에 참여한다.
4. A가 그룹 내에 **"과제1 - 포트폴리오 사이트"** 프로젝트를 생성한다.

### Demo 2: 문서 동시 편집 + 음성 채팅 (3분)

1. A가 프로젝트 내에 **"기획서"** 문서 페이지를 생성한다.
2. B, C, D가 동일한 문서에 접속한다 — **라이브 커서**가 4개 표시된다.
3. 하단 툴바에서 **음성 채팅을 시작**한다 — 4명이 음성으로 대화하면서 문서를 편집한다.
4. A가 기획 의도를 작성하는 동안, B가 디자인 컨셉을, C와 D가 기술 스택을 동시에 작성한다.
5. 모든 변경사항이 **실시간으로 반영**되는 것을 확인한다.

### Demo 3: 코드 편집 및 실행 (3분)

1. C가 프로젝트 내에 **"index.html"** 코드 페이지를 생성한다.
2. Monaco Editor에서 HTML/CSS 코드를 작성한다.
3. **"실행"** 버튼을 클릭하면, Docker 컨테이너에서 코드가 실행되고 결과가 새 브라우저 창에 표시된다.
4. D가 **"app.py"** Python 코드 페이지를 생성하고, 데이터 처리 코드를 작성 후 실행한다 — 콘솔에 결과가 출력된다.
5. 비전공자 B가 C의 코드를 복사하여 수정 후 바로 실행 — **개발 환경 설치 없이** 결과를 확인한다.

### Demo 4: AI 어시스턴트 활용 (2분)

1. D가 코드 작성 중 에러가 발생한다.
2. 우측 **AI 사이드패널**을 열고, "이 코드에서 에러가 나는데 왜 그런지 알려줘"라고 질문한다.
3. AI가 현재 페이지의 코드와 프로젝트 내 관련 문서를 **RAG로 검색**하여 문맥에 맞는 해결 방안을 제시한다.
4. AI가 **1번 파일(app.py)의 함수 오류**로 인해 **2번 파일(main.py)에서 에러가 발생**하고 있음을 분석하고, **1번 파일의 수정이 필요함**을 안내한다.
5. A가 기획서에서 "이 섹션을 좀 더 전문적으로 다듬어줘"라고 요청하면, AI가 문서 작성을 보조한다.

### Demo 5: 일정 관리 + 화면 공유 (2분)

1. A가 **일정/할 일** 페이지에서 프로젝트 마감일과 팀원별 업무를 등록한다.
2. **칸반 보드**에서 각 업무의 상태(할 일 → 진행 중 → 완료)를 드래그 앤 드롭으로 변경한다.
3. **간트 차트**에서 전체 일정을 시각적으로 확인한다.
4. C가 **화면 공유**를 시작하고 **Follow Me 모드**를 활성화한다.
5. C가 코드를 스크롤하면 B, D의 화면도 자동으로 따라가며, 별도 Zoom 없이 코드 리뷰를 진행한다.

### Demo 6: 그룹 컨텍스트 전환 (1분)

1. A가 하단 툴바에서 다른 그룹 **"졸업논문 팀"**을 선택한다.
2. 채팅, 음성 채팅, 화면 공유 등 모든 실시간 기능이 자동으로 해당 그룹의 컨텍스트로 전환된다.
3. 다시 **"웹개발 3조"**를 선택하면 이전 작업 상태가 그대로 유지된다.

---

## 8. Team & R&R

### 8.1 팀원별 역할 분담

| 팀원 | 역할 | 주요 담당 |
|------|------|-----------|
| **김명준** | Backend A | 인프라 구축, 인증 시스템 (JWT/OAuth), 결제/구독, 설정 |
| **남궁훈** | Backend B | 그룹/프로젝트 CRUD, 대시보드, 일정/할 일 관리 |
| **김경빈** (팀장) | Backend B + Frontend | 그룹/프로젝트/대시보드/일정 (백엔드 B 공동), 프론트엔드 UI 유지보수, API 연동, AI 파이프라인 |
| **김봉만** | Backend C | 문서 에디터 (TipTap 실시간 동기화), 메신저 (Socket.IO 채팅) |
| **이도현** | Backend D | 코드 에디터 (Monaco), Docker 샌드박스 코드 실행, 음성 채팅/화면 공유 (LiveKit) |

### 8.2 역할 구조도

```
┌───────────────────────────────────────────────────────┐
│                    김경빈 (팀장)                        │
│           Frontend + Backend B + AI                    │
│    UI 유지보수 · API 연동 · AI RAG 파이프라인           │
├──────────┬──────────┬──────────┬──────────────────────┤
│ Backend A│ Backend B│ Backend C│      Backend D       │
│  김명준  │  남궁훈  │  김봉만  │      이도현          │
│ 인프라   │ 그룹     │ 문서     │ 코드 에디터          │
│ 인증     │ 프로젝트 │ 에디터   │ Docker 실행          │
│ 결제     │ 대시보드 │ 메신저   │ 음성/화면 공유       │
│ 설정     │ 일정/할일│          │                      │
└──────────┴──────────┴──────────┴──────────────────────┘
```

---

## 9. Schedule

### 9.1 전체 일정 (약 3개월)

| 단계 | 기간 | 주요 작업 |
|------|------|-----------|
| **1단계: 기획 및 설계** | 1~2주차 | 요구사항 분석, ERD 설계, API 명세, 와이어프레임 |
| **2단계: 프론트엔드 UI** | 1~2주차 | 전체 UI 컴포넌트 개발 (40개 페이지/컴포넌트) — **완료** |
| **3단계: 백엔드 기초** | 3~4주차 | 인증, 그룹/프로젝트/페이지 CRUD, DB 마이그레이션 |
| **4단계: 핵심 기능** | 5~8주차 | 실시간 동시 편집, 코드 실행, 채팅, 음성/화면 공유 |
| **5단계: AI 및 고급 기능** | 9~10주차 | RAG 파이프라인, AI 어시스턴트, 구독/결제 |
| **6단계: 통합 및 배포** | 11~12주차 | 프론트-백 연동, GCP 배포, 성능 최적화 |

### 9.2 마일스톤

| 마일스톤 | 목표 시점 | 완료 조건 | 상태 |
|----------|-----------|-----------|------|
| M1: UI 완성 | 2주차 | 프론트엔드 40개 컴포넌트 완료 | **완료** |
| M2: 백엔드 초기 설정 | 2주차 | NestJS 프로젝트, 모듈 구조, Docker Compose | **완료** |
| M3: 인증 완성 | 4주차 | 로그인/회원가입/OAuth 동작 | 진행 예정 |
| M4: CRUD API 완성 | 5주차 | 그룹/프로젝트/페이지/할일 CRUD | 진행 예정 |
| M5: 실시간 편집 | 7주차 | 3명 이상 동시 편집 가능 | 진행 예정 |
| M6: 코드 실행 | 8주차 | 7개 언어 Docker 실행 | 진행 예정 |
| M7: 음성/화면 공유 | 9주차 | LiveKit 기반 통화 및 공유 | 진행 예정 |
| M8: AI 어시스턴트 | 10주차 | RAG 기반 질의응답 동작 | 진행 예정 |
| M9: 배포 | 12주차 | GCP 배포 및 도메인 연결 | 진행 예정 |

### 9.3 현재 진행 상황

| 카테고리 | 진행률 | 상태 |
|----------|--------|------|
| 프론트엔드 UI | 40/40 (100%) | **완료** |
| 백엔드 초기 설정 | 완료 | **완료** |
| 백엔드 API/기능 | 0/133 (0%) | 진행 예정 |
| **전체** | **43/173 (25%)** | 진행 중 |

---

## 10. 기술 스택 상세

| 계층 | 기술 | 버전/비고 |
|------|------|-----------|
| **프론트엔드** | React | 19.2 |
| | TypeScript | 5.9 |
| | Vite | 7.3 (빌드 도구, HMR) |
| | TipTap | 3.20 (문서 WYSIWYG 에디터, ProseMirror 기반) |
| | Monaco Editor | VS Code 엔진 (코드 에디터) |
| | Zustand | 5.0 (상태 관리, 9개 store) |
| | React Router | 7.13 (라우팅) |
| | Socket.IO Client | 4.8 (실시간 통신) |
| | LiveKit Client SDK | 2.15 (음성 채팅 + 화면 공유) |
| | TailwindCSS | v4.2 (@tailwindcss/vite) |
| | lucide-react | 0.577 (아이콘) |
| **백엔드** | Node.js | 20 LTS |
| | NestJS | 11.0 (REST API + WebSocket 서버) |
| | TypeORM | 0.3 (PostgreSQL ORM) |
| | Socket.IO Server | 4.8 (실시간 이벤트, @nestjs/websockets) |
| | Passport.js | 11.0 (인증, JWT + OAuth) |
| | Dockerode | 4.0 (Docker API 연동, 코드 실행) |
| | bcrypt | 6.0 (비밀번호 해싱) |
| | class-validator | 0.15 (입력 검증) |
| | Nodemailer | 8.0 (이메일 발송) |
| **데이터베이스** | PostgreSQL + pgvector | 16 (벡터 유사도 검색 지원) |
| | Redis | 7-alpine (ioredis 5.10, 세션/캐시/Pub/Sub) |
| **인프라** | Google Cloud Platform | Compute Engine, Cloud Storage, Cloud SQL |
| | Docker | 코드 실행 샌드박스 (언어별 이미지 사전 빌드) |
| | LiveKit Server | WebRTC 음성 채팅 + 화면 공유 서버 (GCP 셀프 호스팅) |
| | Nginx | 리버스 프록시, SSL 종료 |
| **외부 API** | Google Gemini API | AI 어시스턴트 (RAG 기반, @google/generative-ai 0.24) |
| | Google Embedding API | 텍스트 → 벡터 임베딩 변환 (768차원) |
| | Google OAuth 2.0 | 소셜 로그인 |
| | GitHub OAuth | 소셜 로그인 |
| | Kakao OAuth | 소셜 로그인 |
| | Google Cloud Storage | 파일 업로드 (@google-cloud/storage 7.19) |

---

*계명대학교 컴퓨터공학과 | 팀: 4학년의 무게 | 2026년 3월*
