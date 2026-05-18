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

### 상태
Slack 패턴 정렬 ~90%. 사이드바: 조직 헤더(⚙️ 조직 설정) + 채널/프로젝트/DM 섹션 분리 + 좌측 하단 프로필/조직 설정. 신규 가입자 = `WelcomeOnboarding` 풀스크린.

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

### 상태
실제 백엔드 연동 완료. dev 부팅 시 tester1~3 자동 시드 (`AuthService.seedTestUsersIfDev`). AppLayout 마운트 시 `fetchMe`로 user 자동 채움.

### 사용 방법
- 로그인: `tester1@test.com` / `test1234` (또는 tester2/3)
- OAuth: Google/GitHub/Kakao 버튼 — 백엔드 연동
- **프로필** (`/app/profile`): 닉네임/아바타 + 비밀번호 변경 + 소셜 연동 + 계정 탈퇴 (조직 설정에서 분리됨)

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/pages/auth/LoginPage.tsx` | 로그인 폼 |
| `src/pages/auth/RegisterPage.tsx` | 회원가입 폼 |
| `src/pages/auth/ProfilePage.tsx` | 프로필 + AccountSecuritySection (비번/소셜/탈퇴) |
| `src/components/profile/AccountSecuritySection.tsx` | 보안 섹션 분리 |
| `src/stores/useAuthStore.ts` | 인증 + fetchMe |

---

## 3. 대시보드

### 상태
실제 백엔드 연동. **DM 제외**된 부서 채널만 노출. 우측 하단 카드 = "조직 코드 발급"(owner의 8자리 코드 노출/재발급).

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/pages/dashboard/DashboardPage.tsx` | 대시보드 + OrgInviteCodeCard |

---

## 4. 메신저 & 스레드

### 상태
실제 백엔드 연동 + Socket.IO Gateway. 채널/DM/프로젝트 채팅 통합 모델(`channel.type`). 채널 진입 시 markRead 즉시 반영. URL `:channelId` → useChatStore 자동 동기화.

### 사용 방법
- 메시지 보내기/스레드/이모지/파일 첨부/`@AI` 멘션
- `/app/messages` = **DM 전용 인박스**
- 사이드바 "다이렉트 메시지" 섹션 + 새 DM 버튼 → 조직원 검색 → 1:1 채널 즉시 진입

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/pages/channel/ChannelView.tsx` | 메신저 메인 (URL→active 동기화, markRead) |
| `src/pages/messages/MessagesPage.tsx` | DM 전용 인박스 |
| `src/components/messages/NewDMModal.tsx` | 조직원 검색 → DM 시작 |
| `src/components/channel/ChannelHeader.tsx` | 토픽/멤버/회의/⚙️설정 |
| `src/components/channel/ChannelSettingsModal.tsx` | 이름·토픽·멤버·삭제 |
| `src/components/layout/SidebarDMList.tsx` | 사이드바 DM 섹션 (otherUser 표시) |
| `src/stores/useChannelsStore.ts` | 채널 fetch/add/remove/markChannelRead |
| `src/stores/useChatStore.ts` | 활성 채널 + 메시지 |

---

## 5. 외부 조직 공유 채널 (Slack Connect) — **P3 보류**

> Slack 정렬 로드맵 Phase 3. UI/백엔드 모두 미구현. `connected_org_ids` 컬럼만 있고 흐름 없음. 데드 화면 방지 위해 명시적 보류.

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

## 10. AI 어시스턴트 — **P3 보류**

> RAG·embedding pipeline 미구현. UI는 mock 응답으로 데모 가능. 백엔드 RAG 완성 시 활성화.

### 왜 필요한가 (목표)
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

## 11. 음성 채팅 & 화면 공유 — **P3 보류**

> LiveKit 토큰 발급은 OK, SFU 풀 통합·녹화·세션 기록은 미완. UI 부분 작동.

### 왜 필요한가 (목표)
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

### 상태
**즉시 시작 X** — 회의 방 생성 후 호스트가 명시적 시작/종료. 공개·비공개 + 참여자 지정. 비공개 회의록은 참여자만 열람. 호스트/조직 관리자만 종료·삭제.

### 사용 방법
- **회의 방 생성**: 대시보드 "새 회의 방" 또는 채널 헤더 📹 → CreateMeetingModal (제목·공개범위·참여자)
- **목록**: `/app/meetings` — 본인이 호스트이거나 참여자로 지정된 회의만 노출
- **시작/종료**: 호스트만 (status 'scheduled' → 'in-progress' → 'ended')
- **삭제**: 호스트 또는 조직 owner/admin

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/pages/meeting/MeetingHistoryPage.tsx` | 회의 목록 |
| `src/pages/meeting/MeetingRoomPage.tsx` | 회의실 |
| `src/pages/meeting/MeetingSummaryPage.tsx` | 회의록 요약 |
| `src/components/meeting/CreateMeetingModal.tsx` | 방 생성 (visibility/참여자) |
| `src/stores/useMeetingStore.ts` | createMeeting/startMeetingApi/deleteMeetingApi/loadMyMeetings(orgId) |

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

