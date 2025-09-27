'use client'

import {
  cn,
  createClickHandler,
  createKeyboardHandler,
  logComponentWarning,
  SEMANTIC_COLORS,
  SIZE_CLASSES,
  TRANSITIONS,
  type InteractiveComponentProps,
} from '@/utils'
import React from 'react'

export interface TagProps extends Omit<InteractiveComponentProps, 'size'> {
  label: string
  hasAvatar?: boolean
  avatar?: React.ReactNode
  isRemovable?: boolean
  isError?: boolean
  onRemove?: () => void
  size?: keyof typeof SIZE_CLASSES.tag
}

const Tag: React.FC<TagProps> = ({
  label,
  hasAvatar = false,
  avatar,
  isRemovable = false,
  isError = false,
  size = 'medium',
  isDisabled = false,
  isReadOnly = false,
  onRemove,
  onClick,
  className,
}) => {
  // Validation
  if (hasAvatar && !avatar) {
    logComponentWarning(
      'Tag',
      'Avatar content must be provided when hasAvatar is true.'
    )
  }

  // Base tag classes
  const baseClasses = [
    'inline-flex',
    'items-center',
    'gap-1.5',
    'font-medium',
    'rounded-small',
    TRANSITIONS.colors,
    SIZE_CLASSES.tag[size || 'medium'],
  ]

  // State-based styling
  const getStateClasses = () => {
    const classes = []

    // Semantic color styling
    const semantic = isError ? 'error' : 'neutral'
    classes.push(...SEMANTIC_COLORS[semantic].fill)

    // Disabled state
    if (isDisabled) {
      classes.push('opacity-50', 'cursor-not-allowed')
    }
    // Interactive states (when not disabled)
    else if (!isReadOnly && onClick) {
      classes.push('cursor-pointer')
      classes.push(SEMANTIC_COLORS[semantic].hover)
    }

    return classes
  }

  // Handle tag click
  const handleTagClick = createClickHandler({
    isDisabled,
    isReadOnly,
    onClick,
  })

  // Handle remove click
  const handleRemoveClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    const handler = createClickHandler({
      isDisabled,
      isReadOnly,
      onClick: onRemove,
    })
    handler()
  }

  // Remove button classes
  const getRemoveButtonClasses = () => {
    const classes = [
      'ml-1',
      'w-4',
      'h-4',
      'rounded-full',
      'flex',
      'items-center',
      'justify-center',
      TRANSITIONS.colors,
    ]

    if (isDisabled || isReadOnly) {
      classes.push('cursor-not-allowed')
    } else {
      classes.push('cursor-pointer')
      if (isError) {
        classes.push('hover:bg-red-200', 'text-red-600')
      } else {
        classes.push(
          'hover:bg-gray-slate',
          'hover:text-white',
          'text-text-secondary'
        )
      }
    }

    return classes
  }

  // Avatar component
  const renderAvatar = () => {
    if (!hasAvatar || !avatar) return null

    return (
      <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
        {avatar}
      </div>
    )
  }

  // Remove icon (X)
  const renderRemoveIcon = () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-3 h-3"
    >
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  )

  // Combine all classes
  const tagClasses = cn(baseClasses, getStateClasses(), className)

  return (
    <div
      className={tagClasses}
      onClick={handleTagClick}
      role={onClick ? 'button' : undefined}
      tabIndex={!isDisabled && !isReadOnly && onClick ? 0 : undefined}
      aria-disabled={isDisabled}
      aria-readonly={isReadOnly}
      onKeyDown={createKeyboardHandler({
        isDisabled,
        isReadOnly,
        onActivate: onClick ? () => onClick() : undefined,
      })}
    >
      {/* Avatar */}
      {renderAvatar()}

      {/* Label */}
      <span className="select-none whitespace-nowrap">{label}</span>

      {/* Remove Button */}
      {isRemovable && (
        <button
          type="button"
          className={cn(getRemoveButtonClasses())}
          onClick={handleRemoveClick}
          disabled={isDisabled || isReadOnly}
          aria-label={`Remove ${label} tag`}
          tabIndex={-1} // Remove from tab order, parent handles focus
        >
          {renderRemoveIcon()}
        </button>
      )}
    </div>
  )
}

export default Tag
