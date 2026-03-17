export const APP_NAME = 'SyncFlow'

export const FEATURES = [
  {
    title: 'AI 회의 어시스턴트',
    description:
      'AI가 회의에 참여하여 실시간 회의록을 자동 생성하고, 핵심 논의사항과 액션 아이템을 추출하여 작업으로 자동 등록합니다.',
  },
  {
    title: '실시간 문서 동시 편집',
    description:
      '여러 팀원이 하나의 문서를 동시에 편집하고, 라이브 커서로 서로의 작업을 실시간으로 확인하세요.',
  },
  {
    title: '프로젝트 맥락 AI',
    description:
      '프로젝트 문서와 코드를 이해하는 RAG 기반 AI가 맥락에 맞는 답변과 자료를 제안합니다.',
  },
] as const

/* ── 조직(Organization) ── */

export interface MockOrganization {
  id: string
  name: string
  description: string
  memberCount: number
  plan: string
}

export const MOCK_ORGANIZATIONS: MockOrganization[] = [
  { id: 'org1', name: '테크노바 주식회사', description: 'AI·클라우드 솔루션 기업', memberCount: 42, plan: 'Business' },
  { id: 'org2', name: '블루웨이브 마케팅', description: '디지털 마케팅 에이전시', memberCount: 18, plan: 'Pro' },
]

/* ── 채널(Channel) — 기존 그룹을 대체 ── */

export interface MockChannel {
  id: string
  orgId: string
  name: string
  description: string
  isExternal?: boolean
  memberCount: number
  lastActivity: string
}

export const MOCK_CHANNELS: MockChannel[] = [
  { id: 'ch1', orgId: 'org1', name: '마케팅전략', description: '마케팅팀 채널', memberCount: 8, lastActivity: '10분 전' },
  { id: 'ch2', orgId: 'org1', name: '기술개발TF', description: '신규 제품 개발 태스크포스', memberCount: 12, lastActivity: '방금' },
  { id: 'ch3', orgId: 'org1', name: '경영기획', description: '경영 전략 및 기획', memberCount: 6, lastActivity: '1시간 전' },
  { id: 'ch4', orgId: 'org1', name: '외부협력-블루웨이브', description: '블루웨이브 마케팅과의 협업 채널', isExternal: true, memberCount: 5, lastActivity: '3시간 전' },
  { id: 'ch5', orgId: 'org2', name: '크리에이티브', description: '콘텐츠 기획·제작', memberCount: 7, lastActivity: '30분 전' },
  { id: 'ch6', orgId: 'org2', name: '퍼포먼스', description: '퍼포먼스 마케팅 운영', memberCount: 5, lastActivity: '2시간 전' },
]

/* ── 하위 호환: MOCK_GROUPS (채널 기반) ── */

export const MOCK_GROUPS = MOCK_CHANNELS.filter((c) => c.orgId === 'org1').map((c) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  memberCount: c.memberCount,
  lastActivity: c.lastActivity,
}))

/* ── 프로젝트 ── */

export const MOCK_PROJECTS = [
  { id: 'p1', groupId: 'ch1', name: '2026 마케팅 전략', description: '연간 마케팅 로드맵' },
  { id: 'p2', groupId: 'ch1', name: 'Q1 캠페인', description: '1분기 프로모션 캠페인' },
  { id: 'p3', groupId: 'ch2', name: 'SyncFlow v2', description: '차세대 플랫폼 개발' },
  { id: 'p4', groupId: 'ch2', name: 'API 리팩토링', description: 'REST → GraphQL 전환' },
  { id: 'p5', groupId: 'ch5', name: '브랜드 리뉴얼', description: '클라이언트 A 브랜드 리뉴얼' },
]

export const MOCK_PAGES = [
  { id: 'pg1', projectId: 'p1', name: '마케팅 전략 문서', type: 'doc' as const },
  { id: 'pg2', projectId: 'p3', name: 'API 설계서', type: 'doc' as const },
  { id: 'pg3', projectId: 'p3', name: 'main.py', type: 'code' as const },
  { id: 'pg4', projectId: 'p4', name: 'schema.graphql', type: 'code' as const },
]

