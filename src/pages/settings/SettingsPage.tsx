import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Settings, Sun, Moon, Monitor, Bell, Lock, Link2, Unlink,
  Trash2, AlertTriangle, Eye, EyeOff, Save, X, Crown, ArrowRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Input } from '@/components/auth/Input'
import { useThemeStore } from '@/stores/useThemeStore'
import { useToastStore } from '@/stores/useToastStore'
import type { Theme } from '@/types'

/* ─── 테마 선택 ─── */

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '라이트', icon: Sun },
  { value: 'dark', label: '다크', icon: Moon },
  { value: 'system', label: '시스템', icon: Monitor },
]

function ThemeSection() {
  const { theme, setTheme } = useThemeStore()

  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        테마 설정
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
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

function NotificationSection() {
  const [notifications, setNotifications] = useState({
    message: true,
    todo: true,
    deadline: false,
    browser: true,
  })

  const toggle = (key: keyof typeof notifications) => {
    setNotifications((s) => ({ ...s, [key]: !s[key] }))
  }

  const items = [
    { key: 'message' as const, label: '새 메시지 알림', desc: '채팅 메시지, @멘션 수신 시 알림' },
    { key: 'todo' as const, label: '할 일 알림', desc: '할 일 배정, 상태 변경 시 알림' },
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

/* ─── 비밀번호 변경 ─── */

function PasswordSection() {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const toggleShow = (key: keyof typeof showPw) => {
    setShowPw((s) => ({ ...s, [key]: !s[key] }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.current) e.current = '현재 비밀번호를 입력해주세요'
    if (!form.newPw) e.newPw = '새 비밀번호를 입력해주세요'
    else if (form.newPw.length < 8) e.newPw = '8자 이상 입력해주세요'
    if (!form.confirm) e.confirm = '비밀번호 확인을 입력해주세요'
    else if (form.newPw !== form.confirm) e.confirm = '비밀번호가 일치하지 않습니다'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    addToast('success', '비밀번호가 변경되었습니다.')
    setForm({ current: '', newPw: '', confirm: '' })
    setSaving(false)
  }

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Lock size={16} className="text-neutral-500" />
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">비밀번호 변경</h2>
      </div>
      <div className="space-y-4">
        <div className="relative">
          <Input
            label="현재 비밀번호"
            name="current-password"
            type={showPw.current ? 'text' : 'password'}
            placeholder="현재 비밀번호 입력"
            value={form.current}
            onChange={(e) => setForm((s) => ({ ...s, current: e.target.value }))}
            error={errors.current}
          />
          <button
            type="button"
            onClick={() => toggleShow('current')}
            className="absolute top-8 right-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            {showPw.current ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="relative">
          <Input
            label="새 비밀번호"
            name="new-password"
            type={showPw.newPw ? 'text' : 'password'}
            placeholder="8자 이상 입력"
            value={form.newPw}
            onChange={(e) => setForm((s) => ({ ...s, newPw: e.target.value }))}
            error={errors.newPw}
          />
          <button
            type="button"
            onClick={() => toggleShow('newPw')}
            className="absolute top-8 right-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            {showPw.newPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="relative">
          <Input
            label="새 비밀번호 확인"
            name="confirm-password"
            type={showPw.confirm ? 'text' : 'password'}
            placeholder="새 비밀번호 재입력"
            value={form.confirm}
            onChange={(e) => setForm((s) => ({ ...s, confirm: e.target.value }))}
            error={errors.confirm}
          />
          <button
            type="button"
            onClick={() => toggleShow('confirm')}
            className="absolute top-8 right-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saving} size="sm">
            <Save size={14} />
            {saving ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </div>
      </div>
    </Card>
  )
}

/* ─── 소셜 계정 연동 ─── */

function SocialSection() {
  const addToast = useToastStore((s) => s.addToast)
  const [connected, setConnected] = useState({ google: true, github: false, kakao: false })

  const toggle = async (provider: keyof typeof connected) => {
    const label = { google: 'Google', github: 'GitHub', kakao: '카카오' }[provider]
    if (connected[provider]) {
      setConnected((s) => ({ ...s, [provider]: false }))
      addToast('info', `${label} 계정 연동이 해제되었습니다.`)
    } else {
      setConnected((s) => ({ ...s, [provider]: true }))
      addToast('success', `${label} 계정이 연동되었습니다.`)
    }
  }

  const providers = [
    { key: 'google' as const, label: 'Google', color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20' },
    { key: 'github' as const, label: 'GitHub', color: 'text-neutral-800 dark:text-neutral-200', bgColor: 'bg-neutral-100 dark:bg-neutral-800' },
    { key: 'kakao' as const, label: '카카오', color: 'text-[#191919]', bgColor: 'bg-[#FEE500]' },
  ]

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Link2 size={16} className="text-neutral-500" />
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">소셜 계정 연동</h2>
      </div>
      <div className="space-y-3">
        {providers.map(({ key, label, color, bgColor }) => (
          <div key={key} className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold', bgColor, color)}>
                {label[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</p>
                <p className="text-xs text-neutral-400">
                  {connected[key] ? '연동됨' : '연동되지 않음'}
                </p>
              </div>
            </div>
            <Button
              variant={connected[key] ? 'ghost' : 'secondary'}
              size="sm"
              onClick={() => toggle(key)}
            >
              {connected[key] ? <><Unlink size={13} /> 해제</> : <><Link2 size={13} /> 연결</>}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ─── 계정 탈퇴 (위험 영역) ─── */

function DangerZone() {
  const addToast = useToastStore((s) => s.addToast)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (confirmText !== '탈퇴합니다') return
    setDeleting(true)
    await new Promise((r) => setTimeout(r, 1000))
    addToast('info', '계정 탈퇴가 처리되었습니다. (목업)')
    setDeleting(false)
    setShowConfirm(false)
    setConfirmText('')
  }

  return (
    <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={16} className="text-red-500" />
        <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">위험 영역</h2>
      </div>
      <p className="mb-4 text-xs text-red-600/80 dark:text-red-400/80">
        계정을 탈퇴하면 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
      </p>

      {!showConfirm ? (
        <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>
          <Trash2 size={14} />
          계정 탈퇴
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-neutral-900">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            정말 탈퇴하시겠습니까?
          </p>
          <p className="text-xs text-neutral-500">
            확인을 위해 아래에 <strong className="text-red-600 dark:text-red-400">"탈퇴합니다"</strong>를 입력해주세요.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="탈퇴합니다"
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
              disabled={confirmText !== '탈퇴합니다' || deleting}
              onClick={handleDelete}
            >
              <Trash2 size={14} />
              {deleting ? '처리 중...' : '영구 삭제'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── 설정 페이지 메인 ─── */

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <Settings size={24} className="text-primary-600 dark:text-primary-400" />
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">설정</h1>
      </div>

      <div className="space-y-6">
        {/* 구독 플랜 바로가기 */}
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

        <ThemeSection />
        <NotificationSection />
        <PasswordSection />
        <SocialSection />
        <DangerZone />
      </div>
    </div>
  )
}
