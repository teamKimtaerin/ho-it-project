import { useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '../store'

export function useGroupSelection() {
  const {
    isGroupSelecting,
    startClipGroupSelection,
    endClipGroupSelection,
    addToClipGroupSelection,
  } = useEditorStore()

  console.log('[useGroupSelection] Store functions:', {
    startClipGroupSelection: typeof startClipGroupSelection,
    endClipGroupSelection: typeof endClipGroupSelection,
    addToClipGroupSelection: typeof addToClipGroupSelection,
    isGroupSelecting,
  })

  const isMouseDownRef = useRef(false)

  // Handle mouse up globally to end selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isGroupSelecting) {
        endClipGroupSelection()
      }
      isMouseDownRef.current = false
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isGroupSelecting, endClipGroupSelection])

  const handleClipPointerDown = useCallback(
    (clipId: string) => {
      console.log('[GroupSelection] Pointer down on clip:', clipId)
      console.log(
        '[GroupSelection] startClipGroupSelection type:',
        typeof startClipGroupSelection
      )
      // Start group selection for all clips
      isMouseDownRef.current = true
      if (startClipGroupSelection) {
        console.log('[GroupSelection] About to call startClipGroupSelection')
        try {
          startClipGroupSelection(clipId)
          console.log(
            '[GroupSelection] startClipGroupSelection called successfully'
          )
        } catch (error) {
          console.error(
            '[GroupSelection] Error calling startClipGroupSelection:',
            error
          )
        }
      } else {
        console.error('[GroupSelection] startClipGroupSelection is undefined!')
      }
    },
    [startClipGroupSelection]
  )

  const handleClipMouseEnter = useCallback(
    (clipId: string) => {
      console.log('[GroupSelection] Mouse enter on clip:', clipId, {
        isGroupSelecting,
        isMouseDown: isMouseDownRef.current,
      })
      // Only add to selection if we're in group selection mode
      if (isGroupSelecting && isMouseDownRef.current) {
        console.log('[GroupSelection] Adding to selection:', clipId)
        addToClipGroupSelection(clipId)
      }
    },
    [isGroupSelecting, addToClipGroupSelection]
  )

  return {
    isGroupSelecting,
    handleClipPointerDown,
    handleClipMouseEnter,
  }
}
