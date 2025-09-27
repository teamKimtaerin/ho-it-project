'use client'

import React from 'react'

export interface TabItemProps {
  id: string
  label?: string
  icon?: React.ReactNode
  isSelected?: boolean
  isDisabled?: boolean
  onClick?: (id: string) => void
  size?: 'small' | 'medium' | 'large' | 'extra-large'
  orientation?: 'horizontal' | 'vertical'
  isQuiet?: boolean
  isEmphasized?: boolean
  density?: 'regular' | 'compact'
  className?: string
  children?: React.ReactNode
}

const TabItem: React.FC<TabItemProps> = ({
  id,
  label,
  icon,
  isSelected = false,
  isDisabled = false,
  onClick,
  size = 'medium',
  orientation = 'horizontal',
  isQuiet = false,
  isEmphasized = false,
  density = 'regular',
  className = '',
  children,
}) => {
  // Size classes based on size prop
  const getSizeClasses = () => {
    const padding =
      density === 'compact'
        ? {
            small: 'px-3 py-1',
            medium: 'px-4 py-1.5',
            large: 'px-5 py-2',
            'extra-large': 'px-6 py-2.5',
          }
        : {
            small: 'px-3 py-1.5',
            medium: 'px-4 py-2',
            large: 'px-6 py-3',
            'extra-large': 'px-8 py-4',
          }

    const typography = {
      small: 'text-caption',
      medium: 'text-body',
      large: 'text-body',
      'extra-large': 'text-h3',
    }

    return [padding[size], typography[size]]
  }

  // Icon sizes based on tab size
  const getIconSize = () => {
    const iconSizes = {
      small: 'icon-ui-small',
      medium: 'icon-ui-small',
      large: 'icon-ui-medium',
      'extra-large': 'icon-ui-medium',
    }
    return iconSizes[size]
  }

  // Get base style classes
  const getBaseClasses = () => {
    const base = [
      'inline-flex',
      'items-center',
      'justify-center',
      'font-medium',
      'transition-all',
      'duration-200',
      'cursor-pointer',
      'rounded-default',
      'relative',
      ...getSizeClasses(),
    ]

    // Add orientation-specific classes
    if (orientation === 'vertical') {
      base.push('w-full', 'justify-start')
    }

    return base
  }

  // Get state-based classes
  const getStateClasses = () => {
    const classes = []

    if (isDisabled) {
      classes.push('opacity-50', 'cursor-not-allowed', 'pointer-events-none')
    }

    // Color and style variations based on quiet/emphasized
    if (isQuiet) {
      if (isSelected) {
        classes.push('text-white')
        if (orientation === 'horizontal') {
          classes.push('border-b-2', 'border-white')
        } else {
          classes.push('border-l-2', 'border-white')
        }
      } else {
        classes.push(
          'text-white',
          'hover:text-white',
          'hover:bg-gray-700',
          'hover:scale-105',
          'hover:shadow-sm'
        )
      }
    } else if (isEmphasized) {
      if (isSelected) {
        classes.push('bg-black', 'text-white')
      } else {
        classes.push(
          'bg-white',
          'text-black',
          'hover:bg-gray-50',
          'hover:scale-105',
          'hover:shadow-md',
          'border',
          'border-gray-200'
        )
      }
    } else {
      // Regular style - no individual borders, slider will handle this
      if (isSelected) {
        classes.push('bg-gray-800', 'text-white')
      } else {
        classes.push(
          'text-gray-400',
          'hover:text-white',
          'hover:bg-gray-800',
          'hover:scale-105',
          'hover:shadow-md'
        )
      }
    }

    return classes
  }

  // Handle click
  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick(id)
    }
  }

  // Handle keyboard events
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isDisabled && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onClick?.(id)
    }
  }

  // Combine all classes
  const allClasses = [
    ...getBaseClasses(),
    ...getStateClasses(),
    className,
  ].join(' ')

  // Render content
  const renderContent = () => {
    const hasLabel = label || children
    const iconSize = getIconSize()

    return (
      <>
        {icon && (
          <span className={`${iconSize} ${hasLabel ? 'mr-2' : ''}`}>
            {icon}
          </span>
        )}
        {hasLabel && <span>{label || children}</span>}
      </>
    )
  }

  return (
    <button
      className={allClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={isDisabled}
      role="tab"
      aria-selected={isSelected}
      aria-disabled={isDisabled}
      tabIndex={isSelected ? 0 : -1}
    >
      {renderContent()}
    </button>
  )
}

export default TabItem
