export const APP_NAME = 'SyncFlow'

export const FEATURES = [
  {
    icon: 'Users' as const,
    title: '실시간 협업',
    description: '동시 편집, 라이브 커서, 음성 채팅, 메신저, 일정 관리까지. 팀원들과 실시간으로 함께 작업하세요.',
  },
  {
    icon: 'Layers' as const,
    title: '올인원 작업 환경',
    description: '문서 편집, 코드 실행, AI 어시스턴트를 하나의 플랫폼에서. 도구 전환 없이 집중하세요.',
  },
  {
    icon: 'Monitor' as const,
    title: '화면 공유 & 프레젠테이션',
    description: 'Follow Me 모드로 발표하고, 화면을 공유하며, 별도 앱 없이 팀과 소통하세요.',
  },
] as const

export const MOCK_GROUPS = [
  { id: 'g1', name: '4학년의 무게', description: '졸업 프로젝트 팀', memberCount: 5, lastActivity: '10분 전' },
  { id: 'g2', name: '알고리즘 스터디', description: '주간 알고리즘 풀이', memberCount: 8, lastActivity: '2시간 전' },
]

export const MOCK_PROJECTS = [
  { id: 'p1', groupId: 'g1', name: 'SyncFlow', description: '실시간 협업 플랫폼' },
  { id: 'p2', groupId: 'g1', name: '발표 자료', description: '중간 발표 준비' },
  { id: 'p3', groupId: 'g2', name: 'Week 12', description: '그래프 탐색' },
]

export const MOCK_PAGES = [
  { id: 'pg1', projectId: 'p1', name: '프로젝트 개요', type: 'doc' as const },
  { id: 'pg2', projectId: 'p1', name: 'API 설계', type: 'doc' as const },
  { id: 'pg3', projectId: 'p1', name: 'main.py', type: 'code' as const },
]

export const MOCK_RECENT_PAGES = [
  { id: 'rp1', name: '프로젝트 개요', type: 'doc' as const, groupName: '4학년의 무게', projectName: 'SyncFlow', updatedAt: '5분 전' },
  { id: 'rp2', name: 'main.py', type: 'code' as const, groupName: '4학년의 무게', projectName: 'SyncFlow', updatedAt: '15분 전' },
  { id: 'rp3', name: 'API 설계', type: 'doc' as const, groupName: '4학년의 무게', projectName: 'SyncFlow', updatedAt: '1시간 전' },
  { id: 'rp4', name: 'BFS 풀이.py', type: 'code' as const, groupName: '알고리즘 스터디', projectName: 'Week 12', updatedAt: '3시간 전' },
  { id: 'rp5', name: '발표 스크립트', type: 'doc' as const, groupName: '4학년의 무게', projectName: '발표 자료', updatedAt: '어제' },
  { id: 'rp6', name: 'ERD 설계', type: 'doc' as const, groupName: '4학년의 무게', projectName: 'SyncFlow', updatedAt: '어제' },
  { id: 'rp7', name: 'auth.ts', type: 'code' as const, groupName: '4학년의 무게', projectName: 'SyncFlow', updatedAt: '2일 전' },
]

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low'
export type TaskStatus = 'todo' | 'in-progress' | 'done'

export const MOCK_MY_TASKS = [
  { id: 't1', title: '로그인 API 연동', status: 'in-progress' as TaskStatus, priority: 'high' as TaskPriority, dueDate: '2026-03-08', projectName: 'SyncFlow' },
  { id: 't2', title: 'TipTap 에디터 통합', status: 'todo' as TaskStatus, priority: 'urgent' as TaskPriority, dueDate: '2026-03-07', projectName: 'SyncFlow' },
  { id: 't3', title: '발표 슬라이드 제작', status: 'todo' as TaskStatus, priority: 'normal' as TaskPriority, dueDate: '2026-03-10', projectName: '발표 자료' },
  { id: 't4', title: 'DFS/BFS 문제 풀기', status: 'done' as TaskStatus, priority: 'low' as TaskPriority, dueDate: '2026-03-06', projectName: 'Week 12' },
  { id: 't5', title: 'Socket.IO 이벤트 설계', status: 'todo' as TaskStatus, priority: 'high' as TaskPriority, dueDate: '2026-03-09', projectName: 'SyncFlow' },
]

