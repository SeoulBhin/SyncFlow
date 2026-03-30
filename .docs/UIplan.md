# UI/UX 개선 계획 (UIplan.md)

> Slack 대비 SyncFlow가 보완해야 할 UI/UX 항목 정리.
> SyncFlow 고유 강점(AI 회의 파이프라인, 본격 문서 편집, 4종 작업 뷰, 올인원 통합)은 유지하되,
> 경쟁 제품 대비 부족한 영역을 개선한다.

---

## 1. 랜딩페이지 — 제품 스크린샷/데모 영역

**현황:** Hero 섹션이 텍스트만 존재. 제품이 뭔지 시각적으로 전달 불가.

**개선:**
- Hero 섹션 하단에 제품 스크린샷/GIF placeholder 영역 추가
- 반응형 목업 프레임(브라우저 창 형태) 안에 스크린샷 배치
- 실제 스크린샷은 개발 완료 후 Playwright로 자동 캡처하여 교체

**수정 파일:**
- `src/pages/landing/HeroSection.tsx` — 스크린샷 영역 추가

**구현 상세:**
```
HeroSection
├── 배지 ("AI가 회의에 참여합니다")
├── 헤드라인 + 서브카피
├── CTA 버튼
├── 부제
└── [NEW] 제품 스크린샷 영역
    └── 브라우저 목업 프레임 + placeholder 이미지/gradient
```

---

## 2. 랜딩페이지 — 기능 카드 5개 확장

**현황:** FEATURES 배열이 3개(AI 회의, 실시간 문서, 프로젝트 AI)뿐.

**개선:**
- 기존 3개 유지 + 2개 추가 = 총 5개
- 추가 항목: **작업 관리(4종 뷰)**, **음성 회의**
- 코드 실행은 제외

**수정 파일:**
- `src/constants/index.ts` — FEATURES 배열에 2개 항목 추가

**추가할 항목:**
```ts
{
  title: '스마트 작업 관리',
  description: '칸반, 리스트, 캘린더, 간트 4가지 뷰로 팀의 작업을 한눈에 관리하고, AI 회의에서 추출된 액션 아이템이 자동으로 등록됩니다.'
},
{
  title: '음성 회의 & 허들',
  description: '채널에서 원클릭으로 즉석 통화를 시작하고, 회의 모드를 켜면 AI가 실시간 자막과 회의록을 자동 생성합니다.'
}
```

**참고:** 그리드가 `lg:grid-cols-3`이므로 5개일 때 마지막 행 2개가 중앙 정렬되도록 조정 필요. 또는 6열로 맞추려면 추후 항목 추가 검토.

---

## 3. 랜딩페이지 — 경쟁 비교 섹션

**현황:** SyncFlow가 기존 도구 스택을 대체한다는 메시지가 없음.

**개선:**
- "왜 SyncFlow인가?" 비교 섹션 추가
- **타사 제품명 직접 명시 금지** — "메신저", "문서 도구", "프로젝트 관리", "화상 회의" 등 카테고리명만 사용
- 체크마크/X마크 비교 테이블 또는 "4개 도구 → 1개" 비주얼

**신규 파일:**
- `src/pages/landing/ComparisonSection.tsx`

**수정 파일:**
- `src/pages/landing/LandingPage.tsx` — ComparisonSection import 및 배치

**레이아웃:**
```
ComparisonSection
├── 헤딩: "여러 도구를 넘나들지 마세요"
├── 서브카피: "하나의 플랫폼에서 모든 협업을"
└── 비교 테이블 또는 카드
    ├── 기존 방식: 메신저 + 문서 도구 + 프로젝트 관리 + 화상 회의 (4개 아이콘)
    │   └── "컨텍스트 스위칭, 데이터 분산, 비용 증가"
    └── SyncFlow: 올인원 (1개 아이콘)
        └── "통합 컨텍스트, 데이터 연결, 단일 비용"
```

---

## 4. 랜딩페이지 — AI 회의 파이프라인 인포그래픽

**현황:** 킬러 피처인 AI 회의 파이프라인을 시각적으로 보여주는 섹션이 없음.

**개선:**
- "회의를 하면, 일이 정리됩니다" 플로우를 4단계 인포그래픽으로 시각화
- 각 단계에 아이콘 + 짧은 설명 + 연결선/화살표

**신규 파일:**
- `src/pages/landing/WorkflowSection.tsx`

**수정 파일:**
- `src/pages/landing/LandingPage.tsx` — WorkflowSection import 및 배치

