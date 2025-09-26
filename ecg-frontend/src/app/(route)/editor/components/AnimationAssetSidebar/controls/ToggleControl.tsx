'use client'

import React from 'react'

interface ToggleControlProps {
  label: string
  value: boolean
  emoji?: string
  onChange: (value: boolean) => void
}

const ToggleControl: React.FC<ToggleControlProps> = ({
  label,
  value,
  emoji = '🔘',
  onChange,
}) => {
  const handleToggle = () => {
    onChange(!value)
  }

  return (
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium text-slate-300">
        {emoji} {label}
      </label>
      <button
        onClick={handleToggle}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
          value ? 'bg-blue-600' : 'bg-slate-600'
        }`}
      >
        <span className="sr-only">Toggle {label}</span>
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${
            value ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

export default ToggleControl