export const MOCK_RECENT_PAGES = [
  { id: 'rp1', name: '마케팅 전략 문서', type: 'doc' as const, groupName: '마케팅전략', projectName: '2026 마케팅 전략', updatedAt: '5분 전' },
  { id: 'rp2', name: 'main.py', type: 'code' as const, groupName: '기술개발TF', projectName: 'SyncFlow v2', updatedAt: '15분 전' },
  { id: 'rp3', name: 'API 설계서', type: 'doc' as const, groupName: '기술개발TF', projectName: 'SyncFlow v2', updatedAt: '1시간 전' },
  { id: 'rp4', name: 'schema.graphql', type: 'code' as const, groupName: '기술개발TF', projectName: 'API 리팩토링', updatedAt: '3시간 전' },
  { id: 'rp5', name: 'Q1 캠페인 기획서', type: 'doc' as const, groupName: '마케팅전략', projectName: 'Q1 캠페인', updatedAt: '어제' },
  { id: 'rp6', name: 'ERD 설계', type: 'doc' as const, groupName: '기술개발TF', projectName: 'SyncFlow v2', updatedAt: '어제' },
  { id: 'rp7', name: 'auth.service.ts', type: 'code' as const, groupName: '기술개발TF', projectName: 'API 리팩토링', updatedAt: '2일 전' },
]

/* ── 작업 관리 ── */

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low'
export type TaskStatus = 'todo' | 'in-progress' | 'done'

export const MOCK_MY_TASKS = [
  { id: 't1', title: '결제 API 연동', status: 'in-progress' as TaskStatus, priority: 'high' as TaskPriority, dueDate: '2026-03-12', projectName: 'SyncFlow v2' },
  { id: 't2', title: '마케팅 보고서 작성', status: 'todo' as TaskStatus, priority: 'urgent' as TaskPriority, dueDate: '2026-03-11', projectName: '2026 마케팅 전략' },
  { id: 't3', title: 'GraphQL 스키마 설계', status: 'todo' as TaskStatus, priority: 'normal' as TaskPriority, dueDate: '2026-03-14', projectName: 'API 리팩토링' },
  { id: 't4', title: 'CI/CD 파이프라인 구축', status: 'done' as TaskStatus, priority: 'low' as TaskPriority, dueDate: '2026-03-08', projectName: 'SyncFlow v2' },
  { id: 't5', title: 'Q1 캠페인 소재 검토', status: 'todo' as TaskStatus, priority: 'high' as TaskPriority, dueDate: '2026-03-13', projectName: 'Q1 캠페인' },
]

/* ── 채팅 채널 목업 데이터 ── */

export type ChatChannelType = 'channel' | 'project' | 'dm'

export interface MockChatChannel {
  id: string
  name: string
  type: ChatChannelType
  channelName?: string
  unread: number
  dmUser?: string
}

export const MOCK_CHAT_CHANNELS: MockChatChannel[] = [
  { id: 'cc1', name: '일반', type: 'channel', channelName: '마케팅전략', unread: 3 },
  { id: 'cc2', name: 'SyncFlow v2', type: 'project', channelName: '기술개발TF', unread: 0 },
  { id: 'cc3', name: 'Q1 캠페인', type: 'project', channelName: '마케팅전략', unread: 1 },
  { id: 'cc4', name: '일반', type: 'channel', channelName: '경영기획', unread: 0 },
  { id: 'cc5', name: 'API 리팩토링', type: 'project', channelName: '기술개발TF', unread: 0 },
]

export const MOCK_DMS: MockChatChannel[] = [
  { id: 'dm1', name: '박서준', type: 'dm', dmUser: '박서준', unread: 2 },
  { id: 'dm2', name: '이수현', type: 'dm', dmUser: '이수현', unread: 0 },
  { id: 'dm3', name: '김하늘', type: 'dm', dmUser: '김하늘', unread: 0 },
  { id: 'dm4', name: '정우진', type: 'dm', dmUser: '정우진', unread: 1 },
  { id: 'dm5', name: 'Tester', type: 'dm', dmUser: 'Tester', unread: 0 },
]

export interface MessageReaction {
  emoji: string
  users: string[]
}

