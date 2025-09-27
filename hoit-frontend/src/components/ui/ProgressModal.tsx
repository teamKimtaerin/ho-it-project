'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FaTimes, FaSpinner } from 'react-icons/fa'

export interface ProgressModalProps {
  isOpen: boolean
  onClose: () => void
  onCancel?: () => void
  type: 'upload' | 'export'
  status: 'uploading' | 'processing' | 'completed' | 'failed' | 'select'
  progress: number
  currentStage?: string
  estimatedTimeRemaining?: number
  fileName?: string
  videoThumbnail?: string // 비디오 썸네일 URL
  canCancel?: boolean
  closeOnBackdropClick?: boolean
  'aria-label'?: string
}

const STAGE_MESSAGES = {
  file_validation: '파일 검증 중',
  audio_extraction: '오디오 추출 중',
  whisper_transcription: '음성 인식 중',
  speaker_diarization: '화자 분리 중',
  post_processing: '후처리 중',
} as const

export default function ProgressModal({
  isOpen,
  onClose,
  onCancel,
  type,
  status,
  progress,
  currentStage,
  estimatedTimeRemaining,
  fileName,
  videoThumbnail,
  canCancel = true,
  closeOnBackdropClick = false,
  'aria-label': ariaLabel,
}: ProgressModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // ESC 키 처리
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && canCancel) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // body 스크롤 방지
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, canCancel])

  // 포커스 트랩
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const modal = modalRef.current
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement?.focus()
              e.preventDefault()
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement?.focus()
              e.preventDefault()
            }
          }
        }
      }

      modal.addEventListener('keydown', handleTabKey)
      firstElement?.focus()

      return () => {
        modal.removeEventListener('keydown', handleTabKey)
      }
    }
  }, [isOpen])

  // 백드롭 클릭 처리
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose()
    }
  }

  const getStatusText = () => {
    if (type === 'upload') {
      switch (status) {
        case 'uploading':
          return '파일을 업로드하고 있습니다'
        case 'processing':
          return '음성을 분석하고 있습니다'
        case 'completed':
          return '분석이 완료되었습니다'
        case 'failed':
          return '처리 중 오류가 발생했습니다'
        default:
          return '처리를 준비하고 있습니다'
      }
    } else {
      switch (status) {
        case 'processing':
          return '영상을 출력하고 있습니다'
        case 'completed':
          return '내보내기가 완료되었습니다'
        case 'failed':
          return '내보내기 중 오류가 발생했습니다'
        default:
          return '내보내기를 준비하고 있습니다'
      }
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return ''
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`
  }

  const shouldShowCloseButton = status === 'completed' || status === 'failed'

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={
        ariaLabel || `${type === 'upload' ? '업로드' : '내보내기'} 진행 상황`
      }
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-md w-full max-w-lg max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={
            shouldShowCloseButton
              ? onClose
              : canCancel
                ? onCancel || onClose
                : undefined
          }
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="모달 닫기"
          disabled={!shouldShowCloseButton && !canCancel}
        >
          <FaTimes className="w-5 h-5" />
        </button>

        {/* 콘텐츠 */}
        <div className="p-6">
          {/* 제목 */}
          <h2 className="text-xl font-semibold text-center text-gray-900 mb-6">
            {getStatusText()}
          </h2>

          {/* 파일명과 스피너 */}
          {fileName && (
            <div className="flex items-center gap-3 mb-6">
              {(status === 'uploading' || status === 'processing') && (
                <FaSpinner className="animate-spin text-brand-main" size={16} />
              )}
              <span className="text-gray-700 font-medium">{fileName}</span>
            </div>
          )}

          {/* 썸네일 이미지 */}
          <div className="mb-6">
            <div className="w-full bg-gray-100 rounded-lg overflow-hidden relative flex items-center justify-center h-48">
              {videoThumbnail ? (
                <div className="relative w-full h-full">
                  <img
                    src={videoThumbnail}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                  {/* 오버레이 텍스트 */}
                  <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white text-sm px-3 py-2 rounded">
                    {type === 'upload'
                      ? '업로드를 처리하는 중입니다...'
                      : '비디오를 내보내는 중입니다...'}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-6xl mb-2">🎬</div>
                  <p className="text-sm text-gray-600">
                    {type === 'upload' ? '업로드 처리 중' : '변환 처리 중'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 진행률과 시간 정보 */}
          <div className="flex items-center justify-between mb-3 text-base">
            <span className="text-brand-main font-semibold">
              {Math.round(progress)}%
            </span>
            {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
              <span className="text-gray-500">
                남은 시간: {formatTime(estimatedTimeRemaining)}
              </span>
            )}
            {canCancel && !shouldShowCloseButton && (
              <button
                onClick={onCancel || onClose}
                className="text-gray-600 hover:text-gray-800 transition-colors font-medium"
              >
                취소
              </button>
            )}
          </div>

          {/* 진행률 바 */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div
              className="bg-brand-main h-2 rounded-full transition-all duration-200 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>

          {/* 완료/실패 상태의 액션 버튼 */}
          {status === 'completed' && (
            <div className="flex justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-brand-main hover:bg-brand-dark text-white rounded-lg transition-colors"
              >
                {type === 'upload' ? '에디터로 이동' : '확인'}
              </button>
            </div>
          )}

          {status === 'failed' && (
            <div className="flex justify-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