/* ── 채팅 채널 목업 데이터 ── */

export type ChannelType = 'group' | 'project' | 'dm'

export interface MockChannel {
  id: string
  name: string
  type: ChannelType
  groupName?: string
  unread: number
  /** DM 상대방 이름 */
  dmUser?: string
}

export const MOCK_CHANNELS: MockChannel[] = [
  { id: 'ch1', name: '일반', type: 'group', groupName: '4학년의 무게', unread: 3 },
  { id: 'ch2', name: 'SyncFlow', type: 'project', groupName: '4학년의 무게', unread: 0 },
  { id: 'ch3', name: '발표 자료', type: 'project', groupName: '4학년의 무게', unread: 1 },
  { id: 'ch4', name: '일반', type: 'group', groupName: '알고리즘 스터디', unread: 0 },
  { id: 'ch5', name: 'Week 12', type: 'project', groupName: '알고리즘 스터디', unread: 0 },
]

export const MOCK_DMS: MockChannel[] = [
  { id: 'dm1', name: '이테스터', type: 'dm', dmUser: '이테스터', unread: 2 },
  { id: 'dm2', name: '박테스터', type: 'dm', dmUser: '박테스터', unread: 0 },
  { id: 'dm3', name: '최테스터', type: 'dm', dmUser: '최테스터', unread: 0 },
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
}

/* 이모지 피커에서 사용할 이모지 목록 */
export const EMOJI_LIST = [
  '😀','😂','🥹','😍','🤩','😎','🤔','😮',
  '👍','👎','❤️','🔥','🎉','💯','✅','👏',
  '🙏','💪','⭐','🚀','💡','📌','🎯','✨',
]

/* 멘션 자동완성에서 사용할 채널 멤버 목록 */
export const MOCK_CHANNEL_MEMBERS = [
  { id: 'u1', name: '김테스터' },
  { id: 'u2', name: '이테스터' },
  { id: 'u3', name: '박테스터' },
  { id: 'u4', name: '최테스터' },
  { id: 'u5', name: '정테스터' },
]

export const MOCK_MESSAGES: MockMessage[] = [
  { id: 'm1', channelId: 'ch1', userId: 'u2', userName: '이테스터', content: '오늘 회의 몇 시에 하나요?', timestamp: '오후 2:30', isOwn: false, reactions: [{ emoji: '👍', users: ['u1','u3'] }] },
  { id: 'm2', channelId: 'ch1', userId: 'u1', userName: '김테스터', content: '3시에 하기로 했어요!', timestamp: '오후 2:31', isOwn: true, isRead: true },
  { id: 'm3', channelId: 'ch1', userId: 'u3', userName: '박테스터', content: '네 알겠습니다. 발표 자료 준비해올게요.', timestamp: '오후 2:32', isOwn: false },
  { id: 'm4', channelId: 'ch1', userId: 'u2', userName: '이테스터', content: '저도 ERD 수정본 가져갈게요', timestamp: '오후 2:33', isOwn: false, attachments: [{ id: 'a1', name: 'ERD_v2.png', size: '1.2MB', type: 'image' }] },
  { id: 'm5', channelId: 'ch1', userId: 'u1', userName: '김테스터', content: '좋아요 그러면 3시에 봐요', timestamp: '오후 2:35', isOwn: true, isRead: true, reactions: [{ emoji: '🎉', users: ['u2','u3','u4'] }] },
  { id: 'm6', channelId: 'ch1', userId: 'u4', userName: '최테스터', content: '저는 API 문서 정리해서 공유할게요', timestamp: '오후 2:40', isOwn: false, attachments: [{ id: 'a2', name: 'API_설계서.pdf', size: '340KB', type: 'file' }] },
  { id: 'm7', channelId: 'ch2', userId: 'u2', userName: '이테스터', content: 'Socket.IO 이벤트 설계 초안 올려뒀어요', timestamp: '오후 1:10', isOwn: false, reactions: [{ emoji: '🔥', users: ['u1'] }, { emoji: '👍', users: ['u3'] }] },
  { id: 'm8', channelId: 'ch2', userId: 'u1', userName: '김테스터', content: '확인했어요! 피드백 남겨둘게요', timestamp: '오후 1:15', isOwn: true, isRead: true },
  { id: 'm9', channelId: 'ch2', userId: 'u3', userName: '박테스터', content: '프론트 컴포넌트 구조도 같이 봐야 할 것 같아요', timestamp: '오후 1:20', isOwn: false },
  { id: 'm10', channelId: 'ch3', userId: 'u1', userName: '김테스터', content: '발표 슬라이드 10장 정도로 정리했습니다', timestamp: '오전 11:00', isOwn: true, isRead: true },
  { id: 'm11', channelId: 'ch3', userId: 'u4', userName: '최테스터', content: '데모 영상도 넣으면 좋을 것 같아요', timestamp: '오전 11:05', isOwn: false, reactions: [{ emoji: '💡', users: ['u1'] }] },
  { id: 'm12', channelId: 'dm1', userId: 'u2', userName: '이테스터', content: '내일 스터디 자료 보내줄 수 있어?', timestamp: '오후 4:10', isOwn: false },
  { id: 'm13', channelId: 'dm1', userId: 'u1', userName: '김테스터', content: '응 저녁에 정리해서 보내줄게', timestamp: '오후 4:15', isOwn: true, isRead: true },
  { id: 'm14', channelId: 'dm1', userId: 'u2', userName: '이테스터', content: '고마워!', timestamp: '오후 4:16', isOwn: false, reactions: [{ emoji: '❤️', users: ['u1'] }] },
]

