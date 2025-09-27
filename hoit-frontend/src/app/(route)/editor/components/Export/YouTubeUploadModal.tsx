'use client'

import React, { useEffect, useState } from 'react'
import {
  YouTubePrivacy,
  YouTubeUploadData,
  YouTubeUploadModalProps,
  YouTubeUploadSettings,
  YouTubeUploadStatus,
  UploadProgress,
} from './ExportTypes'
import Portal from './Portal'
import YouTubeExportSettings from './components/YouTubeExportSettings'
import YouTubeVideoPreview from './components/YouTubeVideoPreview'
import YouTubeUploadForm from './components/YouTubeUploadForm'
import YouTubeUploadProgress from './components/YouTubeUploadProgress'
import YouTubeUploadComplete from './components/YouTubeUploadComplete'

export default function YouTubeUploadModal({
  isOpen,
  onClose,
  onUpload,
  defaultTitle = '202509142147',
}: YouTubeUploadModalProps) {
  const [status, setStatus] = useState<YouTubeUploadStatus>('settings')
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<
    UploadProgress | undefined
  >()
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [uploadReady, setUploadReady] = useState(false)

  // 2단계 설정 데이터
  const [settings, setSettings] = useState<YouTubeUploadSettings>({
    title: defaultTitle,
    resolution: '720p',
    quality: '추천 품질',
    frameRate: '30fps',
    format: 'MP4',
  })

  // 3단계 YouTube 데이터
  const [data, setData] = useState<YouTubeUploadData>({
    title: defaultTitle,
    description:
      'Hoit으로 생성됨:\nhttps://www.capcut.com/s/CTtk_OftECn683Mb\n/ #CapCut',
    privacy: 'private',
    channel: '테스트테스트',
  })

  // 모달이 열릴 때 기본값으로 리셋
  useEffect(() => {
    if (isOpen) {
      setStatus('settings')
      setProgress(0)
      setIsPlaying(false)
      setSettings({
        title: defaultTitle,
        resolution: '720p',
        quality: '추천 품질',
        frameRate: '30fps',
        format: 'MP4',
      })
      setData({
        title: defaultTitle,
        description:
          'CapCut으로 생성됨:\nhttps://www.capcut.com/s/CTtk_OftECn683Mb\n/ #CapCut',
        privacy: 'private',
        channel: '테스트테스트',
      })
    }
  }, [isOpen, defaultTitle])

  // ESC 키로 모달 닫기 (업로드 중이 아닐 때만)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && status !== 'uploading') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, status])

  // 업로드 상태 모니터링
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null

    if (status === 'uploading' && sessionId) {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/youtube/upload/status?sessionId=${sessionId}`
          )
          if (response.ok) {
            const statusData = await response.json()
            setCurrentStatus(statusData.progress)
            setProgress(statusData.progress?.progress || 0)

            if (statusData.progress?.status === 'completed') {
              setStatus('completed')
              if (pollInterval) {
                clearInterval(pollInterval)
                pollInterval = null
              }
            } else if (statusData.progress?.status === 'error') {
              setStatus('details') // 에러 시 다시 설정 화면으로
              if (pollInterval) {
                clearInterval(pollInterval)
                pollInterval = null
              }
            }
          }
        } catch (error) {
          console.error('상태 폴링 에러:', error)
        }
      }, 1000) // 1초마다 상태 확인
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [status, sessionId])

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && status !== 'uploading') {
      onClose()
    }
  }

  // 2단계 → 3단계
  const handleSettingsNext = () => {
    setData((prev) => ({ ...prev, title: settings.title }))
    setStatus('details')
  }

  // 3단계 → 4단계 (업로드 시작)
  const handleUpload = async () => {
    // 중복 업로드 방지
    if (status === 'uploading') {
      console.warn('이미 업로드가 진행 중입니다.')
      return
    }

    // 업로드 준비 상태 확인
    if (!uploadReady) {
      console.warn('업로드 준비가 완료되지 않았습니다.')
      return
    }

    setStatus('uploading')
    setProgress(0)
    setCurrentStatus(undefined)

    // 세션 ID 생성
    const newSessionId = `youtube_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setSessionId(newSessionId)

    try {
      // API 엔드포인트로 업로드 요청
      const response = await fetch('/api/youtube/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: newSessionId,
          title: data.title,
          description: data.description,
          privacy: data.privacy,
          videoPath: 'public/friends.mp4', // friends.mp4 파일 (public 폴더 내)
        }),
      })

      if (!response.ok) {
        const errorResult = await response
          .json()
          .catch(() => ({ error: '알 수 없는 오류' }))

        if (response.status === 501) {
          // Static export 환경 또는 프로덕션 환경
          setStatus('details')
          setCurrentStatus({
            status: 'error',
            progress: 0,
            message: 'YouTube 업로드는 개발 환경에서만 지원됩니다.',
            error: errorResult.error || 'API를 사용할 수 없는 환경입니다.',
          })
          return
        }

        throw new Error(
          `업로드 요청 실패: ${response.status} - ${errorResult.error || '알 수 없는 오류'}`
        )
      }

      const result = await response.json()

      if (!result.success) {
        setStatus('details')
        setCurrentStatus({
          status: 'error',
          progress: 0,
          message: '업로드 시작에 실패했습니다.',
          error: result.error || '알 수 없는 오류',
        })
        console.error('YouTube 업로드 시작 실패:', result.error)
        return
      }

      console.log('YouTube 업로드 시작됨:', result.sessionId)
    } catch (error) {
      setStatus('details') // 에러 시 다시 설정 화면으로
      setCurrentStatus({
        status: 'error',
        progress: 0,
        message: '업로드 시작 중 오류가 발생했습니다.',
        error: String(error),
      })
      console.error('YouTube 업로드 중 오류:', error)
    }

    // 기존 onUpload 콜백도 호출 (호환성 유지)
    onUpload(data)
  }

  // 업로드 취소
  const handleCancelUpload = async () => {
    if (sessionId) {
      try {
        await fetch('/api/youtube/cancel-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        })
      } catch (error) {
        console.error('업로드 취소 중 오류:', error)
      }
    }

    setStatus('details')
    setProgress(0)
    setCurrentStatus(undefined)
    setSessionId(undefined)
  }

  // 설정 변경
  const handleSettingsChange = (
    field: keyof YouTubeUploadSettings,
    value: string
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  // 데이터 변경
  const handleDataChange = (field: keyof YouTubeUploadData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePrivacyChange = (privacy: YouTubePrivacy) => {
    setData((prev) => ({ ...prev, privacy }))
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  if (!isOpen) return null

  // 모달 크기 및 위치 계산
  const getModalSize = () => {
    switch (status) {
      case 'settings':
        return 'top-16 right-4 w-[400px] max-h-[80vh]'
      case 'details':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] max-h-[90vh]'
      case 'uploading':
      case 'completed':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] max-h-[70vh]'
      default:
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] max-h-[90vh]'
    }
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/20"
        style={{ zIndex: 9999999 }}
        onClick={handleBackdropClick}
      >
        <div
          className={`absolute bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden ${getModalSize()}`}
          style={{ zIndex: 9999999 }}
        >
          {/* 1단계: 내보내기 설정 */}
          {status === 'settings' && (
            <YouTubeExportSettings
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onNext={handleSettingsNext}
              onClose={onClose}
            />
          )}

          {/* 2단계: YouTube에 공유 */}
          {status === 'details' && (
            <div className="flex flex-col h-full">
              {/* 헤더 */}
              <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-lg font-medium text-black">
                  YouTube에 공유
                </h2>
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              {/* 콘텐츠 영역 */}
              <div className="flex flex-1 min-h-0">
                {/* 좌측 - 비디오 미리보기 */}
                <div className="w-2/5 p-4 flex items-center justify-center">
                  <YouTubeVideoPreview
                    isPlaying={isPlaying}
                    onTogglePlay={togglePlay}
                  />
                </div>

                {/* 우측 - 설정 폼 */}
                <div className="w-3/5 flex flex-col min-h-0">
                  <YouTubeUploadForm
                    data={data}
                    onDataChange={handleDataChange}
                    onPrivacyChange={handlePrivacyChange}
                    onReadyStateChange={setUploadReady}
                  />
                </div>
              </div>

              {/* 하단 버튼 */}
              <div className="px-4 py-3 border-t border-gray-200 flex justify-end flex-shrink-0">
                <button
                  onClick={handleUpload}
                  disabled={!uploadReady}
                  className={`px-6 py-2 rounded-lg transition-colors duration-200 font-medium ${
                    uploadReady
                      ? 'bg-cyan-400 hover:bg-cyan-500 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  내보내기
                </button>
              </div>
            </div>
          )}

          {/* 3단계: 업로드 중 */}
          {status === 'uploading' && (
            <YouTubeUploadProgress
              progress={progress}
              data={data}
              currentStatus={currentStatus}
              onCancel={handleCancelUpload}
              sessionId={sessionId}
            />
          )}

          {/* 4단계: 업로드 완료 */}
          {status === 'completed' && (
            <YouTubeUploadComplete data={data} onClose={onClose} />
          )}
        </div>
      </div>
    </Portal>
  )
}
