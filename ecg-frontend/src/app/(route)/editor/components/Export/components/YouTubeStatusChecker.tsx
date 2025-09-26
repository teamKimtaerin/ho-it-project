'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { AlertIcon, InfoIcon } from '@/components/icons'

interface YouTubeStatusCheckerProps {
  onStatusChange?: (status: {
    isReady: boolean
    browserInstalled: boolean
    isLoggedIn: boolean
    message: string
  }) => void
  showDetails?: boolean
  className?: string
}

interface StatusResult {
  browserInstalled: boolean
  browserVersion?: string
  isLoggedIn: boolean
  profileExists: boolean
  message: string
  error?: string
}

export default function YouTubeStatusChecker({
  onStatusChange,
  showDetails = true,
  className = '',
}: YouTubeStatusCheckerProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [status, setStatus] = useState<StatusResult | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkStatus = useCallback(async () => {
    setIsChecking(true)

    try {
      // 정적 export 환경에서는 API 라우트를 사용할 수 없으므로
      // 클라이언트 사이드에서 기본 상태를 설정
      const newStatus: StatusResult = {
        browserInstalled: true, // 기본적으로 설치되어 있다고 가정
        browserVersion: 'Chromium (설치 여부 확인 불가)',
        isLoggedIn: false, // 업로드 시 로그인 확인
        profileExists: false,
        message: '',
        error: undefined,
      }

      // 업로드 시 YouTube 로그인이 필요함을 안내
      newStatus.message = '업로드 시작 시 YouTube 로그인이 필요합니다.'

      setStatus(newStatus)
      setLastChecked(new Date())

      // 상위 컴포넌트에 상태 전달
      if (onStatusChange) {
        onStatusChange({
          isReady: true, // 기본적으로 준비된 것으로 표시
          browserInstalled: newStatus.browserInstalled,
          isLoggedIn: newStatus.isLoggedIn,
          message: newStatus.message,
        })
      }
    } catch (error) {
      const errorStatus: StatusResult = {
        browserInstalled: false,
        isLoggedIn: false,
        profileExists: false,
        message: '브라우저 자동 감지가 지원되지 않는 환경입니다.',
        error: String(error),
      }

      setStatus(errorStatus)

      if (onStatusChange) {
        onStatusChange({
          isReady: true, // 에러가 있어도 업로드 시도는 가능
          browserInstalled: false,
          isLoggedIn: false,
          message: errorStatus.message,
        })
      }
    } finally {
      setIsChecking(false)
    }
  }, [onStatusChange])

  useEffect(() => {
    // 컴포넌트 마운트 시 자동 체크
    checkStatus()
  }, [checkStatus])

  const getStatusIcon = () => {
    if (isChecking) {
      return (
        <div className="w-4 h-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent text-gray-400" />
      )
    }

    if (!status) {
      return <InfoIcon className="w-4 h-4 text-gray-400" />
    }

    if (!status.browserInstalled || !status.isLoggedIn) {
      return <AlertIcon className="w-4 h-4 text-orange-500" />
    }

    return (
      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
        <svg
          className="w-2.5 h-2.5 text-white"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    )
  }

  const getStatusColor = () => {
    if (!status || isChecking) return 'text-gray-600'
    if (!status.browserInstalled || !status.isLoggedIn) return 'text-orange-600'
    return 'text-green-600'
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        <span className={`text-sm ${getStatusColor()}`}>
          {isChecking
            ? '상태 확인 중...'
            : status?.message || '상태 확인 중...'}
        </span>
      </div>
    )
  }

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">
          YouTube 업로드 상태
        </h3>
        <button
          onClick={checkStatus}
          disabled={isChecking}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          {isChecking ? '확인 중...' : '새로고침'}
        </button>
      </div>

      <div className="space-y-3">
        {/* 브라우저 상태 */}
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${status?.browserInstalled ? 'bg-green-500' : 'bg-orange-500'}`}
          />
          <span className="text-sm text-gray-700">
            브라우저:{' '}
            {isChecking
              ? '확인 중...'
              : status?.browserInstalled
                ? '설치됨'
                : '설치 필요'}
          </span>
          {status?.browserVersion && (
            <span className="text-xs text-gray-500">
              ({status.browserVersion})
            </span>
          )}
        </div>

        {/* 로그인 상태 */}
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${status?.isLoggedIn ? 'bg-green-500' : 'bg-orange-500'}`}
          />
          <span className="text-sm text-gray-700">
            YouTube 로그인:{' '}
            {isChecking
              ? '확인 중...'
              : status?.isLoggedIn
                ? '로그인됨'
                : '로그인 필요'}
          </span>
        </div>

        {/* 상태 메시지 */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-start gap-2">
            {getStatusIcon()}
            <p className={`text-sm ${getStatusColor()}`}>
              {isChecking ? '상태 확인 중...' : status?.message}
            </p>
          </div>
        </div>

        {/* 에러 메시지 */}
        {status?.error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            오류: {status.error}
          </div>
        )}

        {/* 마지막 확인 시간 */}
        {lastChecked && (
          <div className="text-xs text-gray-500">
            마지막 확인: {lastChecked.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* 도움말 */}
      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-800 mb-2">💡 YouTube 업로드 안내:</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 업로드 시작 시 자동으로 YouTube 로그인 페이지가 열립니다</li>
          <li>
            • 브라우저에서 YouTube 계정으로 로그인하면 업로드가 진행됩니다
          </li>
          <li>• Playwright 브라우저가 필요한 경우 자동으로 설치됩니다</li>
        </ul>
      </div>
    </div>
  )
}
