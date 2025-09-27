'use client'

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InfoIcon,
  XCircleIcon,
} from '@/components/icons'
import Button from '@/components/ui/Button'
import {
  ALERT_DIALOG_COLORS,
  cn,
  createClickHandler,
  logComponentWarning,
  SIZE_CLASSES,
  TRANSITIONS,
  type BaseComponentProps,
} from '@/utils'
import React, { useEffect } from 'react'

export type AlertDialogVariant =
  | 'confirmation'
  | 'information'
  | 'warning'
  | 'destructive'
  | 'error'

export interface AlertDialogProps
  extends Omit<BaseComponentProps, 'isDisabled'> {
  title: string
  description?: string
  variant?: AlertDialogVariant
  primaryActionLabel: string
  secondaryActionLabel?: string
  cancelActionLabel?: string
  isOpen: boolean
  onPrimaryAction: () => void
  onSecondaryAction?: () => void
  onCancel?: () => void
  onClose?: () => void
  id?: string
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  title,
  description,
  variant = 'confirmation',
  primaryActionLabel,
  secondaryActionLabel,
  cancelActionLabel = 'Cancel',
  isOpen,
  onPrimaryAction,
  onSecondaryAction,
  onCancel,
  onClose,
  size = 'medium',
  className,
  id,
}) => {
  // Validation
  if (!title) {
    logComponentWarning('AlertDialog', 'Title is required and cannot be empty.')
  }

  if (!primaryActionLabel) {
    logComponentWarning('AlertDialog', 'Primary action label is required.')
  }

  // Get color classes for current variant
  const colorClasses = ALERT_DIALOG_COLORS[variant]

  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault()
        ;(onClose || onCancel)?.()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, onCancel])

  // Event handlers
  const handlePrimaryAction = createClickHandler({
    onClick: onPrimaryAction,
  })

  const handleSecondaryAction = createClickHandler({
    onClick: onSecondaryAction,
  })

  const handleCancel = createClickHandler({
    onClick: onCancel || onClose,
  })

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      if (onClose) {
        onClose()
      } else if (onCancel) {
        onCancel()
      }
      // ;(onClose || onCancel)?.()
    }
  }

  // Get appropriate icon based on variant
  const renderIcon = () => {
    const iconClasses = cn('w-6 h-6', colorClasses.iconColor, 'flex-shrink-0')

    switch (variant) {
      case 'confirmation':
        return <CheckCircleIcon className={iconClasses} />
      case 'information':
        return <InfoIcon className={iconClasses} />
      case 'warning':
        return <ExclamationTriangleIcon className={iconClasses} />
      case 'destructive':
      case 'error':
        return <XCircleIcon className={iconClasses} />
      default:
        return <InfoIcon className={iconClasses} />
    }
  }

  // Size-based classes
  const sizeClasses = {
    small: {
      modal: 'max-w-sm p-4',
      gap: SIZE_CLASSES.gap.small,
      title: 'text-base',
      description: 'text-sm',
    },
    medium: {
      modal: 'max-w-md p-6',
      gap: SIZE_CLASSES.gap.medium,
      title: 'text-lg',
      description: 'text-body',
    },
    large: {
      modal: 'max-w-lg p-8',
      gap: SIZE_CLASSES.gap.large,
      title: 'text-xl',
      description: 'text-body',
    },
    'extra-large': {
      modal: 'max-w-2xl p-10',
      gap: SIZE_CLASSES.gap['extra-large'],
      title: 'text-h3',
      description: 'text-body',
    },
  }[size]

  // Modal overlay classes
  const overlayClasses = cn(
    'fixed inset-0 z-50',
    'bg-black/60 backdrop-blur-sm',
    'flex items-center justify-center p-4',
    TRANSITIONS.colors,
    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
  )

  // Modal container classes
  const modalClasses = cn(
    variant === 'warning' ? 'bg-gray-50' : 'bg-surface',
    'rounded-small',
    'shadow-lg',
    'w-full',
    sizeClasses.modal,
    TRANSITIONS.normal,
    isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
    className
  )

  // Content area classes
  const contentClasses = cn('flex flex-col', sizeClasses.gap)

  // Header classes
  const headerClasses = cn('flex items-start', 'gap-3')

  // Title classes
  const titleClasses = cn(
    sizeClasses.title,
    'font-semibold',
    colorClasses.titleColor,
    'leading-tight'
  )

  // Description classes
  const descriptionClasses = cn(
    sizeClasses.description,
    variant === 'warning' ? 'text-gray-600' : 'text-text-secondary',
    'leading-relaxed',
    'mt-2',
    'whitespace-pre-line'
  )

  // Actions container classes
  const actionsClasses = cn('flex', 'justify-end', 'gap-3', 'pt-2')

  if (!isOpen) return null

  return (
    <div
      className={overlayClasses}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={id ? `${id}-title` : undefined}
      aria-describedby={description && id ? `${id}-description` : undefined}
    >
      <div className={modalClasses} id={id}>
        <div className={contentClasses}>
          {/* Header with Icon and Title */}
          <div className={headerClasses}>
            {renderIcon()}
            <div className="flex-1 min-w-0">
              <h2 className={titleClasses} id={id ? `${id}-title` : undefined}>
                {title}
              </h2>
              {description && (
                <p
                  className={descriptionClasses}
                  id={id ? `${id}-description` : undefined}
                >
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className={actionsClasses}>
            {/* Cancel Button */}
            {(onCancel || onClose) && (
              <Button
                label={cancelActionLabel}
                variant="secondary"
                style="outline"
                size={size}
                onClick={handleCancel}
                className="rounded-[5px] hover:scale-105 hover:shadow-md hover:border-gray-400 transition-all duration-200"
              />
            )}

            {/* Secondary Action Button */}
            {secondaryActionLabel && onSecondaryAction && (
              <Button
                label={secondaryActionLabel}
                variant="secondary"
                style="fill"
                size={size}
                onClick={handleSecondaryAction}
                className="rounded-[5px] hover:scale-105 hover:shadow-md transition-all duration-200"
              />
            )}

            {/* Primary Action Button */}
            <Button
              label={primaryActionLabel}
              variant={colorClasses.primaryButton}
              style="fill"
              size={size}
              onClick={handlePrimaryAction}
              className="rounded-[10px] hover:scale-105 hover:shadow-md transition-all duration-200"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlertDialog
