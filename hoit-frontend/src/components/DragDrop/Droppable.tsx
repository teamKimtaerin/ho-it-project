import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import SortableItem from './SortableItem'

interface DroppableProps {
  id: string
  items: string[]
}

const Droppable: React.FC<DroppableProps> = ({ id, items }) => {
  const { setNodeRef } = useDroppable({ id })

  return (
    <SortableContext id={id} items={items} strategy={rectSortingStrategy}>
      <ul className="list-none p-0 m-0" ref={setNodeRef}>
        {items.map((item) => (
          <SortableItem key={item} id={item} />
        ))}
      </ul>
    </SortableContext>
  )
}

export default Droppable
