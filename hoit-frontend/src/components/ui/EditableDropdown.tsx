'use client'

import { cn, type BaseComponentProps } from '@/utils'
import React, { useEffect, useRef, useState } from 'react'

export interface EditableDropdownProps extends BaseComponentProps {
  value?: string
  onChange?: (value: string) => void
  options?: string[]
  variant?: 'default' | 'toolbar'
  placeholder?: string
  width?: number
}

const EditableDropdown: React.FC<EditableDropdownProps> = ({
  value = '',
  onChange,
  options = [],
  variant = 'default',
  size = 'medium',
  isDisabled = false,
  placeholder = 'Enter value',
  width,
  className,
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  const handleOptionSelect = (option: string) => {
    onChange?.(option)
    setShowDropdown(false)
  }

  const handleDropdownToggle = () => {
    if (!isDisabled) {
      setShowDropdown(!showDropdown)
    }
  }

  // Size-based classes
  const sizeClasses = {
    small: {
      input: 'h-6 px-2 pr-6 text-xs',
      width: 'w-12',
      dropdown: 'w-16',
      option: 'px-2 py-1 text-xs',
      icon: 'w-2.5 h-2.5',
    },
    medium: {
      input: 'h-8 px-2 pr-6 text-sm',
      width: 'w-16',
      dropdown: 'w-20',
      option: 'px-3 py-1.5 text-sm',
      icon: 'w-3 h-3',
    },
    large: {
      input: 'h-10 px-3 pr-8 text-base',
      width: 'w-20',
      dropdown: 'w-24',
      option: 'px-4 py-2 text-base',
      icon: 'w-4 h-4',
    },
    'extra-large': {
      input: 'h-12 px-4 pr-10 text-lg',
      width: 'w-24',
      dropdown: 'w-28',
      option: 'px-5 py-2.5 text-lg',
      icon: 'w-5 h-5',
    },
  }

  const currentSize = sizeClasses[size]

  // Variant-based classes
  const variantClasses = {
    default: {
      input:
        'bg-white border-2 border-slate-300 text-black hover:border-slate-400 hover:bg-gray-50 focus:border-slate-400',
      dropdown: 'bg-white border border-slate-300',
      option: 'text-black hover:bg-gray-100',
    },
    toolbar: {
      input:
        'bg-slate-700/90 border-2 border-slate-500/70 text-white hover:border-slate-400 hover:bg-slate-600/90 focus:border-slate-400',
      dropdown: 'bg-slate-700/95 border border-slate-500/70 backdrop-blur-sm',
      option: 'text-white hover:bg-slate-600/70',
    },
  }

  const inputClasses = cn(
    'rounded-default transition-all focus:outline-none focus:ring-2 focus:ring-blue-200',
    currentSize.input,
    width ? '' : currentSize.width,
    variantClasses[variant].input,
    isDisabled && 'opacity-50 cursor-not-allowed',
    className
  )

  const dropdownClasses = cn(
    'absolute top-full mt-1 left-0 rounded-default shadow-lg z-50 max-h-40 overflow-auto',
    currentSize.dropdown,
    variantClasses[variant].dropdown
  )

  const containerStyle = width ? { width: `${width}px` } : {}

  return (
    <div className="relative" style={containerStyle}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={inputClasses}
        disabled={isDisabled}
        onClick={(e) => e.stopPropagation()}
      />

      {options.length > 0 && (
        <button
          type="button"
          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-600/70 rounded transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            handleDropdownToggle()
          }}
          disabled={isDisabled}
          aria-label="Show options"
        >
          <svg
            className={cn(
              currentSize.icon,
              variant === 'toolbar' ? 'text-slate-300' : 'text-gray-600'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}

      {showDropdown && options.length > 0 && (
        <div
          ref={dropdownRef}
          className={dropdownClasses}
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((option) => (
            <button
              key={option}
              className={cn(
                'w-full text-left transition-colors cursor-pointer',
                currentSize.option,
                variantClasses[variant].option
              )}
              onClick={(e) => {
                e.stopPropagation()
                handleOptionSelect(option)
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default EditableDropdown