export interface MessageAttachment {
  id: string
  name: string
  size: string
  type: 'image' | 'file'
  url?: string
}

export interface MockMessage {
  id: string
  channelId: string
  userId: string
  userName: string
  content: string
  timestamp: string
  isOwn: boolean
  isRead?: boolean
  reactions?: MessageReaction[]
  attachments?: MessageAttachment[]
  parentMessageId?: string
  replyCount?: number
}

export const EMOJI_LIST = [
  '😀','😂','🥹','😍','🤩','😎','🤔','😮',
  '👍','👎','❤️','🔥','🎉','💯','✅','👏',
  '🙏','💪','⭐','🚀','💡','📌','🎯','✨',
]

export const MOCK_CHANNEL_MEMBERS = [
  { id: 'u1', name: '김민수', position: '팀장' },
  { id: 'u2', name: '박서준', position: '시니어 개발자' },
  { id: 'u3', name: '이수현', position: '마케팅 매니저' },
  { id: 'u4', name: '김하늘', position: '디자이너' },
  { id: 'u5', name: '정우진', position: '주니어 개발자' },
]

export const MOCK_MESSAGES: MockMessage[] = [
  { id: 'm1', channelId: 'cc1', userId: 'u3', userName: '이수현', content: '마케팅 보고서 검토 부탁드립니다.', timestamp: '오후 2:30', isOwn: false, reactions: [{ emoji: '👍', users: ['u1','u4'] }] },
  { id: 'm2', channelId: 'cc1', userId: 'u1', userName: '김민수', content: '네, 오늘 중으로 피드백 드리겠습니다.', timestamp: '오후 2:31', isOwn: true, isRead: true },
  { id: 'm3', channelId: 'cc1', userId: 'u4', userName: '김하늘', content: '크리에이티브 소재도 첨부합니다.', timestamp: '오후 2:32', isOwn: false },
  { id: 'm4', channelId: 'cc1', userId: 'u3', userName: '이수현', content: '경쟁사 분석 자료도 올려놨어요', timestamp: '오후 2:33', isOwn: false, attachments: [{ id: 'a1', name: '경쟁사_분석_Q1.pdf', size: '2.4MB', type: 'file' }] },
  { id: 'm5', channelId: 'cc1', userId: 'u1', userName: '김민수', content: '좋습니다. 3시 회의에서 논의하죠.', timestamp: '오후 2:35', isOwn: true, isRead: true, reactions: [{ emoji: '🎉', users: ['u3','u4','u5'] }] },
  { id: 'm6', channelId: 'cc1', userId: 'u5', userName: '정우진', content: '데이터 대시보드 링크 공유합니다', timestamp: '오후 2:40', isOwn: false },
  { id: 'm7', channelId: 'cc2', userId: 'u2', userName: '박서준', content: '결제 모듈 PR 올렸습니다. 리뷰 부탁드려요.', timestamp: '오후 1:10', isOwn: false, reactions: [{ emoji: '🔥', users: ['u1'] }, { emoji: '👍', users: ['u5'] }] },
  { id: 'm8', channelId: 'cc2', userId: 'u1', userName: '김민수', content: '확인했습니다. 코드 리뷰 시작할게요.', timestamp: '오후 1:15', isOwn: true, isRead: true },
  { id: 'm9', channelId: 'cc2', userId: 'u5', userName: '정우진', content: '테스트 커버리지도 확인 부탁드립니다.', timestamp: '오후 1:20', isOwn: false },
  { id: 'm10', channelId: 'cc3', userId: 'u3', userName: '이수현', content: 'Q1 캠페인 타임라인 정리했습니다', timestamp: '오전 11:00', isOwn: false },
  { id: 'm11', channelId: 'cc3', userId: 'u4', userName: '김하늘', content: '배너 시안 3종 공유드려요', timestamp: '오전 11:05', isOwn: false, reactions: [{ emoji: '💡', users: ['u1'] }] },
  { id: 'm12', channelId: 'dm1', userId: 'u2', userName: '박서준', content: '내일 기술 검토 미팅 자료 준비됐나요?', timestamp: '오후 4:10', isOwn: false },
  { id: 'm13', channelId: 'dm1', userId: 'u1', userName: '김민수', content: '네, 퇴근 전에 공유 드리겠습니다.', timestamp: '오후 4:15', isOwn: true, isRead: true },
  { id: 'm14', channelId: 'dm1', userId: 'u2', userName: '박서준', content: '감사합니다!', timestamp: '오후 4:16', isOwn: false, reactions: [{ emoji: '❤️', users: ['u1'] }] },
]

