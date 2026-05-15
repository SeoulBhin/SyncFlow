import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FolderOpen,
  Settings,
  Plus,
  Users,
  Calendar,
  FileText,
  Briefcase,
} from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { MemberPanel } from '@/components/group/MemberPanel'
import { GroupSettingsModal } from '@/components/group/GroupSettingsModal'
import { CreateProjectModal } from '@/components/group/CreateProjectModal'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToastStore } from '@/stores/useToastStore'
import { api } from '@/utils/api'

type Tab = 'projects' | 'members'

interface Group {
  id: string
  name: string
  description: string | null
  inviteCode: string | null
  myRole: string | null
}

interface Project {
  id: string
  name: string
  description: string | null
  deadline: string | null
  sortOrder: number
}

interface Member {
  id: number
  userId: string
  role: string
  user: { id: string; name: string; email: string; avatarUrl: string | null }
}

export function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const addToast = useToastStore((s) => s.addToast)

  const [tab, setTab] = useState<Tab>('projects')
  const [showSettings, setShowSettings] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [editProject, setEditProject] = useState<{ id: string; name: string; description: string; dueDate?: string } | undefined>()
  const [group, setGroup] = useState<Group | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return
    setLoading(true)
    Promise.all([
      api.get<any>(`/groups/${groupId}`),
      api.get<Project[]>(`/groups/${groupId}/projects`),
      api.get<Member[]>(`/groups/${groupId}/members`),
    ])
      .then(([g, p, m]) => {
        setGroup(g)
        setProjects(p)
        setMembers(m)
      })
      .catch(() => addToast('error', '데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [groupId])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-neutral-500 dark:text-neutral-400">채널을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const currentUserRole = (members.find((m) => m.user.id === user?.id)?.role ?? 'member') as 'owner' | 'admin' | 'member' | 'guest'

  const memberList = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    avatar: m.user.avatarUrl ?? undefined,
    role: m.role as 'owner' | 'admin' | 'member' | 'guest',
    isOnline: false,
  }))

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <FolderOpen size={20} className="text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{group.name}</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{group.description}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
          <Settings size={16} />
          설정
        </Button>
      </div>

      <div className="mb-6 flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        <button
          onClick={() => setTab('projects')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'projects'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <Briefcase size={15} />
          프로젝트
        </button>
        <button
          onClick={() => setTab('members')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'members'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <Users size={15} />
          멤버
        </button>
      </div>

      {tab === 'projects' && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              프로젝트 ({projects.length})
            </h2>
            <Button size="sm" onClick={() => setShowCreateProject(true)}>
              <Plus size={14} />
              새 프로젝트
            </Button>
          </div>

          {projects.length === 0 ? (
            <Card className="flex flex-col items-center py-12">
              <Briefcase size={40} className="mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="mb-1 text-sm font-medium text-neutral-600 dark:text-neutral-300">아직 프로젝트가 없습니다</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">새 프로젝트를 만들어 시작하세요.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  hoverable
                  className="cursor-pointer"
                  onClick={() => navigate(`/app/project/${project.id}`)}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{project.name}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditProject({ id: project.id, name: project.name, description: project.description ?? '', dueDate: project.deadline ?? undefined })
                      }}
                      className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                    >
                      <Settings size={14} />
                    </button>
                  </div>
                  <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">{project.description}</p>
                  <div className="flex items-center gap-4 text-xs text-neutral-400 dark:text-neutral-500">
                    {project.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {project.deadline}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FileText size={12} />
                      0페이지
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'members' && (
        <Card>
          <MemberPanel
            members={memberList as any}
            currentUserId={user?.id}
            currentUserRole={currentUserRole}
          />
        </Card>
      )}

      <GroupSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        groupId={groupId}
        groupName={group.name}
        inviteCode={group.inviteCode ?? '------'}
        onDeleted={() => navigate('/app')}
      />
      <CreateProjectModal
        isOpen={showCreateProject || !!editProject}
        onClose={() => { setShowCreateProject(false); setEditProject(undefined) }}
        groupId={groupId}
        editData={editProject}
        onCreated={(project) => setProjects((prev) => [...prev, project as Project])}
      />
    </div>
  )
}
