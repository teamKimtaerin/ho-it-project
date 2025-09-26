'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface RadioButtonProps {
  name: string
  value: string
  checked?: boolean
  onChange?: (value: string) => void
  label?: string
  className?: string
  id?: string
}

const RadioButton: React.FC<RadioButtonProps> = ({
  name,
  value,
  checked = false,
  onChange,
  label,
  className,
  id,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div className="relative">
        <input
          type="radio"
          id={id}
          name={name}
          value={value}
          checked={checked}
          onChange={handleChange}
          className="sr-only"
        />
        <div
          className={cn(
            'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-200',
            checked ? 'border-gray-800 bg-gray-800' : 'border-gray-300 bg-white'
          )}
          onClick={() => onChange?.(value)}
        >
          {checked && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
      {label && (
        <label htmlFor={id} className="text-sm text-gray-900 cursor-pointer">
          {label}
        </label>
      )}
    </div>
  )
}

export default RadioButton
