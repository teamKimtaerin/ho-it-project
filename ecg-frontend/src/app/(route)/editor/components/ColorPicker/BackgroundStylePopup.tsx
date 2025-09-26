'use client'

import React, { useState } from 'react'
import ColorPalette from './ColorPalette'
import ColorPicker from './ColorPicker'

interface BackgroundStylePopupProps {
  color: string
  opacity: number
  onColorChange: (color: string) => void
  onOpacityChange: (opacity: number) => void
  onClose?: () => void
  className?: string
}

export default function BackgroundStylePopup({
  color,
  opacity,
  onColorChange,
  onOpacityChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClose,
  className = '',
}: BackgroundStylePopupProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [currentOpacity, setCurrentOpacity] = useState(opacity)

  const handleOpacityChange = (value: number) => {
    setCurrentOpacity(value)
    onOpacityChange(value)
  }

  return (
    <div
      className={`bg-black rounded-lg shadow-2xl border border-gray-800 ${className}`}
    >
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

            {/* Opacity Slider */}
            <div className="px-4 pb-4 border-t border-gray-800">
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-medium">
                    불투명도
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={Math.round(currentOpacity * 100)}
                      onChange={(e) =>
                        handleOpacityChange(Number(e.target.value) / 100)
                      }
                      className="w-12 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white text-center focus:outline-none focus:border-gray-500"
                      min="0"
                      max="100"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentOpacity * 100}
                    onChange={(e) =>
                      handleOpacityChange(Number(e.target.value) / 100)
                    }
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #4B5563 0%, #4B5563 ${
                        currentOpacity * 100
                      }%, #1F2937 ${currentOpacity * 100}%, #1F2937 100%)`,
                    }}
                  />
                  {/* Preview with opacity */}
                  <div className="mt-3 h-8 rounded border border-gray-700 bg-checkered relative">
                    <div
                      className="absolute inset-0 rounded"
                      style={{
                        backgroundColor: color,
                        opacity: currentOpacity,
                      }}
                    />
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

            {/* Opacity slider remains visible */}
            <div className="px-4 pb-4 border-t border-gray-800">
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-medium">
                    불투명도
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={Math.round(currentOpacity * 100)}
                      onChange={(e) =>
                        handleOpacityChange(Number(e.target.value) / 100)
                      }
                      className="w-12 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white text-center focus:outline-none focus:border-gray-500"
                      min="0"
                      max="100"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentOpacity * 100}
                    onChange={(e) =>
                      handleOpacityChange(Number(e.target.value) / 100)
                    }
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #4B5563 0%, #4B5563 ${
                        currentOpacity * 100
                      }%, #1F2937 ${currentOpacity * 100}%, #1F2937 100%)`,
                    }}
                  />
                  {/* Preview with opacity */}
                  <div className="mt-3 h-8 rounded border border-gray-700 bg-checkered relative">
                    <div
                      className="absolute inset-0 rounded"
                      style={{
                        backgroundColor: color,
                        opacity: currentOpacity,
                      }}
                    />
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
