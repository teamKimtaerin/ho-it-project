import { useState, useCallback, useRef } from 'react'
import { useEditorStore } from '../store'
import type { Sticker, Word } from '../types'

interface UseStickerResizeProps {
  sticker: Sticker
  correspondingText: any
  clipWords: Word[]
}

export function useStickerResize({
  sticker,
  correspondingText,
  clipWords,
}: UseStickerResizeProps) {
  const [isResizing, setIsResizing] = useState(false)
  const [previewEndTime, setPreviewEndTime] = useState<number | null>(null)
  const dragStartX = useRef(0)
  const originalEndTime = useRef(0)

  const { updateText } = useEditorStore()

  // 클립 워드들 중 스티커 이후의 워드들을 찾아서 최대 확장 가능 시간 계산
  const getMaxExtendableTime = useCallback(() => {
    if (!correspondingText || !clipWords.length)
      return correspondingText?.endTime || 0

    const wordsAfterSticker = clipWords.filter(
      (word) => word.start >= correspondingText.startTime
    )

    if (wordsAfterSticker.length === 0) {
      // 스티커 이후에 워드가 없으면 기본 3초 확장 허용
      return correspondingText.startTime + 10
    }

    // 가장 마지막 워드의 끝 시간까지 확장 가능
    return Math.max(...wordsAfterSticker.map((w) => w.end))
  }, [correspondingText, clipWords])

  // 픽셀을 시간으로 변환 (대략 50px = 1초)
  const pixelToTime = useCallback((deltaX: number) => {
    return deltaX / 50 // 50픽셀당 1초
  }, [])

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()

      if (!correspondingText) return

      setIsResizing(true)
      dragStartX.current = e.clientX
      originalEndTime.current = correspondingText.endTime

      // 전역 마우스 이벤트 리스너 추가
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStartX.current
        const timeExtension = pixelToTime(deltaX)
        const newEndTime = originalEndTime.current + timeExtension
        const maxTime = getMaxExtendableTime()

        // 최소 0.5초는 유지하고, 최대 확장 시간을 넘지 않도록 제한
        const clampedEndTime = Math.max(
          correspondingText.startTime + 0.5,
          Math.min(newEndTime, maxTime)
        )

        setPreviewEndTime(clampedEndTime)
      }

      const handleMouseUp = () => {
        setIsResizing(false)

        if (previewEndTime && correspondingText) {
          // 최종 시간 적용
          updateText(correspondingText.id, { endTime: previewEndTime })
          console.log(
            `🎯 Extended sticker time to: ${previewEndTime.toFixed(2)}s`
          )
        }

        setPreviewEndTime(null)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [
      correspondingText,
      pixelToTime,
      getMaxExtendableTime,
      updateText,
      previewEndTime,
    ]
  )

  const getCurrentEndTime = useCallback(() => {
    return previewEndTime ?? correspondingText?.endTime ?? 0
  }, [previewEndTime, correspondingText])

  const getDuration = useCallback(() => {
    const endTime = getCurrentEndTime()
    const startTime = correspondingText?.startTime ?? 0
    return endTime - startTime
  }, [getCurrentEndTime, correspondingText])

  return {
    isResizing,
    previewEndTime,
    handleResizeStart,
    getCurrentEndTime,
    getDuration,
    maxExtendableTime: getMaxExtendableTime(),
  }
}
