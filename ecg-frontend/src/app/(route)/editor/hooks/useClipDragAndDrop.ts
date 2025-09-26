import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export function useClipDragAndDrop(clipId: string, enabled: boolean = false) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: clipId,
    disabled: !enabled,
    animateLayoutChanges: () => false, // 레이아웃 애니메이션 비활성화로 성능 개선
    data: {
      type: 'clip',
      clipId: clipId,
    },
  })

  // Y축으로만 이동하도록 transform 제한
  const restrictedTransform = transform
    ? {
        ...transform,
        x: 0, // X축 이동을 0으로 고정
      }
    : null

  const style = enabled
    ? {
        transform: CSS.Transform.toString(restrictedTransform),
        transition: transition || 'transform 150ms ease',
        opacity: isDragging ? 0.4 : 1,
        willChange: 'transform', // GPU 가속 힌트
      }
    : undefined

  const dragProps = {
    ref: setNodeRef, // Always provide ref for position tracking
    ...(enabled
      ? {
          style,
          ...attributes,
          ...listeners,
        }
      : { style: undefined }), // Only add drag functionality when enabled
  }

  return {
    dragProps,
    isDragging,
  }
}
