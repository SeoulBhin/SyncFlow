# SyncFlow UI 가이드

> 프론트엔드 UI 기능 전체 목록. 각 기능의 **목적**, **사용 방법**, **관련 파일**을 정리한다.

---

## 목차

1. [레이아웃 & 네비게이션](#1-레이아웃--네비게이션)
2. [인증 & 계정](#2-인증--계정)
3. [대시보드](#3-대시보드)
4. [메신저 & 스레드](#4-메신저--스레드)
5. [외부 조직 공유 채널 (Slack Connect)](#5-외부-조직-공유-채널-slack-connect)
6. [작업 관리 (칸반/캘린더/간트/리스트)](#6-작업-관리)
7. [커스텀 필드 & 다중 담당자](#7-커스텀-필드--다중-담당자)
8. [문서 에디터](#8-문서-에디터)
9. [코드 에디터](#9-코드-에디터)
10. [AI 어시스턴트](#10-ai-어시스턴트)
11. [음성 채팅 & 화면 공유](#11-음성-채팅--화면-공유)
12. [회의 시스템](#12-회의-시스템)
13. [설정 & 빌링](#13-설정--빌링)
14. [공통 컴포넌트](#14-공통-컴포넌트)
15. [상태 관리 (Stores)](#15-상태-관리-stores)

---

## 1. 레이아웃 & 네비게이션

### 왜 필요한가
Slack 스타일 통합 네비게이션으로, 채널/DM/프로젝트를 한 곳에서 전환한다. Discord의 서버 전환 방식을 참고하여 조직(Organization) 단위로 컨텍스트를 분리한다.

### 구조
```
┌─ SlackHeader ────────────────────────────────┐
├─ MeetingBanner (회의 중일 때만 표시) ──────────┤
├─ AIContextBanner (AI 상황 배너, 닫기 가능) ────┤
├─────────────────────────────────────────────┤
│ SlackSidebar │   main (Outlet)   │DetailPanel│
│  - 조직 선택   │                    │ AI/Voice │
│  - 즐겨찾기   │                    │ Thread   │
│  - 채널 목록   │                    │ Members  │
│  - DM 목록    │                    │ ScreenSh │
│  - 프로젝트   │                    │          │
│  - 설정       │                    │          │
└─────────────────────────────────────────────┘
┌─ BottomToolbar (액션바) ─────────────────────┐
└─────────────────────────────────────────────┘
```

### 사용 방법
- **조직 전환**: 사이드바 상단 조직 선택기 클릭
- **채널 이동**: 사이드바 채널 목록 클릭 → `ChannelView` 로딩
- **퀵 검색**: `Cmd+K` (Windows: `Ctrl+K`) → 통합 검색 모달
- **우측 패널**: 헤더 아이콘(AI/멤버/음성) 클릭 → DetailPanel 토글

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/components/layout/AppLayout.tsx` | 전체 레이아웃 조합 |
| `src/components/layout/SlackHeader.tsx` | 상단 헤더 (로고, 검색, 알림) |
| `src/components/layout/SlackSidebar.tsx` | 좌측 사이드바 (채널/DM/프로젝트) |
| `src/components/layout/BottomToolbar.tsx` | 하단 액션바 (회의/음성/화면공유/채팅) |
| `src/components/layout/DetailPanel.tsx` | 우측 패널 (AI/Voice/Thread/Members) |
| `src/components/layout/MeetingBanner.tsx` | 회의 진행 중 배너 |
| `src/components/ai/AIContextBanner.tsx` | AI 상황 인식 제안 배너 |
| `src/stores/useGroupContextStore.ts` | 현재 조직/채널 컨텍스트 |
| `src/stores/useSidebarStore.ts` | 사이드바 열림/닫힘 |
| `src/stores/useDetailPanelStore.ts` | 우측 패널 상태 |

### 라우트
| 경로 | 페이지 |
|------|--------|
| `/` | 랜딩 페이지 |
| `/login` | 로그인 |
| `/register` | 회원가입 |
| `/app` | 대시보드 (기본) |
| `/app/channel/:channelId` | 채널 뷰 |
| `/app/tasks` | 작업 관리 |
| `/app/editor/:pageId` | 문서 에디터 |
| `/app/code/:pageId` | 코드 에디터 |
| `/app/meetings` | 회의 목록 |
| `/app/meetings/:id` | 회의실 |
| `/app/meetings/:id/summary` | 회의 요약 |
| `/app/settings` | 설정 |
| `/app/billing` | 요금제 |

---

## 2. 인증 & 계정

### 왜 필요한가
이메일/비밀번호 + OAuth(Google/GitHub/Kakao) 로그인을 지원한다. 현재 Mock 데이터로 동작.

### 사용 방법
- 로그인: 이메일 `아무거나` + 비밀번호 `test1234` 입력
- OAuth: Google/GitHub/Kakao 버튼 클릭 (mock — 바로 로그인)
- 프로필: `/app/profile`에서 이름/이메일/아바타 수정

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/pages/auth/LoginPage.tsx` | 로그인 폼 |
| `src/pages/auth/RegisterPage.tsx` | 회원가입 폼 |
| `src/pages/auth/ForgotPasswordPage.tsx` | 비밀번호 찾기 |
| `src/pages/auth/ResetPasswordPage.tsx` | 비밀번호 재설정 |
| `src/pages/auth/ProfilePage.tsx` | 프로필 편집 |
| `src/stores/useAuthStore.ts` | 인증 상태 |

---

## 3. 대시보드

### 왜 필요한가
로그인 후 첫 화면. 최근 활동, 내 작업, 채널 현황, 회의 일정을 한눈에 볼 수 있다.

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/pages/dashboard/DashboardPage.tsx` | 대시보드 페이지 |

---

## 4. 메신저 & 스레드

### 왜 필요한가
Slack의 핵심 — 채널 기반 팀 채팅 + 스레드로 대화를 구조화한다. Slack에서 메시지가 휘발되는 문제를 "메시지→작업 전환" 기능으로 해결한다.

### 사용 방법
- **메시지 보내기**: 하단 입력창에 타이핑 → Enter
- **이모지 반응**: 입력창 옆 😊 버튼 또는 메시지 hover → 이모지 버튼
- **파일 첨부**: 📎 버튼 클릭
- **멘션**: `@이름` 입력 → 자동완성 드롭다운 선택
- **@AI 멘션**: `@AI` 입력 → 1.5초 후 AI 봇이 mock 응답
- **스레드 열기**: 메시지 hover → "답글 달기" 버튼 또는 "N개 답글" 클릭
- **작업 전환**: 메시지 hover → ☑ 아이콘 클릭 → 메시지 내용이 작업 제목으로

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/pages/channel/ChannelView.tsx` | 메신저 메인 페이지 (대화 목록 + 메시지 피드) |
| `src/components/channel/ChannelHeader.tsx` | 채널 헤더 (음성/화면공유/회의/멤버/AI 버튼) |
| `src/components/thread/ThreadPanel.tsx` | 스레드 패널 (부모 메시지 + 답글 목록 + 입력) |
| `src/components/chat/ChatPopup.tsx` | 미니 채팅 팝업 |
| `src/stores/useChatStore.ts` | 활성 채널/DM 상태 |
| `src/stores/useThreadStore.ts` | 스레드 선택 상태 |

---

## 5. 외부 조직 공유 채널 (Slack Connect)

### 왜 필요한가
기업 간 협업 시 별도 도구(이메일, 카톡) 없이 **같은 플랫폼 안에서 외부 조직과 소통**할 수 있다. Slack Connect 방식을 채택하여, 각 조직이 자기 워크스페이스에서 접속하되 공유 채널에서 메시지/파일을 주고받는다.

### 사용 방법
- **외부 채널 식별**: 사이드바에서 🌐(Globe) 아이콘이 붙은 채널이 외부 공유 채널
- **채널 헤더 조직 배지**: 외부 채널 입장 시 헤더에 연결된 조직 배지(테크노바 × 블루웨이브) 표시
- **공유 채널 배너**: 채널 상단에 "공유 채널 — 테크노바 × 블루웨이브" 배너 + 권한 설정 아이콘
- **외부 조직 초대**: 헤더의 "초대" 버튼 → 이메일 입력 → 권한 설정 → 초대 전송
- **멤버 조직 구분**: 멤버 패널에서 조직별 그룹핑 (내부 멤버 / 외부 멤버)
- **메시지 조직 배지**: 외부 멤버 메시지에 소속 조직 배지 표시

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/components/channel/ExternalChannelBanner.tsx` | 공유 채널 배너 (연결 조직 + 권한 표시) |
| `src/components/channel/SharedChannelInviteModal.tsx` | 외부 조직 초대 모달 (3단계: 입력→확인→완료) |
| `src/components/channel/ChannelHeader.tsx` | 외부 채널 헤더 (Globe 아이콘, 조직 배지, 초대 버튼) |
| `src/components/group/MemberPanel.tsx` | 멤버 패널 (외부 채널 시 조직별 그룹핑) |
| `src/pages/channel/ChannelView.tsx` | 메시지에 외부 멤버 조직 배지 표시 |
| `src/constants/index.ts` | `MockChannel.connectedOrgIds`, `MockOrgMember.orgId/orgName` |

### 데이터 모델
```
MockChannel {
  isExternal: true
  connectedOrgIds: ['org1', 'org2']  // 연결된 조직 ID 목록
}

MockOrgMember {
  orgId: 'org2'        // 소속 조직
  orgName: '블루웨이브'  // 조직 이름
  role: 'guest'         // 외부 멤버는 guest 역할
}
```

---

## 6. 작업 관리

### 왜 필요한가
Trello(칸반) + Asana(리스트) + Google Calendar(캘린더) + Jira(간트)를 하나의 데이터 모델로 4개 뷰에서 제공한다.

### 4개 뷰

| 뷰 | 설명 | 사용 시나리오 |
|----|------|-------------|
| **칸반** | 드래그앤드롭 컬럼 보드 | 스프린트/워크플로우 관리 |
| **캘린더** | 월별 달력에 마감일 표시 | 일정 파악 |
| **간트** | 타임라인 바 차트 | 프로젝트 전체 진행률 |
| **리스트** | 정렬/필터 테이블 | 대량 작업 검색/관리 |

### 사용 방법
- **뷰 전환**: 상단 탭(칸반/캘린더/간트/리스트) 클릭 → CSS 페이드 애니메이션
- **작업 생성**: "새 할 일" 버튼 → TaskModal
- **작업 편집**: 카드/행 클릭 → TaskModal
- **칸반 퀵액션**: 카드 hover → 🖊 아이콘 → 담당자/우선순위/마감일/색상 즉시 변경
- **인라인 제목 편집**: 퀵액션 오버레이에서 연필 아이콘 → 제목 인라인 수정
- **커버 컬러**: 퀵액션 → 팔레트 아이콘 → 8색 선택 → 카드 상단 컬러 바
- **드래그앤드롭**: 칸반에서 카드를 다른 컬럼으로 드래그
- **그룹 필터**: 상단 채널 필터로 특정 그룹 작업만 보기
- **프리셋**: 칸반 보드 프리셋 (기본/개발/마케팅) + 커스텀

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/pages/tasks/TasksPage.tsx` | 작업 관리 메인 (뷰 전환, 통계, 필터) |
| `src/components/tasks/KanbanBoard.tsx` | 칸반 보드 (프리셋, 드래그, 컬럼 관리) |
| `src/components/tasks/KanbanCardOverlay.tsx` | 퀵액션 오버레이 (담당자/우선순위/마감일/색상) |
| `src/components/tasks/EmptyBoardGuide.tsx` | 빈 보드 온보딩 가이드 |
| `src/components/tasks/CalendarView.tsx` | 캘린더 뷰 (월별 그리드) |
| `src/components/tasks/GanttChart.tsx` | 간트 차트 (타임라인) |
| `src/components/tasks/ListView.tsx` | 리스트 뷰 (정렬/필터 테이블 + 커스텀필드 컬럼) |
| `src/components/tasks/TaskModal.tsx` | 작업 생성/편집 모달 (서브태스크, 커스텀필드, 다중담당자) |

---

## 7. 커스텀 필드 & 다중 담당자

### 왜 필요한가
Asana처럼 팀별로 필요한 필드를 자유롭게 추가할 수 있다 (카테고리, 진행률, 스프린트, 스토리 포인트 등). 다중 담당자로 협업 작업을 표현한다.

### 6종 커스텀 필드 타입
| 타입 | 렌더링 | 사용 예시 |
|------|--------|----------|
| `text` | 텍스트 입력 | 스프린트 이름 |
| `number` | 숫자 입력 | 스토리 포인트 |
| `select` | 컬러 태그 버튼 | 카테고리 (프론트/백엔드/디자인/기획) |
| `date` | 날짜 선택기 | 커스텀 날짜 |
| `person` | 멤버 드롭다운 | 리뷰어 |
| `progress` | 슬라이더 + % | 진행률 |

### 사용 방법
- **리스트뷰**: 테이블 우측에 커스텀 필드 컬럼이 자동 추가 (select→컬러태그, progress→프로그레스바)
- **TaskModal**: "커스텀 필드" 섹션에서 각 필드 편집
- **다중 담당자**: TaskModal → "추가 담당자" 드롭다운 → 태그 형태로 표시, X로 제거
- **칸반 카드**: 스택 아바타로 다중 담당자 표시 (최대 3명 + "+N")

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/stores/useCustomFieldStore.ts` | 커스텀 필드 정의/값 관리 (Zustand) |
| `src/components/tasks/CustomFieldEditor.tsx` | 타입별 입력 컴포넌트 |
| `src/constants/index.ts` | `CustomFieldDefinition`, `CustomFieldValue`, mock 데이터 |

---

## 8. 문서 에디터

### 왜 필요한가
Notion + Google Docs 수준의 리치 텍스트 편집. TipTap 기반으로 실시간 동시 편집(Yjs)을 준비하고, 슬래시 커맨드로 빠르게 블록을 삽입한다.

### 사용 방법
- **서식 도구**: 상단 툴바에서 Bold/Italic/Heading/List 등
- **슬래시 커맨드**: 빈 줄에서 `/` 입력 → 13종 블록 선택 드롭다운
  - `/heading1~3`, `/list`, `/numbered`, `/task`, `/callout`, `/toggle`, `/code`, `/quote`, `/divider`, `/table`, `/image`
  - 키보드 ↑↓ 네비게이션, 문자 필터링, Enter로 삽입
- **콜아웃 블록**: 4종 (info/warning/success/error) 강조 박스
- **토글 블록**: 접기/펼치기 가능한 콘텐츠 블록
- **표 삽입**: 툴바 또는 `/table` → 3x3 기본 생성
- **이미지**: 툴바 또는 `/image` → URL 입력
- **자동 저장**: 1.5초 후 자동 저장 (Cloud 아이콘으로 상태 표시)
- **버전 히스토리**: 우측 패널에서 이전 버전 목록
- **목차**: 우측 패널에서 Heading 기반 자동 목차

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/pages/editor/DocumentEditorPage.tsx` | 에디터 페이지 (TipTap 설정, 슬래시 커맨드 상태) |
| `src/components/editor/EditorToolbar.tsx` | 서식 툴바 (콜아웃/토글 버튼 포함) |
| `src/components/editor/SlashCommandMenu.tsx` | 슬래시 커맨드 드롭다운 UI |
| `src/components/editor/extensions/CalloutBlock.ts` | 콜아웃 TipTap 커스텀 노드 |
| `src/components/editor/extensions/ToggleBlock.ts` | 토글 TipTap 커스텀 노드 |
| `src/components/editor/extensions/SlashCommandExtension.ts` | 슬래시 입력 감지 확장 |
| `src/components/editor/LiveCursors.tsx` | 라이브 커서 오버레이 |
| `src/components/editor/VersionHistoryPanel.tsx` | 버전 히스토리 패널 |
| `src/components/editor/TOCPanel.tsx` | 목차 패널 |
| `src/components/editor/ExportMenu.tsx` | 내보내기 메뉴 |
| `src/components/editor/ImageUploadModal.tsx` | 이미지 업로드 모달 |
| `src/styles/app.css` | 콜아웃/토글 CSS, 슬래시 커맨드 애니메이션 |

---

## 9. 코드 에디터

### 왜 필요한가
문서 안에서 코드를 바로 편집하고 실행할 수 있다. Monaco Editor 기반, 7개 언어 지원.

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/pages/editor/CodeEditorPage.tsx` | 코드 에디터 페이지 (Monaco, 언어 선택, 실행) |

---

## 10. AI 어시스턴트

### 왜 필요한가
프로젝트 코드/문서를 이해하는 RAG 기반 AI. Cursor 스타일의 파일 참조(@파일명) + Cmd+K 통합 검색 연동.

### 사용 방법
- **AI 패널 열기**: 헤더의 ✨ 아이콘 클릭
- **파일 참조**: `@파일명`으로 특정 파일 컨텍스트 추가
- **Cmd+K AI**: 검색창에 `?`로 끝나는 질문 또는 `~해줘/~알려줘` 패턴 입력 → "AI에게 질문하기" 항목 1순위 표시
- **@AI 채널 멘션**: 채팅에서 `@AI` 입력 → 봇 응답 자동 삽입
- **제안 칩**: AI 패널 하단에 상황 기반 제안 ("이 문서 요약해줘" 등)
- **컨텍스트 배너**: 회의 종료 시 "회의록 생성할까요?" 배너 표시
- **프로젝트 선택**: AI 패널 상단에서 참조할 프로젝트 전환
- **사용량 표시**: 일일/월간 사용량 바

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/components/ai/AISidePanel.tsx` | AI 사이드 패널 (채팅/파일/기록 탭, 제안 칩) |
| `src/components/ai/AIContextBanner.tsx` | 상황 인식 배너 |
| `src/components/common/SearchModal.tsx` | Cmd+K 검색 → AI 쿼리 감지 |
| `src/stores/useAIStore.ts` | AI 상태 (메시지, 대화, 프로젝트, 사용량) |

---

## 11. 음성 채팅 & 화면 공유

### 왜 필요한가
Zoom 없이 플랫폼 안에서 음성/화상 통화. LiveKit WebRTC 기반.

### 사용 방법
- **음성 참여**: 하단 툴바 마이크 아이콘 또는 채널 헤더 마이크 아이콘
- **음소거**: 연결 후 마이크 아이콘 토글
- **화면 공유**: 하단 툴바 모니터 아이콘
- **패널**: 우측 DetailPanel에서 참여자 목록/화면 공유 뷰

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/components/voice-chat/VoiceChatPanel.tsx` | 음성 채팅 패널 |
| `src/components/screen-share/ScreenSharePanel.tsx` | 화면 공유 패널 |
| `src/stores/useVoiceChatStore.ts` | 음성 채팅 상태 |
| `src/stores/useScreenShareStore.ts` | 화면 공유 상태 |

---

## 12. 회의 시스템

### 왜 필요한가
**킬러 피처** — AI가 회의에 참여하여 실시간 회의록 자동 생성 + 작업 자동 등록.

### 사용 방법
- **회의 목록**: `/app/meetings` → 예정/진행 중/완료 구분
- **회의 시작**: 채널 헤더 카메라 아이콘 → 예정 회의 자동 시작 또는 빠른 회의
- **회의실**: 참여자, 실시간 트랜스크립트, AI 제안
- **회의 요약**: 종료 후 자동 요약 + 액션아이템 리뷰 → "작업보드에 등록" 일괄 버튼

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/pages/meeting/MeetingHistoryPage.tsx` | 회의 목록 |
| `src/pages/meeting/MeetingRoomPage.tsx` | 회의실 (참여자, 트랜스크립트) |
| `src/pages/meeting/MeetingSummaryPage.tsx` | 회의 요약 (액션아이템 리뷰) |
| `src/stores/useMeetingStore.ts` | 회의 상태 |

---

## 13. 설정 & 빌링

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/pages/settings/SettingsPage.tsx` | 프로필, 알림, 테마, OAuth 연동 |
| `src/pages/billing/PricingPage.tsx` | 요금제 선택 |
| `src/pages/billing/BillingHistoryPage.tsx` | 결제 내역 |
| `src/stores/useThemeStore.ts` | 다크 모드 토글 |

---

## 14. 공통 컴포넌트

| 컴포넌트 | 파일 | 용도 |
|---------|------|------|
| `Button` | `src/components/common/Button.tsx` | 재사용 버튼 (variant: primary/ghost/danger/secondary) |
| `SearchModal` | `src/components/common/SearchModal.tsx` | Cmd+K 통합 검색 + AI 쿼리 라우팅 |
| `MemberPanel` | `src/components/group/MemberPanel.tsx` | 멤버 목록 (역할 관리, 조직 그룹핑) |
| `Toast` | `src/stores/useToastStore.ts` | 알림 토스트 |

---

## 15. 상태 관리 (Stores)

Zustand 기반 13개 store. 각 도메인별로 분리.

| Store | 파일 | 역할 |
|-------|------|------|
| `useAuthStore` | `src/stores/useAuthStore.ts` | 인증 상태 |
| `useGroupContextStore` | `src/stores/useGroupContextStore.ts` | 현재 조직/채널 컨텍스트 |
| `useChatStore` | `src/stores/useChatStore.ts` | 활성 채널/DM |
| `useThreadStore` | `src/stores/useThreadStore.ts` | 스레드 선택 |
| `useDetailPanelStore` | `src/stores/useDetailPanelStore.ts` | 우측 패널 (AI/Voice/Thread/Members) |
| `useAIStore` | `src/stores/useAIStore.ts` | AI 대화, 프로젝트, 사용량 |
| `useCustomFieldStore` | `src/stores/useCustomFieldStore.ts` | 커스텀 필드 정의/값 |
| `useMeetingStore` | `src/stores/useMeetingStore.ts` | 회의 상태 |
| `useVoiceChatStore` | `src/stores/useVoiceChatStore.ts` | 음성 채팅 |
| `useScreenShareStore` | `src/stores/useScreenShareStore.ts` | 화면 공유 |
| `useSidebarStore` | `src/stores/useSidebarStore.ts` | 사이드바 열림/닫힘 |
| `useThemeStore` | `src/stores/useThemeStore.ts` | 다크 모드 |
| `useToastStore` | `src/stores/useToastStore.ts` | 토스트 알림 |

---

## Mock 데이터 & 백엔드 전환 가이드

> 현재 모든 UI는 `src/constants/index.ts`의 mock 데이터로 동작한다.
> 백엔드 API가 구현되면 **Store 내부만 수정**하여 전환하며, 컴포넌트 코드는 변경하지 않는다.

### 현재 아키텍처

```
컴포넌트 (React)  →  Zustand Store  →  Mock 데이터 (constants/index.ts)
                         ↑
                    컴포넌트는 여기만 봄
```

### 백엔드 전환 후 아키텍처

```
컴포넌트 (React)  →  Zustand Store  →  API 호출 (axios → backend)
                         ↑
                    컴포넌트 코드 변경 없음
```

### 주요 mock 데이터 목록

| 상수 | 내용 | 사용처 | 전환 대상 API |
|------|------|--------|-------------|
| `MOCK_ORGANIZATIONS` | 2개 조직 (테크노바, 블루웨이브) | 사이드바, 대시보드 | `GET /api/organizations` |
| `MOCK_CHANNELS` | 6개 채널 (외부 공유 1개 포함) | 사이드바, ChannelView | `GET /api/groups` |
| `MOCK_CHAT_CHANNELS` | 5개 채팅 채널 | ChannelView 좌측 대화 목록 | `GET /api/channels` |
| `MOCK_DMS` | 5개 DM | ChannelView 좌측 DM 목록 | `GET /api/dms` |
| `MOCK_MESSAGES` | 14개 메시지 | ChannelView 메시지 피드 | `GET /api/messages?channelId=` |
| `MOCK_THREAD_REPLIES` | 5개 스레드 답글 | ThreadPanel | `GET /api/messages/:id/thread` |
| `MOCK_CHANNEL_MEMBERS` | 5개 멤버 | 멘션 드롭다운, 담당자 선택 | `GET /api/groups/:id/members` |
| `MOCK_ORG_MEMBERS` | 채널별 멤버 (조직 정보 포함) | MemberPanel, 메시지 조직 배지 | `GET /api/groups/:id/members` |
| `MOCK_TASKS` | 14개 작업 | TasksPage 4개 뷰 | `GET /api/tasks` |
| `MOCK_MY_TASKS` | 5개 내 작업 | 대시보드 | `GET /api/tasks?assignee=me` |
| `MOCK_MILESTONES` | 3개 마일스톤 | ListView 진행률 | `GET /api/milestones` |
| `MOCK_CUSTOM_FIELD_DEFINITIONS` | 4개 커스텀 필드 정의 | ListView 컬럼, TaskModal | `GET /api/custom-fields` |
| `MOCK_CUSTOM_FIELD_VALUES` | 6개 작업의 필드 값 | ListView, TaskModal | `GET /api/tasks/:id/custom-fields` |
| `MOCK_PROJECTS` | 5개 프로젝트 | 사이드바, 대시보드 | `GET /api/projects` |
| `MOCK_PAGES` | 4개 문서/코드 페이지 | 사이드바 프로젝트 트리 | `GET /api/pages?projectId=` |
| `MOCK_RECENT_PAGES` | 7개 최근 문서 | 대시보드 | `GET /api/pages/recent` |
| `MOCK_DOC_CONTENT` | 문서 HTML 내용 | DocumentEditorPage | `GET /api/pages/:id/content` |
| `MOCK_MEETINGS` | 4개 회의 | 회의 목록, 회의실 | `GET /api/meetings` |
| `MOCK_VERSION_HISTORY` | 5개 버전 | VersionHistoryPanel | `GET /api/pages/:id/versions` |
| `MOCK_ATTACHMENTS` | 2개 첨부 파일 | DocumentEditorPage | `GET /api/pages/:id/attachments` |
| `MOCK_CODE_SAMPLES` | 7개 언어 예제 | CodeEditorPage | - (로컬 상수, 삭제 불필요) |
| `MOCK_USERS` | 5개 사용자 | 인증 | `GET /api/auth/me` |
| `MOCK_INVITE_CODES` | 3개 초대 코드 | GroupSettingsModal | `GET /api/groups/:id/invite-code` |
| `MEETING_NOTES_TEMPLATE` | 회의록 HTML 템플릿 | DocumentEditorPage | - (로컬 상수, 삭제 불필요) |
| `EMOJI_LIST` | 24개 이모지 | ChannelView 이모지 피커 | - (로컬 상수, 삭제 불필요) |

### 전환 절차 (Store별)

#### 1단계: Store 내부 수정

```ts
// ❌ 현재 (Mock)
// useChatStore.ts
import { MOCK_MESSAGES } from '@/constants'

// 초기 데이터로 mock 사용
messages: MOCK_MESSAGES,

// ✅ 전환 후 (API)
messages: [],

fetchMessages: async (channelId: string) => {
  const res = await api.get(`/api/messages?channelId=${channelId}`)
  set({ messages: res.data })
},
```

#### 2단계: 컴포넌트에서 fetch 호출 추가

```ts
// ChannelView.tsx
useEffect(() => {
  fetchMessages(activeChannelId)
}, [activeChannelId])
```

#### 3단계: constants/index.ts 정리

```
삭제 대상:  MOCK_ORGANIZATIONS, MOCK_CHANNELS, MOCK_MESSAGES, MOCK_TASKS, ...
유지 대상:  인터페이스/타입 (MockTask → Task로 이름 변경 후 src/types/로 이동)
유지 대상:  로컬 상수 (EMOJI_LIST, MOCK_CODE_SAMPLES, MEETING_NOTES_TEMPLATE)
```

### Store → API 전환 매핑

| Store | 현재 Mock 소스 | 전환 시 API |
|-------|---------------|------------|
| `useAuthStore` | `MOCK_USERS`, `MOCK_PASSWORD` | `POST /api/auth/login`, `GET /api/auth/me` |
| `useGroupContextStore` | `MOCK_ORGANIZATIONS`, `MOCK_CHANNELS` | `GET /api/organizations`, `GET /api/groups` |
| `useChatStore` | `MOCK_MESSAGES` | Socket.IO `chat:message` 이벤트 |
| `useThreadStore` | `MOCK_THREAD_REPLIES` | `GET /api/messages/:id/thread` |
| `useAIStore` | 내부 `MOCK_RAG_RESPONSES` | `POST /api/ai/chat` (SSE 스트리밍) |
| `useCustomFieldStore` | `MOCK_CUSTOM_FIELD_DEFINITIONS/VALUES` | `GET /api/custom-fields`, `PUT /api/tasks/:id/custom-fields` |
| `useMeetingStore` | `MOCK_MEETINGS` | `GET /api/meetings`, Socket.IO `meeting:*` |
| `useVoiceChatStore` | 내부 mock 참여자 | LiveKit SDK |
| `useScreenShareStore` | 내부 mock 상태 | LiveKit SDK |

### 타입 이동 계획

현재 `constants/index.ts`에 인터페이스와 데이터가 섞여 있다. 전환 시:

```
src/constants/index.ts (현재)
  ├── interface MockTask { ... }        → src/types/task.ts (Task로 이름 변경)
  ├── interface MockMessage { ... }     → src/types/message.ts
  ├── interface MockChannel { ... }     → src/types/channel.ts
  ├── interface MockOrgMember { ... }   → src/types/member.ts
  ├── type TaskPriority = ...           → src/types/task.ts
  ├── type TaskStatus = ...             → src/types/task.ts
  ├── type CustomFieldType = ...        → src/types/custom-field.ts
  ├── MOCK_TASKS = [...]                → 삭제
  ├── MOCK_MESSAGES = [...]             → 삭제
  ├── EMOJI_LIST = [...]                → 유지 (src/constants/emoji.ts로 분리)
  └── MEETING_NOTES_TEMPLATE = '...'    → 유지 (src/constants/templates.ts로 분리)
```

### 주의사항

- **컴포넌트에서 `MOCK_*`를 직접 import하는 곳이 있다** (ChannelView, TasksPage 등). 이 부분은 Store를 경유하도록 리팩토링 필요.
- **AISidePanel 내부에 자체 mock 데이터**가 있다 (`MOCK_PROJECT_FILES`, `MOCK_RAG_RESPONSES`). Store 외부에 있으므로 별도 정리 필요.
- `MOCK_PASSWORD = 'test1234'`는 인증 로직 전환 시 삭제.
- `interface MockTask`의 `Mock` 접두사는 전환 시 제거 (`Task`로 변경).

---

*마지막 업데이트: 2026-03-18*
