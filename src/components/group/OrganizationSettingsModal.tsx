import { useEffect, useState } from 'react'
import { X, Settings, Copy, Check, RefreshCw, Lock, Globe } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'
import { useGroupContextStore, type GroupSummary } from '@/stores/useGroupContextStore'
import { api } from '@/utils/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  group: GroupSummary | null
}

interface GroupDetail {
  id: string
  name: string
  description?: string | null
  visibility?: 'public' | 'private'
  inviteCode?: string | null
  myRole?: 'owner' | 'admin' | 'member' | 'guest'
}

export function OrganizationSettingsModal({ isOpen, onClose, group }: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const setMyGroups = useGroupContextStore((s) => s.setMyGroups)
  const myGroups = useGroupContextStore((s) => s.myGroups)
  const setActiveOrg = useGroupContextStore((s) => s.setActiveOrg)
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const activeOrgName = useGroupContextStore((s) => s.activeOrgName)

  const [detail, setDetail] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savingVisibility, setSavingVisibility] = useState<'public' | 'private' | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    if (!isOpen || !group) return
    setLoading(true)
    api
      .get<GroupDetail>(`/groups/${group.id}`)
      .then((d) => setDetail(d))
      .catch((e) => {
        const msg = e instanceof Error ? e.message : '조직 정보 로드 실패'
        addToast('error', msg)
      })
      .finally(() => setLoading(false))
  }, [isOpen, group, addToast])

  if (!isOpen || !group) return null

  const isOwnerOrAdmin = detail?.myRole === 'owner' || detail?.myRole === 'admin'

  const updateMyGroupsLocal = (patch: Partial<GroupSummary>) => {
    const next = myGroups.map((g) => (g.id === group.id ? { ...g, ...patch } : g))
    setMyGroups(next)
    if (activeOrgId === group.id && patch.name) {
      setActiveOrg(group.id, patch.name)
    }
  }

  const handleVisibilityChange = async (next: 'public' | 'private') => {
    if (!detail || detail.visibility === next || !isOwnerOrAdmin) return
    setSavingVisibility(next)
    try {
      await api.put(`/groups/${group.id}`, { visibility: next })
      setDetail({ ...detail, visibility: next })
      updateMyGroupsLocal({ visibility: next })
      addToast(
        'success',
        next === 'public' ? '공개 조직으로 전환되었습니다.' : '비공개 조직으로 전환되었습니다.',
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : '전환 실패'
      addToast('error', msg)
    } finally {
      setSavingVisibility(null)
    }
  }

  const handleRegenerateCode = async () => {
    if (!isOwnerOrAdmin) return
    setRegenerating(true)
    try {
      const res = await api.post<{ code: string }>(`/groups/${group.id}/regenerate-code`, {})
      setDetail((d) => (d ? { ...d, inviteCode: res.code } : d))
      addToast('success', '초대 코드가 재발급되었습니다.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '재발급 실패'
      addToast('error', msg)
    } finally {
      setRegenerating(false)
    }
  }

  const handleCopyCode = () => {
    if (!detail?.inviteCode) return
    navigator.clipboard.writeText(detail.inviteCode)
    setCopied(true)
    addToast('success', '초대 코드가 복사되었습니다.')
    setTimeout(() => setCopied(false), 2000)
  }

  const visibility = detail?.visibility ?? 'private'
  const displayName = detail?.name ?? activeOrgName ?? group.name

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-neutral-500" />
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
              조직 설정
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
          {displayName}
        </p>

        {loading ? (
          <p className="py-6 text-center text-xs text-neutral-400">불러오는 중...</p>
        ) : (
          <div className="space-y-5">
            {/* 공개 범위 */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
                공개 범위
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleVisibilityChange('private')}
                  disabled={!isOwnerOrAdmin || savingVisibility !== null}
                  className={`flex items-start gap-2 rounded-lg border-2 px-3 py-2.5 text-left transition-all ${
                    visibility === 'private'
                      ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                  } ${!isOwnerOrAdmin ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <Lock size={14} className="mt-0.5 shrink-0 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                      비공개
                    </p>
                    <p className="mt-0.5 text-[10px] text-neutral-400">
                      초대받은 멤버만 참여 가능
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void handleVisibilityChange('public')}
                  disabled={!isOwnerOrAdmin || savingVisibility !== null}
                  className={`flex items-start gap-2 rounded-lg border-2 px-3 py-2.5 text-left transition-all ${
                    visibility === 'public'
                      ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                  } ${!isOwnerOrAdmin ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <Globe size={14} className="mt-0.5 shrink-0 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                      공개
                    </p>
                    <p className="mt-0.5 text-[10px] text-neutral-400">
                      검색으로 누구나 찾기 가능
                    </p>
                  </div>
                </button>
              </div>
              {!isOwnerOrAdmin && (
                <p className="mt-1.5 text-[10px] text-neutral-400">
                  공개 범위는 owner/admin만 변경할 수 있습니다.
                </p>
              )}
            </div>

            {/* 초대 코드 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  초대 코드
                </label>
                {isOwnerOrAdmin && (
                  <button
                    onClick={() => void handleRegenerateCode()}
                    disabled={regenerating}
                    className="flex items-center gap-1 text-[10px] text-primary-600 hover:underline dark:text-primary-400"
                  >
                    <RefreshCw size={10} className={regenerating ? 'animate-spin' : ''} />
                    재발급
                  </button>
                )}
              </div>
              {detail?.inviteCode ? (
                <div className="flex items-center justify-center gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
                  <span className="text-xl font-bold tracking-[0.3em] text-primary-600 dark:text-primary-400">
                    {detail.inviteCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  >
                    {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                  </button>
                </div>
              ) : (
                <p className="rounded-lg bg-neutral-50 p-3 text-center text-[11px] text-neutral-400 dark:bg-neutral-800/50">
                  {isOwnerOrAdmin
                    ? '초대 코드가 없습니다. 재발급을 눌러주세요.'
                    : '초대 코드는 멤버에게만 노출됩니다.'}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="ghost" onClick={onClose}>
                닫기
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
