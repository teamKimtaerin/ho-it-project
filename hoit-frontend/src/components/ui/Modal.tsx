'use client'

import { CloseIcon } from '@/components/icons'
import Button from '@/components/ui/Button'
import {
  cn,
  createOverlayProps,
  getInitialFocus,
  logComponentWarning,
  preventBodyScroll,
  SIZE_CLASSES,
  trapFocus,
  type BaseComponentProps,
  type ComponentSize,
} from '@/utils'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Types
// Constants
const DEFAULT_Z_INDEX = 1050
const MODAL_TAB_INDEX = -1

export type ModalSize = 'sm' | 'md' | 'lg'

export interface ModalActionConfig {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'accent' | 'negative'
  disabled?: boolean
  closeModal?: boolean // 모달을 자동으로 닫을지 여부
  isblind?: boolean // 화면 리더 전용
}

export interface ModalProps extends Omit<BaseComponentProps, 'size'> {
  // Core state
  isOpen: boolean
  onClose: () => void

  // Content
  title?: string
  subtitle?: string
  children?: React.ReactNode
  content?: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode

  // Appearance
  size?: ModalSize

  // Behavior
  closeOnEsc?: boolean
  closeOnBackdropClick?: boolean
  dismissible?: boolean

  // Layout
  scrollable?: boolean

  // Advanced
  container?: HTMLElement | null
  preventScroll?: boolean
  zIndex?: number

  // ARIA
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string

  // Actions (simplified)
  primaryAction?: ModalActionConfig
  secondaryAction?: ModalActionConfig
  cancelAction?: Pick<ModalActionConfig, 'label' | 'onClick'>

  // Test support
  'data-testid'?: string
  id?: string
  isblind?: boolean // 화면 리더 전용
}

