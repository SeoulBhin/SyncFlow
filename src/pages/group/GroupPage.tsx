import { useState } from 'react'
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
import {
  MOCK_GROUPS,
  MOCK_PROJECT_DETAILS,
  MOCK_GROUP_MEMBERS,
  MOCK_INVITE_CODES,
} from '@/constants'

type Tab = 'projects' | 'members'

export function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('projects')
  const [showSettings, setShowSettings] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [editProject, setEditProject] = useState<{ id: string; name: string; description: string; dueDate?: string } | undefined>()

  const group = MOCK_GROUPS.find((g) => g.id === groupId)
  if (!group) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-neutral-500 dark:text-neutral-400">채널을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const projects = MOCK_PROJECT_DETAILS.filter((p) => p.groupId === groupId)
  const members = MOCK_GROUP_MEMBERS[groupId!] ?? []
  const inviteCode = MOCK_INVITE_CODES[groupId!] ?? '------'

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
                  onClick={() => navigate(`/group/${groupId}/project/${project.id}`)}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{project.name}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditProject({ id: project.id, name: project.name, description: project.description, dueDate: project.dueDate })
                      }}
                      className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                    >
                      <Settings size={14} />
                    </button>
                  </div>
                  <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">{project.description}</p>
                  <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500">
                      <span>진행률</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                      <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-400 dark:text-neutral-500">
                    {project.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {project.dueDate}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FileText size={12} />
                      {project.pageCount}페이지
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {project.memberCount}명
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
          <MemberPanel members={members} />
        </Card>
      )}

      <GroupSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        groupName={group.name}
        inviteCode={inviteCode}
      />
      <CreateProjectModal
        isOpen={showCreateProject || !!editProject}
        onClose={() => { setShowCreateProject(false); setEditProject(undefined) }}
        editData={editProject}
      />
    </div>
  )
}
