import React from 'react'
import { useDraggable } from '@dnd-kit/core'

interface DraggableProps {
  children: React.ReactNode
  id: string
}

const Draggable: React.FC<DraggableProps> = ({ children, id }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-pointer"
    >
      {children}
    </button>
  )
}

export default Draggable
