'use client'

import React from 'react'

interface DropIndicatorProps {
  isActive: boolean
}

export default function DropIndicator({ isActive }: DropIndicatorProps) {
  if (!isActive) return null

  return (
    <div
      className="relative w-full h-0.5 -my-1.5 pointer-events-none"
      style={{
        opacity: isActive ? 1 : 0,
        transition: 'opacity 150ms ease',
      }}
    >
      <div
        className="absolute inset-0 bg-blue-500"
        style={{
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
    </div>
  )
}
