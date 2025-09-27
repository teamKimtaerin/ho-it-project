'use client'

import React from 'react'
import { LuCheck } from 'react-icons/lu'
import { cn } from '@/lib/utils'

export interface CheckboxProps {
  label?: string
  checked?: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
  className?: string
  id?: string
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked = false,
  disabled = false,
  onChange,
  className,
  id,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked)
  }

  const checkboxClasses = cn(
    'w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center cursor-pointer transition-all duration-200',
    checked && 'bg-black border-black',
    disabled && 'cursor-not-allowed opacity-60',
    className
  )

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          className="sr-only"
        />
        <div
          className={checkboxClasses}
          onClick={() => !disabled && onChange?.(!checked)}
        >
          {checked && <LuCheck className="w-4 h-4 text-white font-bold" />}
        </div>
      </div>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'text-sm text-gray-900 cursor-pointer',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        >
          {label}
        </label>
      )}
    </div>
  )
}

export default Checkbox
