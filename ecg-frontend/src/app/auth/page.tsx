'use client'

import Checkbox from '@/components/ui/Checkbox'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStatus } from '@/hooks/useAuthStatus'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useCallback, useState, useEffect } from 'react'
import { LuEye, LuEyeOff } from 'react-icons/lu'

const AuthPageContent: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoggedIn, isLoading: authLoading } = useAuthStatus()
  const provider = searchParams.get('provider')
  const emailFromUrl = searchParams.get('email') || ''
  const [formData, setFormData] = useState({
    email: emailFromUrl, // URL에서 받은 이메일로 초기화
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const { login, getGoogleLoginUrl } = useAuth()

  // 모든 Hook들을 early return 전에 배치
  const handleGoogleLogin = useCallback(() => {
    try {
      const googleUrl = getGoogleLoginUrl()
      // 현재 창에서 Google OAuth로 이동
      window.location.href = googleUrl
    } catch (error) {
      console.error('Google OAuth 오류:', error)
      setErrors({ general: 'Google 로그인을 시작할 수 없습니다.' })
    }
  }, [getGoogleLoginUrl])

  const handleForgotPassword = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    // TODO: 비밀번호 찾기 기능 구현
    console.log('Forgot password clicked')
  }, [])

  const handleInputChange = useCallback(
    (field: keyof typeof formData) => (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }))
      }
    },
    [errors]
  )

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.'
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.'
    } else if (formData.password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateForm()) return

      setIsLoading(true)

      try {
        await login({
          email: formData.email,
          password: formData.password,
        })

        router.push('/')
      } catch (error) {
        setErrors({
          general:
            error instanceof Error ? error.message : '오류가 발생했습니다.',
        })
      } finally {
        setIsLoading(false)
      }
    },
    [formData, login, router, validateForm]
  )

  // 로그인 상태 체크 및 리디렉션
  useEffect(() => {
    console.log('Auth redirect check:', { authLoading, isLoggedIn })
    if (!authLoading && isLoggedIn) {
      console.log('Redirecting to home page...')
      router.push('/')
    }
  }, [isLoggedIn, authLoading, router])

  // Google OAuth 자동 리디렉션 및 토큰 처리
  React.useEffect(() => {
    if (provider === 'google') {
      handleGoogleLogin()
    }

    // URL에서 토큰 확인 (Google OAuth 콜백 처리)
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const error = urlParams.get('error')

    if (token) {
      // OAuth 성공 - 토큰 저장 후 홈으로 이동
      localStorage.setItem('token', token)
      router.push('/')
    } else if (error) {
      // OAuth 실패 - 에러 메시지 표시
      const message =
        urlParams.get('message') || 'Google 로그인 중 오류가 발생했습니다.'
      setErrors({ general: message })
      // URL 정리
      window.history.replaceState({}, '', '/auth')
    }
  }, [provider, handleGoogleLogin, router])

  // 인증 상태 로딩 중이거나 로그인된 경우 로딩 화면 표시
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-300">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      {/* Animated Background - same as landing page */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-40">
          <div className="absolute bottom-1/4 left-3/11 w-86 h-86 bg-primary rounded-full filter blur-3xl bg-blob animate-blob animation-delay-0"></div>
          <div className="absolute top-1/3 left-4/7 w-72 h-72 bg-primary-light rounded-full filter blur-3xl bg-blob animate-blob animation-delay-1000"></div>
          <div className="absolute bottom-1/7 left-6/11 w-64 h-64 bg-amber-300 rounded-full filter blur-3xl bg-blob animate-blob animation-delay-2500"></div>
          <div className="absolute bottom-2/4 left-4/11 w-86 h-86 bg-red-500 rounded-full filter blur-3xl bg-blob animate-blob animation-delay-4000"></div>
          <div className="absolute bottom-1/9 left-1/11 w-56 h-56 bg-green-500 rounded-full filter blur-3xl bg-blob animate-blob animation-delay-5000"></div>
          <div className="absolute bottom-1/3 left-5/11 w-56 h-56 bg-white rounded-full filter blur-3xl bg-blob animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-6/11 left-9/11 w-56 h-56 bg-fuchsia-600 rounded-full filter blur-3xl bg-blob animate-blob animation-delay-3000"></div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl p-10 shadow-2xl border border-gray-200">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
          </div>

          {/* Error Message */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-[50px] bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-black font-bold text-xs border border-gray-300">
              G
            </span>
            <span>Google로 로그인</span>
          </button>

          {/* Divider */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-xs text-gray-500 px-2">
              혹은 이메일로 로그인
            </span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                이메일
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email')(e.target.value)}
                  placeholder="이메일 주소 입력"
                  className={`w-full h-[50px] px-4 bg-gray-50 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-300' : 'border-gray-200'
                  }`}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange('password')(e.target.value)
                  }
                  placeholder="비밀번호 입력"
                  className={`w-full h-[50px] px-4 pr-12 bg-gray-50 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.password ? 'border-red-300' : 'border-gray-200'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <LuEye className="w-5 h-5" />
                  ) : (
                    <LuEyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <Checkbox
                checked={rememberMe}
                onChange={setRememberMe}
                label="로그인 상태 유지"
              />
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                disabled={isLoading}
              >
                비밀번호 찾기
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full h-[50px] rounded-3xl font-bold text-base transition-colors cursor-pointer ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {isLoading ? '처리 중...' : '로그인'}
            </button>
          </form>

          {/* Footer */}
          <div className="space-y-4 text-center">
            <p className="text-xs text-gray-500">
              Hoit과 함께 멋진 영상을 만들어보세요!
            </p>

            <button
              type="button"
              onClick={() => router.push('/signup')}
              className="text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors cursor-pointer"
              disabled={isLoading}
            >
              회원가입
            </button>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                disabled={isLoading}
              >
                홈으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const AuthPage: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-gray-300">로딩 중...</p>
          </div>
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  )
}

export default AuthPage