## 13-1. 가시성 & 권한 모델 (설계)

> 현재 프론트는 mock 데이터 기반이므로 권한 체크가 없다.
> 백엔드 구현 시 아래 모델을 적용한다.

### 문제

| 상황 | 현재 | 개선 |
|------|------|------|
| CTO가 전사 작업 확인 | 모든 채널에 일일이 참여해야 함 | Owner/Admin은 자동 열람 |
| 새 멤버가 채널 참여 | 초대해야 함 | public 채널은 자유 참여 |
| 외부 디자이너가 프로젝트 열람 | 방법 없음 | project_members로 Viewer 초대 |

### 구조

```
조직 (Organization)
  ├── Owner/Admin → 모든 그룹·프로젝트 자동 열람 + 전사 대시보드
  ├── Member → 참여한 그룹만
  └── Guest → 초대된 외부 채널만

그룹 (Group)
  ├── public: 조직 내 누구나 검색·참여
  ├── private: 초대제
  └── external: 외부 조직 공유 (Slack Connect)

프로젝트
  ├── 그룹 멤버 → 자동 접근
  └── project_members → 그룹 외부 Viewer 개별 초대
```

### 프론트엔드 적용 필요 사항 (백엔드 연동 시)

| UI | 변경 |
|----|------|
| 그룹 생성 모달 | `visibility` 선택 (public/private) — **이미 external 선택은 구현됨** |
| 사이드바 채널 목록 | public 그룹은 🔍 검색/참여 버튼, private은 🔒 아이콘 |
| 대시보드 | Owner/Admin용 "전사 뷰" 탭 (크로스 프로젝트 작업 현황) |
| 프로젝트 설정 | "Viewer 초대" 기능 (project_members) |
| 작업 페이지 | 권한에 따라 편집/읽기전용 분기 |

> 상세 설계는 `.docs/PROJECT.md` "가시성 & 권한 모델" 섹션 참조

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

---

## Slack 정렬 로드맵

> 모든 UI/UX는 Slack 패턴을 기준으로 정렬한다. 백엔드 의존도에 따라 4단계로 나누고, 작업 시작 전 항상 이 표에서 다음 카드를 뽑는다.

### Phase 0 — 백엔드 의존 0 (지금 바로)

프론트만으로 완결되는 폴리싱. Slack 학습 곡선 0이 되는 핵심.

| 항목 | 현재 | Slack 목표 | 관련 파일 |
|------|------|----------|---------|
| 채널 헤더 토픽 인라인 편집 | 모달에서만 수정 | 헤더 클릭 → 즉시 input → blur 저장 | `components/channel/ChannelHeader.tsx` |
| DetailPanel 채널 멤버 패널 | 토글만 됨 (내용 비어있음) | 멤버 목록 + role 배지 + 추가/제거 진입점 | `components/layout/DetailPanel.tsx` |
| 사이드바 채널 hover ⚙️ | 없음 | hover 시 채널 설정 빠른 진입 | `components/layout/SlackSidebar.tsx` |
| 메시지 hover 액션 정렬 | 일부 (스레드/이모지) | 별표/스레드/이모지/저장/⋯ 통일 | `pages/channel/ChannelView.tsx` |
| 키보드 단축키 안내 | 없음 | Cmd+K(검색), Cmd+Shift+M(멘션) 등 | `components/common/SearchModal.tsx` |
| 사이드바 즐겨찾기 섹션 | 빈 배열 | 별표한 채널/DM 노출 (P1과 연동) | `components/layout/SlackSidebar.tsx` |

### Phase 1 — 작은 백엔드 추가

컬럼 1~2개 또는 endpoint 1~2개 추가로 가능.

| 항목 | 백엔드 추가 | Slack 패턴 |
|------|----------|----------|
| 메시지 핀 | `messages.is_pinned BOOLEAN` + `GET /channels/:id/pins` | 헤더 📌, 핀 목록 패널 |
| 채널 토픽 변경 시스템 메시지 | 토픽 PUT 시 system message INSERT | "박서준이 토픽을 ~로 변경" |
| 채널별 알림 설정 | `channel_members.notification_pref` enum | 헤더 🔔 → 모든/멘션만/없음 |
| 즐겨찾기 ⭐ | `favorites` 테이블 (user_id, channel_id) | 사이드바 즐겨찾기 섹션 채움 |
| 메시지 저장(북마크) | `saved_messages` 테이블 | 헤더 🔖 → 저장한 메시지 |

### Phase 2 — 중간 백엔드 작업

신규 도메인 1개 또는 endpoint set.

