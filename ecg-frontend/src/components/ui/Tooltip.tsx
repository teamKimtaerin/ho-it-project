'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  children: React.ReactNode
  content: string
  shortcut?: string
  delay?: number
  disabled?: boolean
}

export default function Tooltip({
  children,
  content,
  shortcut,
  delay = 500,
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 120 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Mac/Windows 구분
  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.userAgent.toUpperCase().indexOf('MAC') >= 0

  const formatShortcut = (shortcut: string) => {
    if (!shortcut) return ''
    if (isMac) {
      return shortcut
        .replace('Ctrl', '⌘')
        .replace('Alt', '⌥')
        .replace('Shift', '⇧')
    }
    return shortcut
  }

  const calculatePosition = () => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const tooltipWidth = Math.max(rect.width, 120) // 최소 120px, 컴포넌트 너비에 맞춤

    let left = rect.left + rect.width / 2 - tooltipWidth / 2
    const top = rect.bottom + 8 // 요소 아래에 표시 (8px 간격)

    // 화면 경계 체크
    if (left < 10) left = 10
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10
    }

    setPosition({
      top: top + window.scrollY,
      left: left + window.scrollX,
      width: tooltipWidth,
    })
  }

  const handleMouseEnter = () => {
    if (disabled) return

    timeoutRef.current = setTimeout(() => {
      calculatePosition()
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const tooltipContent = (
    <div
      className="fixed px-2 py-1.5 text-xs bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-md shadow-xl pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 100000,
      }}
    >
      <div className="flex flex-col items-center space-y-0.5">
        <span className="text-white font-medium text-center">{content}</span>
        {shortcut && (
          <span className="text-slate-400 text-[10px] font-mono text-center">
            ({formatShortcut(shortcut)})
          </span>
        )}
      </div>
      {/* 화살표 - 요소 위쪽에 */}
      <div
        className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-b-3 border-transparent border-b-slate-800/95"
        style={{
          borderLeftWidth: '4px',
          borderRightWidth: '4px',
          borderBottomWidth: '4px',
        }}
      />
    </div>
  )

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {isVisible &&
        typeof document !== 'undefined' &&
        createPortal(tooltipContent, document.body)}
    </>
  )
}