/* ── 그룹/프로젝트 관리 목업 데이터 ── */

export type GroupRole = 'owner' | 'admin' | 'member'

export interface MockGroupMember {
  id: string
  name: string
  email: string
  role: GroupRole
  isOnline: boolean
  avatar?: string
}

export const MOCK_GROUP_MEMBERS: Record<string, MockGroupMember[]> = {
  g1: [
    { id: 'u1', name: '김테스터', email: 'tester1@test.com', role: 'owner', isOnline: true },
    { id: 'u2', name: '이테스터', email: 'tester2@test.com', role: 'admin', isOnline: true },
    { id: 'u3', name: '박테스터', email: 'tester3@test.com', role: 'member', isOnline: false },
    { id: 'u4', name: '최테스터', email: 'tester4@test.com', role: 'member', isOnline: true },
    { id: 'u5', name: '정테스터', email: 'tester5@test.com', role: 'member', isOnline: false },
  ],
  g2: [
    { id: 'u1', name: '김테스터', email: 'tester1@test.com', role: 'admin', isOnline: true },
    { id: 'u2', name: '이테스터', email: 'tester2@test.com', role: 'owner', isOnline: true },
    { id: 'u6', name: '강테스터', email: 'tester6@test.com', role: 'member', isOnline: false },
    { id: 'u7', name: '윤테스터', email: 'tester7@test.com', role: 'member', isOnline: false },
    { id: 'u8', name: '장테스터', email: 'tester8@test.com', role: 'member', isOnline: true },
    { id: 'u9', name: '한테스터', email: 'tester9@test.com', role: 'member', isOnline: false },
    { id: 'u10', name: '서테스터', email: 'tester10@test.com', role: 'member', isOnline: false },
    { id: 'u11', name: '조테스터', email: 'tester11@test.com', role: 'member', isOnline: true },
  ],
}

export const MOCK_INVITE_CODES: Record<string, string> = {
  g1: 'AB3F7K',
  g2: 'XY9M2P',
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
  { id: 'p1', groupId: 'g1', name: 'SyncFlow', description: '실시간 협업 플랫폼', dueDate: '2026-03-15', progress: 38, pageCount: 12, memberCount: 5 },
  { id: 'p2', groupId: 'g1', name: '발표 자료', description: '중간 발표 준비', dueDate: '2026-03-10', progress: 65, pageCount: 4, memberCount: 3 },
  { id: 'p3', groupId: 'g2', name: 'Week 12', description: '그래프 탐색', dueDate: '2026-03-08', progress: 80, pageCount: 6, memberCount: 4 },
]

/* ── 문서 에디터 목업 데이터 ── */

