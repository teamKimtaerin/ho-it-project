'use client'

import {
  cn,
  createClickHandler,
  createKeyboardHandler,
  getDisabledClasses,
  SIZE_CLASSES,
  TRANSITIONS,
  type InteractiveComponentProps,
} from '@/utils'
import React from 'react'

export interface SwitchProps extends InteractiveComponentProps {
  label?: string
  isSelected?: boolean
  isEmphasized?: boolean
  onChange?: (selected: boolean) => void
  id?: string
}

const Switch: React.FC<SwitchProps> = ({
  label,
  isSelected = false,
  size = 'medium',
  isEmphasized = false,
  isDisabled = false,
  isReadOnly = false,
  onChange,
  className,
  id,
}) => {
  const sizeClasses = SIZE_CLASSES.switch[size]

  const handleClick = createClickHandler({
    isDisabled,
    isReadOnly,
    onClick: () => onChange?.(!isSelected),
  })

  const handleKeyDown = createKeyboardHandler({
    isDisabled,
    isReadOnly,
    onActivate: () => onChange?.(!isSelected),
  })

  const trackClasses = cn(
    'relative inline-flex items-center shrink-0 cursor-pointer',
    'rounded-full',
    TRANSITIONS.normal,
    'border-2 border-transparent',
    sizeClasses.track,

    // Track background states - OFF/ON 상태에 따라 명확히 구분
    isSelected
      ? isEmphasized
        ? 'bg-primary-dark shadow-inner'
        : 'bg-primary shadow-inner'
      : 'bg-gray-slate shadow-inner',

    // Hover states
    !isDisabled &&
      !isReadOnly &&
      (isSelected
        ? isEmphasized
          ? 'hover:bg-primary hover:shadow-md'
          : 'hover:bg-primary-dark hover:shadow-md'
        : 'hover:bg-black hover:shadow-sm'),

    // Focus states
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    isSelected ? 'focus:ring-primary-light' : 'focus:ring-gray-medium',

    // Disabled states
    (isDisabled || isReadOnly) && getDisabledClasses()
  )

  const thumbClasses = cn(
    'absolute',
    sizeClasses.thumbPosition,
    'bg-white',
    'rounded-full',
    'shadow-md',
    TRANSITIONS.transform,
    'pointer-events-none',
    sizeClasses.thumb,

    // Transform - OFF/ON 상태에 따라 좌우 이동
    isSelected && sizeClasses.thumbTransform,

    // Interactive visual feedback
    !isDisabled && !isReadOnly && (isSelected ? 'shadow-lg' : 'shadow-md'),

    // Enhanced shadow for emphasis
    isEmphasized && 'shadow-xl'
  )

  const labelClasses = cn(
    'text-text-primary',
    'font-medium',
    SIZE_CLASSES.typography[size],
    isDisabled && 'opacity-50'
  )

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 text-text-primary',
        className
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={isSelected}
        aria-disabled={isDisabled}
        aria-readonly={isReadOnly}
        disabled={isDisabled || isReadOnly}
        className={trackClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        id={id}
        aria-label={label || `Toggle switch ${isSelected ? 'on' : 'off'}`}
      >
        {/* Track 내부의 시각적 인디케이터 */}
        <span className="sr-only">{isSelected ? 'On' : 'Off'}</span>

        {/* Thumb (Handle) */}
        <span className={thumbClasses} aria-hidden="true" />
      </button>

      {label && (
        <label
          htmlFor={id}
          className={cn(
            labelClasses,
            !isDisabled && !isReadOnly && 'cursor-pointer'
          )}
          onClick={isDisabled || isReadOnly ? undefined : handleClick}
        >
          {label}
        </label>
      )}
    </div>
  )
}

export default Switch