| 항목 | 백엔드 작업 | Slack 패턴 |
|------|----------|----------|
| 파일 모음 페이지 | `file_uploads` 채널별 GET + 검색 | 채널 헤더 📎 → 파일 모음 |
| 통합 검색 (Cmd+K) | 메시지/파일/채널/사용자 통합 search endpoint | Cmd+K 모달 결과 sectioned |
| 알림 inbox | `notifications` 테이블 + Socket.IO 푸시 | 우측 상단 🔔 → 인박스 |
| 멘션 추적 | 메시지에서 `@user` 파싱 + mentions 테이블 | 헤더 @ 버튼 → 내 멘션만 |
| 채널 토픽 알림 | 토픽 변경 시 멤버에게 푸시 | (위 알림 inbox 통합) |

### Phase 3 — 큰 백엔드 작업 (보류)

새 데이터 모델 + 통합 흐름. **지금은 UI도 만들지 말고 명시적 "나중"** — 데드 화면 < 명시적 누락.

| 항목 | 왜 보류 | 의존 |
|------|--------|------|
| Slack Connect (외부 조직 공유 채널) | `connected_org_ids` 컬럼만 있고 흐름 미구현 | 외부 조직 인증·권한 모델 |
| Canvas (공유 노트) | 신규 도메인 | TipTap + 새 데이터 모델 |
| Workflow Builder | 신규 도메인 | Job 큐 + 트리거 시스템 |
| AI RAG 답변 | pgvector 미연동 | Gemini + embedding pipeline |
| 음성/화상 huddle 풀 통합 | LiveKit 토큰만 발급, SFU 안정화 미완 | LiveKit Server 안정화 |
| Slack Apps / Webhook | 외부 통합 신규 | OAuth 2.0 외부 앱 인증 |

### 도메인별 Slack 정렬 매트릭스

UI.md의 14개 도메인이 Slack의 어디에 매핑되는지, 어떤 Phase로 가야 하는지.

| # | 도메인 | 현재 상태 | Slack 비교 | Phase |
|---|-------|---------|----------|-------|
| 1 | 레이아웃 & 네비게이션 | ~90% | 사이드바·헤더·DetailPanel 구조 OK | **P0 폴리싱** |
| 2 | 인증 & 계정 | OAuth + 프로필 분리 완료 | Slack과 무관 (앱 공통) | — |
| 3 | 대시보드 | 내 채널/페이지/회의/조직코드 | Slack은 대시보드 없음 (Home 탭) | 자체 색깔 유지 |
| 4 | 메신저 & 스레드 | ChannelView + 스레드 OK | hover 액션 정렬, 핀 미구현 | **P0 + P1** |
| 5 | Slack Connect | Mock UI만 | Slack Connect 정확 매핑 | **P3 보류** |
| 6 | 작업 관리 (4뷰) | 칸반/캘린더/간트/리스트 | Slack 외부 도구 영역 (Asana 통합) | 자체 색깔 |
| 7 | 커스텀 필드 | OK | 자체 색깔 | — |
| 8 | 문서 에디터 | TipTap + Yjs | Slack의 Canvas와 매핑 | P3 (Canvas 보류) |
| 9 | 코드 에디터 | Monaco | Slack 비대상 | 자체 색깔 |
| 10 | AI 어시스턴트 | UI 있음, RAG 미연동 | Slack AI와 매핑 | **P3 보류** |
| 11 | 음성/화면 공유 | LiveKit 토큰만 | Slack Huddle | **P3 보류** |
| 12 | 회의 시스템 | 방 생성/시작/참여자/회의록 OK | Slack 비대상 (자체 킬러) | 자체 색깔 |
| 13 | 설정 & 빌링 | 조직 설정/프로필 분리 OK | Slack 매핑 자연스러움 | **P0 폴리싱** |
| 14 | 공통 컴포넌트 | Button/Modal/Toast | — | — |

### 의사결정 가이드

- **새 작업 시작 전**: 이 표에서 도메인 → Phase 확인. P0/P1만 손대고 P3는 명시적 보류.
- **Mock 컴포넌트 만들 유혹 금지**: P3 항목은 UI도 만들지 말고 "추후" 표기. **데드 화면 < 명시적 누락**.
- **Phase 0 항목이 아직 남아있으면**: 그것부터 끝내고 Phase 1로 넘어간다. 단계 건너뛰지 않음.
- **백엔드 미완 영역**: 김명준 등 백엔드 진행 상황 확인 후 Phase 1/2 항목으로 승격.

### 다음 1주 작업 제안 (Phase 0부터)

1. DetailPanel 채널 멤버 패널 채우기 (`GET /channels/:id/members` 이미 있음)
2. 채널 헤더 토픽 인라인 편집
3. 사이드바 채널 hover 시 ⚙️ 빠른 진입
4. 메시지 hover 액션 5개 정렬 (별표 보류, 나머지 4개)
5. 사이드바 즐겨찾기 — Phase 1로 진행 시 백엔드와 함께
