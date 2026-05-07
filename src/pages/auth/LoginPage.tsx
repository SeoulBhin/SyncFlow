import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { LogIn, Mail, Lock } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/auth/Input'
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons'
import { useForm } from '@/hooks/useForm'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToastStore } from '@/stores/useToastStore'
import { MOCK_USERS, MOCK_PASSWORD } from '@/constants'

interface LoginValues {
  email: string
  password: string
}

function validate(values: LoginValues) {
  const errors: Partial<Record<keyof LoginValues, string>> = {}
  if (!values.email) {
    errors.email = '이메일을 입력해주세요'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = '올바른 이메일 형식이 아닙니다'
  }
  if (!values.password) {
    errors.password = '비밀번호를 입력해주세요'
  } else if (values.password.length < 8) {
    errors.password = '비밀번호는 8자 이상이어야 합니다'
  }
  return errors
}

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const addToast = useToastStore((s) => s.addToast)
  const [loading, setLoading] = useState(false)

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } = useForm<LoginValues>(
    { email: '', password: '' },
    validate,
  )

  const onSubmit = handleSubmit(async (v) => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))

    const user = MOCK_USERS.find((u) => u.email === v.email)
    if (user && v.password === MOCK_PASSWORD) {
      login(user, '')
      addToast('success', `${user.name}님, 환영합니다!`)
      navigate('/app')
    } else {
      addToast('error', '이메일 또는 비밀번호가 올바르지 않습니다.')
    }
    setLoading(false)
  })

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* 헤더 */}
        <div className="text-center">
          <LogIn size={40} className="mx-auto text-primary-600 dark:text-primary-400" />
          <h1 className="mt-4 text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            로그인
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            SyncFlow에 로그인하고 팀과 함께 시작하세요
          </p>
        </div>

        {/* 로그인 폼 (이메일/비밀번호 입력 후 제출) */}
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
          {/* 비밀번호 입력 필드 */}
          <Input
            label="비밀번호"
            name="password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            value={values.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.password ? errors.password : undefined}
          />

          <div className="flex justify-end">
            {/* 비밀번호 재설정 페이지로 이동 */}
            <Link
              to="/forgot-password"
              className="text-xs text-primary-600 hover:underline dark:text-primary-400"
            >
              비밀번호 찾기
            </Link>
          </div>

          {/* 로그인 제출 버튼 */}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        {/* 소셜 로그인 (Google, GitHub) */}
        <SocialLoginButtons />

        {/* 회원가입 페이지로 이동 */}
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          계정이 없으신가요?{' '}
          <Link to="/register" className="text-primary-600 hover:underline dark:text-primary-400">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
