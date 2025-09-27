'use client'

import React from 'react'
import ColorPalette from './ColorPalette'

interface SimpleColorPopupProps {
  color: string
  onColorChange: (color: string) => void
  onClose?: () => void
  className?: string
}

export default function SimpleColorPopup({
  color,
  onColorChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClose,
  className = '',
}: SimpleColorPopupProps) {
  return (
    <div
      className={`bg-black rounded-lg shadow-2xl border border-gray-800 ${className}`}
    >
      <ColorPalette
        selectedColor={color}
        onColorSelect={onColorChange}
        showCustomColor={false}
      />
    </div>
  )
}