/* ── 조직 멤버 ── */

export type OrgRole = 'owner' | 'admin' | 'member' | 'guest'

export interface MockOrgMember {
  id: string
  name: string
  email: string
  position: string
  role: OrgRole
  isOnline: boolean
  avatar?: string
}

export const MOCK_ORG_MEMBERS: Record<string, MockOrgMember[]> = {
  ch1: [
    { id: 'u1', name: '김민수', email: 'minsu.kim@technova.co.kr', position: '마케팅 팀장', role: 'owner', isOnline: true },
    { id: 'u3', name: '이수현', email: 'suhyun.lee@technova.co.kr', position: '마케팅 매니저', role: 'admin', isOnline: true },
    { id: 'u4', name: '김하늘', email: 'haneul.kim@technova.co.kr', position: '디자이너', role: 'member', isOnline: false },
    { id: 'u5', name: '정우진', email: 'woojin.jung@technova.co.kr', position: '주니어 마케터', role: 'member', isOnline: true },
  ],
  ch2: [
    { id: 'u1', name: '김민수', email: 'minsu.kim@technova.co.kr', position: 'CTO', role: 'owner', isOnline: true },
    { id: 'u2', name: '박서준', email: 'seojun.park@technova.co.kr', position: '시니어 개발자', role: 'admin', isOnline: true },
    { id: 'u5', name: '정우진', email: 'woojin.jung@technova.co.kr', position: '주니어 개발자', role: 'member', isOnline: true },
    { id: 'u6', name: '강도윤', email: 'doyun.kang@technova.co.kr', position: '백엔드 개발자', role: 'member', isOnline: false },
    { id: 'u7', name: '윤서아', email: 'seoa.yoon@technova.co.kr', position: 'QA 엔지니어', role: 'member', isOnline: false },
  ],
  ch4: [
    { id: 'u1', name: '김민수', email: 'minsu.kim@technova.co.kr', position: 'CTO', role: 'admin', isOnline: true },
    { id: 'u8', name: '한지민', email: 'jimin.han@bluewave.kr', position: '디지털 마케팅 팀장', role: 'guest', isOnline: true },
    { id: 'u9', name: '오승호', email: 'seungho.oh@bluewave.kr', position: '콘텐츠 디렉터', role: 'guest', isOnline: false },
  ],
}

/** @deprecated GroupRole은 OrgRole로 통합. 하위 호환용 */
export type GroupRole = OrgRole

/** @deprecated MockGroupMember는 MockOrgMember로 대체. 하위 호환용 */
export type MockGroupMember = MockOrgMember

/** @deprecated MOCK_GROUP_MEMBERS는 MOCK_ORG_MEMBERS로 대체 */
export const MOCK_GROUP_MEMBERS = MOCK_ORG_MEMBERS

export const MOCK_INVITE_CODES: Record<string, string> = {
  ch1: 'MK7X3P',
  ch2: 'TF9A2K',
  ch3: 'BZ5R8N',
}

export interface MockProjectDetail {
  id: string
  groupId: string
  name: string
  description: string
  dueDate?: string
  progress: number
  pageCount: number
  memberCount: number
}

export const MOCK_PROJECT_DETAILS: MockProjectDetail[] = [
  { id: 'p1', groupId: 'ch1', name: '2026 마케팅 전략', description: '연간 마케팅 로드맵', dueDate: '2026-04-30', progress: 45, pageCount: 8, memberCount: 4 },
  { id: 'p2', groupId: 'ch1', name: 'Q1 캠페인', description: '1분기 프로모션 캠페인', dueDate: '2026-03-31', progress: 72, pageCount: 5, memberCount: 3 },
  { id: 'p3', groupId: 'ch2', name: 'SyncFlow v2', description: '차세대 플랫폼 개발', dueDate: '2026-06-30', progress: 28, pageCount: 15, memberCount: 5 },
  { id: 'p4', groupId: 'ch2', name: 'API 리팩토링', description: 'REST → GraphQL 전환', dueDate: '2026-04-15', progress: 60, pageCount: 7, memberCount: 3 },
]

