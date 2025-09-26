'use client'

import {
  cn,
  getBaseInteractiveClasses,
  SIZE_CLASSES,
  type BaseComponentProps,
} from '@/utils'
import React from 'react'

export interface ToggleButtonProps extends BaseComponentProps {
  isPressed?: boolean
  icon?: React.ReactNode
  label?: string
  variant?: 'default' | 'toolbar'
  onPress?: (isPressed: boolean) => void
  children?: React.ReactNode
}

const ToggleButton: React.FC<ToggleButtonProps> = ({
  isPressed = false,
  icon,
  label,
  variant = 'default',
  size = 'medium',
  isDisabled = false,
  onPress,
  className,
  children,
}) => {
  const handleClick = () => {
    if (!isDisabled) {
      onPress?.(!isPressed)
    }
  }

  // Size-based classes
  const sizeClasses = {
    small: 'w-6 h-6 text-xs',
    medium: 'w-8 h-8 text-sm',
    large: 'w-10 h-10 text-base',
    'extra-large': 'w-12 h-12 text-lg',
  }

  // Variant-based classes
  const variantClasses = {
    default: {
      base: 'border bg-white text-gray-800',
      pressed: 'bg-purple-500 border-purple-500 text-white',
      hover: 'hover:bg-gray-50 hover:border-gray-400',
      pressedHover: 'hover:bg-purple-600',
    },
    toolbar: {
      base: 'border text-slate-300',
      pressed: 'bg-purple-500 border-purple-500 text-white',
      hover: 'hover:bg-slate-700/50',
      pressedHover: 'hover:bg-purple-600',
    },
  }

  const buttonClasses = cn(
    // Base styles
    'inline-flex items-center justify-center rounded transition-colors',
    getBaseInteractiveClasses(),

    // Size
    sizeClasses[size],

    // Variant and state
    variantClasses[variant].base,
    isPressed ? variantClasses[variant].pressed : variantClasses[variant].hover,
    isPressed && variantClasses[variant].pressedHover,

    // Icon font styles
    icon && !label && !children && 'font-bold',

    // Disabled state
    isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',

    className
  )

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={handleClick}
      disabled={isDisabled}
      aria-pressed={isPressed}
      aria-label={label}
    >
      {icon && <span className={SIZE_CLASSES.iconClasses[size]}>{icon}</span>}
      {(label || children) && !icon && (label || children)}
      {!icon && !label && !children && <span>?</span>}
    </button>
  )
}

export default ToggleButton
