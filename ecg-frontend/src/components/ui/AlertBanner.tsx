'use client'

import { AlertIcon, CloseIcon, InfoIcon } from '@/components/icons'
import {
  ALERT_BANNER_COLORS,
  cn,
  createClickHandler,
  logComponentWarning,
  SIZE_CLASSES,
  TRANSITIONS,
  type BaseComponentProps,
} from '@/utils'
import React, { useState } from 'react'

export type AlertBannerVariant = 'neutral' | 'informative' | 'negative'

export interface AlertBannerProps
  extends Omit<BaseComponentProps, 'isDisabled'> {
  text: string
  variant?: AlertBannerVariant
  actionLabel?: string
  onAction?: () => void
  isDismissible?: boolean
  onDismiss?: () => void
  id?: string
}

const AlertBanner: React.FC<AlertBannerProps> = ({
  text,
  variant = 'neutral',
  actionLabel,
  onAction,
  isDismissible = false,
  onDismiss,
  size = 'medium',
  className,
  id,
}) => {
  // Validation
  if (!text) {
    logComponentWarning('AlertBanner', 'Text is required and cannot be empty.')
  }

  const [isVisible, setIsVisible] = useState(true)
  const sizeClasses = SIZE_CLASSES.alertBanner[size]
  const colorClasses = ALERT_BANNER_COLORS[variant]

  // Handle dismiss
  const handleDismiss = createClickHandler({
    onClick: () => {
      setIsVisible(false)
      onDismiss?.()
    },
  })

  // Handle action
  const handleAction = createClickHandler({
    onClick: onAction,
  })

  // Don't render if dismissed
  if (!isVisible) return null

  // Get appropriate icon based on variant
  const renderIcon = () => {
    const iconClasses = cn(
      sizeClasses.icon,
      colorClasses.iconColor,
      'flex-shrink-0',
      'mt-0.5'
    )

    switch (variant) {
      case 'informative':
        return <InfoIcon className={iconClasses} />
      case 'negative':
        return <AlertIcon className={iconClasses} />
      case 'neutral':
      default:
        return <InfoIcon className={iconClasses} />
    }
  }

  // Container classes
  const containerClasses = cn(
    'flex',
    'items-start',
    'gap-3',
    sizeClasses.container,
    'border-l-4',
    'rounded-default',
    colorClasses.background,
    colorClasses.border,
    TRANSITIONS.colors,
    className
  )

  // Content classes
  const contentClasses = cn(
    'flex-1',
    'flex',
    'items-start',
    'justify-between',
    'gap-4',
    'min-w-0' // Prevent flex overflow
  )

  // Text classes
  const textClasses = cn(
    sizeClasses.text,
    'font-medium',
    colorClasses.text,
    'leading-relaxed'
  )

  // Action button classes
  const actionButtonClasses = cn(
    'inline-flex',
    'items-center',
    'font-medium',
    'underline',
    'hover:no-underline',
    sizeClasses.text,
    colorClasses.text,
    TRANSITIONS.colors,
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'focus:ring-current',
    'rounded-sm'
  )

  // Dismiss button classes
  const dismissButtonClasses = cn(
    'flex-shrink-0',
    'inline-flex',
    'items-center',
    'justify-center',
    'rounded-md',
    'p-1',
    'ml-4',
    colorClasses.iconColor,
    'hover:bg-black hover:bg-opacity-5',
    TRANSITIONS.colors,
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'focus:ring-current'
  )

  return (
    <div className={containerClasses} role="alert" aria-live="polite" id={id}>
      {/* Icon */}
      {renderIcon()}

      {/* Content */}
      <div className={contentClasses}>
        <div className="flex items-start flex-col gap-2 flex-1">
          {/* Alert Text */}
          <p className={textClasses}>{text}</p>

          {/* Action Button */}
          {actionLabel && onAction && (
            <button
              type="button"
              className={actionButtonClasses}
              onClick={handleAction}
            >
              {actionLabel}
            </button>
          )}
        </div>

        {/* Dismiss Button */}
        {isDismissible && (
          <button
            type="button"
            className={dismissButtonClasses}
            onClick={handleDismiss}
            aria-label="Dismiss alert"
          >
            <CloseIcon className={sizeClasses.button} />
          </button>
        )}
      </div>
    </div>
  )
}

export default AlertBanner
