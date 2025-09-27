import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Item from './Item'

interface SortableItemProps {
  id: string
}

const SortableItem: React.FC<SortableItemProps> = ({ id }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  // TODO: Verify exact types for transform and transition from @dnd-kit/sortable
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition as string | undefined, // TODO: Replace with actual transition type
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li style={style} ref={setNodeRef} {...attributes} {...listeners}>
      <Item id={id} />
    </li>
  )
}

export default SortableItem
