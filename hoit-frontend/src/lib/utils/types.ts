/**
 * Component type definitions
 */

// Component size type definitions
export type ComponentSize = 'small' | 'medium' | 'large' | 'extra-large'
export type ComponentVariant =
  | 'accent'
  | 'primary'
  | 'secondary'
  | 'negative'
  | 'modern-primary'
  | 'modern-secondary'
  | 'modern-dark'
export type ComponentStyle = 'fill' | 'outline' | 'modern'
export type StaticColor = 'none' | 'white' | 'black'

// Common base interface
export interface BaseComponentProps {
  size?: ComponentSize
  isDisabled?: boolean
  className?: string
}

export interface InteractiveComponentProps extends BaseComponentProps {
  isReadOnly?: boolean
  onClick?: () => void
}

export interface StatefulComponentProps {
  isPending?: boolean
  isError?: boolean
  isSelected?: boolean
}

/**
 * Common size-based class mappings
 */
export const SIZE_CLASSES = {
  padding: {
    small: 'px-3 py-1.5',
    medium: 'px-4 py-2',
    large: 'px-6 py-3',
    'extra-large': 'px-8 py-4',
  },
  gap: {
    small: 'gap-2',
    medium: 'gap-4',
    large: 'gap-6',
    'extra-large': 'gap-8',
  },
  text: {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    'extra-large': 'text-xl',
  },
  height: {
    small: 'h-8',
    medium: 'h-10',
    large: 'h-12',
    'extra-large': 'h-16',
  },
  width: {
    small: 'w-8',
    medium: 'w-10',
    large: 'w-12',
    'extra-large': 'w-16',
  },
  iconSize: {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6',
    'extra-large': 'w-8 h-8',
  },
  iconClasses: {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6',
    'extra-large': 'w-8 h-8',
  },
  badge: {
    small: {
      container: 'px-2 py-0.5 text-xs',
      icon: 'w-3 h-3',
      onlyIcon: 'p-1',
    },
    medium: {
      container: 'px-2.5 py-0.5 text-sm',
      icon: 'w-4 h-4',
      onlyIcon: 'p-1.5',
    },
    large: {
      container: 'px-3 py-1 text-base',
      icon: 'w-5 h-5',
      onlyIcon: 'p-2',
    },
    'extra-large': {
      container: 'px-4 py-1.5 text-lg',
      icon: 'w-6 h-6',
      onlyIcon: 'p-2.5',
    },
  },
  alertBanner: {
    small: {
      container: 'px-3 py-2',
      icon: 'w-4 h-4',
      text: 'text-sm',
      button: 'px-2 py-1 text-xs',
    },
    medium: {
      container: 'px-4 py-3',
      icon: 'w-5 h-5',
      text: 'text-base',
      button: 'px-3 py-1.5 text-sm',
    },
    large: {
      container: 'px-6 py-4',
      icon: 'w-6 h-6',
      text: 'text-lg',
      button: 'px-4 py-2 text-base',
    },
    'extra-large': {
      container: 'px-8 py-6',
      icon: 'w-7 h-7',
      text: 'text-xl',
      button: 'px-5 py-2.5 text-lg',
    },
  },
  alertDialog: {
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8',
    'extra-large': 'p-10',
  },
  progressBar: {
    small: 'h-2',
    medium: 'h-3',
    large: 'h-4',
    'extra-large': 'h-6',
  },
  progress: {
    small: {
      height: 'h-2',
      fontSize: 'text-xs',
    },
    medium: {
      height: 'h-3',
      fontSize: 'text-sm',
    },
    large: {
      height: 'h-4',
      fontSize: 'text-base',
    },
    'extra-large': {
      height: 'h-6',
      fontSize: 'text-lg',
    },
  },
  progressCircle: {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
    'extra-large': 'w-24 h-24',
  },
  modal: {
    sm: {
      container: 'max-w-sm',
      title: 'text-lg',
      content: 'text-sm',
    },
    md: {
      container: 'max-w-md',
      title: 'text-xl',
      content: 'text-base',
    },
    lg: {
      container: 'max-w-lg',
      title: 'text-2xl',
      content: 'text-lg',
    },
  },
  typography: {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    'extra-large': 'text-xl',
  },
  switch: {
    small: {
      track: 'w-8 h-5',
      thumb: 'w-4 h-4',
      thumbPosition: 'translate-x-0',
      thumbTransform: 'translate-x-3',
    },
    medium: {
      track: 'w-10 h-6',
      thumb: 'w-5 h-5',
      thumbPosition: 'translate-x-0',
      thumbTransform: 'translate-x-4',
    },
    large: {
      track: 'w-12 h-7',
      thumb: 'w-6 h-6',
      thumbPosition: 'translate-x-0',
      thumbTransform: 'translate-x-5',
    },
    'extra-large': {
      track: 'w-14 h-8',
      thumb: 'w-7 h-7',
      thumbPosition: 'translate-x-0',
      thumbTransform: 'translate-x-6',
    },
  },
  statusLight: {
    small: {
      container: 'gap-1.5',
      text: 'text-xs',
      dot: 'w-2 h-2',
    },
    medium: {
      container: 'gap-2',
      text: 'text-sm',
      dot: 'w-3 h-3',
    },
    large: {
      container: 'gap-2.5',
      text: 'text-base',
      dot: 'w-4 h-4',
    },
    'extra-large': {
      container: 'gap-3',
      text: 'text-lg',
      dot: 'w-5 h-5',
    },
  },
  tag: {
    small: {
      container: 'px-2 py-0.5 text-xs',
      icon: 'w-3 h-3',
    },
    medium: {
      container: 'px-2.5 py-0.5 text-sm',
      icon: 'w-4 h-4',
    },
    large: {
      container: 'px-3 py-1 text-base',
      icon: 'w-5 h-5',
    },
    'extra-large': {
      container: 'px-4 py-1.5 text-lg',
      icon: 'w-6 h-6',
    },
  },
} as const

