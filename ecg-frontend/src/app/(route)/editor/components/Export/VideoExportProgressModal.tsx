'use client'

import ProgressModal from '@/components/ui/ProgressModal'
import { useEffect, useState } from 'react'
import { useEditorStore } from '../../store'

interface VideoExportProgressModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

export default function VideoExportProgressModal({
  isOpen,
  onClose,
  onComplete,
}: VideoExportProgressModalProps) {
  const [progress, setProgress] = useState(0)
  const [currentThumbnail, setCurrentThumbnail] = useState<string>('')
  const { videoThumbnail, videoUrl } = useEditorStore()

  // 🧪 [임시 하드코딩] 썸네일 생성/설정
  useEffect(() => {
    if (!isOpen) {
      setCurrentThumbnail('')
      return
    }

    console.log(
      '🧪 [VideoExportProgressModal] 하드코딩된 썸네일 사용: notebook-thumbnail.png'
    )

    // 하드코딩된 썸네일 경로 설정
    setCurrentThumbnail('/notebook-thumbnail.png')
  }, [isOpen])

  // 진행률 시뮬레이션
  useEffect(() => {
    if (!isOpen) {
      setProgress(0)
      return
    }

    const duration = 40000 // 40초간 진행 (실제 시간에 맞춤)
    const intervalTime = 100 // 100ms마다 업데이트 (더 천천히)
    const increment = 100 / (duration / intervalTime)

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + increment
        if (newProgress >= 100) {
          clearInterval(interval)
          // 100% 완료 시 잠시 후 완료 콜백 호출
          setTimeout(() => {
            onComplete?.()
          }, 500)
          return 100
        }
        return newProgress
      })
    }, intervalTime)

    return () => {
      clearInterval(interval)
    }
  }, [isOpen, onComplete])

  // 40초부터 시작해서 진행률에 따라 카운트다운
  const remainingSeconds = Math.max(0, 40 - Math.floor(progress * 0.4)) // 100% 완료시 0초

  return (
    <ProgressModal
      isOpen={isOpen}
      onClose={onClose}
      type="export"
      status="processing"
      progress={progress}
      estimatedTimeRemaining={remainingSeconds}
      videoThumbnail={currentThumbnail || videoThumbnail || undefined}
      canCancel={true}
      closeOnBackdropClick={false}
      aria-label="내보내기 진행 상황"
    />
  )
}
