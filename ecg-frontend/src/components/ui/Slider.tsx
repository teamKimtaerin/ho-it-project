'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'

export interface SliderProps {
  label?: string
  labelPosition?: 'top' | 'left'
  value?: number
  minValue?: number
  maxValue?: number
  step?: number
  valueFormat?: (value: number) => string
  progressionScale?: 'linear' | 'log'
  width?: number | string
  hasFill?: boolean
  fillStart?: number
  hasGradient?: boolean
  isEditable?: boolean
  isDisabled?: boolean
  onChange?: (value: number) => void
  className?: string
}

const Slider: React.FC<SliderProps> = ({
  label,
  labelPosition = 'top',
  value,
  minValue = 0,
  maxValue = 100,
  step = 1,
  valueFormat = (val) => val.toString(),
  progressionScale = 'linear',
  width = '100%',
  hasFill = false,
  fillStart,
  hasGradient = false,
  isEditable = true,
  isDisabled = false,
  onChange,
  className = '',
}) => {
  // Internal state for uncontrolled component
  const [internalValue, setInternalValue] = useState(value ?? minValue)
  const [isDragging, setIsDragging] = useState(false)

  const sliderRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Get current value (controlled or uncontrolled)
  const currentValue = value !== undefined ? value : internalValue

  // Clamp value within bounds
  const clampValue = useCallback(
    (val: number) => {
      return Math.min(maxValue, Math.max(minValue, val))
    },
    [minValue, maxValue]
  )

  // Convert pixel position to value
  const pixelToValue = useCallback(
    (pixelX: number) => {
      if (!sliderRef.current) return minValue

      const rect = sliderRef.current.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, pixelX / rect.width))

      let newValue
      if (progressionScale === 'log') {
        // Logarithmic scale conversion
        const logMin = Math.log(Math.max(minValue, 0.1))
        const logMax = Math.log(maxValue)
        const logValue = logMin + percentage * (logMax - logMin)
        newValue = Math.exp(logValue)
      } else {
        // Linear scale
        newValue = minValue + percentage * (maxValue - minValue)
      }

      // Apply step
      const steppedValue = Math.round(newValue / step) * step
      return clampValue(steppedValue)
    },
    [minValue, maxValue, step, progressionScale, clampValue]
  )

  // Convert value to percentage for positioning
  const valueToPercentage = useCallback(
    (val: number) => {
      if (progressionScale === 'log') {
        const logMin = Math.log(Math.max(minValue, 0.1))
        const logMax = Math.log(maxValue)
        const logValue = Math.log(Math.max(val, 0.1))
        return Math.max(0, Math.min(1, (logValue - logMin) / (logMax - logMin)))
      } else {
        return Math.max(
          0,
          Math.min(1, (val - minValue) / (maxValue - minValue))
        )
      }
    },
    [minValue, maxValue, progressionScale]
  )

  // Handle value change with animation frame for smooth updates
  const handleValueChange = useCallback(
    (newValue: number) => {
      const clampedValue = clampValue(newValue)

      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // Use requestAnimationFrame for smooth visual updates
      animationFrameRef.current = requestAnimationFrame(() => {
        if (value === undefined) {
          setInternalValue(clampedValue)
        }
        onChange?.(clampedValue)
      })
    },
    [value, onChange, clampValue]
  )

  // Mouse/touch event handlers
  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!isEditable || isDisabled) return

      event.preventDefault()
      setIsDragging(true)

      // Capture the pointer to ensure we get move events even if cursor leaves the element
      const target = event.currentTarget
      if (target instanceof HTMLElement) {
        target.setPointerCapture(event.pointerId)
      }

      const rect = sliderRef.current?.getBoundingClientRect()
      if (rect) {
        const pixelX = event.clientX - rect.left
        const newValue = pixelToValue(pixelX)
        handleValueChange(newValue)
      }
    },
    [isEditable, isDisabled, pixelToValue, handleValueChange]
  )

  // Pointer move and up handlers
  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!isDragging || !isEditable || isDisabled) return

      event.preventDefault()
      const rect = sliderRef.current?.getBoundingClientRect()
      if (rect) {
        const pixelX = Math.max(
          0,
          Math.min(rect.width, event.clientX - rect.left)
        )
        const newValue = pixelToValue(pixelX)
        handleValueChange(newValue)
      }
    },
    [isDragging, isEditable, isDisabled, pixelToValue, handleValueChange]
  )

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (!isDragging) return

      setIsDragging(false)
      const target = event.currentTarget
      if (target instanceof HTMLElement) {
        target.releasePointerCapture(event.pointerId)
      }
    },
    [isDragging]
  )

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isEditable || isDisabled) return

      let delta = 0
      const largeStep = (maxValue - minValue) / 10

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          delta = step
          break
        case 'ArrowLeft':
        case 'ArrowDown':
          delta = -step
          break
        case 'PageUp':
          delta = largeStep
          break
        case 'PageDown':
          delta = -largeStep
          break
        case 'Home':
          handleValueChange(minValue)
          event.preventDefault()
          return
        case 'End':
          handleValueChange(maxValue)
          event.preventDefault()
          return
        default:
          return
      }

      if (delta !== 0) {
        event.preventDefault()
        handleValueChange(currentValue + delta)
      }
    },
    [
      isEditable,
      isDisabled,
      step,
      maxValue,
      minValue,
      currentValue,
      handleValueChange,
    ]
  )

  // Calculate positions and dimensions
  const thumbPosition = valueToPercentage(currentValue) * 100
  const fillStartPosition =
    fillStart !== undefined ? valueToPercentage(fillStart) * 100 : 0
  const fillEndPosition = thumbPosition

  // Determine fill range
  const fillLeft = Math.min(fillStartPosition, fillEndPosition)
  const fillWidth = Math.abs(fillEndPosition - fillStartPosition)

  // Container classes
  const containerClasses = [
    'relative',
    'inline-block',
    labelPosition === 'left' ? 'flex items-center gap-4' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // Slider track classes
  const trackClasses = [
    'relative',
    'h-1',
    'bg-surface-secondary',
    'rounded-full',
    'cursor-pointer',
    isDisabled ? 'opacity-50 cursor-not-allowed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Thumb classes
  const thumbClasses = [
    'absolute',
    'w-4',
    'h-4',
    '-top-1.5',
    '-ml-2',
    'bg-primary',
    'border-2',
    'border-white',
    'rounded-full',
    'shadow-md',
    // Remove transition for immediate response during drag
    ...(isDragging ? [] : ['transition-all', 'duration-200']),
    isDragging ? 'scale-110 shadow-lg' : 'hover:scale-105',
    isDisabled
      ? 'opacity-50 cursor-not-allowed'
      : 'cursor-grab active:cursor-grabbing',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-primary-light',
  ]
    .filter(Boolean)
    .join(' ')

  // Fill classes
  const fillClasses = [
    'absolute',
    'h-full',
    'rounded-full',
    // Remove transition for immediate response during drag
    ...(isDragging ? [] : ['transition-all', 'duration-150']),
    hasGradient
      ? 'bg-gradient-to-r from-primary-light to-primary'
      : 'bg-primary',
  ]
    .filter(Boolean)
    .join(' ')

  // Width style
  const sliderWidth = typeof width === 'number' ? `${width}px` : width

  return (
    <div className={containerClasses}>
      {/* Label */}
      {label && (
        <label
          className={`text-sm font-medium text-slate-400 ${
            labelPosition === 'top' ? 'block mb-2' : 'flex-shrink-0'
          }`}
        >
          {label}
        </label>
      )}

      {/* Slider Container */}
      <div className="relative" style={{ width: sliderWidth }}>
        {/* Track */}
        <div
          ref={sliderRef}
          className={trackClasses}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          role="slider"
          aria-valuemin={minValue}
          aria-valuemax={maxValue}
          aria-valuenow={currentValue}
          aria-valuetext={valueFormat(currentValue)}
          aria-disabled={isDisabled}
          tabIndex={isDisabled ? -1 : 0}
          onKeyDown={handleKeyDown}
        >
          {/* Fill */}
          {hasFill && (
            <div
              className={fillClasses}
              style={{
                left: `${fillLeft}%`,
                width: `${fillWidth}%`,
              }}
            />
          )}

          {/* Thumb */}
          <div
            ref={thumbRef}
            className={thumbClasses}
            style={{
              left: `${thumbPosition}%`,
            }}
          />
        </div>

        {/* Value Display */}
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>{valueFormat(minValue)}</span>
          <span className="text-slate-200 font-semibold">
            {valueFormat(currentValue)}
          </span>
          <span>{valueFormat(maxValue)}</span>
        </div>
      </div>
    </div>
  )
}

export default Slider
