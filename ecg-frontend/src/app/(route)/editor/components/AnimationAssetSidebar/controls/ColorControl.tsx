'use client'

import React from 'react'

interface ColorControlProps {
  label: string
  value: string
  emoji?: string
  onChange: (value: string) => void
}

const ColorControl: React.FC<ColorControlProps> = ({
  label,
  value,
  emoji = '🎨',
  onChange,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium text-slate-300">
        {emoji} {label}
      </label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-mono">
          {value.toUpperCase()}
        </span>
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={handleChange}
            className="w-8 h-6 rounded border border-slate-600 cursor-pointer bg-transparent appearance-none"
            style={{
              WebkitAppearance: 'none',
              MozAppearance: 'none',
            }}
          />
          <div
            className="absolute inset-0 rounded border border-slate-600 pointer-events-none"
            style={{ backgroundColor: value }}
          />
        </div>
      </div>

      {/* Custom Color Input Styles */}
      <style jsx>{`
        input[type='color'] {
          -webkit-appearance: none;
          border: none;
          background: transparent;
        }
        input[type='color']::-webkit-color-swatch-wrapper {
          padding: 0;
          border: none;
          border-radius: 4px;
        }
        input[type='color']::-webkit-color-swatch {
          border: none;
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}

export default ColorControl