export const MOCK_DOC_CONTENT = `
<h1>프로젝트 개요</h1>
<p><strong>SyncFlow</strong>는 실시간 협업 플랫폼으로, 문서 편집, 코드 실행, 음성 채팅, 일정 관리를 하나의 환경에서 제공합니다.</p>

<h2>핵심 기능</h2>
<ul>
  <li><strong>실시간 문서 편집</strong> — TipTap + Yjs 기반 동시 편집, 라이브 커서 표시</li>
  <li><strong>코드 에디터</strong> — Monaco Editor + 서버 사이드 실행 (Python, JS, Java, C++)</li>
  <li><strong>음성 채팅</strong> — WebRTC 기반 그룹 음성 통화</li>
  <li><strong>일정 관리</strong> — 칸반 보드, 캘린더, 할 일 CRUD</li>
</ul>

<h2>기술 스택</h2>
<h3>프론트엔드</h3>
<p>React 19, TypeScript, TailwindCSS v4, Zustand, TipTap, Monaco Editor</p>

<h3>백엔드</h3>
<p>NestJS, PostgreSQL, Redis, Socket.IO, Yjs</p>

<blockquote><p>이 문서는 프로젝트의 전체적인 구조와 방향성을 설명합니다.</p></blockquote>

<h2>마일스톤</h2>
<ol>
  <li>UI 목업 완성 (3월 1주)</li>
  <li>백엔드 API 연동 (3월 2주)</li>
  <li>실시간 협업 기능 (3월 3주)</li>
  <li>배포 및 테스트 (3월 4주)</li>
</ol>

<hr>

<p>아래는 ERD 설계 초안입니다:</p>

<pre><code class="language-sql">CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  invite_code CHAR(6) UNIQUE NOT NULL
);</code></pre>
`

export interface MockVersionHistory {
  id: string
  userName: string
  timestamp: string
  summary: string
}

export const MOCK_VERSION_HISTORY: MockVersionHistory[] = [
  { id: 'v1', userName: '김테스터', timestamp: '오늘 14:35', summary: '마일스톤 섹션 추가' },
  { id: 'v2', userName: '이테스터', timestamp: '오늘 13:20', summary: '기술 스택 업데이트' },
  { id: 'v3', userName: '김테스터', timestamp: '오늘 11:00', summary: '핵심 기능 목록 수정' },
  { id: 'v4', userName: '박테스터', timestamp: '어제 17:45', summary: 'ERD 코드 블록 추가' },
  { id: 'v5', userName: '김테스터', timestamp: '어제 14:10', summary: '프로젝트 개요 초안 작성' },
]

export interface MockAttachment {
  id: string
  name: string
  size: string
}

export const MOCK_ATTACHMENTS: MockAttachment[] = [
  { id: 'att1', name: 'ERD_v2.png', size: '1.2MB' },
  { id: 'att2', name: '요구사항정의서.pdf', size: '340KB' },
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
  <p>실시간 협업 플랫폼</p>
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
}