const Modal: React.FC<ModalProps> = ({
  // Core
  isOpen,
  onClose,

  // Content
  title,
  subtitle,
  children,
  content,
  header,
  footer,

  // Appearance
  size = 'md',

  // Behavior
  closeOnEsc = true,
  closeOnBackdropClick = true,
  dismissible = true,

  // Layout
  scrollable = true,

  // Advanced
  container,
  preventScroll = true,
  zIndex = DEFAULT_Z_INDEX,

  // ARIA
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,

  // Actions
  primaryAction,
  secondaryAction,
  cancelAction,

  // Props
  className,
  id,
  'data-testid': dataTestId,
  isblind = true,
}) => {
  const [isMounted, setIsMounted] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<Element | null>(null)
  const focusTrap = useRef<(() => void) | null>(null)

  // Enhanced validation
  if (!children && !content && !title && !header) {
    logComponentWarning('Modal', 'Modal should have content.')
  }

  if (!ariaLabel && !ariaLabelledBy && !title) {
    logComponentWarning(
      'Modal',
      'Modal should have accessible name via aria-label, aria-labelledby, or title.'
    )
  }

  // Mount handling for SSR
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Modal lifecycle management
  useEffect(() => {
    if (isOpen) {
      // Store focus for restoration
      previousActiveElement.current = document.activeElement

      // Prevent body scroll
      if (preventScroll) {
        preventBodyScroll(true)
      }

      // Setup focus management
      if (modalRef.current) {
        focusTrap.current = trapFocus(modalRef.current)

        const initialFocusElement = getInitialFocus(modalRef.current)
        if (initialFocusElement) {
          initialFocusElement.focus()
        } else {
          modalRef.current.focus()
        }
      }
    } else {
      // Cleanup
      if (focusTrap.current) {
        focusTrap.current()
        focusTrap.current = null
      }

      if (preventScroll) {
        preventBodyScroll(false)
      }

      // Restore focus
      if (
        previousActiveElement.current &&
        'focus' in previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function'
      ) {
        previousActiveElement.current.focus()
        previousActiveElement.current = null
      }
    }

    return () => {
      if (preventScroll) preventBodyScroll(false)
      if (focusTrap.current) focusTrap.current()
    }
  }, [isOpen, preventScroll])

  // Create overlay handlers using shared utilities
  const { handleEscapeKey, overlayProps } = createOverlayProps(
    isOpen,
    onClose,
    { closeOnEsc, closeOnBackdropClick, dismissible }
  )

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleEscapeKey)
    return () => document.removeEventListener('keydown', handleEscapeKey)
  }, [isOpen, handleEscapeKey])

  // Memoized event handlers for performance
  const handleCloseClick = useCallback(() => {
    onClose()
  }, [onClose])

  const handlePrimaryAction = useCallback(() => {
    if (primaryAction?.disabled) return

    primaryAction?.onClick()

    // closeModal이 명시적으로 false가 아니면 모달을 닫음
    if (primaryAction?.closeModal !== false) {
      onClose()
    }
  }, [primaryAction, onClose])

  const handleSecondaryAction = useCallback(() => {
    if (secondaryAction?.disabled) return

    secondaryAction?.onClick()

    // closeModal이 명시적으로 false가 아니면 모달을 닫음
    if (secondaryAction?.closeModal !== false) {
      onClose()
    }
  }, [secondaryAction, onClose])

  const handleCancelAction = useCallback(() => {
    if (cancelAction?.onClick) {
      cancelAction.onClick()
    } else {
      onClose()
    }
  }, [cancelAction, onClose])

  // Computed values
  const sizeClasses = SIZE_CLASSES.modal[size]
  const showCloseButton = true
  const hasActions = Boolean(primaryAction || secondaryAction || cancelAction)
  const buttonSize = getButtonSize(size)

  // Overlay classes with blur backdrop
  // Overlay classes with optional blur backdrop
  const overlayClasses = cn(
    'fixed inset-0 flex p-4 items-center justify-center',
    'bg-black bg-opacity-50',
    isblind && 'backdrop-blur-sm', // ← 여기 조건부 적용
    'transition-all duration-300 ease-out',
    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
  )

  const modalClasses = cn(
    'relative outline-none bg-surface rounded-small shadow-lg',
    sizeClasses.container,
    scrollable && 'max-h-[90vh] overflow-y-auto',
    'transition-all duration-300 ease-out',
    isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
    className
  )

  // Simple class definitions
  const headerClasses = cn(
    'flex items-start justify-between border-b border-gray-medium min-h-[60px]',
    'p-4'
  )

  const contentClasses = cn('flex-1', 'p-4', !scrollable && 'overflow-hidden')

  const footerClasses = cn(
    'border-t border-gray-medium flex items-center justify-end gap-3',
    'p-4'
  )

  // Memoize target container check - 항상 훅스 규칙을 위해 early return 전에 배치
  const targetContainer = useMemo(() => {
    return container || (typeof document !== 'undefined' ? document.body : null)
  }, [container])

  // Don't render if not mounted or not open
  if (!isMounted || !isOpen) return null

  if (!targetContainer) return null

  const modalContent = (
    <div
      className={overlayClasses}
      style={{ zIndex }}
      {...overlayProps}
      data-testid={dataTestId ? `${dataTestId}-backdrop` : undefined}
    >
      <div
        ref={modalRef}
        className={modalClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          ariaLabelledBy || (title && id ? `${id}-title` : undefined)
        }
        aria-describedby={ariaDescribedBy || (id ? `${id}-content` : undefined)}
        aria-label={ariaLabel}
        tabIndex={MODAL_TAB_INDEX}
        id={id}
        data-testid={dataTestId}
      >
        {/* Header */}
        {(title || subtitle || header || showCloseButton) && (
          <div className={headerClasses}>
            {header || (
              <div className="flex-1 min-w-0">
                {title && (
                  <h2
                    className={cn(
                      'font-semibold text-black leading-tight flex-1',
                      sizeClasses.title
                    )}
                    id={id ? `${id}-title` : undefined}
                  >
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-text-secondary mt-1 text-sm">{subtitle}</p>
                )}
              </div>
            )}

            {showCloseButton && (
              <button
                type="button"
                className={cn(
                  'p-1 ml-4 flex-shrink-0',
                  'rounded-default text-gray-600',
                  'hover:text-gray-900 hover:bg-gray-100',
                  'transition-colors duration-200'
                )}
                onClick={handleCloseClick}
                aria-label="Close modal"
                data-testid={dataTestId ? `${dataTestId}-close` : undefined}
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          className={cn(contentClasses, sizeClasses.content)}
          id={id ? `${id}-content` : undefined}
        >
          {content || children}
        </div>

        {/* Footer */}
        {(footer || hasActions) && (
          <div className={footerClasses}>
            {footer || (
              <>
                {cancelAction && (
                  <Button
                    label={cancelAction.label || 'Cancel'}
                    variant="secondary"
                    style="outline"
                    size={buttonSize}
                    onClick={handleCancelAction}
                    data-testid={
                      dataTestId ? `${dataTestId}-cancel` : undefined
                    }
                  />
                )}

                {secondaryAction && (
                  <Button
                    label={secondaryAction.label}
                    variant={secondaryAction.variant || 'secondary'}
                    style="fill"
                    size={buttonSize}
                    onClick={handleSecondaryAction}
                    isDisabled={secondaryAction.disabled}
                    data-testid={
                      dataTestId ? `${dataTestId}-secondary` : undefined
                    }
                  />
                )}

                {primaryAction && (
                  <Button
                    label={primaryAction.label}
                    variant={primaryAction.variant || 'primary'}
                    style="fill"
                    size={buttonSize}
                    onClick={handlePrimaryAction}
                    isDisabled={primaryAction.disabled}
                    data-testid={
                      dataTestId ? `${dataTestId}-primary` : undefined
                    }
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, targetContainer)
}

// Helper functions - moved outside component to prevent re-creation
function getButtonSize(modalSize: ModalSize): ComponentSize {
  const sizeMap: Record<ModalSize, ComponentSize> = {
    sm: 'small',
    md: 'medium',
    lg: 'large',
  }
  return sizeMap[modalSize]
}

export default React.memo(Modal)
