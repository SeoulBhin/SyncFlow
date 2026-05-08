import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, User, Mail, Lock } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/auth/Input'
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons'
import { useForm } from '@/hooks/useForm'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToastStore } from '@/stores/useToastStore'
import { api } from '@/utils/api'

interface RegisterValues {
  name: string
  email: string
  password: string
  confirmPassword: string
}

function validate(values: RegisterValues) {
  const errors: Partial<Record<keyof RegisterValues, string>> = {}
  if (!values.name) {
    errors.name = '이름을 입력해주세요'
  }
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
  if (!values.confirmPassword) {
    errors.confirmPassword = '비밀번호 확인을 입력해주세요'
  } else if (values.password && values.confirmPassword !== values.password) {
    errors.confirmPassword = '비밀번호가 일치하지 않습니다'
  }
  return errors
}

export function RegisterPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const addToast = useToastStore((s) => s.addToast)
  const [loading, setLoading] = useState(false)

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } =
    useForm<RegisterValues>(
      { name: '', email: '', password: '', confirmPassword: '' },
      validate,
    )

  const onSubmit = handleSubmit(async (v) => {
    setLoading(true)
    try {
      const { accessToken } = await api.post<{ accessToken: string }>('/auth/register', {
        name: v.name,
        email: v.email,
        password: v.password,
      })
      localStorage.setItem('accessToken', accessToken)
      const user = await api.get<{ id: string; name: string; email: string; avatarUrl?: string }>('/auth/me')
      login({ id: user.id, name: user.name, email: user.email, avatar: user.avatarUrl ?? undefined }, accessToken)
      addToast('success', '회원가입이 완료되었습니다!')
      navigate('/app')
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : '회원가입에 실패했습니다.')
    }
    setLoading(false)
  })

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* 헤더 */}
        <div className="text-center">
          <UserPlus size={40} className="mx-auto text-primary-600 dark:text-primary-400" />
          <h1 className="mt-4 text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            회원가입
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            SyncFlow와 함께 새로운 협업을 시작하세요
          </p>
        </div>

        {/* 회원가입 폼 (이름/이메일/비밀번호 입력 후 제출) */}
        <form onSubmit={onSubmit} className="space-y-4">
          {/* 이름 입력 필드 */}
          <Input
            label="이름"
            name="name"
            type="text"
            placeholder="홍길동"
            icon={User}
            value={values.name}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.name ? errors.name : undefined}
          />
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

          {/* 회원가입 제출 버튼 */}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? '가입 중...' : '회원가입'}
          </Button>
        </form>

        {/* 소셜 로그인 (Google, GitHub) */}
        <SocialLoginButtons />

        {/* 로그인 페이지로 이동 */}
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-primary-600 hover:underline dark:text-primary-400">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
