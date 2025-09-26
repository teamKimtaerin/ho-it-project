'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { clsx } from 'clsx'

interface ResizablePanelDividerProps {
  onResize: (delta: number) => void
  onResizeStart?: () => void
  onResizeEnd?: () => void
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

const ResizablePanelDivider: React.FC<ResizablePanelDividerProps> = ({
  onResize,
  onResizeStart,
  onResizeEnd,
  orientation = 'vertical',
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [startPosition, setStartPosition] = useState(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      setStartPosition(orientation === 'vertical' ? e.clientX : e.clientY)
      onResizeStart?.()
    },
    [orientation, onResizeStart]
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const currentPosition = orientation === 'vertical' ? e.clientX : e.clientY
      const delta = currentPosition - startPosition
      setStartPosition(currentPosition)
      onResize(delta)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      onResizeEnd?.()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    // 드래그 중 텍스트 선택 방지
    document.body.style.userSelect = 'none'
    document.body.style.cursor =
      orientation === 'vertical' ? 'col-resize' : 'row-resize'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDragging, startPosition, orientation, onResize, onResizeEnd])

  return (
    <div
      className={clsx(
        'relative group flex items-center justify-center transition-all',
        orientation === 'vertical'
          ? 'w-3 h-full cursor-col-resize'
          : 'h-3 w-full cursor-row-resize',
        isDragging && 'bg-blue-500/20',
        className
      )}
      onMouseDown={handleMouseDown}
    >
      {/* 중앙 분리선 */}
      <div
        className={clsx(
          'absolute transition-all',
          orientation === 'vertical'
            ? 'w-px h-full bg-gray-700 hover:bg-blue-500'
            : 'h-px w-full bg-gray-700 hover:bg-blue-500',
          isDragging && 'bg-blue-500'
        )}
      />

      {/* 드래그 아이콘 */}
      <div
        className={clsx(
          'absolute flex items-center justify-center transition-all',
          orientation === 'vertical' ? 'w-8 h-12' : 'w-12 h-8',
          'bg-gray-800 rounded-md border border-gray-700',
          'opacity-0 group-hover:opacity-100',
          isDragging && 'opacity-100 bg-blue-900 border-blue-500'
        )}
      >
        <span className="text-blue-400 font-bold text-sm select-none">
          {orientation === 'vertical' ? '<|>' : '<->'}
        </span>
      </div>
    </div>
  )
}

export default ResizablePanelDivider
