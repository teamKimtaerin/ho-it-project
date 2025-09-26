import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Sticker, Word } from '../../types'
import { useEditorStore } from '../../store'
import { useStickerResize } from '../../hooks/useStickerResize'
import TooltipPortal from './TooltipPortal'
import { debounce } from 'lodash'

interface ClipStickerProps {
  sticker: Sticker
  clipId: string
  clipWords: Word[]
  onStickerClick: (stickerId: string) => void
  onStickerDelete?: (stickerId: string) => void
}

export default function ClipSticker({
  sticker,
  clipId,
  clipWords,
  onStickerClick,
  onStickerDelete,
}: ClipStickerProps) {
  const stickerRef = useRef<HTMLDivElement>(null)
  const [lastClickTime, setLastClickTime] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number
    y: number
  } | null>(null)

  const {
    multiSelectedWordIds,
    canDragSticker,
    playingWordId,
    playingClipId,
    setStickerFocus,
    selectedStickerId,
    focusedStickerId,
    // Get textInsertion methods to select corresponding InsertedText
    insertedTexts,
    selectText,
  } = useEditorStore()

  // Find corresponding inserted text for this sticker
  const correspondingText = insertedTexts?.find(
    (text: { id: string }) => text.id === sticker.originalInsertedTextId
  )

  // Setup resize functionality
  const { isResizing, previewEndTime, handleResizeStart, getDuration } =
    useStickerResize({
      sticker,
      correspondingText,
      clipWords,
    })

  const isFocused = focusedStickerId === sticker.id
  const isSelected = selectedStickerId === sticker.id
  const isMultiSelected = multiSelectedWordIds.has(sticker.id) // Keep for compatibility
  const isDraggable = canDragSticker(sticker.id)
  const isPlaying = playingWordId === sticker.id
  const isInPlayingClip = playingClipId === clipId
  const isOtherClipPlaying = playingClipId !== null && playingClipId !== clipId

  // Setup drag and drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isBeingDragged,
  } = useSortable({
    id: `${clipId}-${sticker.id}`,
    data: {
      type: 'sticker',
      sticker,
      clipId,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Handle click events
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()

      console.log('👆 Sticker click:', {
        stickerId: sticker.id,
        target: (e.target as HTMLElement).tagName,
        virtualTime: sticker.start,
      })

      const currentTime = Date.now()
      const timeDiff = currentTime - lastClickTime
      const isDoubleClick = timeDiff < 300

      if (isDoubleClick) {
        // Double click - no special action for stickers (they're just visual indicators)
        return
      }

      // Single click - focus sticker, activate sidebar, and seek to sticker time
      setStickerFocus(clipId, sticker.id)

      // Find and select corresponding InsertedText
      if (insertedTexts && selectText) {
        const matchingInsertedText = insertedTexts.find(
          (text: {
            content: string
            startTime: number
            endTime: number
            id: string
          }) =>
            text.content === sticker.text &&
            Math.abs(text.startTime - sticker.start) < 0.1 && // Allow small time difference
            Math.abs(text.endTime - sticker.end) < 0.1
        )

        if (matchingInsertedText) {
          selectText(matchingInsertedText.id)
          console.log(
            '🎯 Selected corresponding InsertedText:',
            matchingInsertedText.id,
            matchingInsertedText.content
          )
        }
      }

      // Use VirtualPlayerController as single source of truth
      const virtualPlayerController = (
        window as {
          virtualPlayerController?: {
            seek: (
              virtualTime: number
            ) => Promise<{ realTime: number; virtualTime: number }>
            pause?: () => void
            isPlaying?: boolean
          }
        }
      ).virtualPlayerController

      if (virtualPlayerController) {
        console.log(
          '🎯 [SYNC] Seeking via VirtualPlayerController to virtual time:',
          sticker.start
        )

        // Seek is now always async with proper queue handling
        virtualPlayerController
          .seek(sticker.start)
          .then(({ realTime, virtualTime }) => {
            console.log(
              '✅ [SYNC] Seek completed - virtual:',
              virtualTime.toFixed(3),
              's, real:',
              realTime.toFixed(3),
              's'
            )

            // Always pause after seek to sticker position
            if (virtualPlayerController.pause) {
              virtualPlayerController.pause()
              console.log('⏸️ [SYNC] Paused after seek')
            }

            // Also ensure video element is paused
            const video = document.querySelector('video') as HTMLVideoElement
            if (video && !video.paused) {
              video.pause()
            }
          })
          .catch((error: unknown) => {
            console.error(
              '❌ [SYNC] VirtualPlayerController seek failed:',
              error
            )

            // Fallback: try direct video control
            const video = document.querySelector('video') as HTMLVideoElement
            if (video) {
              video.currentTime = sticker.start
              video.pause()
              console.log('⚠️ [SYNC] Used fallback video control')
            }
          })
      } else {
        // Fallback: Use regular video player if VirtualPlayerController not available
        console.warn(
          '⚠️ [SYNC] VirtualPlayerController not available, falling back to videoPlayer'
        )
        const videoPlayer = (
          window as {
            videoPlayer?: {
              seekTo: (time: number) => void
              pause: () => void
              pauseAutoWordSelection?: () => void
            }
          }
        ).videoPlayer

        if (videoPlayer) {
          try {
            videoPlayer.seekTo(sticker.start)
            videoPlayer.pause()
            if (videoPlayer.pauseAutoWordSelection) {
              videoPlayer.pauseAutoWordSelection()
            }
            console.log(
              '⏸️ [SYNC] Video paused and seeked to sticker time:',
              sticker.start
            )
          } catch (error) {
            console.error('❌ [SYNC] Video player seek/pause failed:', error)
          }
        }
      }

      onStickerClick(sticker.id)
      setLastClickTime(currentTime)
    },
    [
      sticker.id,
      sticker.start,
      sticker.end,
      sticker.text,
      clipId,
      onStickerClick,
      lastClickTime,
      setStickerFocus,
      insertedTexts,
      selectText,
    ]
  )

  // Debounce the click handler to prevent rapid repeated seeks
  const debouncedHandleClick = useMemo(
    () => debounce(handleClick, 100, { leading: true, trailing: false }),
    [handleClick]
  )

  // Handle keyboard shortcuts for deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if this sticker is selected and focused
      if (isFocused && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()
        e.stopPropagation()

        if (onStickerDelete) {
          onStickerDelete(sticker.id)
        }
      }
    }

    if (isFocused) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFocused, onStickerDelete, sticker.id])

  // Calculate tooltip position when resizing starts with dynamic adjustment
  useEffect(() => {
    if (isResizing && stickerRef.current) {
      const rect = stickerRef.current.getBoundingClientRect()
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft
      const scrollY = window.pageYOffset || document.documentElement.scrollTop

      // Tooltip dimensions (approximate)
      const tooltipWidth = 140
      const tooltipHeight = 60

      // Calculate initial position (above and centered)
      let x = rect.left + scrollX + rect.width / 2
      let y = rect.top + scrollY - 10

      // Adjust for screen boundaries
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX,
        scrollY,
      }

      // Check horizontal boundaries
      if (x - tooltipWidth / 2 < viewport.scrollX + 10) {
        // Too far left, align to left edge with padding
        x = viewport.scrollX + tooltipWidth / 2 + 10
      } else if (
        x + tooltipWidth / 2 >
        viewport.scrollX + viewport.width - 10
      ) {
        // Too far right, align to right edge with padding
        x = viewport.scrollX + viewport.width - tooltipWidth / 2 - 10
      }

      // Check vertical boundaries
      if (y - tooltipHeight < viewport.scrollY + 10) {
        // Too close to top, show below the sticker instead
        y = rect.bottom + scrollY + 10
      }

      setTooltipPosition({ x, y })
    } else {
      setTooltipPosition(null)
    }
  }, [isResizing])

  // Determine visual state classes
  const getStickerClasses = () => {
    const classes = [
      'relative',
      'inline-block',
      'px-2',
      'py-1',
      'text-sm',
      'rounded-lg',
      'transition-all',
      'duration-200',
      'cursor-pointer',
      'select-none',
      'min-w-[40px]',
      'text-center',
      'font-bold',
    ]

    if (isPlaying) {
      // Currently playing sticker - highlighted with animated gradient
      classes.push(
        'bg-gradient-to-r',
        'from-purple-400',
        'via-purple-500',
        'to-purple-600',
        'text-white',
        'shadow-md',
        'ring-2',
        'ring-purple-300',
        'ring-opacity-50',
        'transform',
        'scale-105',
        'transition-all',
        'duration-300',
        'animate-pulse'
      )
    } else if (isFocused || isSelected) {
      classes.push(
        'bg-purple-700',
        'text-white',
        'ring-2',
        'ring-purple-300',
        'shadow-lg'
      )
    } else if (isMultiSelected) {
      classes.push('bg-purple-500', 'text-white', 'shadow-md')
    } else {
      // Default sticker styling - purple theme to distinguish from words
      classes.push(
        'bg-purple-100',
        'border-2',
        'border-purple-400',
        'hover:border-purple-600',
        'hover:bg-purple-200',
        'text-purple-800',
        'shadow-sm'
      )

      // Dim stickers when other clips are playing
      if (isOtherClipPlaying) {
        classes.push('opacity-40')
      } else if (isInPlayingClip && !isPlaying) {
        classes.push('opacity-70')
      }
    }

    if (isResizing) {
      classes.push(
        'ring-2',
        'ring-purple-300',
        'cursor-ew-resize',
        'bg-purple-600',
        'text-white',
        'shadow-lg',
        'border-2',
        'border-purple-400',
        'transform',
        'scale-105'
      )
    } else if (isBeingDragged) {
      classes.push('opacity-50', 'cursor-grabbing')
    } else if (isDraggable) {
      classes.push('cursor-grab')
    }

    return classes.join(' ')
  }

  // Custom onMouseDown that handles both resize and drag
  const customOnMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const resizeZoneWidth = 8 // Increased resize zone for better UX
      const isRightEdge = clickX > rect.width - resizeZoneWidth

      console.log('🎯 Sticker mouseDown:', {
        stickerId: sticker.id,
        isRightEdge,
        clickX,
        rectWidth: rect.width,
        correspondingText: !!correspondingText,
        isDraggable,
        hasListeners: !!listeners?.onMouseDown,
        isResizing,
      })

      if (isRightEdge && correspondingText) {
        // Right edge - start resize drag
        console.log('📏 Starting resize for sticker:', sticker.id)
        e.stopPropagation()
        e.preventDefault()
        handleResizeStart(e)
      } else if (isDraggable && listeners?.onMouseDown && !isResizing) {
        // Position drag - let @dnd-kit handle it (only if not resizing)
        console.log('🚀 Starting position drag for sticker:', sticker.id)
        listeners.onMouseDown(e as React.MouseEvent<HTMLElement>)
      } else {
        // Regular click (using debounced version)
        console.log('👆 Regular click on sticker:', sticker.id)
        debouncedHandleClick(e)
      }
    },
    [
      correspondingText,
      handleResizeStart,
      isDraggable,
      listeners,
      debouncedHandleClick,
      isResizing,
      sticker.id,
    ]
  )

  // Clean attributes - exclude onMouseDown since we handle it custom
  const cleanAttributes = isDraggable
    ? {
        ...attributes,
        // Include all listeners except onMouseDown which we handle in customOnMouseDown
        ...(listeners
          ? Object.fromEntries(
              Object.entries(listeners).filter(([key]) => key !== 'onMouseDown')
            )
          : {}),
      }
    : attributes

  return (
    <div
      ref={(node) => {
        stickerRef.current = node
        setNodeRef(node)
      }}
      className={getStickerClasses()}
      style={style}
      data-sticker-id={sticker.id}
      data-clip-id={clipId}
      title={`📝 삽입 텍스트: ${sticker.text} (${getDuration().toFixed(1)}s)`}
      {...cleanAttributes}
      onMouseDown={customOnMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const resizeZoneWidth = 8
        const isRightEdge = mouseX > rect.width - resizeZoneWidth
        e.currentTarget.style.cursor =
          isRightEdge && correspondingText
            ? 'ew-resize'
            : isDraggable
              ? 'grab'
              : 'pointer'
      }}
    >
      {/* Display 'T' icon for text stickers */}
      <span className="text-lg font-bold">T</span>

      {/* Right edge resize handle (visible only on hover) */}
      {correspondingText && (
        <div
          className={`absolute right-0 top-0 w-2 h-full transition-all duration-200 ${
            isResizing
              ? 'bg-purple-400 opacity-100 w-3'
              : 'hover:bg-purple-300 opacity-0 hover:opacity-50'
          }`}
          style={{ cursor: 'ew-resize' }}
        />
      )}

      {/* Resize drag area indicator */}
      {isResizing && (
        <div className="absolute inset-0 border-2 border-dashed border-purple-300 rounded-lg pointer-events-none animate-pulse" />
      )}

      {/* Portal-based resize preview indicator */}
      <TooltipPortal
        isVisible={
          isResizing && previewEndTime !== null && tooltipPosition !== null
        }
      >
        {tooltipPosition && (
          <div
            className="fixed bg-purple-900/90 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap shadow-lg border border-purple-400 pointer-events-none"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translate(-50%, -100%)',
              zIndex: 10000,
            }}
          >
            <div className="text-center">
              <div className="font-bold">{getDuration().toFixed(1)}s</div>
              <div className="text-xs opacity-80">드래그하여 시간 조절</div>
            </div>
            {/* Arrow pointing down */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-purple-900/90"></div>
          </div>
        )}
      </TooltipPortal>

      {/* Delete button (visible on hover) */}
      {isHovered && onStickerDelete && (
        <button
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            console.log(
              '🗑️ Delete button mouseDown - executing delete for sticker:',
              sticker.id
            )

            // Execute delete immediately on mouseDown to prevent sticker events
            if (onStickerDelete) {
              onStickerDelete(sticker.id)
            }
          }}
          onClick={(e) => {
            // Backup onClick in case mouseDown doesn't work on some browsers
            e.stopPropagation()
            e.preventDefault()
            console.log(
              '🗑️ Delete button click backup for sticker:',
              sticker.id
            )
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-lg hover:scale-110 z-10"
          title="삭제"
        >
          ×
        </button>
      )}

      {/* Small indicator showing it's a sticker */}
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full"></div>
    </div>
  )
}