**레이아웃:**
```
WorkflowSection
├── 헤딩: "AI가 회의를 일로 바꿉니다"
└── 4단계 플로우 (가로 또는 세로)
    ├── Step 1: 회의 시작 (마이크 아이콘)
    │   └── "채널에서 원클릭으로 회의 시작"
    ├── Step 2: 실시간 자막 (자막 아이콘)
    │   └── "AI가 음성을 텍스트로 변환"
    ├── Step 3: 회의록 생성 (문서 아이콘)
    │   └── "핵심 논의사항을 자동 정리"
    └── Step 4: 작업 등록 (체크박스 아이콘)
        └── "액션 아이템을 칸반에 자동 추가"
```

**모바일:** 가로 → 세로 플로우로 전환 (sm 브레이크포인트)

---

## 5. 채널 요약 AI (일일 요약 / 채널 캐치업)

**현황:** 채널 대화 요약 기능 없음. 부재 후 복귀 시 모든 메시지를 직접 읽어야 함.

**개선:**
- **채널 상단**: "놓친 대화 요약" 버튼 → 클릭 시 AI가 최근 대화 요약 표시
- **대시보드**: "오늘의 요약" 위젯 — 주요 채널들의 핵심 논의 요약

**수정 파일:**
- `src/pages/channel/ChannelView.tsx` — 채널 상단에 요약 버튼/배너 추가
- `src/pages/dashboard/DashboardPage.tsx` — 일일 요약 위젯 추가

**백엔드 필요:**
- `backend/src/ai/` — 채널 메시지 요약 API 엔드포인트 추가
- 기존 RAG 인프라 활용 가능

**UI 상세:**
```
ChannelView 상단
├── [NEW] 캐치업 배너 (읽지 않은 메시지가 N개 이상일 때 표시)
│   ├── "42개의 새 메시지가 있습니다"
│   ├── [AI 요약 보기] 버튼
│   └── 클릭 시 요약 카드 펼침
│       ├── 핵심 논의 3줄 요약
│       ├── 주요 결정사항
│       └── 나에게 온 멘션
```

---

## 6. 허들(즉석 통화) — 채널 내 원클릭 음성 참여

**현황:** 회의가 "공식적" 느낌. 별도 회의 페이지로 이동해야 함.

**개선:**
- 채널 헤더에 **헤드폰 아이콘** → 클릭 시 즉시 음성 참여 (허들)
- 허들 = 비공식 즉석 통화. 자유 입퇴장.
- 허들 상태에서 **"회의 시작" 버튼**을 누르면 → STT, 실시간 자막, AI 회의록, 작업 자동 등록 활성화
- 즉, 허들이 **회의의 로비/대기실 역할**을 겸함

**수정 파일:**
- `src/components/channel/ChannelHeader.tsx` — 허들 버튼 추가
- `src/components/voice-chat/VoiceChatPanel.tsx` — 허들 모드 UI 추가
- `src/stores/useVoiceChatStore.ts` — 허들 상태 관리
- `src/pages/channel/ChannelView.tsx` — 채널 하단에 허들 참여자 바 표시

**흐름:**
```
[채널 화면]
  └── ChannelHeader: 헤드폰 아이콘 클릭
      └── 허들 참여 (음성 연결)
          ├── 채널 하단에 "허들 참여 중" 바 표시
          │   ├── 참여자 아바타 (최대 N명)
          │   ├── 음소거/음소거 해제
          │   ├── 화면 공유
          │   ├── [회의 시작] 버튼 ← 이때부터 STT/AI 활성화
          │   └── 나가기
          └── 다른 채널 멤버에게 "허들 진행 중" 표시
              └── 클릭 시 참여
```

**회의 전환 흐름:**
```
허들(비공식 통화)
  → 누군가 "회의 시작" 클릭
  → STT ON, 실시간 자막 시작, AI 회의록 생성 시작
  → 회의 종료 시 → 회의 요약 페이지 생성 + 작업 자동 등록
  → 허들은 계속 유지 가능 (또는 함께 종료)
```

---

## 7. 문서 템플릿 시스템

**현황:** 문서 생성 시 항상 빈 문서로 시작. 반복적인 양식을 매번 처음부터 작성.

**개선:**
- CreatePageModal에서 **"빈 문서"** 외에 **템플릿 선택 그리드** 표시
- 프리셋 템플릿: 회의록, 프로젝트 기획서, 스프린트 회고, 주간보고, 기술 문서

**수정 파일:**
- `src/components/group/CreatePageModal.tsx` — 템플릿 선택 UI 추가
- `src/constants/index.ts` 또는 신규 `src/constants/templates.ts` — 템플릿 데이터

