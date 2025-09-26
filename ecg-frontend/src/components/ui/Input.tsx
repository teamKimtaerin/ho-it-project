'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import HelpText from './HelpText'

export interface InputProps {
  label?: string
  type?: 'text' | 'email' | 'password' | 'number'
  value?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  helperText?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  className?: string
}

const Input: React.FC<InputProps> = ({
  label,
  type = 'text',
  value = '',
  placeholder,
  disabled = false,
  required = false,
  error,
  helperText,
  onChange,
  onBlur,
  className,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  const inputClasses = cn(
    // Base styles
    'w-full px-3 py-2 border rounded-md shadow-sm placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500',
    'transition-colors duration-200',

    // State styles
    error
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300',

    disabled && 'bg-gray-50 cursor-not-allowed opacity-60',

    className
  )

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onChange={handleChange}
        onBlur={onBlur}
        className={inputClasses}
      />

      {error && <HelpText text={error} variant="negative" className="mt-1" />}

      {helperText && !error && (
        <HelpText text={helperText} variant="neutral" className="mt-1" />
      )}
    </div>
  )
}

export default Input