export const MOCK_TASKS: MockTask[] = [
  { id: 't1', title: '로그인 API 연동', description: 'JWT 기반 인증 로직을 프론트에 연결합니다.', status: 'in-progress', priority: 'high', assigneeId: 'u1', assigneeName: '김테스터', dueDate: '2026-03-08', startDate: '2026-03-04', projectName: 'SyncFlow', groupName: '4학년의 무게' },
  { id: 't2', title: 'TipTap 에디터 통합', description: 'ProseMirror 기반 WYSIWYG 에디터를 페이지에 통합합니다.', status: 'todo', priority: 'urgent', assigneeId: 'u2', assigneeName: '이테스터', dueDate: '2026-03-07', startDate: '2026-03-05', projectName: 'SyncFlow', groupName: '4학년의 무게' },
  { id: 't3', title: '발표 슬라이드 제작', description: '중간 발표용 슬라이드를 준비합니다.', status: 'todo', priority: 'normal', assigneeId: 'u3', assigneeName: '박테스터', dueDate: '2026-03-10', startDate: '2026-03-07', projectName: '발표 자료', groupName: '4학년의 무게' },
  { id: 't4', title: 'DFS/BFS 문제 풀기', description: '이번 주 알고리즘 과제입니다.', status: 'done', priority: 'low', assigneeId: 'u1', assigneeName: '김테스터', dueDate: '2026-03-06', startDate: '2026-03-03', projectName: 'Week 12', groupName: '알고리즘 스터디' },
  { id: 't5', title: 'Socket.IO 이벤트 설계', description: '실시간 통신 이벤트 구조를 설계합니다.', status: 'todo', priority: 'high', assigneeId: 'u4', assigneeName: '최테스터', dueDate: '2026-03-09', startDate: '2026-03-06', projectName: 'SyncFlow', groupName: '4학년의 무게' },
  { id: 't6', title: 'DB 스키마 마이그레이션', description: 'PostgreSQL 테이블 생성 스크립트를 작성합니다.', status: 'in-progress', priority: 'urgent', assigneeId: 'u2', assigneeName: '이테스터', dueDate: '2026-03-07', startDate: '2026-03-04', projectName: 'SyncFlow', groupName: '4학년의 무게' },
  { id: 't7', title: '디자인 시스템 정리', description: 'Tailwind 컴포넌트 토큰을 정리합니다.', status: 'done', priority: 'normal', assigneeId: 'u3', assigneeName: '박테스터', dueDate: '2026-03-05', startDate: '2026-03-02', projectName: 'SyncFlow', groupName: '4학년의 무게' },
  { id: 't8', title: 'Docker 환경 구성', description: '코드 실행용 Docker 이미지를 빌드합니다.', status: 'todo', priority: 'high', assigneeId: 'u4', assigneeName: '최테스터', dueDate: '2026-03-12', startDate: '2026-03-09', projectName: 'SyncFlow', groupName: '4학년의 무게' },
  { id: 't9', title: 'README 작성', description: '프로젝트 소개 및 설치 가이드를 작성합니다.', status: 'in-progress', priority: 'low', assigneeId: 'u1', assigneeName: '김테스터', dueDate: '2026-03-11', startDate: '2026-03-08', projectName: 'SyncFlow', groupName: '4학년의 무게' },
  { id: 't10', title: '발표 대본 작성', description: '발표 시 사용할 스크립트입니다.', status: 'todo', priority: 'normal', assigneeId: 'u3', assigneeName: '박테스터', dueDate: '2026-03-10', startDate: '2026-03-08', projectName: '발표 자료', groupName: '4학년의 무게' },
  { id: 't11', title: 'LiveKit 음성 채팅 연동', description: 'WebRTC 기반 음성 채팅을 연결합니다.', status: 'todo', priority: 'high', assigneeId: 'u2', assigneeName: '이테스터', dueDate: '2026-03-14', startDate: '2026-03-10', projectName: 'SyncFlow', groupName: '4학년의 무게' },
  { id: 't12', title: '단위 테스트 작성', description: 'API 엔드포인트 단위 테스트를 작성합니다.', status: 'todo', priority: 'normal', assigneeId: 'u4', assigneeName: '최테스터', dueDate: '2026-03-15', startDate: '2026-03-12', projectName: 'SyncFlow', groupName: '4학년의 무게' },
  { id: 't13', title: 'DP 문제 풀기', description: '동적 프로그래밍 과제입니다.', status: 'todo', priority: 'normal', assigneeId: 'u2', assigneeName: '이테스터', dueDate: '2026-03-13', startDate: '2026-03-10', projectName: 'Week 12', groupName: '알고리즘 스터디' },
  { id: 't14', title: '스터디 발표 자료', description: '이번 주 발표 자료를 준비합니다.', status: 'in-progress', priority: 'high', assigneeId: 'u4', assigneeName: '최테스터', dueDate: '2026-03-09', startDate: '2026-03-07', projectName: 'Week 12', groupName: '알고리즘 스터디' },
]

export interface MockMilestone {
  id: string
  name: string
  totalTasks: number
  completedTasks: number
}

export const MOCK_MILESTONES: MockMilestone[] = [
  { id: 'ms1', name: 'UI 목업 완성', totalTasks: 4, completedTasks: 4 },
  { id: 'ms2', name: '백엔드 API 연동', totalTasks: 6, completedTasks: 2 },
  { id: 'ms3', name: '실시간 협업 기능', totalTasks: 5, completedTasks: 0 },
]

export const MOCK_PASSWORD = 'test1234'

export const MOCK_USERS = [
  { id: 'u1', name: '김테스터', email: 'tester1@test.com', avatar: undefined },
  { id: 'u2', name: '이테스터', email: 'tester2@test.com', avatar: undefined },
  { id: 'u3', name: '박테스터', email: 'tester3@test.com', avatar: undefined },
  { id: 'u4', name: '최테스터', email: 'tester4@test.com', avatar: undefined },
]
