import React from 'react'

interface SelectionBoxProps {
  startX: number
  startY: number
  endX: number
  endY: number
  isSelecting: boolean
}

const SelectionBox: React.FC<SelectionBoxProps> = ({
  startX,
  startY,
  endX,
  endY,
  isSelecting,
}) => {
  if (!isSelecting) return null

  const left = Math.min(startX, endX)
  const top = Math.min(startY, endY)
  const width = Math.abs(endX - startX)
  const height = Math.abs(endY - startY)

  return (
    <div
      className="absolute border-2 border-blue-200 pointer-events-none z-50"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  )
}

export default SelectionBox
