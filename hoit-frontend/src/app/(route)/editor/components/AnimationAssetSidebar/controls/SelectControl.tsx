'use client'

import React from 'react'
import { IoChevronDown } from 'react-icons/io5'

interface SelectOption {
  value: string
  label: string
}

interface SelectControlProps {
  label: string
  value: string
  options: SelectOption[]
  emoji?: string
  onChange: (value: string) => void
}

const SelectControl: React.FC<SelectControlProps> = ({
  label,
  value,
  options,
  emoji = '📋',
  onChange,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-300">
        {emoji} {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={handleChange}
          className="w-full appearance-none bg-slate-700 border border-slate-600 text-white text-xs rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <IoChevronDown size={12} className="text-slate-400" />
        </div>
      </div>
    </div>
  )
}

export default SelectControl