/* ── 문서 에디터 목업 데이터 ── */

export const MOCK_DOC_CONTENT = `
<h1>2026 마케팅 전략</h1>
<p><strong>테크노바 주식회사</strong>의 2026년 마케팅 전략 문서입니다. AI 솔루션 시장의 성장에 맞춰 브랜드 포지셔닝을 강화합니다.</p>

<h2>핵심 전략</h2>
<ul>
  <li><strong>AI 솔루션 리더십</strong> — 기술 블로그, 백서, 웨비나를 통한 Thought Leadership 구축</li>
  <li><strong>B2B 디지털 마케팅</strong> — LinkedIn, Google Ads, ABM 캠페인 운영</li>
  <li><strong>파트너 에코시스템</strong> — 클라우드 파트너사와의 공동 마케팅 프로그램</li>
  <li><strong>고객 성공 사례</strong> — Case Study 발행 및 레퍼런스 프로그램</li>
</ul>

<h2>KPI</h2>
<h3>Q1 목표</h3>
<p>MQL 200건, SQL 50건, 웹사이트 트래픽 월 50,000 세션</p>

<h3>Q2 목표</h3>
<p>파이프라인 ₩5B, 고객 전환율 15% 이상</p>

<blockquote><p>마케팅과 세일즈 간 긴밀한 협업이 성공의 핵심입니다.</p></blockquote>

<h2>일정</h2>
<ol>
  <li>브랜드 리뉴얼 (3월)</li>
  <li>Q1 캠페인 런칭 (3월 중순)</li>
  <li>파트너 서밋 (4월)</li>
  <li>중간 성과 리뷰 (6월)</li>
</ol>
`

export interface MockVersionHistory {
  id: string
  userName: string
  timestamp: string
  summary: string
}

export const MOCK_VERSION_HISTORY: MockVersionHistory[] = [
  { id: 'v1', userName: '김민수', timestamp: '오늘 14:35', summary: 'KPI 섹션 업데이트' },
  { id: 'v2', userName: '이수현', timestamp: '오늘 13:20', summary: 'Q1 캠페인 일정 추가' },
  { id: 'v3', userName: '김민수', timestamp: '오늘 11:00', summary: '핵심 전략 수정' },
  { id: 'v4', userName: '김하늘', timestamp: '어제 17:45', summary: '디자인 가이드 첨부' },
  { id: 'v5', userName: '김민수', timestamp: '어제 14:10', summary: '전략 문서 초안 작성' },
]

export interface MockAttachment {
  id: string
  name: string
  size: string
}

export const MOCK_ATTACHMENTS: MockAttachment[] = [
  { id: 'att1', name: '경쟁사_분석_Q1.pdf', size: '2.4MB' },
  { id: 'att2', name: '캠페인_소재_v3.zip', size: '8.7MB' },
]

/* ── 코드 에디터 목업 데이터 ── */

