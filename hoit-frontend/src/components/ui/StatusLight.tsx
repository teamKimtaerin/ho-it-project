import {
  cn,
  getDisabledClasses,
  logComponentWarning,
  SIZE_CLASSES,
  STATUS_LIGHT_COLORS,
  TRANSITIONS,
  type BaseComponentProps,
} from '@/utils'
import React from 'react'

export type StatusLightVariant =
  | 'informative'
  | 'neutral'
  | 'positive'
  | 'notice'
  | 'negative'
  | 'indigo'
  | 'celery'
  | 'chartreuse'
  | 'yellow'
  | 'magenta'
  | 'fuchsia'
  | 'purple'
  | 'seafoam'

export interface StatusLightProps extends BaseComponentProps {
  label: string
  variant?: StatusLightVariant
  id?: string
}

const StatusLight: React.FC<StatusLightProps> = ({
  label,
  variant = 'informative',
  size = 'medium',
  isDisabled = false,
  className,
  id,
}) => {
  // Validation
  if (!label) {
    logComponentWarning('StatusLight', 'Label is required and cannot be empty.')
  }

  const sizeClasses = SIZE_CLASSES.statusLight[size]

  // Container classes
  const containerClasses = cn(
    'inline-flex',
    'items-center',
    'font-medium',
    sizeClasses.container,
    sizeClasses.text,
    TRANSITIONS.colors,

    // Text color
    'text-text-primary',

    // Disabled state
    isDisabled && getDisabledClasses(),

    className
  )

  // Status dot classes
  const dotClasses = cn(
    'rounded-full',
    'flex-shrink-0',
    sizeClasses.dot,
    STATUS_LIGHT_COLORS[variant],
    TRANSITIONS.colors,

    // Disabled state for dot
    isDisabled && 'opacity-50'
  )

  // Label classes
  const labelClasses = cn('select-none', isDisabled && 'opacity-50')

  return (
    <div
      className={containerClasses}
      role="status"
      aria-label={`Status: ${variant} - ${label}`}
      id={id}
    >
      {/* Status indicator dot */}
      <div className={dotClasses} aria-hidden="true" />

      {/* Status label */}
      <span className={labelClasses}>{label}</span>
    </div>
  )
}

export default StatusLight
