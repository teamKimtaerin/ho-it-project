import {
  BADGE_COLORS,
  cn,
  logComponentWarning,
  SIZE_CLASSES,
  TRANSITIONS,
  type BaseComponentProps,
} from '@/utils'
import React from 'react'

export type BadgeVariant = keyof typeof BADGE_COLORS
export type BadgeFixed = 'none' | 'top' | 'right' | 'bottom' | 'left'
export type BadgeRounding = 'default' | 'small' | 'full'

export interface BadgeProps extends Omit<BaseComponentProps, 'isDisabled'> {
  label?: string
  icon?: React.ReactNode
  variant?: BadgeVariant
  fixed?: BadgeFixed
  rounding?: BadgeRounding
  id?: string
}

const Badge: React.FC<BadgeProps> = ({
  label,
  icon,
  variant = 'neutral',
  fixed = 'none',
  rounding = 'full',
  size = 'small',
  className,
  id,
}) => {
  // Validation
  if (!label && !icon) {
    logComponentWarning('Badge', 'Either label or icon must be provided.')
  }

  // Get size and color classes
  const sizeClasses = SIZE_CLASSES.badge[size]
  const colorClasses = BADGE_COLORS[variant]

  // Determine if it's icon-only
  const isIconOnly = !label && icon

  // Get rounding classes
  const roundingClasses = getRoundingClasses(rounding)

  // Base badge classes
  const badgeClasses = cn(
    // Base styles
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'whitespace-nowrap',
    'select-none',

    // Size-based classes
    isIconOnly ? sizeClasses.onlyIcon : sizeClasses.container,

    // Rounding classes
    roundingClasses,

    // Color classes
    colorClasses.bg,
    colorClasses.text,

    // Transitions
    TRANSITIONS.colors,

    // Fixed positioning
    fixed !== 'none' && getFixedPositionClasses(fixed),

    className
  )

  // Icon classes
  const iconClasses = cn(
    sizeClasses.icon,
    'flex-shrink-0',
    label && 'mr-1' // Add margin when both icon and label exist
  )

  return (
    <span
      className={badgeClasses}
      id={id}
      role="status"
      aria-label={label || 'Badge'}
    >
      {/* Icon */}
      {icon && <span className={iconClasses}>{icon}</span>}

      {/* Label */}
      {label && <span className="truncate">{label}</span>}
    </span>
  )
}

/**
 * Get rounding classes for badge border radius
 */
function getRoundingClasses(rounding: BadgeRounding): string {
  switch (rounding) {
    case 'default':
      return 'rounded-default'
    case 'small':
      return 'rounded-small'
    case 'full':
      return 'rounded-full'
    default:
      return 'rounded-full'
  }
}

/**
 * Get fixed position classes for badge positioning
 */
function getFixedPositionClasses(fixed: BadgeFixed): string {
  const baseFixed = 'absolute z-10'

  switch (fixed) {
    case 'top':
      return cn(baseFixed, '-top-2 left-1/2 -translate-x-1/2')
    case 'right':
      return cn(baseFixed, '-top-2 -right-2')
    case 'bottom':
      return cn(baseFixed, '-bottom-2 left-1/2 -translate-x-1/2')
    case 'left':
      return cn(baseFixed, '-top-2 -left-2')
    case 'none':
    default:
      return ''
  }
}

export default Badge
