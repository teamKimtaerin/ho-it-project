import React from 'react'

interface WordDropCursorProps {
  position: 'before' | 'after'
  isActive: boolean
}

export default function WordDropCursor({
  position,
  isActive,
}: WordDropCursorProps) {
  if (!isActive) return null

  return (
    <div
      className={`
        absolute top-0 bottom-0 w-0.5 bg-purple-500 z-50
        ${position === 'before' ? 'left-0 -translate-x-1' : 'right-0 translate-x-1'}
      `}
      style={{
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {/* Text cursor indicator - non-blinking */}
      <div
        className="absolute top-1/2 -translate-y-1/2"
        style={{
          left: position === 'before' ? '-2px' : 'auto',
          right: position === 'after' ? '-2px' : 'auto',
        }}
      >
        <div className="w-1 h-4 bg-purple-500" />
        <div
          className="absolute top-0 w-2 h-1 bg-purple-500"
          style={{
            left: position === 'before' ? '0' : '-4px',
          }}
        />
        <div
          className="absolute bottom-0 w-2 h-1 bg-purple-500"
          style={{
            left: position === 'before' ? '0' : '-4px',
          }}
        />
      </div>
    </div>
  )
}
