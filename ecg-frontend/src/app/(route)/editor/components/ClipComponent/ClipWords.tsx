import { useRef, useState } from 'react'
import React, { useCallback } from 'react'
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DndContext,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Word, Sticker } from '../../types'
import ClipWord from './ClipWord'
import ClipSticker from './ClipSticker'
import { useWordGrouping } from '../../hooks/useWordGrouping'
import { useEditorStore } from '../../store'
import { getAssetIcon } from '../../utils/assetIconMapper'
import { DRAG_ACTIVATION_DISTANCE } from '../../types'

interface ClipWordsProps {
  clipId: string
  words: Word[]
  stickers: Sticker[]
  onWordEdit: (clipId: string, wordId: string, newText: string) => void
  onStickerDeleteRequest?: (stickerId: string, stickerText: string) => void
}

// Asset database interface
interface AssetDatabaseItem {
  id: string
  title: string
  iconName?: string
}

export default function ClipWords({
  clipId,
  words,
  stickers,
  onWordEdit,
  onStickerDeleteRequest,
}: ClipWordsProps) {
  // Add ref for debouncing clicks
  const lastClickTimeRef = useRef(0)

  // Drag state for visual feedback
  const [draggedStickerId, setDraggedStickerId] = useState<string | null>(null)
  const [hoveredWordId, setHoveredWordId] = useState<string | null>(null)

  // Configure sensors to prevent drag interference with double-click
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE, // 15px - prevent accidental drags
      },
    })
  )

  const {
    // From dev branch
    setFocusedWord,
    // clearWordFocus, // Currently unused
    // draggedWordId, // Currently unused
    setActiveClipId,
    // From feat/editor-asset-sidebar-clean branch
    setSelectedWordId,
    setCurrentWordAssets,
    selectedWordAssets,
    expandClip,
    // For sticker position updates
    insertedTexts,
    updateText,
    // For updating clip data
    setClips,
    clips,
  } = useEditorStore()

  // Asset related state with icon support
  const [allAssets, setAllAssets] = React.useState<AssetDatabaseItem[]>([])

  // Setup grouping functionality (from dev)
  const {
    containerRef,
    isDragging: isGroupDragging,
    handleMouseDown,
    handleKeyDown,
  } = useWordGrouping({
    clipId,
    onGroupChange: () => {
      // Optional: Handle group change
    },
  })

  // Fetch assets database for asset names and icons
  React.useEffect(() => {
    const fetchAssets = async () => {
      try {
        const response = await fetch('/asset-store/assets-database.json')
        if (response.ok) {
          const data = await response.json()
          // Map to include only needed fields for performance
          const assetsWithIcons: AssetDatabaseItem[] = data.assets.map(
            (asset: Record<string, unknown>) => ({
              id: asset.id,
              title: asset.title,
              iconName: asset.iconName,
            })
          )
          setAllAssets(assetsWithIcons)
        }
      } catch (error) {
        console.error('Failed to fetch assets:', error)
      }
    }
    fetchAssets()
  }, [])

  // Get asset name by ID (from feat/editor-asset-sidebar-clean)
  const getAssetNameById = (id: string) => {
    const asset = allAssets.find((a) => a.id === id)
    return asset?.title || ''
  }

  // Keep words and stickers separate but visually sorted by time
  const wordItems = words.map((word) => ({
    type: 'word' as const,
    item: word,
    start: word.start,
  }))
  const stickerItems = stickers.map((sticker) => ({
    type: 'sticker' as const,
    item: sticker,
    start: sticker.start,
  }))

  // Create sortable items for DnD (include both words and stickers)
  const sortableItems = [...wordItems, ...stickerItems].map(
    (item) => `${clipId}-${item.item.id}`
  )

  // For visual display, combine and sort by time (but keep semantic separation)
  const allItems = [...wordItems, ...stickerItems].sort(
    (a, b) => a.start - b.start
  )

  // Word-Sticker relationship management functions
  const getStickersForWord = (wordId: string) => {
    return stickers.filter((sticker) => sticker.attachedWordId === wordId)
  }

  const getUnattachedStickers = () => {
    return stickers.filter((sticker) => !sticker.attachedWordId)
  }

  const attachStickerToWord = (stickerId: string, wordId: string) => {
    const targetWord = words.find((w) => w.id === wordId)
    const targetSticker = stickers.find((s) => s.id === stickerId)

    if (!targetWord || !targetSticker) return

    // Update sticker data with attachedWordId
    const updatedClips = clips.map((clip) => {
      if (clip.id === clipId) {
        return {
          ...clip,
          stickers: (clip.stickers || []).map((sticker) =>
            sticker.id === stickerId
              ? {
                  ...sticker,
                  attachedWordId: wordId,
                  start: targetWord.start,
                  end: targetWord.start + 3,
                }
              : sticker
          ),
        }
      }
      return clip
    })
    setClips(updatedClips)

    // Find corresponding inserted text
    const correspondingText = insertedTexts?.find(
      (text: { id: string }) => text.id === targetSticker.originalInsertedTextId
    )

    if (correspondingText && updateText) {
      // Sync start time with target word
      const currentDuration =
        correspondingText.endTime - correspondingText.startTime
      const duration = currentDuration > 0 ? currentDuration : 3
      const newStartTime = targetWord.start
      const newEndTime = newStartTime + duration

      updateText(correspondingText.id, {
        startTime: newStartTime,
        endTime: newEndTime,
      })

      console.log(
        `🔗 Attached sticker "${targetSticker.text}" to word "${targetWord.text}" at ${newStartTime.toFixed(2)}s`
      )
    }
  }

  // Find target word for sticker drop
  const findTargetWordForDrop = (overId: string) => {
    // Check if dropping directly on a word
    const targetWord = words.find((w) => w.id === overId)
    if (targetWord) {
      return targetWord
    }

    // If dropping on another sticker, find its attached word or nearest word
    const targetSticker = stickers.find((s) => s.id === overId)
    if (targetSticker?.attachedWordId) {
      return words.find((w) => w.id === targetSticker.attachedWordId)
    }

    // Fallback: use first word in clip
    return words.length > 0 ? words[0] : null
  }

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeId = event.active.id.toString().replace(`${clipId}-`, '')
      const draggedSticker = stickers.find((s) => s.id === activeId)

      console.log('🚀 Drag start in ClipWords:', {
        activeId,
        draggedSticker: draggedSticker?.id,
        eventActiveId: event.active.id,
      })

      if (draggedSticker) {
        setDraggedStickerId(draggedSticker.id)
      }
    },
    [clipId, stickers]
  )

  // Handle drag over for hover feedback
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (!draggedStickerId || !event.over) {
        setHoveredWordId(null)
        return
      }

      const overId = event.over.id.toString().replace(`${clipId}-`, '')
      const targetWord = findTargetWordForDrop(overId)

      setHoveredWordId(targetWord?.id || null)
    },
    [clipId, draggedStickerId, findTargetWordForDrop]
  )

  // Handle drag end for sticker-to-word attachment
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      console.log('🏁 Drag end in ClipWords:', {
        activeId: active?.id,
        overId: over?.id,
        hasActive: !!active,
        hasOver: !!over,
      })

      // Reset drag state
      setDraggedStickerId(null)
      setHoveredWordId(null)

      if (!over || !active) return

      // Extract item ID from the sortable ID format
      const activeId = active.id.toString().replace(`${clipId}-`, '')
      const overId = over.id.toString().replace(`${clipId}-`, '')

      console.log('🎯 Processing drag end:', {
        activeId,
        overId,
        clipId,
      })

      // Ensure both items belong to the same clip (boundary check)
      if (
        !active.id.toString().startsWith(clipId) ||
        !over.id.toString().startsWith(clipId)
      ) {
        console.warn(
          '🚫 Sticker drag blocked: attempting to move outside clip boundary'
        )
        return
      }

      // Find if the dragged item is a sticker
      const draggedSticker = stickers.find((s) => s.id === activeId)

      console.log('📌 Dragged sticker found:', draggedSticker?.id)

      if (!draggedSticker) return // Only handle sticker drags

      // Find target word for attachment
      const targetWord = findTargetWordForDrop(overId)

      console.log('🎯 Target word found:', targetWord?.id, targetWord?.text)

      if (!targetWord) {
        console.warn('🚫 No valid target word found for sticker attachment')
        return
      }

      // Skip if already attached to the same word
      if (draggedSticker.attachedWordId === targetWord.id) {
        console.log('📌 Sticker already attached to this word')
        return
      }

      // Attach sticker to target word
      console.log(
        '🔗 Attaching sticker to word:',
        draggedSticker.id,
        '→',
        targetWord.id
      )
      attachStickerToWord(draggedSticker.id, targetWord.id)
    },
    [clipId, stickers, words, findTargetWordForDrop, attachStickerToWord]
  )

  // Handle sticker deletion request (delegate to parent)
  const handleStickerDeleteRequest = useCallback(
    (stickerId: string) => {
      const sticker = stickers.find((s) => s.id === stickerId)
      if (!sticker || !onStickerDeleteRequest) return

      onStickerDeleteRequest(stickerId, sticker.text)
    },
    [stickers, onStickerDeleteRequest]
  )

  // Combined word click handler (merging both functionalities)
  const handleWordClick = useCallback(
    (wordId: string, _isCenter: boolean) => {
      const word = words.find((w) => w.id === wordId)
      if (!word) return

      // Prevent rapid clicks from causing conflicts (reduced to allow double-click)
      const now = Date.now()
      if (now - lastClickTimeRef.current < 10) {
        return
      }
      lastClickTimeRef.current = now

      // Seek video player to word start time
      const videoPlayer = (
        window as {
          videoPlayer?: {
            seekTo: (time: number) => void
            pauseAutoWordSelection?: () => void
          }
        }
      ).videoPlayer
      if (videoPlayer) {
        videoPlayer.seekTo(word.start)
        // Pause auto word selection for a few seconds when user manually selects a word
        if (videoPlayer.pauseAutoWordSelection) {
          videoPlayer.pauseAutoWordSelection()
        }
      }

      // Focus on clicked word (center click logic handled by ClipWord component)
      const wordAssets = selectedWordAssets[wordId] || word.appliedAssets || []
      setFocusedWord(clipId, wordId)
      setActiveClipId(clipId)
      setSelectedWordId(wordId)
      setCurrentWordAssets(wordAssets)
      // Expand clip to show waveform editor on single click
      expandClip(clipId, wordId)
    },
    [
      clipId,
      words,
      setFocusedWord,
      setActiveClipId,
      setSelectedWordId,
      setCurrentWordAssets,
      selectedWordAssets,
      expandClip,
    ]
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortableItems}
        strategy={horizontalListSortingStrategy}
      >
        <div
          ref={containerRef}
          className="flex flex-wrap gap-1 relative cursor-pointer items-start"
          onMouseDown={handleMouseDown}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {allItems.map((combinedItem) => {
            if (combinedItem.type === 'word') {
              const word = combinedItem.item as Word
              const appliedAssets = word.appliedAssets || []

              return (
                <React.Fragment key={word.id}>
                  <ClipWord
                    word={word}
                    clipId={clipId}
                    onWordClick={handleWordClick}
                    onWordEdit={onWordEdit}
                    isStickerDropTarget={draggedStickerId !== null}
                    isStickerHovered={hoveredWordId === word.id}
                  />

                  {/* Render asset icons after each word */}
                  {appliedAssets.length > 0 && (
                    <div className="flex gap-1 items-center">
                      {appliedAssets.map((assetId: string) => {
                        const IconComponent = getAssetIcon(assetId, allAssets)
                        const assetName = getAssetNameById(assetId)
                        return IconComponent ? (
                          <div
                            key={assetId}
                            className="w-3 h-3 bg-slate-600/50 rounded-sm flex items-center justify-center"
                            title={assetName}
                          >
                            <IconComponent
                              size={10}
                              className="text-slate-300"
                            />
                          </div>
                        ) : null
                      })}
                    </div>
                  )}
                </React.Fragment>
              )
            } else {
              // Render sticker
              const sticker = combinedItem.item as Sticker
              const appliedAssets = sticker.appliedAssets || []

              return (
                <React.Fragment key={sticker.id}>
                  <ClipSticker
                    sticker={sticker}
                    clipId={clipId}
                    clipWords={words}
                    onStickerClick={(stickerId) =>
                      handleWordClick(stickerId, false)
                    } // Reuse word click handler
                    onStickerDelete={handleStickerDeleteRequest}
                  />

                  {/* Render asset icons after each sticker */}
                  {appliedAssets.length > 0 && (
                    <div className="flex gap-1 items-center">
                      {appliedAssets.map((assetId: string) => {
                        const IconComponent = getAssetIcon(assetId, allAssets)
                        const assetName = getAssetNameById(assetId)
                        return IconComponent ? (
                          <div
                            key={assetId}
                            className="w-3 h-3 bg-slate-600/50 rounded-sm flex items-center justify-center"
                            title={assetName}
                          >
                            <IconComponent
                              size={10}
                              className="text-slate-300"
                            />
                          </div>
                        ) : null
                      })}
                    </div>
                  )}
                </React.Fragment>
              )
            }
          })}

          {/* Visual feedback for group selection (from dev) */}
          {isGroupDragging && (
            <div className="absolute inset-0 bg-blue-500/10 pointer-events-none rounded" />
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
