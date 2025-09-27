import { useCallback, useRef, useState, useEffect } from 'react'
import { useEditorStore } from '../store'

interface WordGroupingOptions {
  clipId: string
  onGroupChange?: (groupedWordIds: Set<string>) => void
}

export function useWordGrouping({
  clipId,
  onGroupChange,
}: WordGroupingOptions) {
  const {
    startGroupSelection,
    addToGroupSelection,
    endGroupSelection,
    clearGroupSelection,
    isGroupSelecting,
    groupedWordIds,
  } = useEditorStore()

  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPoint, setDragStartPoint] = useState<{
    x: number
    y: number
  } | null>(null)
  const draggedOverWords = useRef<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle mouse down on container (not on a word)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement

      // Check if clicking on empty space or edge of word
      const wordElement = target.closest('[data-word-id]')

      if (wordElement) {
        const rect = wordElement.getBoundingClientRect()
        const x = e.clientX - rect.left
        const width = rect.width
        const centerThreshold = width * 0.3

        // If clicking on edge of word, start group selection
        if (x <= centerThreshold || x >= width - centerThreshold) {
          const wordId = wordElement.getAttribute('data-word-id')
          if (wordId) {
            setIsDragging(true)
            setDragStartPoint({ x: e.clientX, y: e.clientY })
            startGroupSelection(clipId, wordId)
            draggedOverWords.current = new Set([wordId])
          }
        }
      } else {
        // Clicking on empty space - start drag selection
        setIsDragging(true)
        setDragStartPoint({ x: e.clientX, y: e.clientY })
        clearGroupSelection()
        draggedOverWords.current.clear()
      }
    },
    [clipId, startGroupSelection, clearGroupSelection]
  )

  // Handle mouse move during drag
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStartPoint) return

      // Find all word elements under the current mouse position
      const elements = document.elementsFromPoint(e.clientX, e.clientY)

      elements.forEach((element) => {
        const wordElement = element.closest('[data-word-id]') as HTMLElement
        if (
          wordElement &&
          wordElement.getAttribute('data-clip-id') === clipId
        ) {
          const wordId = wordElement.getAttribute('data-word-id')
          if (wordId && !draggedOverWords.current.has(wordId)) {
            draggedOverWords.current.add(wordId)
            addToGroupSelection(wordId)
          }
        }
      })

      // Create selection box visual feedback (optional)
      if (containerRef.current) {
        // You can dispatch an event or update state to show a selection box
        // This is optional visual feedback
      }
    },
    [isDragging, dragStartPoint, clipId, addToGroupSelection]
  )

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      setDragStartPoint(null)
      endGroupSelection()

      // Notify parent of group change
      if (onGroupChange && draggedOverWords.current.size > 0) {
        onGroupChange(new Set(draggedOverWords.current))
      }
    }
  }, [isDragging, endGroupSelection, onGroupChange])

  // Setup global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      // Prevent text selection during drag
      document.body.style.userSelect = 'none'

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.userSelect = ''
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Handle keyboard shortcuts for group operations
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl/Cmd + A to select all words in clip
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        const allWordElements =
          containerRef.current?.querySelectorAll('[data-word-id]')
        if (allWordElements) {
          clearGroupSelection()
          allWordElements.forEach((element) => {
            const wordId = element.getAttribute('data-word-id')
            if (wordId) {
              addToGroupSelection(wordId)
            }
          })
        }
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        clearGroupSelection()
      }
    },
    [clearGroupSelection, addToGroupSelection]
  )

  return {
    containerRef,
    isDragging,
    isGroupSelecting,
    groupedWordIds,
    handleMouseDown,
    handleKeyDown,
    clearGroupSelection,
  }
}
