'use client'

import React from 'react'
import { AlertIcon, InfoIcon, XCircleIcon } from '@/components/icons'

interface YouTubeErrorHandlerProps {
  error: string
  errorType?: 'login' | 'browser' | 'network' | 'upload' | 'unknown'
  onRetry?: () => void
  onDismiss?: () => void
  showDetails?: boolean
  className?: string
}

export default function YouTubeErrorHandler({
  error,
  errorType = 'unknown',
  onRetry,
  onDismiss,
  showDetails = true,
  className = '',
}: YouTubeErrorHandlerProps) {
  const getErrorConfig = () => {
    switch (errorType) {
      case 'login':
        return {
          icon: <AlertIcon className="w-5 h-5 text-orange-500" />,
          title: 'YouTube 로그인 필요',
          color: 'orange',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800',
          solution:
            '업로드를 시작하면 자동으로 YouTube 로그인 페이지가 열립니다.',
          actionText: '로그인하고 재시도',
        }

      case 'browser':
        return {
          icon: <XCircleIcon className="w-5 h-5 text-red-500" />,
          title: 'Playwright 브라우저 설치 필요',
          color: 'red',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          solution:
            '터미널에서 "npx playwright install chromium" 명령어를 실행해주세요.',
          actionText: '설치 후 재시도',
        }

      case 'network':
        return {
          icon: <AlertIcon className="w-5 h-5 text-yellow-500" />,
          title: '네트워크 연결 오류',
          color: 'yellow',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          solution: '인터넷 연결을 확인하고 다시 시도해주세요.',
          actionText: '재시도',
        }

      case 'upload':
        return {
          icon: <XCircleIcon className="w-5 h-5 text-red-500" />,
          title: 'YouTube 업로드 실패',
          color: 'red',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          solution: '잠시 후 다시 시도하거나, 파일 크기와 형식을 확인해주세요.',
          actionText: '다시 시도',
        }

      default:
        return {
          icon: <InfoIcon className="w-5 h-5 text-gray-500" />,
          title: '알 수 없는 오류',
          color: 'gray',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          solution:
            '문제가 지속되면 브라우저를 새로고침하거나 지원팀에 문의해주세요.',
          actionText: '재시도',
        }
    }
  }

  const config = getErrorConfig()

  if (!showDetails) {
    return (
      <div
        className={`flex items-center gap-2 p-2 ${config.bgColor} ${config.borderColor} border rounded ${className}`}
      >
        {config.icon}
        <span className={`text-sm ${config.textColor}`}>{error}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`ml-auto p-1 ${config.textColor} hover:opacity-70`}
          >
            ×
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 ${className}`}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {config.icon}
          <div className="flex-1">
            <h3 className={`text-sm font-medium ${config.textColor} mb-1`}>
              {config.title}
            </h3>
            <p className={`text-sm ${config.textColor} opacity-90`}>{error}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`${config.textColor} hover:opacity-70 p-1`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 해결 방법 */}
      <div className="mt-3 pl-8">
        <p className={`text-xs ${config.textColor} opacity-80 mb-3`}>
          💡 <strong>해결 방법:</strong> {config.solution}
        </p>

        {/* 상세 안내 */}
        {errorType === 'browser' && (
          <div className={`text-xs ${config.textColor} opacity-75 mb-3`}>
            <p className="mb-1">설치 명령어:</p>
            <code className="bg-white bg-opacity-50 px-2 py-1 rounded font-mono">
              npx playwright install chromium
            </code>
          </div>
        )}

        {errorType === 'login' && (
          <div className={`text-xs ${config.textColor} opacity-75 mb-3`}>
            <p>로그인 과정:</p>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>업로드 시작 시 브라우저가 자동으로 열림</li>
              <li>Google 계정으로 YouTube 로그인</li>
              <li>로그인 완료 후 자동으로 업로드 진행</li>
            </ol>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className={`px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors ${
                config.color === 'red'
                  ? 'bg-red-600 hover:bg-red-700'
                  : config.color === 'orange'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : config.color === 'yellow'
                      ? 'bg-yellow-600 hover:bg-yellow-700'
                      : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {config.actionText}
            </button>
          )}

          {errorType === 'browser' && (
            <button
              onClick={() => {
                // 터미널 명령어 복사
                navigator.clipboard?.writeText(
                  'npx playwright install chromium'
                )
              }}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              명령어 복사
            </button>
          )}
        </div>
      </div>

      {/* 추가 도움말 */}
      {errorType === 'unknown' && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <p className={`text-xs ${config.textColor} opacity-70`}>
            문제가 계속 발생하는 경우:
          </p>
          <ul
            className={`text-xs ${config.textColor} opacity-70 mt-1 space-y-1`}
          >
            <li>• 브라우저 새로고침 (Ctrl+F5)</li>
            <li>• 개발자 도구에서 콘솔 오류 확인</li>
            <li>• YouTube Studio 직접 접속하여 로그인 상태 확인</li>
          </ul>
        </div>
      )}
    </div>
  )
}

// 편의 컴포넌트들
export const YouTubeLoginError: React.FC<
  Omit<YouTubeErrorHandlerProps, 'errorType'>
> = (props) => <YouTubeErrorHandler {...props} errorType="login" />

export const YouTubeBrowserError: React.FC<
  Omit<YouTubeErrorHandlerProps, 'errorType'>
> = (props) => <YouTubeErrorHandler {...props} errorType="browser" />

export const YouTubeNetworkError: React.FC<
  Omit<YouTubeErrorHandlerProps, 'errorType'>
> = (props) => <YouTubeErrorHandler {...props} errorType="network" />

export const YouTubeUploadError: React.FC<
  Omit<YouTubeErrorHandlerProps, 'errorType'>
> = (props) => <YouTubeErrorHandler {...props} errorType="upload" />
