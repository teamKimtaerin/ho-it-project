'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import HelpText from '@/components/ui/HelpText'
import { AuthAPI } from '@/lib/api/auth'

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToSignup?: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToSignup,
}) => {
  const { login, isLoading, error, clearError } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.email) {
      errors.email = '이메일을 입력해주세요.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '올바른 이메일 형식을 입력해주세요.'
    }

    if (!formData.password) {
      errors.password = '비밀번호를 입력해주세요.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!validateForm()) return

    try {
      await login(formData)
      onSuccess?.()
    } catch {
      // 에러는 store에서 처리됨
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // 해당 필드의 에러 클리어
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = AuthAPI.getGoogleLoginUrl()
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인</h2>
          <p className="text-gray-600">ECG 계정으로 로그인하세요</p>
        </div>

        {error && (
          <HelpText text={error} variant="negative" className="text-center" />
        )}

        <div className="space-y-4">
          <Input
            type="email"
            label="이메일"
            value={formData.email}
            onChange={(value) => handleInputChange('email', value)}
            placeholder="your@email.com"
            disabled={isLoading}
            required
            error={formErrors.email}
          />

          <Input
            type="password"
            label="비밀번호"
            value={formData.password}
            onChange={(value) => handleInputChange('password', value)}
            placeholder="비밀번호를 입력하세요"
            disabled={isLoading}
            required
            error={formErrors.password}
          />
        </div>

        <div className="space-y-3">
          <Button
            type="submit"
            variant="primary"
            style="fill"
            size="large"
            isDisabled={isLoading}
            className="w-full"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            style="outline"
            size="large"
            onClick={handleGoogleLogin}
            isDisabled={isLoading}
            className="w-full"
          >
            Google로 로그인
          </Button>
        </div>

        {onSwitchToSignup && (
          <div className="text-center">
            <p className="text-sm text-gray-600">
              계정이 없으신가요?{' '}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="font-medium text-blue-600 hover:text-blue-500"
                disabled={isLoading}
              >
                회원가입
              </button>
            </p>
          </div>
        )}
      </form>
    </div>
  )
}

export default LoginForm
