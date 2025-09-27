'use client'

import Modal from '@/components/ui/Modal'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FaVimeo, FaYoutube } from 'react-icons/fa'
import { LuLink } from 'react-icons/lu'
import {
  generateVideoThumbnail,
  generateVideoThumbnailWithMetadata,
  revokeThumbnailUrl,
  isVideoFile,
  isAudioFile,
} from '@/utils/video/videoThumbnail'

interface VideoMetadata {
  duration?: number
  size?: number
  width?: number
  height?: number
  fps?: number
}

interface NewUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onFileSelect?: (files: File[]) => void
  onStartTranscription?: (data: {
    files: File[]
    settings: TranscriptionSettings
  }) => Promise<void>
  onVideoInfoReady?: (
    file: File,
    thumbnailUrl?: string,
    metadata?: VideoMetadata
  ) => void
  acceptedTypes?: string[]
  maxFileSize?: number
  multiple?: boolean
  isLoading?: boolean
}

interface TranscriptionSettings {
  language: 'auto' | 'ko' | 'en' | 'ja' | 'zh'
}

type TabType = 'upload' | 'link'

const NewUploadModal: React.FC<NewUploadModalProps> = ({
  isOpen,
  onClose,
  onFileSelect,
  onStartTranscription,
  onVideoInfoReady,
  acceptedTypes = ['audio/*', 'video/*'],
  maxFileSize = 100 * 1024 * 1024, // 100MB
  multiple = true,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('upload')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [language, setLanguage] = useState<'auto' | 'ko' | 'en' | 'ja' | 'zh'>(
    'auto'
  )
  const [isDragOver, setIsDragOver] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('')
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        // 파일 크기 검증
        const validFiles = files.filter((file) => {
          if (maxFileSize && file.size > maxFileSize) {
            alert(
              `${file.name} 파일이 너무 큽니다. 최대 ${Math.round(maxFileSize / 1024 / 1024)}MB까지 업로드 가능합니다.`
            )
            return false
          }
          return true
        })

        if (validFiles.length > 0) {
          setSelectedFiles(validFiles)
          onFileSelect?.(validFiles)

          // 첫 번째 파일이 비디오인 경우 썸네일 생성
          const firstFile = validFiles[0]
          if (isVideoFile(firstFile)) {
            generateThumbnailForFile(firstFile)
          } else {
            // 오디오 파일이거나 비디오가 아닌 경우 썸네일 없음
            setThumbnailUrl('')
          }
        }
      }
    },
    [onFileSelect, maxFileSize]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length > 0) {
        // 파일 크기 검증
        const validFiles = files.filter((file) => {
          if (maxFileSize && file.size > maxFileSize) {
            alert(
              `${file.name} 파일이 너무 큽니다. 최대 ${Math.round(maxFileSize / 1024 / 1024)}MB까지 업로드 가능합니다.`
            )
            return false
          }
          return true
        })

        if (validFiles.length > 0) {
          setSelectedFiles(validFiles)
          onFileSelect?.(validFiles)

          // 첫 번째 파일이 비디오인 경우 썸네일 생성
          const firstFile = validFiles[0]
          if (isVideoFile(firstFile)) {
            generateThumbnailForFile(firstFile)
          } else {
            // 오디오 파일이거나 비디오가 아닌 경우 썸네일 없음
            setThumbnailUrl('')
          }
        }
      }
    },
    [onFileSelect, maxFileSize]
  )

  const handleFileSelectClick = () => {
    fileInputRef.current?.click()
  }

  // 썸네일 생성 함수
  const generateThumbnailForFile = async (file: File) => {
    try {
      console.log(
        'Starting thumbnail generation for:',
        file.name,
        file.type,
        file.size
      )
      setIsGeneratingThumbnail(true)

      // 이전 썸네일 URL 정리
      if (thumbnailUrl && thumbnailUrl.startsWith('blob:')) {
        revokeThumbnailUrl(thumbnailUrl)
      }

      if (isVideoFile(file)) {
        // 비디오 파일: 썸네일과 메타데이터를 함께 생성
        const result = await generateVideoThumbnailWithMetadata(file, {
          width: 384, // 썸네일 너비
          height: 216, // 썸네일 높이 (16:9 비율)
          quality: 0.8,
        })

        console.log('Thumbnail and metadata generated successfully:', result)
        setThumbnailUrl(result.thumbnailUrl)

        // onVideoInfoReady 콜백 호출
        console.log('🎬 NewUploadModal calling onVideoInfoReady:', {
          fileName: file.name,
          thumbnailUrl: result.thumbnailUrl ? 'generated' : 'missing',
          metadata: result.metadata,
        })
        onVideoInfoReady?.(file, result.thumbnailUrl, result.metadata)
      } else {
        // 비디오가 아닌 파일: 썸네일 없음
        setThumbnailUrl('')

        // 비디오가 아닌 파일도 정보를 전달 (오디오 파일 등)
        onVideoInfoReady?.(file, '', {
          duration: 0,
          size: file.size,
          width: 0,
          height: 0,
          fps: 0,
        })
      }
    } catch (error) {
      console.error('Failed to generate thumbnail:', error)
      // 썸네일 생성 실패 시 썸네일 없음
      setThumbnailUrl('')

      // 에러가 발생해도 파일 정보는 전달
      onVideoInfoReady?.(file, '', {
        duration: 0,
        size: file.size,
        width: 0,
        height: 0,
        fps: 0,
      })
    } finally {
      setIsGeneratingThumbnail(false)
    }
  }

  const handleStartTranscription = async () => {
    if (selectedFiles.length === 0) return

    const settings: TranscriptionSettings = {
      language,
    }

    try {
      await onStartTranscription?.({
        files: selectedFiles,
        settings,
      })
    } catch (error) {
      console.error('Transcription failed:', error)
    }
  }

  const handleGoBack = () => {
    setSelectedFiles([])
    // 썸네일 URL 정리
    if (thumbnailUrl && thumbnailUrl.startsWith('blob:')) {
      revokeThumbnailUrl(thumbnailUrl)
    }
    setThumbnailUrl('')
    onClose()
  }

  // 컴포넌트 언마운트 시 썸네일 URL 정리
  useEffect(() => {
    return () => {
      if (thumbnailUrl && thumbnailUrl.startsWith('blob:')) {
        revokeThumbnailUrl(thumbnailUrl)
      }
    }
  }, [thumbnailUrl])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-[512px] max-w-[90vw]"
      closeOnBackdropClick={!isLoading}
      closeOnEsc={!isLoading}
      aria-label="파일 업로드"
    >
      <div className="bg-white rounded-xl p-5 relative">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900 mb-3">
            1. 영상 불러오기
          </h1>

          {/* Tabs */}
          <div className="flex">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 h-12 text-base font-bold transition-colors cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-black text-white rounded-l-lg'
                  : 'bg-gray-100 text-gray-900 rounded-l-lg border border-gray-300'
              }`}
            >
              파일 업로드
            </button>
            <button
              disabled={true}
              className="flex-1 h-12 text-base font-medium bg-gray-50 text-gray-400 rounded-r-lg border border-gray-200 cursor-not-allowed"
            >
              링크 가져오기
            </button>
          </div>
        </div>

        {/* Upload Tab Content */}
        {activeTab === 'upload' && (
          <div className="mb-4">
            <div className="relative">
              <div
                className={`border-2 border-dashed rounded-lg transition-colors ${
                  isDragOver
                    ? 'border-brand-sub bg-purple-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {selectedFiles.length === 0 ? (
                  // 파일 미선택 상태: 기존 UI
                  <div className="p-8 text-center">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        파일 올려놓기
                      </h3>
                      <p className="text-sm text-gray-500">
                        PC에서 드래그하거나 클릭하여 찾아보세요.
                      </p>
                    </div>

                    <button
                      onClick={handleFileSelectClick}
                      className="bg-black text-white px-6 py-2 rounded font-bold hover:bg-gray-800 hover:scale-105 transition-all duration-200 cursor-pointer"
                      disabled={isLoading}
                    >
                      파일 선택
                    </button>

                    <p className="text-sm text-gray-500 mt-4">비디오·오디오</p>
                  </div>
                ) : (
                  // 파일 선택 상태: 썸네일 UI
                  <div className="p-4">
                    <div className="w-full bg-gray-100 rounded-lg overflow-hidden relative">
                      {isGeneratingThumbnail ? (
                        // 썸네일 생성 중 로딩 상태
                        <div className="w-full h-48 flex items-center justify-center bg-gray-200">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">
                              썸네일 생성 중...
                            </p>
                          </div>
                        </div>
                      ) : thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt="선택된 비디오 파일 썸네일"
                          className="w-full h-48 object-cover"
                          onError={() => {
                            // 이미지 로드 실패 시 썸네일 제거
                            setThumbnailUrl('')
                          }}
                        />
                      ) : (
                        // 썸네일이 없는 경우 파일 아이콘 표시
                        <div className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center">
                          <div className="text-6xl mb-2">
                            {isVideoFile(selectedFiles[0]) ? '🎬' : '🎵'}
                          </div>
                          <p className="text-sm text-gray-600">
                            {isVideoFile(selectedFiles[0])
                              ? '비디오 파일'
                              : '오디오 파일'}
                          </p>
                        </div>
                      )}

                      {/* 썸네일 우상단 파일 변경 버튼 */}
                      <button
                        onClick={handleFileSelectClick}
                        className="absolute top-2 right-2 bg-brand-sub bg-opacity-90 text-white px-3 py-1 rounded text-xs font-medium hover:bg-brand-dark transition-all cursor-pointer"
                        disabled={isLoading}
                      >
                        파일 변경
                      </button>

                      {/* 파일 타입 표시 */}
                      <div className="absolute bottom-2 left-2">
                        <span className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
                          {isVideoFile(selectedFiles[0]) ? '비디오' : '오디오'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <p className="text-sm font-medium text-gray-900">
                        {selectedFiles[0].name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFiles[0].size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptedTypes.join(',')}
                  onChange={handleFileInputChange}
                  multiple={multiple}
                  className="hidden"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        )}

        {/* Link Tab Content */}
        {activeTab === 'link' && (
          <div className="mb-4">
            {/* Import from URL Section */}
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <LuLink className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Import from URL
              </h3>
              <p className="text-gray-600 text-sm">
                Paste a video URL from supported platforms
              </p>
            </div>

            {/* Video URL Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Video URL
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Supported Platforms */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Supported Platforms
              </h4>
              <div className="space-y-3">
                {/* YouTube */}
                <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-10 h-10 bg-red-500 rounded flex items-center justify-center mr-3">
                    <FaYoutube className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">YouTube</p>
                    <p className="text-xs text-gray-500">
                      https://youtube.com/watch?v=...
                    </p>
                  </div>
                </div>

                {/* Vimeo */}
                <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-10 h-10 bg-brand-main rounded flex items-center justify-center mr-3">
                    <FaVimeo className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Vimeo</p>
                    <p className="text-xs text-gray-500">
                      https://vimeo.com/...
                    </p>
                  </div>
                </div>

                {/* Direct URL */}
                <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-10 h-10 bg-gray-600 rounded flex items-center justify-center mr-3">
                    <LuLink className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Direct URL
                    </p>
                    <p className="text-xs text-gray-500">
                      https://example.com/video.mp4
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcription Settings */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. 환경 설정</h2>

          <div className="mb-3">
            {/* <h3 className="text-base font-bold text-gray-900 mb-4">
              환경 설정
            </h3> */}

            <div>
              <label className="text-base block text-sm font-medium text-gray-900 mb-2">
                언어 선택:
              </label>
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) =>
                    setLanguage(
                      e.target.value as 'auto' | 'ko' | 'en' | 'ja' | 'zh'
                    )
                  }
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-sub focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="auto">Auto Detect</option>
                  <option value="ko">한국어 (Korean)</option>
                  <option value="en">English</option>
                  <option value="ja">日本語 (Japanese)</option>
                  <option value="zh">中文 (Chinese)</option>
                </select>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                영상 콘텐츠의 기본 언어를 선택해 주세요.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleGoBack}
            className="btn-modern-secondary"
            disabled={isLoading}
          >
            취소
          </button>
          <button
            onClick={handleStartTranscription}
            disabled={
              (activeTab === 'upload' && selectedFiles.length === 0) ||
              (activeTab === 'link' && !videoUrl.trim()) ||
              isLoading
            }
            className={`btn-modern-black ${
              (activeTab === 'upload' && selectedFiles.length === 0) ||
              (activeTab === 'link' && !videoUrl.trim()) ||
              isLoading
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {isLoading ? '처리 중...' : '시작하기'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default NewUploadModal
