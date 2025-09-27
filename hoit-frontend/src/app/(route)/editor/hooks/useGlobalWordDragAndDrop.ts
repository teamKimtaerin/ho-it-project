import { useCallback, useRef } from 'react'
import { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core'
import { useEditorStore } from '../store'

export function useGlobalWordDragAndDrop() {
  const {
    focusedWordId,
    focusedClipId,
    groupedWordIds,
    startWordDrag,
    endWordDrag,
    setDropTarget,
    clips,
    moveWordBetweenClips,
    reorderWordsInClip,
  } = useEditorStore()

  const draggedWordsRef = useRef<Set<string>>(new Set())

  // Sensors are managed at page level to avoid conflicts

  const handleWordDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const data = active.data.current

      if (data?.type !== 'word') return

      const wordId = data.wordId as string
      const dragClipId = data.clipId as string

      // Only allow drag if word is focused or in group
      if (
        (focusedWordId === wordId && focusedClipId === dragClipId) ||
        groupedWordIds.has(wordId)
      ) {
        startWordDrag(wordId)

        // If dragging a grouped word, track all grouped words
        if (groupedWordIds.size > 1) {
          draggedWordsRef.current = new Set(groupedWordIds)
        } else {
          draggedWordsRef.current = new Set([wordId])
        }
      }
    },
    [focusedWordId, focusedClipId, groupedWordIds, startWordDrag]
  )

  const handleWordDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      const activeData = active.data.current
      const overData = over?.data.current

      if (activeData?.type !== 'word') return

      if (over && overData?.type === 'word') {
        const overWordId = overData.wordId as string
        const _overClipId = overData.clipId as string

        // Allow dropping within any clip (cross-clip support)
        // Calculate drop position based on cursor location
        const activeRect = active.rect.current.translated
        const overRect = over.rect

        if (activeRect && overRect) {
          const position =
            activeRect.left < overRect.left + overRect.width / 2
              ? 'before'
              : 'after'
          setDropTarget(overWordId, position)
        }
      } else {
        setDropTarget(null, null)
      }
    },
    [setDropTarget]
  )

  const handleWordDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      const activeData = active.data.current
      const overData = over?.data.current

      endWordDrag()
      draggedWordsRef.current.clear()

      if (
        activeData?.type === 'word' &&
        over &&
        overData?.type === 'word' &&
        active.id !== over.id
      ) {
        const sourceWordId = activeData.wordId as string
        const targetWordId = overData.wordId as string
        const sourceClipId = activeData.clipId as string
        const targetClipId = overData.clipId as string

        // Handle both within-clip reordering and cross-clip movement
        if (sourceClipId === targetClipId) {
          // Same clip: reorder words
          if (reorderWordsInClip) {
            reorderWordsInClip(sourceClipId, sourceWordId, targetWordId)
          }
        } else {
          // Different clips: move word between clips
          if (moveWordBetweenClips) {
            // Find target position based on the target word
            const targetClip = clips.find((clip) => clip.id === targetClipId)
            if (targetClip) {
              const targetWordIndex = targetClip.words.findIndex(
                (word) => word.id === targetWordId
              )
              // Insert position depends on drop position (before or after)
              const { dropPosition } = useEditorStore.getState()
              const insertPosition =
                dropPosition === 'before'
                  ? targetWordIndex
                  : targetWordIndex + 1
              moveWordBetweenClips(
                sourceClipId,
                targetClipId,
                sourceWordId,
                insertPosition
              )
            }
          }
        }
      }
    },
    [endWordDrag, clips, moveWordBetweenClips, reorderWordsInClip]
  )

  const handleWordDragCancel = useCallback(() => {
    endWordDrag()
    draggedWordsRef.current.clear()
  }, [endWordDrag])

  return {
    handleWordDragStart,
    handleWordDragOver,
    handleWordDragEnd,
    handleWordDragCancel,
    draggedWords: draggedWordsRef.current,
  }
}
