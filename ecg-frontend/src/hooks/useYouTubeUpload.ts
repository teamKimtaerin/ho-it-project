import { useState, useCallback, useRef } from 'react'
import {
  YouTubeUploadData,
  YouTubeUploadResponse,
  UploadProgress,
} from '@/app/(route)/editor/components/Export/ExportTypes'

interface UseYouTubeUploadReturn {
  isUploading: boolean
  progress: UploadProgress | null
  error: string | null
  uploadVideo: (data: YouTubeUploadData) => Promise<YouTubeUploadResponse>
  clearError: () => void
  abortUpload: () => void
}

export const useYouTubeUpload = (): UseYouTubeUploadReturn => {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const uploadIdRef = useRef<string | null>(null)
  const serviceRef = useRef<{ abortUpload: (id: string) => boolean } | null>(
    null
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const abortUpload = useCallback(() => {
    if (uploadIdRef.current && serviceRef.current) {
      serviceRef.current.abortUpload(uploadIdRef.current)
      setIsUploading(false)
      setProgress(null)
      setError('업로드가 취소되었습니다')
    }
  }, [])

  const uploadVideo = useCallback(
    async (data: YouTubeUploadData): Promise<YouTubeUploadResponse> => {
      if (isUploading) {
        return {
          success: false,
          error: '이미 업로드가 진행 중입니다',
        }
      }

      try {
        setIsUploading(true)
        setError(null)
        setProgress({
          status: 'initializing',
          progress: 0,
          message: '업로드 준비 중...',
        })

        // 업로드 ID 생성
        uploadIdRef.current = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        serviceRef.current = { abortUpload: () => true } // 임시 객체

        // 진행 상황 콜백 (현재 사용되지 않음)
        // const progressCallback = (newProgress: UploadProgress) => {
        //   setProgress(newProgress)
        //
        //   // 에러 상태 처리
        //   if (newProgress.status === 'error') {
        //     setError(newProgress.error || newProgress.message)
        //     setIsUploading(false)
        //   }
        //
        //   // 완료 상태 처리
        //   if (newProgress.status === 'completed') {
        //     setIsUploading(false)
        //   }
        // }

        // 실제 업로드 실행
        setProgress({
          status: 'uploading',
          progress: 0,
          message: 'YouTube에 업로드 중...',
        })

        const response = await fetch('/api/upload/youtube', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        const result = await response.json()

        // 최종 결과 처리
        if (result.success) {
          setProgress({
            status: 'completed',
            progress: 100,
            message: 'YouTube 업로드 완료!',
          })
        } else {
          setError(result.error || '알 수 없는 오류가 발생했습니다')
          setProgress({
            status: 'error',
            progress: 0,
            message: result.error || '업로드 실패',
            error: result.error,
          })
        }

        setIsUploading(false)
        return result
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다'
        setError(errorMessage)
        setIsUploading(false)
        setProgress(null)

        return {
          success: false,
          error: errorMessage,
        }
      }
    },
    [isUploading]
  )

  return {
    isUploading,
    progress,
    error,
    uploadVideo,
    clearError,
    abortUpload,
  }
}
