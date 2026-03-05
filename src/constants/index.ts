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
  { id: 'g1', name: '4학년의 무게', description: '졸업 프로젝트 팀' },
  { id: 'g2', name: '알고리즘 스터디', description: '주간 알고리즘 풀이' },
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

export const MOCK_PASSWORD = 'test1234'

export const MOCK_USERS = [
  { id: 'u1', name: '김테스터', email: 'tester1@test.com', avatar: undefined },
  { id: 'u2', name: '이테스터', email: 'tester2@test.com', avatar: undefined },
  { id: 'u3', name: '박테스터', email: 'tester3@test.com', avatar: undefined },
  { id: 'u4', name: '최테스터', email: 'tester4@test.com', avatar: undefined },
]