**템플릿 목록:**
```ts
const PAGE_TEMPLATES = [
  {
    id: 'blank',
    title: '빈 문서',
    icon: 'FileText',
    content: ''
  },
  {
    id: 'meeting-notes',
    title: '회의록',
    icon: 'Mic',
    content: '## 회의 정보\n- 일시: \n- 참석자: \n\n## 안건\n\n## 논의사항\n\n## 결정사항\n\n## 액션 아이템\n| 담당자 | 내용 | 기한 |\n|--------|------|------|\n| | | |'
  },
  {
    id: 'project-brief',
    title: '프로젝트 기획서',
    icon: 'Target',
    content: '## 프로젝트 개요\n\n## 목표\n\n## 범위\n\n## 일정\n\n## 리소스\n\n## 리스크'
  },
  {
    id: 'sprint-retro',
    title: '스프린트 회고',
    icon: 'RotateCcw',
    content: '## 스프린트 정보\n- 기간: \n- 목표: \n\n## 잘한 점\n\n## 개선할 점\n\n## 액션 아이템'
  },
  {
    id: 'weekly-report',
    title: '주간 보고',
    icon: 'Calendar',
    content: '## 이번 주 완료\n\n## 다음 주 계획\n\n## 이슈 & 블로커\n\n## 공유사항'
  },
  {
    id: 'tech-doc',
    title: '기술 문서',
    icon: 'Code',
    content: '## 개요\n\n## 아키텍처\n\n## API 명세\n\n## 설치 & 실행\n\n## 트러블슈팅'
  }
]
```

**CreatePageModal 레이아웃:**
```
CreatePageModal
├── 모달 헤더: "새 페이지 만들기"
├── 페이지 이름 입력
├── [NEW] 템플릿 선택 그리드 (2~3열)
│   ├── 빈 문서 (기본 선택)
│   ├── 회의록
│   ├── 프로젝트 기획서
│   ├── 스프린트 회고
│   ├── 주간 보고
│   └── 기술 문서
└── 생성 버튼
```

---

## 8. 사이드바 Custom Sections (채널 자유 그룹핑)

**현황:** 사이드바 채널 목록이 고정 섹션(즐겨찾기/채널/프로젝트)으로만 구분. 채널 수가 늘어나면 관리 어려움.

**개선:**
- 사용자가 커스텀 섹션을 생성하여 채널을 자유롭게 그룹핑
- 드래그앤드롭으로 채널을 섹션 간 이동
- 섹션 이름 편집, 접기/펴기, 삭제

**수정 파일:**
- `src/components/layout/SlackSidebar.tsx` — 커스텀 섹션 렌더링 + 추가/편집 UI
- `src/stores/useSidebarStore.ts` — 커스텀 섹션 상태 관리

**데이터 모델:**
```ts
interface CustomSection {
  id: string
  name: string
  channelIds: string[]
  isCollapsed: boolean
  order: number
}
```

**UI 상세:**
```
SlackSidebar
├── 조직 헤더
├── 메인 네비게이션 (홈, 메시지, 작업, 회의)
├── 구분선
├── [기존] 즐겨찾기 섹션
├── [기존] 채널 섹션 (커스텀 섹션에 속하지 않은 채널)
├── [NEW] 커스텀 섹션들
│   ├── "프론트엔드팀" (접기/펴기)
│   │   ├── #react-dev
│   │   └── #ui-review
│   ├── "백엔드팀" (접기/펴기)
│   │   ├── #api-dev
│   │   └── #db-ops
│   └── [+ 섹션 추가] 버튼
├── [기존] 프로젝트 섹션
└── 설정
```

**백엔드 필요:**
- 사용자별 커스텀 섹션 저장 API (settings 모듈 확장)

---

## 9. 외부 협업 — 게스트 링크 (가입 없이 참여)

**현황:** 외부 협업 시 상대방도 SyncFlow 가입 필요. 진입 장벽 높음.

**개선:**
- **공유 링크 생성**: 채널, 문서, 회의 요약에 대해 "공유 링크 생성" 기능
- **게스트 뷰**: 가입 없이 브라우저에서 읽기 전용(또는 제한된 편집) 접근
- **만료 설정**: 링크에 만료 기간/비밀번호 설정 가능

**수정 파일:**
- `src/components/channel/ChannelHeader.tsx` — 공유 링크 생성 버튼 추가
- `src/pages/editor/DocumentEditorPage.tsx` — 공유 링크 생성 버튼 추가
- 신규: `src/pages/guest/GuestView.tsx` — 게스트 접근 경량 페이지
- `src/app/router.tsx` — `/guest/:token` 라우트 추가

**백엔드 필요:**
- 토큰 기반 게스트 인증 API
- 공유 링크 CRUD API (만료, 권한 수준 설정)
- 게스트 접근 로깅

