import {
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useCallback } from 'react'
import { useEditorStore } from '../store'
import { DRAG_ACTIVATION_DISTANCE } from '../types'

export function useDragAndDrop() {
  const {
    selectedClipIds,
    setSelectedClipIds,
    setActiveId,
    setOverId,
    reorderClips,
  } = useEditorStore()

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      setActiveId(active.id as string)

      // If dragging an item that's not selected, clear selection and select only this item
      if (!selectedClipIds.has(active.id as string)) {
        setSelectedClipIds(new Set([active.id as string]))
      }
    },
    [selectedClipIds, setActiveId, setSelectedClipIds]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event
      setOverId(over?.id as string | null)
    },
    [setOverId]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (active.id !== over?.id && over) {
        reorderClips(active.id as string, over.id as string, selectedClipIds)
      }

      setActiveId(null)
      setOverId(null)
    },
    [selectedClipIds, reorderClips, setActiveId, setOverId]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setOverId(null)
  }, [setActiveId, setOverId])

  return {
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  }
}
