import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ShieldCheck, Lock, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/auth/Input'
import { useForm } from '@/hooks/useForm'
import { useToastStore } from '@/stores/useToastStore'

interface ResetPasswordValues {
  password: string
  confirmPassword: string
}

function validate(values: ResetPasswordValues) {
  const errors: Partial<Record<keyof ResetPasswordValues, string>> = {}
  if (!values.password) {
    errors.password = '새 비밀번호를 입력해주세요'
  } else if (values.password.length < 8) {
    errors.password = '비밀번호는 8자 이상이어야 합니다'
  }
  if (!values.confirmPassword) {
    errors.confirmPassword = '비밀번호 확인을 입력해주세요'
  } else if (values.password && values.confirmPassword !== values.password) {
    errors.confirmPassword = '비밀번호가 일치하지 않습니다'
  }
  return errors
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const addToast = useToastStore((s) => s.addToast)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } =
    useForm<ResetPasswordValues>({ password: '', confirmPassword: '' }, validate)

  const onSubmit = handleSubmit(async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setDone(true)
    addToast('success', '비밀번호가 성공적으로 변경되었습니다.')
    setLoading(false)
  })

  /* 토큰 없음 — 잘못된 접근 안내 */
  if (!token) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <ShieldCheck size={48} className="mx-auto text-warning" />
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            유효하지 않은 링크
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            비밀번호 재설정 링크가 만료되었거나 올바르지 않습니다.
            <br />
            다시 요청해주세요.
          </p>
          {/* 비밀번호 재설정 요청 페이지로 이동 */}
          <Link to="/forgot-password">
            <Button variant="secondary" className="w-full">
              재설정 다시 요청하기
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  /* 변경 완료 화면 */
  if (done) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <CheckCircle size={48} className="mx-auto text-success" />
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            비밀번호 변경 완료
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            새로운 비밀번호로 로그인해주세요.
          </p>
          {/* 로그인 페이지로 이동 */}
          <Link to="/login">
            <Button className="w-full">로그인하러 가기</Button>
          </Link>
        </div>
      </div>
    )
  }

  /* 새 비밀번호 입력 폼 */
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* 헤더 */}
        <div className="text-center">
          <ShieldCheck size={40} className="mx-auto text-primary-600 dark:text-primary-400" />
          <h1 className="mt-4 text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            새 비밀번호 설정
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            새로운 비밀번호를 입력해주세요.
          </p>
        </div>

        {/* 새 비밀번호 입력 폼 */}
        <form onSubmit={onSubmit} className="space-y-4">
          {/* 새 비밀번호 입력 필드 */}
          <Input
            label="새 비밀번호"
            name="password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            value={values.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.password ? errors.password : undefined}
          />
          {/* 비밀번호 확인 입력 필드 */}
          <Input
            label="비밀번호 확인"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            value={values.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.confirmPassword ? errors.confirmPassword : undefined}
          />

          {/* 비밀번호 변경 제출 버튼 (목업 — 완료 화면으로 전환) */}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </form>

        {/* 로그인 페이지로 이동 */}
        <p className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            <ArrowLeft size={14} />
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  )
}
