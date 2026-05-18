import { useState } from 'react'
import { Plus, LogIn, Sparkles, Globe } from 'lucide-react'
import { CreateOrganizationModal } from '@/components/group/CreateOrganizationModal'
import { JoinGroupModal } from '@/components/group/JoinGroupModal'
import { PublicGroupSearchModal } from '@/components/group/PublicGroupSearchModal'
import { useAuthStore } from '@/stores/useAuthStore'

export function WelcomeOnboarding() {
  const user = useAuthStore((s) => s.user)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || ''

  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto bg-neutral-50 px-4 py-12 dark:bg-neutral-900">
      <div className="w-full max-w-2xl">
        {/* 헤더 */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            <Sparkles size={28} strokeWidth={1.75} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 sm:text-3xl">
            {displayName ? `${displayName}님, 환영합니다!` : 'SyncFlow에 오신 것을 환영합니다'}
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            새 조직을 만들거나 초대 코드로 기존 조직에 참여하세요.
          </p>
        </div>

        {/* 두 카드 */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* 조직 만들기 */}
          <button
            onClick={() => setShowCreate(true)}
            className="group flex flex-col items-start rounded-2xl border border-neutral-200 bg-surface p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-lg dark:border-neutral-700 dark:bg-surface-dark-elevated dark:hover:border-primary-500"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400">
              <Plus size={22} strokeWidth={2} />
            </div>
            <h2 className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
              새 조직 만들기
            </h2>
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              팀을 위한 새로운 작업 공간을 만듭니다. 멤버를 초대하고 채널·프로젝트를 구성할 수
              있어요.
            </p>
          </button>

          {/* 초대 코드 */}
          <button
            onClick={() => setShowJoin(true)}
            className="group flex flex-col items-start rounded-2xl border border-neutral-200 bg-surface p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-lg dark:border-neutral-700 dark:bg-surface-dark-elevated dark:hover:border-primary-500"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:group-hover:bg-neutral-600">
              <LogIn size={20} strokeWidth={2} />
            </div>
            <h2 className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
              초대 코드로 참여
            </h2>
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              팀에서 받은 6자리 초대 코드를 입력하여 기존 조직에 참여하세요.
            </p>
          </button>
        </div>

        {/* 공개 조직 둘러보기 (보조 진입점) */}
        <button
          onClick={() => setShowSearch(true)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-transparent px-4 py-2.5 text-xs text-neutral-500 transition-colors hover:border-primary-400 hover:bg-primary-50/30 hover:text-primary-600 dark:border-neutral-600 dark:text-neutral-400 dark:hover:bg-primary-900/10 dark:hover:text-primary-400"
        >
          <Globe size={14} />
          공개 조직 둘러보기
        </button>

        {/* 보조 안내 */}
        <p className="mt-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
          처음이세요? 조직을 만들면 자동으로 관리자가 됩니다.
        </p>
      </div>

      <CreateOrganizationModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      <JoinGroupModal isOpen={showJoin} onClose={() => setShowJoin(false)} />
      <PublicGroupSearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  )
}
