'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { YouTubeUploadData, UploadProgress } from '../ExportTypes'

interface YouTubeUploadProgressProps {
  progress: number
  data: YouTubeUploadData
  currentStatus?: UploadProgress
  onCancel?: () => void
  sessionId?: string
}

export default function YouTubeUploadProgress({
  progress,
  data,
  currentStatus,
  onCancel,
}: YouTubeUploadProgressProps) {
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState<string | null>(
    null
  )
  const [uploadStartTime] = useState(Date.now())

  useEffect(() => {
    if (progress > 0 && progress < 100) {
      const elapsed = Date.now() - uploadStartTime
      const estimated = (elapsed / progress) * (100 - progress)
      const minutes = Math.floor(estimated / 60000)
      const seconds = Math.floor((estimated % 60000) / 1000)

      if (minutes > 0) {
        setEstimatedTimeLeft(`약 ${minutes}분 ${seconds}초 남음`)
      } else {
        setEstimatedTimeLeft(`약 ${seconds}초 남음`)
      }
    } else {
      setEstimatedTimeLeft(null)
    }
  }, [progress, uploadStartTime])

  const getStatusMessage = () => {
    if (!currentStatus) return '업로드 준비 중...'

    switch (currentStatus.status) {
      case 'initializing':
        return '브라우저 초기화 중...'
      case 'navigating':
        return 'YouTube Studio 접속 중...'
      case 'uploading':
        return '파일 업로드 중...'
      case 'processing':
        return '비디오 정보 입력 중...'
      case 'publishing':
        return '비디오 게시 중...'
      case 'completed':
        return '업로드 완료!'
      case 'error':
        return '업로드 중 오류 발생'
      default:
        return currentStatus.message || '처리 중...'
    }
  }

  const getStatusIcon = () => {
    if (!currentStatus) return null

    switch (currentStatus.status) {
      case 'initializing':
      case 'navigating':
        return '🌐'
      case 'uploading':
        return '📤'
      case 'processing':
        return '⚙️'
      case 'publishing':
        return '🚀'
      case 'completed':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '⏳'
    }
  }
  return (
    <div className="flex h-full">
      {/* 좌측 - 비디오 미리보기 */}
      <div className="w-2/5 p-6 flex items-center justify-center">
        <div className="relative bg-black rounded-lg overflow-hidden w-full max-w-sm">
          <Image
            src="/youtube-upload/sample-thumbnail.png"
            alt="Uploading video"
            width={320}
            height={180}
            className="w-full h-auto"
            unoptimized
          />
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            {/* 진행률 표시 */}
            <div className="text-4xl md:text-6xl font-bold text-white mb-2">
              {progress}%
            </div>

            {/* 상태 메시지 */}
            <div className="flex items-center gap-2 text-white text-base md:text-lg mb-3">
              <span>{getStatusIcon()}</span>
              <span>{getStatusMessage()}</span>
            </div>

            {/* 진행률 바 */}
            <div className="w-full max-w-xs bg-gray-700 rounded-full h-2 mb-3">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* 예상 시간 */}
            {estimatedTimeLeft && (
              <div className="text-xs md:text-sm text-white/80 mb-2">
                {estimatedTimeLeft}
              </div>
            )}

            {/* 안내 메시지 */}
            <div className="text-xs md:text-sm text-white/70 mb-2 text-center px-4">
              브라우저를 닫아도 업로드가 중단되지 않습니다
            </div>
            <div className="text-xs md:text-sm text-white/70 text-center px-4">
              동영상이 YouTube 채널에 저장됩니다
            </div>
          </div>

          {/* 취소 버튼 */}
          {onCancel && currentStatus?.status !== 'completed' && (
            <button
              onClick={onCancel}
              className="absolute top-4 left-4 bg-gray-800/70 hover:bg-gray-800/90 text-white px-3 py-1.5 rounded text-sm transition-colors"
            >
              취소
            </button>
          )}

          {/* 로딩 스피너 */}
          {currentStatus?.status !== 'completed' &&
            currentStatus?.status !== 'error' && (
              <div className="absolute bottom-4 right-4">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent text-white" />
              </div>
            )}
        </div>
      </div>

      {/* 우측 - 진행 상태 */}
      <div className="w-3/5 p-6 overflow-y-auto" style={{ maxHeight: '90vh' }}>
        <div className="space-y-6">
          <h2 className="text-xl font-medium text-black">YouTube 채널</h2>

          <div>
            <div className="flex items-center mb-2">
              <span className="text-gray-600 text-sm mr-2">🎬</span>
              <select
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                disabled
              >
                <option>테스트테스트</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-black mb-2 block">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.title}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-black"
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {data.title.length}/100
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-black mb-2 block">
              설명
            </label>
            <textarea
              value={data.description}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-black resize-none"
              rows={3}
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {data.description.length}/5000
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-black mb-3 block">
              동영상 커버
            </label>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-3">
                커버로 사용할 이미지를 선택하세요.
              </p>
              <div className="w-24 h-16 bg-gray-200 rounded border-2 border-cyan-400 overflow-hidden">
                <Image
                  src="/youtube-upload/sample-thumbnail.png"
                  alt="Video thumbnail"
                  width={96}
                  height={64}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              {/* 진행 표시 */}
              <div className="mt-4 flex items-center text-cyan-400">
                <div className="w-6 h-6 mr-2">
                  <svg
                    className="animate-spin"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray="31.416"
                      strokeDashoffset="15.708"
                    ></circle>
                  </svg>
                </div>
                <span className="text-sm">업로드 중...</span>
              </div>
            </div>
          </div>

          <button
            disabled
            className="w-full bg-gray-300 text-gray-500 font-medium py-3 rounded-lg cursor-not-allowed"
          >
            공유
          </button>
        </div>
      </div>
    </div>
  )
}
