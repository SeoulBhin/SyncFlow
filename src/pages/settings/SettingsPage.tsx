import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Settings, Sun, Moon, Monitor, Bell,
  Trash2, X, Crown, ArrowRight,
  Building2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { useThemeStore } from '@/stores/useThemeStore'
import { useToastStore } from '@/stores/useToastStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { api } from '@/utils/api'
import type { Theme } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/* ─── 테마 선택 ─── */

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '라이트', icon: Sun },
  { value: 'dark', label: '다크', icon: Moon },
  { value: 'system', label: '시스템', icon: Monitor },
]

function ThemeSection({ accessToken }: { accessToken: string | null }) {
  const { theme, setTheme } = useThemeStore()
  const addToast = useToastStore((s) => s.addToast)

  const handleTheme = async (value: Theme) => {
    setTheme(value)
    if (!accessToken) return
    await fetch(`${API_BASE}/api/settings/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
      body: JSON.stringify({ theme: value }),
    }).catch(() => addToast('error', '테마 저장 실패'))
  }

  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        테마 설정
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => handleTheme(value)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all',
              theme === value
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:bg-neutral-800',
            )}
          >
            <Icon size={22} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

/* ─── 알림 설정 ─── */

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

function NotificationSection({
  accessToken,
  initialNotifications,
}: {
  accessToken: string | null
  initialNotifications: { message: boolean; task: boolean; deadline: boolean; browser: boolean } | null
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [notifications, setNotifications] = useState({
    message: true,
    task: true,
    deadline: false,
    browser: true,
  })

  useEffect(() => {
    if (initialNotifications) setNotifications(initialNotifications)
  }, [initialNotifications])

  const toggle = async (key: keyof typeof notifications) => {
    const next = !notifications[key]
    setNotifications((s) => ({ ...s, [key]: next }))
    if (!accessToken) return
    const fieldMap: Record<string, string> = {
      message: 'notifyMessage',
      task: 'notifyTask',
      deadline: 'notifyDeadline',
      browser: 'notifyBrowser',
    }
    await fetch(`${API_BASE}/api/settings/notifications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
      body: JSON.stringify({ [fieldMap[key]]: next }),
    }).catch(() => addToast('error', '알림 설정 저장 실패'))
  }

  const items = [
    { key: 'message' as const, label: '새 메시지 알림', desc: '채팅 메시지, @멘션 수신 시 알림' },
    { key: 'task' as const, label: '할 일 알림', desc: '할 일 배정, 상태 변경 시 알림' },
    { key: 'deadline' as const, label: '마감일 알림', desc: '마감일 24시간 전 미리 알림' },
    { key: 'browser' as const, label: '브라우저 푸시 알림', desc: '백그라운드에서도 알림 수신 (Notification API)' },
  ]

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Bell size={16} className="text-neutral-500" />
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">알림 설정</h2>
      </div>
      <div className="space-y-4">
        {items.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</p>
              <p className="text-xs text-neutral-400">{desc}</p>
            </div>
            <ToggleSwitch checked={notifications[key]} onChange={() => toggle(key)} />
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ─── 조직 위험 영역 — owner: 삭제 / 일반 멤버: 탈퇴 ─── */

function OrganizationDangerZone() {
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const activeOrgName = useGroupContextStore((s) => s.activeOrgName)
  const removeGroup = useGroupContextStore((s) => s.removeGroup)

  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  // store cache가 stale일 수 있으므로 백엔드에서 정확한 role 다시 fetch
  const [actualRole, setActualRole] = useState<'owner' | 'admin' | 'member' | 'guest' | null>(
    null,
  )
  const [roleLoaded, setRoleLoaded] = useState(false)

  useEffect(() => {
    if (!activeOrgId) return
    setRoleLoaded(false)
    api
      .get<{ myRole?: 'owner' | 'admin' | 'member' | 'guest' | null }>(`/groups/${activeOrgId}`)
      .then((d) => setActualRole(d.myRole ?? null))
      .catch(() => setActualRole(null))
      .finally(() => setRoleLoaded(true))
  }, [activeOrgId])

  if (!activeOrgId) return null
  if (!roleLoaded) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center text-xs text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800/50">
        권한 확인 중...
      </div>
    )
  }

  const isOwner = actualRole === 'owner'

  const handleDelete = async () => {
    if (confirmText !== activeOrgName) return
    setBusy(true)
    try {
      await api.delete(`/groups/${activeOrgId}`)
      removeGroup(activeOrgId)
      addToast('success', `조직 "${activeOrgName}"이(가) 삭제되었습니다.`)
      navigate('/app')
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : '조직 삭제 실패')
    } finally {
      setBusy(false)
      setShowConfirm(false)
      setConfirmText('')
    }
  }

  const handleLeave = async () => {
    setBusy(true)
    try {
      await api.post(`/groups/${activeOrgId}/leave`, {})
      removeGroup(activeOrgId)
      addToast('success', `조직 "${activeOrgName}"에서 탈퇴했습니다.`)
      navigate('/app')
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : '조직 탈퇴 실패')
    } finally {
      setBusy(false)
      setShowConfirm(false)
    }
  }

  // ── owner: 조직 삭제 (이름 확인) ──
  if (isOwner) {
    return (
      <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
        <div className="mb-3 flex items-center gap-2">
          <Building2 size={16} className="text-red-500" />
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">조직 삭제</h2>
        </div>
        <p className="mb-4 text-xs text-red-600/80 dark:text-red-400/80">
          조직을 삭제하면 채널·프로젝트·페이지·태스크 등 모든 데이터가 영구적으로 사라집니다. 이 작업은 되돌릴 수 없습니다.
          조직 소유자(owner)만 수행할 수 있어요.
        </p>

        {!showConfirm ? (
          <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>
            <Trash2 size={14} />
            조직 삭제
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-neutral-900">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              정말 "{activeOrgName}" 조직을 삭제하시겠습니까?
            </p>
            <p className="text-xs text-neutral-500">
              확인을 위해 조직 이름{' '}
              <strong className="text-red-600 dark:text-red-400">"{activeOrgName}"</strong>을(를) 그대로 입력해주세요.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={activeOrgName ?? ''}
              className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-red-800 dark:bg-neutral-800 dark:focus:ring-red-900/50"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowConfirm(false); setConfirmText('') }}
              >
                <X size={14} />
                취소
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={confirmText !== activeOrgName || busy}
                onClick={() => void handleDelete()}
              >
                <Trash2 size={14} />
                {busy ? '처리 중...' : '영구 삭제'}
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── 일반 멤버: 조직 탈퇴 ──
  return (
    <div className="rounded-xl border-2 border-orange-200 bg-orange-50/40 p-6 dark:border-orange-900/50 dark:bg-orange-950/20">
      <div className="mb-3 flex items-center gap-2">
        <Building2 size={16} className="text-orange-500" />
        <h2 className="text-sm font-semibold text-orange-700 dark:text-orange-400">조직 탈퇴</h2>
      </div>
      <p className="mb-4 text-xs text-orange-700/80 dark:text-orange-400/80">
        이 조직에서 나갑니다. 조직 데이터는 그대로 남고, 다시 참여하려면 새 초대 코드가 필요합니다.
      </p>

      {!showConfirm ? (
        <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>
          조직 탈퇴
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border border-orange-200 bg-white p-4 dark:border-orange-900/50 dark:bg-neutral-900">
          <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
            정말 "{activeOrgName}" 조직에서 탈퇴하시겠습니까?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>
              <X size={14} />
              취소
            </Button>
            <Button variant="danger" size="sm" disabled={busy} onClick={() => void handleLeave()}>
              {busy ? '처리 중...' : '탈퇴하기'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── 설정 페이지 메인 ─── */

export function SettingsPage() {
  const accessToken = sessionStorage.getItem('accessToken')
  const [settingsData, setSettingsData] = useState<{
    notifications: { message: boolean; task: boolean; deadline: boolean; browser: boolean }
    social: { google: boolean; github: boolean; kakao: boolean }
  } | null>(null)

  useEffect(() => {
    if (!accessToken) return
    fetch(`${API_BASE}/api/settings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data) => setSettingsData(data))
      .catch(() => {})
  }, [accessToken])

  const activeOrgName = useGroupContextStore((s) => s.activeOrgName)

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <Settings size={24} className="text-primary-600 dark:text-primary-400" />
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
          조직 설정
          {activeOrgName && (
            <span className="ml-2 text-sm font-normal text-neutral-400">· {activeOrgName}</span>
          )}
        </h1>
      </div>

      <div className="space-y-6">
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
              <Crown size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">구독 플랜</p>
              <p className="text-xs text-neutral-400">현재: <span className="font-medium text-violet-600 dark:text-violet-400">무료</span></p>
            </div>
          </div>
          <Link to="/app/billing">
            <Button variant="ghost" size="sm">
              플랜 관리 <ArrowRight size={14} />
            </Button>
          </Link>
        </Card>

        <ThemeSection accessToken={accessToken} />
        <NotificationSection accessToken={accessToken} initialNotifications={settingsData?.notifications ?? null} />
        <OrganizationDangerZone />

        <p className="pt-2 text-center text-xs text-neutral-400">
          비밀번호·소셜 연동·계정 탈퇴는{' '}
          <Link to="/app/profile" className="text-primary-600 hover:underline dark:text-primary-400">
            프로필 페이지
          </Link>
          에서 관리합니다.
        </p>
      </div>
    </div>
  )
}
