'use client'

import React from 'react'

interface SliderControlProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  emoji?: string
  onChange: (value: number) => void
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = '',
  emoji = '🎛️',
  onChange,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    onChange(newValue)
  }

  const formatValue = (val: number) => {
    if (unit === '%') return `${Math.round(val)}${unit}`
    if (unit === 's') return `${val.toFixed(1)}${unit}`
    if (unit === 'x') return `${val.toFixed(1)}${unit}`
    return `${val}`
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-300">
          {emoji} {label}
        </label>
        <span className="text-xs text-slate-400">{formatValue(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
      />

      {/* Custom Slider Styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #1e293b;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }

        .slider::-webkit-slider-thumb:hover {
          background: #2563eb;
          transform: scale(1.1);
        }

        .slider::-webkit-slider-track {
          background: #475569;
          border-radius: 4px;
          height: 8px;
        }

        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #1e293b;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .slider::-moz-range-track {
          background: #475569;
          border-radius: 4px;
          height: 8px;
        }
      `}</style>
    </div>
  )
}

export default SliderControl
