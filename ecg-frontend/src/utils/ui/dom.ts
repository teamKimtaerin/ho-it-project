/**
 * DOM utility functions
 */

/**
 * Safely focus an element
 */
export function focusElement(element: HTMLElement | null): void {
  if (element && typeof element.focus === 'function') {
    element.focus()
  }
}

/**
 * Check if an element is in viewport
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  const windowHeight =
    window.innerHeight || document.documentElement.clientHeight
  const windowWidth = window.innerWidth || document.documentElement.clientWidth

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= windowHeight &&
    rect.right <= windowWidth
  )
}

/**
 * Smooth scroll to element
 */
export function scrollToElement(
  element: HTMLElement,
  options: ScrollIntoViewOptions = {}
): void {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest',
    ...options,
  })
}

/**
 * Get scroll position
 */
export function getScrollPosition(): { x: number; y: number } {
  return {
    x:
      window.pageXOffset ||
      document.documentElement.scrollLeft ||
      document.body.scrollLeft ||
      0,
    y:
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0,
  }
}

/**
 * Set scroll position
 */
export function setScrollPosition(x: number, y: number): void {
  window.scrollTo(x, y)
}

/**
 * Get element dimensions
 */
export function getElementDimensions(element: HTMLElement): {
  width: number
  height: number
  top: number
  left: number
} {
  const rect = element.getBoundingClientRect()
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      const result = document.execCommand('copy')
      document.body.removeChild(textArea)
      return result
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

/**
 * Add event listener with cleanup
 */
export function addEventListenerWithCleanup(
  element: HTMLElement | Window | Document,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): () => void {
  element.addEventListener(event, handler, options)

  return () => {
    element.removeEventListener(event, handler, options)
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: never[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let isThrottled = false

  return (...args: Parameters<T>) => {
    if (isThrottled) return

    func(...args)
    isThrottled = true

    setTimeout(() => {
      isThrottled = false
    }, delay)
  }
}

/**
 * Create a click handler with proper event handling
 */
export function createClickHandler(options: {
  onClick?: () => void
  isDisabled?: boolean
  isPending?: boolean
  isReadOnly?: boolean
}): () => void {
  const {
    onClick,
    isDisabled = false,
    isPending = false,
    isReadOnly = false,
  } = options

  return () => {
    if (isDisabled || isPending || isReadOnly || !onClick) return
    onClick()
  }
}

/**
 * Create a keyboard handler for interactive elements
 */
export function createKeyboardHandler(options: {
  onActivate?: () => void
  isDisabled?: boolean
  isPending?: boolean
  isReadOnly?: boolean
}): (event: React.KeyboardEvent<HTMLElement>) => void {
  const {
    onActivate,
    isDisabled = false,
    isPending = false,
    isReadOnly = false,
  } = options

  return (event: React.KeyboardEvent<HTMLElement>) => {
    if (isDisabled || isPending || isReadOnly || !onActivate) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    // Trigger on Enter or Space key
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onActivate()
    }
  }
}

/**
 * Get focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ')

  return Array.from(
    container.querySelectorAll(focusableSelectors)
  ) as HTMLElement[]
}

/**
 * Trap focus within an element
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = getFocusableElements(element)
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  const handleTabKey = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement?.focus()
        event.preventDefault()
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement?.focus()
        event.preventDefault()
      }
    }
  }

  document.addEventListener('keydown', handleTabKey)

  return () => {
    document.removeEventListener('keydown', handleTabKey)
  }
}

/**
 * Get initial focus element within a container
 */
export function getInitialFocus(container: HTMLElement): HTMLElement | null {
  const autoFocusElement = container.querySelector('[autofocus]') as HTMLElement
  if (autoFocusElement) return autoFocusElement

  const focusableElements = getFocusableElements(container)
  return focusableElements[0] || null
}

/**
 * Create overlay props for modals and dialogs
 */
export function createOverlayProps(
  isOpen: boolean,
  onClose: () => void,
  options: {
    closeOnEsc?: boolean
    closeOnBackdropClick?: boolean
    dismissible?: boolean
  } = {}
) {
  const {
    closeOnEsc = true,
    closeOnBackdropClick = true,
    dismissible = true,
  } = options

  const handleBackdropClick = createClickHandler({
    isDisabled: !dismissible || !closeOnBackdropClick,
    onClick: onClose,
  })

  const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && closeOnEsc && dismissible) {
      event.preventDefault()
      onClose()
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleBackdropClick()
    }
  }

  return {
    handleBackdropClick,
    handleEscapeKey,
    overlayProps: {
      onClick: handleOverlayClick,
    },
  }
}

/**
 * Prevent body scroll when modal is open
 */
export function preventBodyScroll(prevent: boolean): void {
  if (typeof document === 'undefined') return

  if (prevent) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}
