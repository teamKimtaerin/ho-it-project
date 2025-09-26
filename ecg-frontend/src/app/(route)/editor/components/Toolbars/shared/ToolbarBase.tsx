'use client'

import React from 'react'
import {
  getToolbarClasses,
  type ToolbarVariant,
} from '../../../constants/colors'

interface ToolbarBaseProps {
  variant?: ToolbarVariant
  children: React.ReactNode
  className?: string
}

/**
 * 공통 툴바 래퍼 컴포넌트
 * 모든 툴바의 기본 스타일과 레이아웃을 제공
 */
export default function ToolbarBase({
  variant = 'base',
  children,
  className = '',
}: ToolbarBaseProps) {
  const baseClasses = getToolbarClasses(variant)

  return (
    <div className={`${baseClasses} px-6 py-1 ${className}`}>{children}</div>
  )
}
