'use client'

import React, { useState, useRef, useEffect } from 'react'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  onClose?: () => void
  className?: string
}

export default function ColorPicker({
  color: initialColor,
  onChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClose,
  className = '',
}: ColorPickerProps) {
  const [color, setColor] = useState(initialColor)
  const [hue, setHue] = useState(0)
  const [saturation, setSaturation] = useState(100)
  const [brightness, setBrightness] = useState(50)
  const [hexInput, setHexInput] = useState(initialColor)
  const [colorFormat, setColorFormat] = useState<'HEX' | 'RGB' | 'HSL'>('HEX')

  const gradientRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  // HSB to HEX conversion
  const hsbToHex = (h: number, s: number, b: number): string => {
    const hNorm = h / 360
    const sNorm = s / 100
    const bNorm = b / 100

    const c = bNorm * sNorm
    const x = c * (1 - Math.abs(((hNorm * 6) % 2) - 1))
    const m = bNorm - c

    let r = 0,
      g = 0,
      b2 = 0

    if (hNorm < 1 / 6) {
      r = c
      g = x
      b2 = 0
    } else if (hNorm < 2 / 6) {
      r = x
      g = c
      b2 = 0
    } else if (hNorm < 3 / 6) {
      r = 0
      g = c
      b2 = x
    } else if (hNorm < 4 / 6) {
      r = 0
      g = x
      b2 = c
    } else if (hNorm < 5 / 6) {
      r = x
      g = 0
      b2 = c
    } else {
      r = c
      g = 0
      b2 = x
    }

    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }

    return `#${toHex(r)}${toHex(g)}${toHex(b2)}`
  }

  // Update color when HSB changes
  useEffect(() => {
    const newColor = hsbToHex(hue, saturation, brightness)
    setColor(newColor)
    setHexInput(newColor.toUpperCase())
    onChange(newColor)
  }, [hue, saturation, brightness, onChange])

  // Handle gradient click
  const handleGradientClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gradientRef.current) return

    const rect = gradientRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newSaturation = (x / rect.width) * 100
    const newBrightness = 100 - (y / rect.height) * 100

    setSaturation(Math.max(0, Math.min(100, newSaturation)))
    setBrightness(Math.max(0, Math.min(100, newBrightness)))
  }

  // Handle hue slider click
  const handleHueClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hueRef.current) return

    const rect = hueRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newHue = (x / rect.width) * 360

    setHue(Math.max(0, Math.min(360, newHue)))
  }

  // Handle hex input
  const handleHexInputChange = (value: string) => {
    setHexInput(value)
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      setColor(value)
      onChange(value)
      // TODO: Convert hex to HSB and update sliders
    }
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
      {/* Gradient Selector */}
      <div className="space-y-4">
        <div
          ref={gradientRef}
          className="relative w-full h-48 rounded-lg cursor-crosshair overflow-hidden"
          style={{
            background: `linear-gradient(to bottom, transparent, black), 
                        linear-gradient(to right, white, hsl(${hue}, 100%, 50%))`,
          }}
          onClick={handleGradientClick}
          onMouseMove={(e) => {
            if (e.buttons === 1) handleGradientClick(e)
          }}
        >
          {/* Color picker cursor */}
          <div
            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${saturation}%`,
              top: `${100 - brightness}%`,
              backgroundColor: color,
            }}
          />
        </div>

        {/* Hue Slider */}
        <div
          ref={hueRef}
          className="relative w-full h-8 rounded-md cursor-pointer"
          style={{
            background: `linear-gradient(to right, 
              hsl(0, 100%, 50%), 
              hsl(60, 100%, 50%), 
              hsl(120, 100%, 50%), 
              hsl(180, 100%, 50%), 
              hsl(240, 100%, 50%), 
              hsl(300, 100%, 50%), 
              hsl(360, 100%, 50%))`,
          }}
          onClick={handleHueClick}
          onMouseMove={(e) => {
            if (e.buttons === 1) handleHueClick(e)
          }}
        >
          <div
            className="absolute top-0 w-1 h-full bg-white shadow-lg pointer-events-none"
            style={{ left: `${(hue / 360) * 100}%` }}
          />
        </div>

        {/* Color Input Section */}
        <div className="flex items-center gap-2">
          {/* Format Dropdown */}
          <button
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 hover:bg-gray-700 cursor-pointer"
            onClick={() => {
              const formats: ('HEX' | 'RGB' | 'HSL')[] = ['HEX', 'RGB', 'HSL']
              const currentIndex = formats.indexOf(colorFormat)
              setColorFormat(formats[(currentIndex + 1) % formats.length])
            }}
          >
            {colorFormat} ▼
          </button>

          {/* Color Preview */}
          <div
            className="w-10 h-10 rounded border-2 border-gray-600"
            style={{ backgroundColor: color }}
          />

          {/* Hex Input */}
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexInputChange(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-gray-500"
            placeholder="#000000"
          />
        </div>
      </div>
    </div>
  )
}
