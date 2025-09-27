'use client'

import { cn, getBaseInteractiveClasses, type BaseComponentProps } from '@/utils'
import React, { useEffect, useRef, useState } from 'react'

export interface ColorPickerProps extends BaseComponentProps {
  value?: string
  onChange?: (color: string) => void
  colors?: string[]
  variant?: 'default' | 'toolbar'
  showText?: boolean
  placeholder?: string
}

const DEFAULT_COLORS = [
  '#FFFFFF',
  '#000000',
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#FFA500',
  '#800080',
  '#FFC0CB',
  '#A52A2A',
  '#808080',
  '#90EE90',
  '#FFB6C1',
  '#8B4513',
  '#2E8B57',
  '#4682B4',
  '#D2691E',
  '#9ACD32',
]

const ColorPicker: React.FC<ColorPickerProps> = ({
  value = '#FFFFFF',
  onChange,
  colors = DEFAULT_COLORS,
  variant = 'default',
  size = 'medium',
  isDisabled = false,
  showText = false,
  placeholder = 'A',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const paletteRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target) &&
        paletteRef.current &&
        !paletteRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleColorSelect = (color: string) => {
    onChange?.(color)
    setIsOpen(false)
  }

  // Size-based classes
  const sizeClasses = {
    small: {
      trigger: 'w-6 h-6 text-xs',
      text: 'text-xs',
      colorBar: 'w-4 h-1',
      palette: 'w-60',
      colorButton: 'w-8 h-8',
      grid: 'grid-cols-5 gap-2 p-3',
    },
    medium: {
      trigger: 'w-8 h-8 text-sm',
      text: 'text-xs',
      colorBar: 'w-5 h-1',
      palette: 'w-70',
      colorButton: 'w-10 h-10',
      grid: 'grid-cols-5 gap-4 p-5',
    },
    large: {
      trigger: 'w-10 h-10 text-base',
      text: 'text-sm',
      colorBar: 'w-6 h-1.5',
      palette: 'w-80',
      colorButton: 'w-12 h-12',
      grid: 'grid-cols-5 gap-5 p-6',
    },
    'extra-large': {
      trigger: 'w-12 h-12 text-lg',
      text: 'text-base',
      colorBar: 'w-8 h-2',
      palette: 'w-96',
      colorButton: 'w-14 h-14',
      grid: 'grid-cols-5 gap-6 p-8',
    },
  }

  const currentSize = sizeClasses[size]

  // Variant-based classes
  const variantClasses = {
    default: {
      trigger:
        'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 hover:border-gray-400',
      palette: 'bg-white border border-gray-300',
    },
    toolbar: {
      trigger:
        'bg-slate-700/90 border border-slate-500/70 text-white hover:bg-slate-600/90 hover:border-slate-400',
      palette: 'bg-slate-800/95 border border-slate-600 backdrop-blur-sm',
    },
  }

  const triggerClasses = cn(
    'flex flex-col items-center justify-center rounded transition-colors',
    getBaseInteractiveClasses(),
    currentSize.trigger,
    variantClasses[variant].trigger,
    isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    className
  )

  const paletteClasses = cn(
    'absolute top-full mt-2 left-0 rounded-lg shadow-2xl z-50',
    currentSize.palette,
    variantClasses[variant].palette
  )

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={triggerClasses}
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled}
        aria-label="Color picker"
      >
        {showText && (
          <span className={cn('font-bold', currentSize.text)}>
            {placeholder}
          </span>
        )}
        <div
          className={cn('rounded-sm mt-0.5', currentSize.colorBar)}
          style={{ backgroundColor: value }}
        />
      </button>

      {isOpen && (
        <div
          ref={paletteRef}
          className={paletteClasses}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={cn('grid', currentSize.grid)}>
            {colors.map((color) => (
              <button
                key={color}
                className={cn(
                  'rounded-lg border-2 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md',
                  currentSize.colorButton
                )}
                style={{
                  backgroundColor: color,
                  borderColor:
                    value === color ? '#60A5FA' : 'rgba(255, 255, 255, 0.2)',
                }}
                onClick={() => handleColorSelect(color)}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ColorPicker
