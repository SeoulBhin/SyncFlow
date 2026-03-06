import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/auth/Input'
import { useForm } from '@/hooks/useForm'
import { useToastStore } from '@/stores/useToastStore'

interface ForgotPasswordValues {
  email: string
}

function validate(values: ForgotPasswordValues) {
  const errors: Partial<Record<keyof ForgotPasswordValues, string>> = {}
  if (!values.email) {
    errors.email = '이메일을 입력해주세요'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = '올바른 이메일 형식이 아닙니다'
  }
  return errors
}

export function ForgotPasswordPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } =
    useForm<ForgotPasswordValues>({ email: '' }, validate)

  const onSubmit = handleSubmit(async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setSent(true)
    addToast('success', '비밀번호 재설정 링크가 발송되었습니다.')
    setLoading(false)
  })

  /* 발송 완료 화면 */
  if (sent) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <CheckCircle size={48} className="mx-auto text-success" />
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            이메일을 확인해주세요
          </h1>
          <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            <span className="font-medium text-neutral-700 dark:text-neutral-200">
              {values.email}
            </span>
            으로 비밀번호 재설정 링크를 보냈습니다.
            <br />
            메일함을 확인해주세요.
          </p>

          <div className="space-y-3">
            {/* 재발송 버튼 (목업 — 동일 토스트 표시) */}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => addToast('info', '재설정 링크를 다시 발송했습니다.')}
            >
              이메일 다시 보내기
            </Button>
            {/* 로그인 페이지로 이동 */}
            <Link to="/login" className="block">
              <Button variant="ghost" className="w-full">
                <ArrowLeft size={16} />
                로그인으로 돌아가기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* 이메일 입력 화면 */
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* 헤더 */}
        <div className="text-center">
          <KeyRound size={40} className="mx-auto text-primary-600 dark:text-primary-400" />
          <h1 className="mt-4 text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            비밀번호 재설정
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            가입 시 사용한 이메일을 입력하시면 재설정 링크를 보내드립니다.
          </p>
        </div>

        {/* 이메일 입력 폼 */}
        <form onSubmit={onSubmit} className="space-y-4">
          {/* 이메일 입력 필드 */}
          <Input
            label="이메일"
            name="email"
            type="email"
            placeholder="name@example.com"
            icon={Mail}
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.email ? errors.email : undefined}
          />

          {/* 재설정 링크 발송 버튼 (목업 — 발송 완료 화면으로 전환) */}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? '발송 중...' : '재설정 링크 보내기'}
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
