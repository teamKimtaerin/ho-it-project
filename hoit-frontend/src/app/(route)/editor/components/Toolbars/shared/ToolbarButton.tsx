'use client'

import React from 'react'
import Tooltip from '@/components/ui/Tooltip'
import { EDITOR_COLORS, type ToolbarVariant } from '../../../constants/colors'

interface ToolbarButtonProps {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  shortcut?: string
  className?: string
  variant?: ToolbarVariant
}

/**
 * 툴바 버튼 컴포넌트
 * 아이콘과 라벨을 포함한 세로형 버튼
 */
export default function ToolbarButton({
  icon,
  label,
  onClick,
  disabled = false,
  active = false,
  shortcut,
  className = '',
  variant = 'base',
}: ToolbarButtonProps) {
  const toolbarColors = EDITOR_COLORS.toolbar[variant]
  const iconColor =
    'iconColor' in toolbarColors ? toolbarColors.iconColor : 'text-black'
  const textColor = 'text' in toolbarColors ? toolbarColors.text : 'text-black'
  const hoverColor =
    'hover' in toolbarColors ? toolbarColors.hover : 'hover:bg-gray-200'

  const buttonClasses = `
    flex flex-col items-center space-y-1 px-2 py-1 rounded cursor-pointer transition-colors
    ${
      disabled
        ? `${textColor} cursor-not-allowed opacity-50`
        : active
          ? `bg-black/10 ${textColor} ${hoverColor}`
          : `${hoverColor} ${textColor}`
    }
    ${className}
  `

  const content = (
    <div className={buttonClasses} onClick={disabled ? undefined : onClick}>
      <div className={`w-5 h-5 ${disabled ? 'opacity-50' : iconColor}`}>
        {icon}
      </div>
      <span className={`text-xs ${disabled ? 'opacity-50' : textColor}`}>
        {label}
      </span>
    </div>
  )

  if (shortcut && !disabled) {
    return (
      <Tooltip content={label} shortcut={shortcut} disabled={disabled}>
        {content}
      </Tooltip>
    )
  }

  return content
}