// Utility functions for components
export const getSizeClasses = (
  size: ComponentSize = 'medium',
  variant?: ComponentVariant
) => {
  // Modern buttons use their own size classes
  if (variant?.startsWith('modern-')) {
    const modernSizes = {
      small: 'btn-modern-sm',
      medium: '',
      large: 'btn-modern-lg',
      'extra-large': 'btn-modern-lg',
    }
    return modernSizes[size]
  }

  return SIZE_CLASSES.padding[size]
}

export const getVariantClasses = (
  variant: ComponentVariant = 'primary',
  style: ComponentStyle = 'fill',
  staticColor: StaticColor = 'none'
) => {
  // Modern button variants use their own CSS classes
  if (variant.startsWith('modern-')) {
    const modernVariants = {
      'modern-primary': 'btn-modern-primary',
      'modern-secondary': 'btn-modern-secondary',
      'modern-dark': 'btn-modern-dark',
    }
    return (
      modernVariants[
        variant as 'modern-primary' | 'modern-secondary' | 'modern-dark'
      ] || 'btn-modern-primary'
    )
  }

  // Traditional variants
  const baseVariants = {
    accent:
      style === 'fill'
        ? 'bg-accent text-white border-accent'
        : 'border-accent text-accent',
    primary:
      style === 'fill'
        ? 'bg-primary text-white border-primary'
        : 'border-primary text-primary',
    secondary:
      style === 'fill'
        ? 'bg-secondary text-text-primary border-border'
        : 'border-secondary text-secondary',
    negative:
      style === 'fill'
        ? 'bg-negative text-white border-negative'
        : 'border-negative text-negative',
  }

  const colorOverrides = {
    white: 'text-white border-white',
    black: 'text-black border-black',
    none: '',
  }

  return `${baseVariants[variant as keyof typeof baseVariants]} ${staticColor !== 'none' ? colorOverrides[staticColor] : ''}`
}

export const getDisabledClasses = () => {
  return 'opacity-50 cursor-not-allowed pointer-events-none'
}

export const getBaseInteractiveClasses = () => {
  return 'cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'
}

// Component warning function
export const logComponentWarning = (component: string, message: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`${component}: ${message}`)
  }
}
