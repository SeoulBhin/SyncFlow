import { useState, useRef, type ChangeEvent } from 'react'
import { UserCircle, Camera, Save } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/auth/Input'
import { Card } from '@/components/common/Card'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToastStore } from '@/stores/useToastStore'
import { AIUsageCard } from '@/components/ai/AIUsageCard'
import {
  PasswordSection,
  SocialSection,
  AccountDangerZone,
} from '@/components/profile/AccountSecuritySection'

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const addToast = useToastStore((s) => s.addToast)

  const [nickname, setNickname] = useState(user?.name ?? '김테스터')
  const [statusMessage, setStatusMessage] = useState('열심히 개발 중입니다!')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      addToast('error', '이미지 파일만 업로드 가능합니다.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!nickname.trim()) {
      addToast('error', '닉네임을 입력해주세요.')
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    addToast('success', '프로필이 저장되었습니다.')
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <UserCircle size={24} className="text-primary-600 dark:text-primary-400" />
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">프로필 관리</h1>
      </div>

      <div className="space-y-6">
        {/* 프로필 사진 영역 */}
        <Card>
          <h2 className="mb-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            프로필 사진
          </h2>
          <div className="flex items-center gap-6">
            {/* 아바타 미리보기 (클릭 시 파일 선택 열기) */}
            <button
              type="button"
              onClick={handleAvatarClick}
              className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-neutral-200 bg-neutral-100 transition-colors hover:border-primary-400 dark:border-neutral-600 dark:bg-neutral-700"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="프로필 미리보기"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserCircle className="h-full w-full text-neutral-300 dark:text-neutral-500" />
              )}
              {/* 호버 시 카메라 아이콘 오버레이 */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera size={24} className="text-white" />
              </div>
            </button>

            <div className="space-y-2">
              {/* 사진 업로드 버튼 (파일 선택 다이얼로그 열기) */}
              <Button variant="secondary" size="sm" onClick={handleAvatarClick}>
                사진 변경
              </Button>
              {/* 사진 제거 버튼 (미리보기 초기화) */}
              {avatarPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAvatarPreview(null)}
                >
                  사진 제거
                </Button>
              )}
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                JPG, PNG, GIF (최대 5MB)
              </p>
            </div>

            {/* 숨겨진 파일 입력 — 아바타 클릭/버튼으로 트리거 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </Card>

        {/* 기본 정보 영역 */}
        <Card>
          <h2 className="mb-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            기본 정보
          </h2>
          <div className="space-y-4">
            {/* 이메일 표시 (읽기 전용) */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                이메일
              </label>
              <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                {user?.email ?? 'tester1@test.com'}
              </p>
            </div>

            {/* 닉네임 변경 입력 필드 */}
            <Input
              label="닉네임"
              name="nickname"
              type="text"
              placeholder="닉네임을 입력해주세요"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />

            {/* 상태 메시지 편집 필드 */}
            <div className="space-y-1.5">
              <label
                htmlFor="statusMessage"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                상태 메시지
              </label>
              {/* 상태 메시지 텍스트 입력 (textarea) */}
              <textarea
                id="statusMessage"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="상태 메시지를 입력해주세요"
                rows={3}
                maxLength={100}
                className="w-full resize-none rounded-lg border border-neutral-200 bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
              />
              <p className="text-right text-xs text-neutral-400">
                {statusMessage.length}/100
              </p>
            </div>
          </div>
        </Card>

        {/* AI 사용량 표시 (UI-37) */}
        <AIUsageCard />

        {/* 프로필 저장 버튼 (목업 — 토스트로 저장 완료 표시) */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? '저장 중...' : '변경사항 저장'}
          </Button>
        </div>

        {/* 보안 / 연결된 계정 / 계정 탈퇴 — 조직 설정에서 옮겨온 영역 */}
        <div className="mt-8 space-y-6 border-t border-neutral-200 pt-6 dark:border-neutral-700">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            보안 & 계정
          </h2>
          <PasswordSection />
          <SocialSection />
          <AccountDangerZone />
        </div>
      </div>
    </div>
  )
}
