import React, { useMemo } from 'react'
import { useEditorStore } from '../../store'
import type { Sticker } from '../../types'

interface ClipStickerButtonProps {
  clipId: string
  stickers: Sticker[]
}

interface StickerButtonItemProps {
  sticker: Sticker
  correspondingText: {
    content: string
    startTime: number
    endTime: number
    id: string
  }
}

function StickerButtonItem({
  sticker,
  correspondingText,
}: StickerButtonItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!correspondingText) return

    console.log('🎯 Seeking to inserted text:', {
      textId: correspondingText.id,
      content: correspondingText.content,
      startTime: correspondingText.startTime,
    })

    // Seek video player to the start time of the inserted text
    const videoPlayer = (
      window as {
        videoPlayer?: {
          seekTo: (time: number) => void
          pauseAutoWordSelection?: () => void
        }
      }
    ).videoPlayer

    if (videoPlayer) {
      videoPlayer.seekTo(correspondingText.startTime)
      if (videoPlayer.pauseAutoWordSelection) {
        videoPlayer.pauseAutoWordSelection()
      }
    }
  }

  // Calculate duration for display
  const duration = correspondingText
    ? correspondingText.endTime - correspondingText.startTime
    : 0

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className="w-5 h-5 bg-purple-600 hover:bg-purple-700 text-white rounded-sm flex items-center justify-center transition-all duration-150 text-xs font-bold cursor-pointer"
        title={`Jump to inserted text: "${correspondingText?.content || sticker.text}" (Duration: ${duration.toFixed(1)}s)`}
      >
        T
      </button>
    </div>
  )
}

export default function ClipStickerButton({
  stickers,
}: ClipStickerButtonProps) {
  const { insertedTexts } = useEditorStore()

  // Find all stickers with valid corresponding insertedTexts
  const validStickers = useMemo(() => {
    if (!stickers || stickers.length === 0 || !insertedTexts) return []

    return stickers
      .map((sticker) => {
        const correspondingText = insertedTexts.find(
          (text: {
            id: string
            content: string
            startTime: number
            endTime: number
          }) => text.id === sticker.originalInsertedTextId
        )
        return correspondingText ? { sticker, correspondingText } : null
      })
      .filter(Boolean) as Array<{
      sticker: Sticker
      correspondingText: {
        content: string
        startTime: number
        endTime: number
        id: string
      }
    }>
  }, [stickers, insertedTexts])

  // Don't render if no valid stickers
  if (validStickers.length === 0) return null

  return (
    <div className="flex gap-1">
      {validStickers.map(({ sticker, correspondingText }) => (
        <StickerButtonItem
          key={sticker.id}
          sticker={sticker}
          correspondingText={correspondingText}
        />
      ))}
    </div>
  )
}
