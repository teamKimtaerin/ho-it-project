'use client'

import React from 'react'
import { EDITOR_COLORS } from '../../../constants/colors'

interface ToolbarDividerProps {
  className?: string
  vertical?: boolean
}

/**
 * 툴바 구분선 컴포넌트
 * 툴바 내 섹션을 시각적으로 구분
 */
export default function ToolbarDivider({
  className = '',
  vertical = true,
}: ToolbarDividerProps) {
  const dividerClasses = vertical
    ? `w-px h-12 ${EDITOR_COLORS.toolbar.base.divider} mx-2`
    : `h-px w-full ${EDITOR_COLORS.toolbar.base.divider} my-2`

  return <div className={`${dividerClasses} ${className}`} />
}
