import { useEffect, useState } from 'react'
import { X, Video, Users, Lock, Globe } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMeetingStore } from '@/stores/useMeetingStore'
import { api } from '@/utils/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated?: (meetingId: string) => void
}

interface OrgMember {
  id: number
  userId: string
  groupId: string
  role: string
  user: { id: string; name: string; email?: string }
}

export function CreateMeetingModal({ isOpen, onClose, onCreated }: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const createMeeting = useMeetingStore((s) => s.createMeeting)

  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('private')
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen || !activeOrgId) return
    setLoadingMembers(true)
    api
      .get<OrgMember[]>(`/groups/${activeOrgId}/members`)
      .then((members) => {
        setOrgMembers(
          members.filter((m) => {
            if (!currentUserId) return true
            return m.userId !== currentUserId && m.user?.id !== currentUserId
          }),
        )
      })
      .catch(() => setOrgMembers([]))
      .finally(() => setLoadingMembers(false))
  }, [isOpen, activeOrgId, currentUserId])

  if (!isOpen) return null

  const toggleMember = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedUserIds.size === orgMembers.length) setSelectedUserIds(new Set())
    else setSelectedUserIds(new Set(orgMembers.map((m) => m.userId)))
  }

  const handleClose = () => {
    setTitle('')
    setVisibility('private')
    setSelectedUserIds(new Set())
    onClose()
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      addToast('error', '회의 제목을 입력해주세요.')
      return
    }
    if (!activeOrgId) {
      addToast('error', '조직이 선택되지 않았습니다.')
      return
    }
    setSubmitting(true)
    try {
      const participants = orgMembers
        .filter((m) => selectedUserIds.has(m.userId))
        .map((m) => ({ userId: m.userId, userName: m.user.name }))

      const meeting = await createMeeting(title.trim(), {
        groupId: activeOrgId,
        visibility,
        participants,
      })
      addToast(
        'success',
        `회의 방 "${meeting.title}" 생성됨. 시작 버튼을 누르면 회의가 시작됩니다.`,
      )
      onCreated?.(meeting.id)
      handleClose()
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : '회의 생성 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video size={18} className="text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
              새 회의 방 만들기
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
          회의 방을 만들면 즉시 시작되지 않고 대기 상태가 됩니다. 참여 대상자에게만 회의 탭에 노출돼요.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              회의 제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 주간 마케팅 전략 회의"
              maxLength={200}
              autoFocus
              className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              공개 범위
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`flex items-start gap-2 rounded-lg border-2 px-3 py-2.5 text-left transition-all ${
                  visibility === 'private'
                    ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20'
                    : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                }`}
              >
                <Lock size={14} className="mt-0.5 shrink-0 text-neutral-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">비공개</p>
                  <p className="mt-0.5 text-[10px] text-neutral-400">
                    참여자 + 호스트만 회의 + 회의록 열람
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`flex items-start gap-2 rounded-lg border-2 px-3 py-2.5 text-left transition-all ${
                  visibility === 'public'
                    ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20'
                    : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                }`}
              >
                <Globe size={14} className="mt-0.5 shrink-0 text-neutral-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">공개</p>
                  <p className="mt-0.5 text-[10px] text-neutral-400">
                    같은 조직 멤버 누구나 열람·참여 가능
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 참여자 체크박스 */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <Users size={14} className="text-neutral-400" />
                참여자
                {selectedUserIds.size > 0 && (
                  <span className="rounded-full bg-primary-100 px-1.5 text-[10px] font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                    {selectedUserIds.size}
                  </span>
                )}
              </label>
              {orgMembers.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-[11px] text-primary-600 hover:underline dark:text-primary-400"
                >
                  {selectedUserIds.size === orgMembers.length ? '전체 해제' : '전체 선택'}
                </button>
              )}
            </div>
            <p className="mb-1.5 text-[10px] text-neutral-400">
              비공개 회의: 여기 선택된 멤버에게만 회의 탭에 노출되고, 회의록도 이들만 열람 가능
            </p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50/50 dark:border-neutral-700 dark:bg-neutral-800/50">
              {loadingMembers ? (
                <p className="px-3 py-3 text-center text-[11px] text-neutral-400">불러오는 중...</p>
              ) : orgMembers.length === 0 ? (
                <p className="px-3 py-3 text-center text-[11px] text-neutral-400">
                  초대할 조직원이 없습니다.
                </p>
              ) : (
                orgMembers.map((m) => {
                  const checked = selectedUserIds.has(m.userId)
                  return (
                    <label
                      key={m.userId}
                      className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(m.userId)}
                        className="h-3.5 w-3.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-400"
                      />
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                        {m.user.name?.[0] ?? '?'}
                      </div>
                      <span className="flex-1 truncate text-xs text-neutral-700 dark:text-neutral-200">
                        {m.user.name}
                      </span>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={submitting}>
              취소
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={submitting}>
              {submitting ? '생성 중...' : '회의 방 만들기'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
