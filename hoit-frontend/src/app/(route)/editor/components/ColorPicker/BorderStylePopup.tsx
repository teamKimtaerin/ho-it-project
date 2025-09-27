'use client'

import React, { useState } from 'react'
import ColorPalette from './ColorPalette'
import ColorPicker from './ColorPicker'

interface BorderStylePopupProps {
  color: string
  thickness: number
  onColorChange: (color: string) => void
  onThicknessChange: (thickness: number) => void
  onClose?: () => void
  className?: string
}

export default function BorderStylePopup({
  color,
  thickness,
  onColorChange,
  onThicknessChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClose,
  className = '',
}: BorderStylePopupProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [currentThickness, setCurrentThickness] = useState(thickness)

  const handleThicknessChange = (value: number) => {
    setCurrentThickness(value)
    onThicknessChange(value)
  }

  return (
    <div
      className={`bg-black rounded-lg shadow-2xl border border-gray-800 ${className}`}
    >
      {/* Header Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            !showColorPicker
              ? 'text-white bg-gray-900'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setShowColorPicker(false)}
        >
          <div className="flex items-center justify-center gap-2">
            <span>테두리</span>
            <div
              className="w-4 h-4 rounded border border-gray-600"
              style={{ backgroundColor: color }}
            />
          </div>
        </button>
        <button
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            showColorPicker
              ? 'text-white bg-gray-900'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setShowColorPicker(true)}
        >
          <div className="flex items-center justify-center gap-2">
            <span>배경</span>
            <div
              className="w-4 h-4 rounded border border-gray-600"
              style={{ backgroundColor: color }}
            />
          </div>
        </button>
        <button className="px-4 py-3 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors">
          형광펜
        </button>
        <button className="px-4 py-3 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors">
          그림자
        </button>
      </div>

      {/* Content */}
      <div>
        {!showColorPicker ? (
          <>
            {/* Color Palette */}
            <ColorPalette
              selectedColor={color}
              onColorSelect={onColorChange}
              showCustomColor={true}
              onCustomColorClick={() => setShowColorPicker(true)}
            />

            {/* Thickness Slider */}
            <div className="px-4 pb-4 border-t border-gray-800">
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-medium">
                    두께
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={currentThickness}
                      onChange={(e) =>
                        handleThicknessChange(Number(e.target.value))
                      }
                      className="w-12 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white text-center focus:outline-none focus:border-gray-500"
                      min="1"
                      max="20"
                    />
                    <span className="text-xs text-gray-400">px</span>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={currentThickness}
                    onChange={(e) =>
                      handleThicknessChange(Number(e.target.value))
                    }
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #4B5563 0%, #4B5563 ${
                        ((currentThickness - 1) / 19) * 100
                      }%, #1F2937 ${((currentThickness - 1) / 19) * 100}%, #1F2937 100%)`,
                    }}
                  />
                  {/* Dots for scale */}
                  <div className="flex justify-between mt-1">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 h-1 bg-gray-600 rounded-full"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Advanced Color Picker */}
            <ColorPicker
              color={color}
              onChange={onColorChange}
              onClose={() => setShowColorPicker(false)}
            />

            {/* Thickness slider remains visible */}
            <div className="px-4 pb-4 border-t border-gray-800">
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-medium">
                    두께
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={currentThickness}
                      onChange={(e) =>
                        handleThicknessChange(Number(e.target.value))
                      }
                      className="w-12 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white text-center focus:outline-none focus:border-gray-500"
                      min="1"
                      max="20"
                    />
                    <span className="text-xs text-gray-400">px</span>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={currentThickness}
                    onChange={(e) =>
                      handleThicknessChange(Number(e.target.value))
                    }
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #4B5563 0%, #4B5563 ${
                        ((currentThickness - 1) / 19) * 100
                      }%, #1F2937 ${((currentThickness - 1) / 19) * 100}%, #1F2937 100%)`,
                    }}
                  />
                  {/* Dots for scale */}
                  <div className="flex justify-between mt-1">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 h-1 bg-gray-600 rounded-full"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
