import React from 'react'

interface ItemProps {
  id: string
  dragOverlay?: boolean
}

const Item: React.FC<ItemProps> = ({ id, dragOverlay }) => {
  return (
    <div
      className="flex items-center box-border w-[110px] h-[30px] mb-[5px] pl-[5px] border border-gray-400 rounded-[5px] select-none bg-white"
      style={{ cursor: dragOverlay ? 'grabbing' : 'grab' }}
    >
      Item {id}
    </div>
  )
}

export default Item
