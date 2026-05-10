import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Lock, Link2, Unlink, Trash2, AlertTriangle, Eye, EyeOff, Save, X,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Input } from '@/components/auth/Input'
import { useToastStore } from '@/stores/useToastStore'
import { useAuthStore } from '@/stores/useAuthStore'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function getAccessToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
}

/* ─── 비밀번호 변경 ─── */

export function PasswordSection() {
  const accessToken = getAccessToken()
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
    try {
      const res = await fetch(`${API_BASE}/api/settings/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.newPw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? '오류')
      addToast('success', '비밀번호가 변경되었습니다.')
      setForm({ current: '', newPw: '', confirm: '' })
    } catch (e: unknown) {
      addToast('error', e instanceof Error ? e.message : '비밀번호 변경 실패')
    } finally {
      setSaving(false)
    }
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

export function SocialSection() {
  const accessToken = getAccessToken()
  const addToast = useToastStore((s) => s.addToast)
  const [connected, setConnected] = useState({ google: false, github: false, kakao: false })

  useEffect(() => {
    if (!accessToken) return
    fetch(`${API_BASE}/api/settings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.social) setConnected(data.social)
      })
      .catch(() => {})
  }, [accessToken])

  const toggle = async (provider: keyof typeof connected) => {
    const label = { google: 'Google', github: 'GitHub', kakao: '카카오' }[provider]
    if (connected[provider]) {
      try {
        const res = await fetch(`${API_BASE}/api/settings/social/${provider}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? '오류')
        setConnected((s) => ({ ...s, [provider]: false }))
        addToast('info', `${label} 계정 연동이 해제되었습니다.`)
      } catch (e: unknown) {
        addToast('error', e instanceof Error ? e.message : '연동 해제 실패')
      }
    } else {
      window.location.href = `${API_BASE}/api/auth/oauth/${provider}`
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

/* ─── 계정 탈퇴 ─── */

export function AccountDangerZone() {
  const accessToken = getAccessToken()
  const addToast = useToastStore((s) => s.addToast)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (confirmText !== '탈퇴합니다') return
    setDeleting(true)
    try {
      const res = await fetch(`${API_BASE}/api/settings/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? '오류')
      addToast('info', '계정이 삭제되었습니다.')
      logout()
      navigate('/')
    } catch (e: unknown) {
      addToast('error', e instanceof Error ? e.message : '계정 삭제 실패')
    } finally {
      setDeleting(false)
      setShowConfirm(false)
      setConfirmText('')
    }
  }

  return (
    <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={16} className="text-red-500" />
        <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">계정 탈퇴</h2>
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
              onClick={() => void handleDelete()}
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
