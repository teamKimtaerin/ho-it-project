'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  FaGoogle,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
} from 'react-icons/fa'

interface UserInfo {
  email?: string
  name?: string
  channelId?: string
}

interface YouTubeAuthButtonProps {
  onAuthChange?: (isAuthenticated: boolean, userInfo?: UserInfo) => void
  sessionId?: string
}

interface AuthStatus {
  isAuthenticated: boolean
  isLoading: boolean
  error?: string
  userInfo?: UserInfo
  channelInfo?: {
    id: string
    title: string
    thumbnailUrl?: string
  }
}

export default function YouTubeAuthButton({
  onAuthChange,
  sessionId,
}: YouTubeAuthButtonProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    isLoading: true,
  })

  const checkAuthStatus = useCallback(async () => {
    console.log('[AUTH_BUTTON] 인증 상태 확인 시작')
    try {
      // 쿠키에 토큰이 있는지 확인
      const hasToken = document.cookie.includes('youtube_auth_token')
      console.log('[AUTH_BUTTON] 쿠키 토큰 존재 여부:', hasToken)
      console.log('[AUTH_BUTTON] 전체 쿠키:', document.cookie)

      if (hasToken) {
        console.log('[AUTH_BUTTON] /api/auth/youtube/verify API 호출 시작')
        // 토큰이 유효한지 API로 확인
        const response = await fetch('/api/auth/youtube/verify/', {
          method: 'GET',
          credentials: 'include',
        })

        console.log(
          '[AUTH_BUTTON] API 응답 상태:',
          response.status,
          response.statusText
        )

        if (response.ok) {
          const data = await response.json()
          console.log('[AUTH_BUTTON] API 응답 데이터:', data)

          // success가 true이고 isAuthenticated가 true인 경우 성공으로 처리
          if (data.success && data.isAuthenticated) {
            console.log('[AUTH_BUTTON] 인증 성공 - UI 업데이트')
            setAuthStatus({
              isAuthenticated: true,
              isLoading: false,
              userInfo: data.userInfo,
              channelInfo: data.channelInfo,
            })
            onAuthChange?.(true, data)
            return
          } else {
            console.log('[AUTH_BUTTON] API 응답에서 인증 실패:', data)
          }
        } else {
          console.log('[AUTH_BUTTON] API 응답 오류:', response.status)
        }
      } else {
        console.log('[AUTH_BUTTON] 쿠키에 토큰 없음')
      }

      console.log('[AUTH_BUTTON] 인증되지 않은 상태로 설정')
      setAuthStatus({
        isAuthenticated: false,
        isLoading: false,
      })
      onAuthChange?.(false)
    } catch (error) {
      console.error('[AUTH_BUTTON] 인증 상태 확인 오류:', error)
      setAuthStatus({
        isAuthenticated: false,
        isLoading: false,
        error: '인증 상태 확인 실패',
      })
      onAuthChange?.(false)
    }
  }, [onAuthChange])

  // 페이지 로드 시 인증 상태 확인
  useEffect(() => {
    console.log('[AUTH_BUTTON] useEffect 실행 - 초기 인증 상태 확인')
    checkAuthStatus()

    // URL 파라미터에서 인증 결과 확인
    const urlParams = new URLSearchParams(window.location.search)
    const authResult = urlParams.get('auth')
    console.log('[AUTH_BUTTON] URL 파라미터 인증 결과:', authResult)

    if (authResult === 'success') {
      console.log('[AUTH_BUTTON] OAuth 성공 - 채널 정보 재확인 예약')
      // 인증 성공 시 채널 정보를 다시 확인
      setTimeout(() => {
        console.log('[AUTH_BUTTON] 지연된 인증 상태 재확인')
        checkAuthStatus()
      }, 1000)
      // URL 파라미터 제거
      window.history.replaceState({}, '', window.location.pathname)
    } else if (authResult === 'error' || authResult === 'cancelled') {
      console.log('[AUTH_BUTTON] OAuth 실패/취소:', authResult)
      const message = urlParams.get('message') || '인증 실패'
      setAuthStatus((prev) => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
        error: decodeURIComponent(message),
      }))
      onAuthChange?.(false)
      // URL 파라미터 제거
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [onAuthChange, checkAuthStatus])

  const handleAuth = async () => {
    try {
      setAuthStatus((prev) => ({ ...prev, isLoading: true, error: undefined }))

      // sessionId를 URL 파라미터로 안전하게 인코딩
      const encodedSessionId = encodeURIComponent(sessionId || 'default')
      const url = `/api/auth/youtube?sessionId=${encodedSessionId}`

      console.log('OAuth 인증 URL 요청:', url)
      console.log('현재 윈도우 위치:', window.location.href)
      console.log('완전한 요청 URL:', new URL(url, window.location.origin).href)

      // OAuth 인증 URL 요청
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('API 응답 상태:', response.status, response.statusText)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type')
      console.log('응답 Content-Type:', contentType)

      // 응답 내용을 먼저 텍스트로 읽어서 확인
      const responseText = await response.text()
      console.log('응답 내용 (처음 200자):', responseText.substring(0, 200))

      if (!contentType || !contentType.includes('application/json')) {
        console.error('응답이 JSON이 아님:', responseText)
        throw new Error(`서버 응답 형식 오류 - Content-Type: ${contentType}`)
      }

      // JSON 파싱 시도
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('JSON 파싱 오류:', parseError)
        console.error('응답 전체 내용:', responseText)
        throw new Error('서버 응답 JSON 파싱 실패')
      }
      console.log('OAuth 응답 데이터:', data)

      if (data.success && data.authUrl) {
        // 새 창에서 OAuth 인증 실행
        window.location.href = data.authUrl
      } else {
        throw new Error(data.error || '인증 URL 생성 실패')
      }
    } catch (error) {
      console.error('YouTube 인증 오류:', error)
      setAuthStatus((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      }))
    }
  }

  const handleLogout = () => {
    // 쿠키 삭제
    document.cookie =
      'youtube_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'

    setAuthStatus({
      isAuthenticated: false,
      isLoading: false,
    })
    onAuthChange?.(false)
  }

  if (authStatus.isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <FaSpinner className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-600">인증 상태 확인 중...</span>
      </div>
    )
  }

  if (authStatus.isAuthenticated) {
    return (
      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaCheckCircle className="w-4 h-4 text-green-600" />
            <div>
              <span className="text-sm font-medium text-green-800">
                YouTube 계정 연동됨
              </span>
              {authStatus.userInfo?.email && (
                <p className="text-xs text-green-600 mt-1">
                  {authStatus.userInfo.email}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-green-700 hover:text-green-900 underline"
          >
            연동 해제
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
      {authStatus.error && (
        <div className="flex items-center gap-2 mb-3">
          <FaExclamationTriangle className="w-4 h-4 text-orange-600" />
          <span className="text-sm text-orange-800">{authStatus.error}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-orange-800 mb-1">
            YouTube 계정 연동 필요
          </p>
          <p className="text-xs text-orange-600">
            업로드하려면 먼저 YouTube 계정을 연동해주세요.
          </p>
        </div>

        <button
          onClick={handleAuth}
          disabled={authStatus.isLoading}
          className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors duration-200 disabled:opacity-50"
        >
          <FaGoogle className="w-4 h-4" />
          계정 연동
        </button>
      </div>
    </div>
  )
}
