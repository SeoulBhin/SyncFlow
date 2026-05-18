import { useEffect, useState } from 'react'
import { X, Settings, Trash2, Users, UserMinus, Save } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useChannelsStore, type ChannelSummary } from '@/stores/useChannelsStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { api } from '@/utils/api'
import { useNavigate } from 'react-router-dom'

interface Props {
  isOpen: boolean
  onClose: () => void
  channel: ChannelSummary | null
}

interface ChannelMember {
  id: number
  channelId: string
  userId: string
  userName: string
  joinedAt: string
}

interface OrgMember {
  userId: string
  user: { id: string; name: string }
}

export function ChannelSettingsModal({ isOpen, onClose, channel }: Props) {
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const removeChannelLocal = useChannelsStore((s) => s.removeChannel)
  const fetchChannelsForOrg = useChannelsStore((s) => s.fetchForOrg)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [members, setMembers] = useState<ChannelMember[]>([])
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isOpen || !channel) return
    setName(channel.name ?? '')
    setDescription(channel.description ?? '')
    setSelectedToAdd(new Set())

    // 채널 멤버 fetch
    api
      .get<ChannelMember[]>(`/channels/${channel.id}/members`)
      .then(setMembers)
      .catch(() => setMembers([]))

    // 조직원 목록 fetch (멤버 추가 후보)
    if (activeOrgId) {
      api
        .get<{ userId: string; user: { id: string; name: string } }[]>(
          `/groups/${activeOrgId}/members`,
        )
        .then(setOrgMembers)
        .catch(() => setOrgMembers([]))
    }
  }, [isOpen, channel, activeOrgId])

  if (!isOpen || !channel) return null

  const memberUserIds = new Set(members.map((m) => m.userId))
  const candidates = orgMembers.filter((m) => !memberUserIds.has(m.userId))

  const toggleAdd = (userId: string) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const handleSave = async () => {
    if (!name.trim()) {
      addToast('error', '채널명을 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      // 1) 이름/설명 변경
      if (name !== channel.name || description !== (channel.description ?? '')) {
        await api.put(`/channels/${channel.id}`, {
          name: name.trim(),
          description: description.trim() || null,
        })
      }
      // 2) 신규 멤버 추가
      if (selectedToAdd.size > 0) {
        const toAdd = candidates
          .filter((c) => selectedToAdd.has(c.userId))
          .map((c) => ({ userId: c.userId, userName: c.user.name }))
        await api.post(`/channels/${channel.id}/members`, { members: toAdd })
      }
      addToast('success', '채널 설정이 저장되었습니다.')
      if (activeOrgId) void fetchChannelsForOrg(activeOrgId)
      onClose()
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async (userId: string, userName: string) => {
    try {
      await api.delete(`/channels/${channel.id}/members/${userId}`)
      setMembers((prev) => prev.filter((m) => m.userId !== userId))
      addToast('success', `${userName}님이 채널에서 제거되었습니다.`)
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : '멤버 제거 실패')
    }
  }

  const handleDeleteChannel = async () => {
    setDeleting(true)
    try {
      await api.delete(`/channels/${channel.id}`)
      removeChannelLocal(channel.id)
      addToast('success', `채널 "${channel.name}"이(가) 삭제되었습니다.`)
      onClose()
      navigate('/app')
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : '채널 삭제 실패')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-neutral-500" />
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
              채널 설정
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* 채널 정보 */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
              채널 이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
              토픽 / 설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 채널의 주제는 무엇인가요?"
              rows={2}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
            />
          </div>

          {/* 현재 멤버 */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                <Users size={12} />
                현재 멤버 ({members.length})
              </label>
            </div>
            <div className="max-h-32 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50/50 dark:border-neutral-700 dark:bg-neutral-800/50">
              {members.length === 0 ? (
                <p className="px-3 py-3 text-center text-[11px] text-neutral-400">
                  멤버가 없습니다
                </p>
              ) : (
                members.map((m) => (
                  <div
                    key={m.userId}
                    className="group flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                      {m.userName?.[0] ?? '?'}
                    </div>
                    <span className="flex-1 truncate text-xs text-neutral-700 dark:text-neutral-200">
                      {m.userName || '이름 없음'}
                    </span>
                    {m.userId !== currentUserId && (
                      <button
                        onClick={() => void handleRemoveMember(m.userId, m.userName)}
                        title="멤버 제거"
                        className="rounded p-1 text-neutral-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-error group-hover:opacity-100 dark:hover:bg-red-900/20"
                      >
                        <UserMinus size={11} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 멤버 추가 */}
          {candidates.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  추가할 조직원
                  {selectedToAdd.size > 0 && (
                    <span className="ml-1 rounded-full bg-primary-100 px-1.5 text-[10px] font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                      {selectedToAdd.size}
                    </span>
                  )}
                </label>
              </div>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50/50 dark:border-neutral-700 dark:bg-neutral-800/50">
                {candidates.map((m) => {
                  const checked = selectedToAdd.has(m.userId)
                  return (
                    <label
                      key={m.userId}
                      className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAdd(m.userId)}
                        className="h-3.5 w-3.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-400"
                      />
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                        {m.user.name?.[0] ?? '?'}
                      </div>
                      <span className="flex-1 truncate text-xs">{m.user.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* 액션 */}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              취소
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={14} />
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>

          {/* 위험 영역 — 채널 삭제 */}
          {channel.type !== 'dm' && (
            <div className="mt-4 rounded-lg border border-red-200 p-3 dark:border-red-900/50">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-xs text-error">
                    "{channel.name}" 채널을 삭제하시겠습니까? 메시지·파일 모두 영구 삭제됩니다.
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    <X size={14} />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => void handleDeleteChannel()}
                    disabled={deleting}
                  >
                    {deleting ? '삭제 중' : '삭제'}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={13} />
                  채널 삭제
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