**공유 링크 생성 UI:**
```
ShareLinkModal
├── 공유 대상 표시 (채널명 / 문서명 / 회의 요약)
├── 권한 설정
│   ├── 읽기 전용
│   └── 댓글 허용 (문서의 경우)
├── 만료 설정
│   ├── 7일 / 30일 / 무제한
│   └── 비밀번호 (선택)
├── [링크 생성] 버튼
└── 생성된 링크 복사 영역
```

**게스트 뷰 레이아웃:**
```
GuestView (경량 페이지, 풀 앱 아님)
├── 상단 바
│   ├── SyncFlow 로고
│   ├── 공유된 콘텐츠 제목
│   └── [SyncFlow 시작하기] CTA
├── 콘텐츠 영역
│   ├── 문서: 읽기 전용 TipTap 렌더
│   ├── 회의 요약: 요약 카드
│   └── 채널: 최근 메시지 읽기 전용
└── 하단
    └── "SyncFlow에서 더 많은 기능을 경험하세요" CTA
```

---

## 10. Activity 통합 피드

**현황:** 멘션, 스레드 답글, 리액션, 작업 알림이 흩어져 있음. 통합 확인 불가.

**개선:**
- 사이드바에 **Activity 탭** 추가 또는 독립 페이지
- 모든 알림을 시간순 통합 피드로 표시
- 필터: 전체 / 멘션 / 스레드 / 리액션 / 작업

**신규 파일:**
- `src/pages/activity/ActivityPage.tsx` — Activity 피드 페이지
- `src/stores/useActivityStore.ts` — 알림 통합 스토어

**수정 파일:**
- `src/components/layout/SlackSidebar.tsx` — Activity 네비게이션 항목 추가
- `src/app/router.tsx` — `/app/activity` 라우트 추가

**레이아웃:**
```
ActivityPage
├── 헤더: "활동"
├── 필터 탭: [전체] [멘션] [스레드] [리액션] [작업]
└── 피드 (시간순, 무한 스크롤)
    ├── 멘션 항목
    │   ├── "김영수가 #기술개발TF에서 나를 멘션했습니다"
    │   ├── 메시지 미리보기
    │   └── 타임스탬프 + [채널로 이동]
    ├── 스레드 답글 항목
    │   ├── "박서준이 내 메시지에 답글을 달았습니다"
    │   ├── 답글 미리보기
    │   └── 타임스탬프 + [스레드 열기]
    ├── 리액션 항목
    │   └── "이지은 외 2명이 내 메시지에 반응했습니다"
    └── 작업 알림 항목
        └── "새 작업이 배정되었습니다: API 설계 검토"
```

**데이터 모델:**
```ts
interface ActivityItem {
  id: string
  type: 'mention' | 'thread_reply' | 'reaction' | 'task_assigned' | 'task_updated'
  actorId: string
  actorName: string
  channelId?: string
  channelName?: string
  messagePreview?: string
  taskId?: string
  taskTitle?: string
  createdAt: string
  isRead: boolean
}
```

---

## 구현 우선순위 (제안)

| 순위 | 항목 | 난이도 | 영향도 | 비고 |
|------|------|--------|--------|------|
| 1 | 기능 카드 5개 확장 (#2) | 낮음 | 중간 | 상수 수정만 |
| 2 | AI 회의 파이프라인 인포그래픽 (#4) | 낮음 | 높음 | 킬러 피처 어필 |
| 3 | 경쟁 비교 섹션 (#3) | 낮음 | 높음 | 포지셔닝 명확화 |
| 4 | 제품 스크린샷 placeholder (#1) | 낮음 | 높음 | 나중에 실제 이미지 교체 |
| 5 | 문서 템플릿 시스템 (#7) | 중간 | 중간 | 프론트엔드만 |
| 6 | 허들/즉석 통화 (#6) | 높음 | 높음 | 기존 음성 시스템 확장 |
| 7 | Activity 통합 피드 (#10) | 중간 | 중간 | 신규 페이지 + 스토어 |
| 8 | 사이드바 Custom Sections (#8) | 중간 | 중간 | 드래그앤드롭 포함 |
| 9 | 채널 요약 AI (#5) | 높음 | 높음 | 백엔드 AI 필요 |
| 10 | 게스트 링크 (#9) | 높음 | 높음 | 백엔드 인증 필요 |

---

## 랜딩페이지 섹션 배치 순서

```
LandingPage (개선 후)
├── Navbar
├── HeroSection (+ 제품 스크린샷 placeholder)
├── WorkflowSection (AI 회의 파이프라인 인포그래픽)
├── FeatureCards (5개)
├── ComparisonSection (경쟁 비교)
├── CTASection
└── Footer
```
