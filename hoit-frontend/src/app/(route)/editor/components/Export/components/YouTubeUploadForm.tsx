'use client'

import React, { useState, useCallback } from 'react'
import Image from 'next/image'
import { FaChevronDown } from 'react-icons/fa'
import { YouTubePrivacy, YouTubeUploadData } from '../ExportTypes'
import YouTubeStatusChecker from './YouTubeStatusChecker'
import YouTubeErrorHandler from './YouTubeErrorHandler'
import YouTubeAuthButton from './YouTubeAuthButton'

interface YouTubeUploadFormProps {
  data: YouTubeUploadData
  onDataChange: (field: keyof YouTubeUploadData, value: string) => void
  onPrivacyChange: (privacy: YouTubePrivacy) => void
  onReadyStateChange?: (isReady: boolean) => void
}

export default function YouTubeUploadForm({
  data,
  onDataChange,
  onPrivacyChange,
  onReadyStateChange,
}: YouTubeUploadFormProps) {
  // const uploadReady = false // 사용되지 않음
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [channelInfo, setChannelInfo] = useState<{
    id: string
    title: string
    thumbnailUrl?: string
  } | null>(null)
  const [statusError, setStatusError] = useState<{
    error: string
    type: 'login' | 'browser' | 'network' | 'unknown'
  } | null>(null)

  const handleAuthChange = (
    authenticated: boolean,
    userInfo?: {
      email?: string
      name?: string
      channelId?: string
      channelInfo?: {
        id: string
        title: string
        thumbnailUrl?: string
      }
    }
  ) => {
    setIsAuthenticated(authenticated)

    // 채널 정보 업데이트
    if (authenticated && userInfo?.channelInfo) {
      setChannelInfo(userInfo.channelInfo)
      // 실제 채널 이름으로 데이터 업데이트
      onDataChange('channel', userInfo.channelInfo.title)
    } else {
      setChannelInfo(null)
    }

    // 내보내기 준비 상태 업데이트
    updateReadyState(authenticated)

    if (authenticated) {
      setStatusError(null)
    }
  }

  // 내보내기 준비 상태 확인 함수
  const updateReadyState = useCallback(
    (authState: boolean = isAuthenticated) => {
      // 인증된 상태이고 제목이 있으면 준비 완료
      const ready = authState && data.title.trim().length > 0
      onReadyStateChange?.(ready)
    },
    [isAuthenticated, data.title, onReadyStateChange]
  )

  const handleStatusChange = (status: {
    isReady: boolean
    browserInstalled: boolean
    isLoggedIn: boolean
    message: string
  }) => {
    // setUploadReady(status.isReady) // 사용되지 않음

    // 에러 상태 설정 (인증되지 않은 경우 제외)
    if (!status.isReady && isAuthenticated) {
      if (!status.browserInstalled) {
        setStatusError({
          error: status.message,
          type: 'browser',
        })
      } else if (!status.isLoggedIn) {
        setStatusError({
          error: status.message,
          type: 'login',
        })
      } else {
        setStatusError({
          error: status.message,
          type: 'unknown',
        })
      }
    } else {
      setStatusError(null)
    }
  }

  // 제목이 변경될 때마다 준비 상태 업데이트
  React.useEffect(() => {
    updateReadyState()
  }, [data.title, isAuthenticated, updateReadyState])

  const handleRetryStatus = async () => {
    // 상태 재확인 트리거 (YouTubeStatusChecker에서 처리)
    setStatusError(null)
  }
  return (
    <div
      className="p-4 overflow-y-auto flex-1 min-h-0"
      style={{ maxHeight: 'calc(90vh - 120px)' }}
    >
      {/* YouTube 계정 인증 */}
      <div className="mb-4">
        <YouTubeAuthButton
          onAuthChange={handleAuthChange}
          sessionId={data.title} // 세션 추적용
        />
      </div>

      {/* YouTube 업로드 상태 확인 (인증된 경우에만 표시) */}
      {isAuthenticated && (
        <div className="mb-4">
          <YouTubeStatusChecker
            onStatusChange={handleStatusChange}
            showDetails={false}
            className="mb-2"
          />

          {/* 에러 표시 */}
          {statusError && (
            <YouTubeErrorHandler
              error={statusError.error}
              errorType={statusError.type}
              onRetry={handleRetryStatus}
              onDismiss={() => setStatusError(null)}
              showDetails={false}
              className="mb-3"
            />
          )}
        </div>
      )}

      {/* YouTube 채널 */}
      <div className="mb-3">
        <label className="text-xs font-medium text-black mb-1 block">
          YouTube 채널
        </label>
        <div className="relative">
          {isAuthenticated && channelInfo ? (
            <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 text-black flex items-center gap-2">
              <span>🎬</span>
              <span>{channelInfo.title}</span>
            </div>
          ) : (
            <select
              value={data.channel}
              onChange={(e) => onDataChange('channel', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white appearance-none cursor-pointer"
              disabled={!isAuthenticated}
            >
              <option value="">계정 연동 후 선택 가능</option>
            </select>
          )}
          {!isAuthenticated && (
            <FaChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
          )}
        </div>
      </div>

      {/* 제목 */}
      <div className="mb-3">
        <label className="text-xs font-medium text-black mb-1 block">
          제목 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onDataChange('title', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-gray-50"
          placeholder="동영상 제목을 입력하세요"
        />
        <div className="text-right text-xs text-gray-500 mt-1">
          {data.title.length}/100
        </div>
      </div>

      {/* 설명 */}
      <div className="mb-3">
        <label className="text-xs font-medium text-black mb-1 block">
          설명
        </label>
        <textarea
          value={data.description}
          onChange={(e) => onDataChange('description', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-gray-50 resize-none"
          rows={3}
          placeholder="동영상에 대한 설명을 입력하세요"
        />
        <div className="text-right text-xs text-gray-500 mt-1">
          {data.description.length}/5000
        </div>
      </div>

      {/* 동영상 커버 */}
      <div className="mb-3">
        <label className="text-xs font-medium text-black mb-2 block">
          동영상 커버
        </label>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-2">
            커버로 사용할 이미지를 선택하세요.
          </p>
          <div className="flex gap-2">
            <div className="w-20 h-12 bg-gray-200 rounded border-2 border-blue-500 overflow-hidden">
              <Image
                src="/youtube-upload/sample-thumbnail.png"
                alt="Selected thumbnail"
                width={80}
                height={48}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            <button className="w-20 h-12 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
              <span>✏️</span>
            </button>
          </div>
        </div>
      </div>

      {/* 공개 여부 */}
      <div className="mb-6">
        <label className="text-xs font-medium text-black mb-3 block">
          공개 여부
        </label>
        <div className="space-y-4">
          {[
            {
              value: 'private' as YouTubePrivacy,
              label: '비공개',
              desc: '내 계정만 동영상을 볼 수 있습니다',
            },
            {
              value: 'unlisted' as YouTubePrivacy,
              label: '일부 공개',
              desc: '링크를 아는 사람만 동영상을 볼 수 있습니다',
            },
            {
              value: 'public' as YouTubePrivacy,
              label: '공개',
              desc: '모든 사용자가 동영상을 검색하고 볼 수 있습니다',
            },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-start space-x-3 cursor-pointer py-1"
            >
              <input
                type="radio"
                name="privacy"
                value={option.value}
                checked={data.privacy === option.value}
                onChange={() => onPrivacyChange(option.value)}
                className="mt-1 w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
              />
              <div className="flex-1">
                <div className="text-xs font-medium text-black mb-1">
                  {option.label}
                </div>
                <div className="text-xs text-gray-500 leading-relaxed">
                  {option.desc}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