export const MOCK_CODE_SAMPLES: Record<string, string> = {
  python: `# SyncFlow - Python 예제
def greet(name: str) -> str:
    return f"Hello, {name}!"

numbers = [1, 2, 3, 4, 5]
squares = [n ** 2 for n in numbers]

print(greet("SyncFlow"))
print(f"결과: {squares}")
`,
  javascript: `// SyncFlow - JavaScript 예제
function greet(name) {
  return \`Hello, \${name}!\`;
}

const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);

console.log(greet("SyncFlow"));
console.log("Sum:", sum);
`,
  java: `// SyncFlow - Java 예제
public class Main {
    public static void main(String[] args) {
        String name = "SyncFlow";
        System.out.println("Hello, " + name + "!");
    }
}
`,
  c: `// SyncFlow - C 예제
#include <stdio.h>

int main() {
    printf("Hello, SyncFlow!\\n");
    return 0;
}
`,
  cpp: `// SyncFlow - C++ 예제
#include <iostream>
#include <vector>

int main() {
    std::cout << "Hello, SyncFlow!" << std::endl;
    return 0;
}
`,
  html: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>SyncFlow</title>
</head>
<body>
  <h1>Hello, SyncFlow!</h1>
  <p>AI 회의 어시스턴트 기반 스마트 협업 플랫폼</p>
</body>
</html>
`,
  css: `/* SyncFlow - CSS 예제 */
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f0f4f8;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: #627d98;
}
`,
}

/* ── 할 일/일정 관리 확장 목업 데이터 ── */

export interface MockTask {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string
  assigneeName: string
  dueDate: string
  startDate: string
  projectName: string
  groupName: string
  fromMeeting?: string
}

export const MOCK_TASKS: MockTask[] = [
  { id: 't1', title: '결제 API 연동', description: 'Stripe 결제 모듈을 프론트에 연결합니다.', status: 'in-progress', priority: 'high', assigneeId: 'u2', assigneeName: '박서준', dueDate: '2026-03-12', startDate: '2026-03-08', projectName: 'SyncFlow v2', groupName: '기술개발TF' },
  { id: 't2', title: '마케팅 보고서 작성', description: 'Q1 마케팅 성과 보고서를 작성합니다.', status: 'todo', priority: 'urgent', assigneeId: 'u3', assigneeName: '이수현', dueDate: '2026-03-11', startDate: '2026-03-09', projectName: '2026 마케팅 전략', groupName: '마케팅전략' },
  { id: 't3', title: 'GraphQL 스키마 설계', description: 'API v2 스키마를 설계합니다.', status: 'todo', priority: 'normal', assigneeId: 'u2', assigneeName: '박서준', dueDate: '2026-03-14', startDate: '2026-03-10', projectName: 'API 리팩토링', groupName: '기술개발TF' },
  { id: 't4', title: 'CI/CD 파이프라인 구축', description: 'GitHub Actions 기반 CI/CD를 구성합니다.', status: 'done', priority: 'low', assigneeId: 'u5', assigneeName: '정우진', dueDate: '2026-03-08', startDate: '2026-03-04', projectName: 'SyncFlow v2', groupName: '기술개발TF' },
  { id: 't5', title: 'Q1 캠페인 소재 검토', description: '배너 및 랜딩 페이지 소재를 검토합니다.', status: 'todo', priority: 'high', assigneeId: 'u4', assigneeName: '김하늘', dueDate: '2026-03-13', startDate: '2026-03-10', projectName: 'Q1 캠페인', groupName: '마케팅전략' },
  { id: 't6', title: 'DB 인덱스 최적화', description: '느린 쿼리에 대한 인덱스를 추가합니다.', status: 'in-progress', priority: 'urgent', assigneeId: 'u6', assigneeName: '강도윤', dueDate: '2026-03-11', startDate: '2026-03-08', projectName: 'SyncFlow v2', groupName: '기술개발TF' },
  { id: 't7', title: '브랜드 가이드라인 정리', description: '브랜드 컬러, 폰트, 로고 사용 가이드를 정리합니다.', status: 'done', priority: 'normal', assigneeId: 'u4', assigneeName: '김하늘', dueDate: '2026-03-07', startDate: '2026-03-03', projectName: 'Q1 캠페인', groupName: '마케팅전략' },
  { id: 't8', title: 'WebSocket 연동', description: '실시간 알림을 위한 WebSocket을 연결합니다.', status: 'todo', priority: 'high', assigneeId: 'u5', assigneeName: '정우진', dueDate: '2026-03-15', startDate: '2026-03-12', projectName: 'SyncFlow v2', groupName: '기술개발TF' },
  { id: 't9', title: '고객 인터뷰 일정 조율', description: 'Case Study용 고객 인터뷰 일정을 잡습니다.', status: 'in-progress', priority: 'low', assigneeId: 'u3', assigneeName: '이수현', dueDate: '2026-03-18', startDate: '2026-03-10', projectName: '2026 마케팅 전략', groupName: '마케팅전략' },
  { id: 't10', title: '프레젠테이션 자료 준비', description: '파트너 미팅용 발표 자료를 준비합니다.', status: 'todo', priority: 'normal', assigneeId: 'u1', assigneeName: '김민수', dueDate: '2026-03-14', startDate: '2026-03-11', projectName: '2026 마케팅 전략', groupName: '마케팅전략' },
  { id: 't11', title: '부하 테스트 실행', description: '서비스 안정성을 위한 부하 테스트를 실행합니다.', status: 'todo', priority: 'high', assigneeId: 'u7', assigneeName: '윤서아', dueDate: '2026-03-16', startDate: '2026-03-13', projectName: 'SyncFlow v2', groupName: '기술개발TF' },
  { id: 't12', title: '경쟁사 벤치마킹 보고서', description: '주요 경쟁사 기능 비교 분석을 합니다.', status: 'todo', priority: 'normal', assigneeId: 'u3', assigneeName: '이수현', dueDate: '2026-03-17', startDate: '2026-03-12', projectName: '2026 마케팅 전략', groupName: '마케팅전략' },
  { id: 't13', title: '결제 모듈 코드 리뷰', description: 'PR #142 코드 리뷰를 완료합니다.', status: 'in-progress', priority: 'high', assigneeId: 'u1', assigneeName: '김민수', dueDate: '2026-03-11', startDate: '2026-03-10', projectName: 'SyncFlow v2', groupName: '기술개발TF', fromMeeting: 'mt2' },
  { id: 't14', title: '랜딩 페이지 A/B 테스트 설계', description: '전환율 개선을 위한 A/B 테스트를 설계합니다.', status: 'todo', priority: 'normal', assigneeId: 'u4', assigneeName: '김하늘', dueDate: '2026-03-19', startDate: '2026-03-14', projectName: 'Q1 캠페인', groupName: '마케팅전략', fromMeeting: 'mt1' },
]

export interface MockMilestone {
  id: string
  name: string
  totalTasks: number
  completedTasks: number
}

export const MOCK_MILESTONES: MockMilestone[] = [
  { id: 'ms1', name: 'MVP 출시', totalTasks: 6, completedTasks: 4 },
  { id: 'ms2', name: 'Q1 캠페인 런칭', totalTasks: 5, completedTasks: 2 },
  { id: 'ms3', name: 'API v2 마이그레이션', totalTasks: 8, completedTasks: 3 },
]

export const MOCK_PASSWORD = 'test1234'

export const MOCK_USERS = [
  { id: 'u1', name: '김민수', email: 'minsu.kim@technova.co.kr', avatar: undefined },
  { id: 'u2', name: '박서준', email: 'seojun.park@technova.co.kr', avatar: undefined },
  { id: 'u3', name: '이수현', email: 'suhyun.lee@technova.co.kr', avatar: undefined },
  { id: 'u4', name: '김하늘', email: 'haneul.kim@technova.co.kr', avatar: undefined },
  { id: 'u5', name: 'Tester', email: 'tester1@test.com', avatar: undefined },
]

/* ── 회의 목업 데이터 ── */

export type MeetingStatus = 'scheduled' | 'in-progress' | 'ended'

export interface MockMeeting {
  id: string
  title: string
  channelId: string
  channelName: string
  status: MeetingStatus
  scheduledAt: string
  startedAt?: string
  endedAt?: string
  duration?: string
  participants: { id: string; name: string; position: string }[]
  summary?: string
  actionItems?: { id: string; title: string; assignee: string; done: boolean }[]
  transcript?: { speaker: string; text: string; time: string }[]
}

export const MOCK_MEETINGS: MockMeeting[] = [
  {
    id: 'mt1',
    title: '주간 마케팅 전략 회의',
    channelId: 'ch1',
    channelName: '마케팅전략',
    status: 'ended',
    scheduledAt: '2026-03-10 10:00',
    startedAt: '2026-03-10 10:02',
    endedAt: '2026-03-10 10:47',
    duration: '45분',
    participants: [
      { id: 'u1', name: '김민수', position: '팀장' },
      { id: 'u3', name: '이수현', position: '매니저' },
      { id: 'u4', name: '김하늘', position: '디자이너' },
    ],
    summary: 'Q1 캠페인 진행 상황을 검토하고, 랜딩 페이지 A/B 테스트 방향을 결정했습니다. 배너 소재는 다음 주까지 최종 확정하기로 했습니다.',
    actionItems: [
      { id: 'ai1', title: '랜딩 페이지 A/B 테스트 설계', assignee: '김하늘', done: false },
      { id: 'ai2', title: '배너 소재 최종안 제출', assignee: '김하늘', done: false },
      { id: 'ai3', title: '퍼포먼스 데이터 리포트 공유', assignee: '이수현', done: true },
    ],
    transcript: [
      { speaker: '김민수', text: '지난주 캠페인 성과를 먼저 살펴보겠습니다.', time: '10:02' },
      { speaker: '이수현', text: 'CTR이 전주 대비 12% 상승했고, 전환율은 소폭 하락했습니다.', time: '10:03' },
      { speaker: '김하늘', text: '배너 소재를 변경한 효과가 있었던 것 같아요. 랜딩 페이지도 개선이 필요합니다.', time: '10:05' },
      { speaker: '김민수', text: '랜딩 페이지 A/B 테스트를 진행하는 게 좋겠습니다.', time: '10:07' },
      { speaker: '이수현', text: '네, 다음 주까지 테스트 설계를 완료하겠습니다.', time: '10:08' },
    ],
  },
  {
    id: 'mt2',
    title: '기술 검토 미팅',
    channelId: 'ch2',
    channelName: '기술개발TF',
    status: 'ended',
    scheduledAt: '2026-03-09 14:00',
    startedAt: '2026-03-09 14:05',
    endedAt: '2026-03-09 15:10',
    duration: '1시간 5분',
    participants: [
      { id: 'u1', name: '김민수', position: 'CTO' },
      { id: 'u2', name: '박서준', position: '시니어 개발자' },
      { id: 'u5', name: '정우진', position: '주니어 개발자' },
    ],
    summary: '결제 모듈 아키텍처를 검토하고, 코드 리뷰 일정을 확정했습니다. GraphQL 마이그레이션은 4월 초 시작하기로 결정했습니다.',
    actionItems: [
      { id: 'ai4', title: '결제 모듈 코드 리뷰', assignee: '김민수', done: false },
      { id: 'ai5', title: '부하 테스트 시나리오 작성', assignee: '정우진', done: false },
      { id: 'ai6', title: 'GraphQL 스키마 초안', assignee: '박서준', done: true },
    ],
    transcript: [
      { speaker: '박서준', text: '결제 모듈 PR을 올렸는데, 아키텍처 리뷰를 먼저 받고 싶습니다.', time: '14:05' },
      { speaker: '김민수', text: 'Stripe SDK 직접 호출 대신 어댑터 패턴을 적용하는 건 어떨까요?', time: '14:08' },
      { speaker: '정우진', text: '테스트 커버리지는 현재 72%입니다. 목표인 85%까지 올려야 합니다.', time: '14:15' },
    ],
  },
  {
    id: 'mt3',
    title: '스프린트 플래닝',
    channelId: 'ch2',
    channelName: '기술개발TF',
    status: 'scheduled',
    scheduledAt: '2026-03-11 10:00',
    participants: [
      { id: 'u1', name: '김민수', position: 'CTO' },
      { id: 'u2', name: '박서준', position: '시니어 개발자' },
      { id: 'u5', name: '정우진', position: '주니어 개발자' },
      { id: 'u6', name: '강도윤', position: '백엔드 개발자' },
    ],
  },
  {
    id: 'mt4',
    title: '외부 협력사 킥오프',
    channelId: 'ch4',
    channelName: '외부협력-블루웨이브',
    status: 'scheduled',
    scheduledAt: '2026-03-12 15:00',
    participants: [
      { id: 'u1', name: '김민수', position: 'CTO' },
      { id: 'u8', name: '한지민', position: '마케팅 팀장' },
      { id: 'u9', name: '오승호', position: '콘텐츠 디렉터' },
    ],
  },
]
