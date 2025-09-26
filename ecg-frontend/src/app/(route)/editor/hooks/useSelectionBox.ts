import { useCallback, useRef } from 'react'
import { useEditorStore } from '../store'

export function useSelectionBox() {
  const {
    isSelecting,
    setIsSelecting,
    selectionBox,
    setSelectionBox,
    setSelectedClipIds,
    addToSelection,
  } = useEditorStore()

  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start selection if clicking on empty space
      if ((e.target as HTMLElement).closest('.sortable-clip')) return

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      // 스크롤 위치를 고려한 좌표 계산
      const scrollTop = containerRef.current?.scrollTop || 0
      const scrollLeft = containerRef.current?.scrollLeft || 0

      setIsSelecting(true)
      setSelectionBox({
        startX: e.clientX - rect.left + scrollLeft,
        startY: e.clientY - rect.top + scrollTop,
        endX: e.clientX - rect.left + scrollLeft,
        endY: e.clientY - rect.top + scrollTop,
      })

      // Clear selection if not holding Ctrl/Cmd
      if (!e.ctrlKey && !e.metaKey) {
        setSelectedClipIds(new Set())
      }
    },
    [setIsSelecting, setSelectionBox, setSelectedClipIds]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting) return

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      // 스크롤 위치를 고려한 좌표 계산
      const scrollTop = containerRef.current?.scrollTop || 0
      const scrollLeft = containerRef.current?.scrollLeft || 0

      setSelectionBox({
        ...selectionBox,
        endX: e.clientX - rect.left + scrollLeft,
        endY: e.clientY - rect.top + scrollTop,
      })
    },
    [isSelecting, selectionBox, setSelectionBox]
  )

  const handleMouseUp = useCallback(() => {
    if (!isSelecting) return

    // Check which clips are within the selection box
    const clipElements =
      containerRef.current?.querySelectorAll('[data-clip-id]')
    const selected: string[] = []

    // 스크롤 위치 가져오기
    const scrollTop = containerRef.current?.scrollTop || 0
    const scrollLeft = containerRef.current?.scrollLeft || 0

    clipElements?.forEach((element) => {
      const clipRect = element.getBoundingClientRect()
      const containerRect = containerRef.current!.getBoundingClientRect()

      // 스크롤을 고려한 절대 위치 계산
      const clipTop = clipRect.top - containerRect.top + scrollTop
      const clipBottom = clipRect.bottom - containerRect.top + scrollTop
      const clipLeft = clipRect.left - containerRect.left + scrollLeft
      const clipRight = clipRect.right - containerRect.left + scrollLeft

      const selLeft = Math.min(selectionBox.startX, selectionBox.endX)
      const selRight = Math.max(selectionBox.startX, selectionBox.endX)
      const selTop = Math.min(selectionBox.startY, selectionBox.endY)
      const selBottom = Math.max(selectionBox.startY, selectionBox.endY)

      // Check if clip intersects with selection box
      if (
        clipRight > selLeft &&
        clipLeft < selRight &&
        clipBottom > selTop &&
        clipTop < selBottom
      ) {
        const clipId = element.getAttribute('data-clip-id')
        if (clipId) selected.push(clipId)
      }
    })

    if (selected.length > 0) {
      addToSelection(selected)
    }

    setIsSelecting(false)
  }, [isSelecting, selectionBox, addToSelection, setIsSelecting])

  return {
    containerRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    isSelecting,
    selectionBox,
  }
}
