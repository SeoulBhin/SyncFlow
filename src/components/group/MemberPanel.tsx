import { useState } from 'react'
import { Shield, ShieldCheck, Crown, UserMinus, ChevronDown, Eye, Building2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { type GroupRole, type MockGroupMember } from '@/constants'

interface Props {
  members: MockGroupMember[]
  currentUserId?: string
  currentUserRole?: GroupRole
  isExternalChannel?: boolean
}

const roleConfig: Record<GroupRole, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: '소유자', icon: Crown, color: 'text-yellow-500' },
  admin: { label: '관리자', icon: ShieldCheck, color: 'text-primary-500' },
  member: { label: '멤버', icon: Shield, color: 'text-neutral-400' },
  guest: { label: '게스트', icon: Eye, color: 'text-orange-400' },
}

export function MemberPanel({ members, currentUserId = 'u1', currentUserRole = 'owner', isExternalChannel = false }: Props) {
  const [kickConfirm, setKickConfirm] = useState<string | null>(null)
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null)

  const isAdmin = currentUserRole === 'owner' || currentUserRole === 'admin'

  const sorted = [...members].sort((a, b) => {
    const order: Record<GroupRole, number> = { owner: 0, admin: 1, member: 2, guest: 3 }
    return order[a.role] - order[b.role]
  })

  const onlineCount = members.filter((m) => m.isOnline).length

  const orgGroups = isExternalChannel
    ? sorted.reduce<Record<string, typeof sorted>>((acc, m) => {
        const orgKey = m.orgName ?? '내부'
        ;(acc[orgKey] ??= []).push(m)
        return acc
      }, {})
    : null

  const renderMember = (member: (typeof sorted)[0]) => {
    const role = roleConfig[member.role]
    const RoleIcon = role.icon
    const isMe = member.id === currentUserId
    const canManage = isAdmin && !isMe && member.role !== 'owner'

    return (
      <div key={member.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        <div className="relative">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold',
            member.role === 'guest' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300')}>
            {member.name[0]}
          </div>
          <span className={cn('absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface dark:border-surface-dark-elevated',
            member.isOnline ? 'bg-success' : 'bg-neutral-300 dark:bg-neutral-600')} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{member.name}</span>
            {isMe && <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">나</span>}
          </div>
          <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">{member.email}</p>
        </div>
        <div className="relative flex items-center gap-1.5">
          {canManage ? (
            <button onClick={() => setRoleDropdown(roleDropdown === member.id ? null : member.id)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700">
              <RoleIcon size={14} className={role.color} />
              <span className="text-neutral-600 dark:text-neutral-300">{role.label}</span>
              <ChevronDown size={12} className="text-neutral-400" />
            </button>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 text-xs">
              <RoleIcon size={14} className={role.color} />
              <span className="text-neutral-600 dark:text-neutral-300">{role.label}</span>
            </div>
          )}
          {roleDropdown === member.id && canManage && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setRoleDropdown(null)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-28 rounded-lg border border-neutral-200 bg-surface py-1 shadow-lg dark:border-neutral-700 dark:bg-surface-dark-elevated">
                {(['admin', 'member'] as GroupRole[]).map((r) => {
                  const cfg = roleConfig[r]; const Icon = cfg.icon
                  return (
                    <button key={r} onClick={() => setRoleDropdown(null)}
                      className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700',
                        member.role === r && 'bg-neutral-50 dark:bg-neutral-800')}>
                      <Icon size={13} className={cfg.color} />{cfg.label}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
        {canManage && (
          <div className="relative">
            {kickConfirm === member.id ? (
              <div className="flex items-center gap-1">
                <button onClick={() => setKickConfirm(null)} className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700">취소</button>
                <button onClick={() => setKickConfirm(null)} className="rounded bg-error px-2 py-1 text-xs text-white hover:bg-red-700">확인</button>
              </div>
            ) : (
              <button onClick={() => setKickConfirm(member.id)}
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-error dark:hover:bg-red-900/20" title="강퇴">
                <UserMinus size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          멤버 ({members.length}명 / {onlineCount}명 온라인)
        </h3>
      </div>
      {isExternalChannel && orgGroups ? (
        <div className="space-y-4">
          {Object.entries(orgGroups).map(([orgName, orgMembers]) => (
            <div key={orgName}>
              <div className="mb-1.5 flex items-center gap-1.5 px-3">
                <Building2 size={12} className={orgName === '내부' ? 'text-primary-500' : 'text-orange-500'} />
                <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">{orgName}</span>
                <span className="text-[10px] text-neutral-400">({orgMembers.length})</span>
              </div>
              <div className="space-y-1">{orgMembers.map(renderMember)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">{sorted.map(renderMember)}</div>
      )}
    </div>
  )
}
