/**
 * Color utility functions for consistent color management
 */

export type ColorVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'neutral'
  | 'positive'
  | 'negative'
  | 'notice'
  | 'informative'

export type ColorIntensity =
  | 'light'
  | 'medium'
  | 'dark'
  | 'very-light'
  | 'very-dark'

/**
 * Get CSS variable name for a color
 */
export function getColorVar(
  variant: ColorVariant,
  intensity?: ColorIntensity
): string {
  const baseVar = `--color-${variant}`
  if (!intensity || intensity === 'medium') {
    return baseVar
  }
  return `${baseVar}-${intensity}`
}

/**
 * Get CSS color value using CSS variables
 */
export function getCSSColor(
  variant: ColorVariant,
  intensity?: ColorIntensity
): string {
  return `var(${getColorVar(variant, intensity)})`
}

/**
 * Generate Tailwind color classes
 */
export function getTailwindColor(
  property: 'bg' | 'text' | 'border' | 'ring',
  variant: ColorVariant,
  intensity?: ColorIntensity
): string {
  const colorName =
    intensity && intensity !== 'medium' ? `${variant}-${intensity}` : variant
  return `${property}-${colorName}`
}

/**
 * Color palette for consistent theming
 */
export const colorPalette = {
  primary: '#7c3aed',
  'primary-dark': '#5b21b6',
  'primary-light': '#a855f7',
  'primary-very-light': '#f3e8ff',

  secondary: '#76797d',
  accent: '#10b981',

  neutral: '#76797d',
  positive: '#10b981',
  negative: '#dc2626',
  notice: '#f59e0b',
  informative: '#7c3aed',

  white: '#ffffff',
  black: '#080808',
  'gray-slate': '#76797d',
  'gray-medium': '#e2e8f0',
  'gray-light': '#f8fafc',
} as const

export type ColorName = keyof typeof colorPalette

export const SEMANTIC_COLORS = {
  error: {
    fill: ['bg-red-50', 'text-red-700', 'border', 'border-red-200'],
    outline: ['border', 'border-red-200', 'text-red-700', 'hover:bg-red-50'],
    background: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    hover: 'hover:bg-red-100',
  },
  success: {
    fill: ['bg-green-50', 'text-green-700', 'border', 'border-green-200'],
    outline: [
      'border',
      'border-green-200',
      'text-green-700',
      'hover:bg-green-50',
    ],
    background: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  warning: {
    fill: ['bg-yellow-50', 'text-yellow-700', 'border', 'border-yellow-200'],
    outline: [
      'border',
      'border-yellow-200',
      'text-yellow-700',
      'hover:bg-yellow-50',
    ],
    background: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
  },
  info: {
    fill: ['bg-blue-50', 'text-blue-700', 'border', 'border-blue-200'],
    outline: ['border', 'border-blue-200', 'text-blue-700', 'hover:bg-blue-50'],
    background: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  neutral: {
    fill: ['bg-gray-50', 'text-gray-700', 'border', 'border-gray-200'],
    outline: ['border', 'border-gray-200', 'text-gray-700', 'hover:bg-gray-50'],
    background: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    hover: 'hover:bg-gray-100',
  },
} as const

export const TRANSITIONS = {
  fast: 'transition-all duration-200 ease-out',
  normal: 'transition-all duration-300 ease-in-out',
  slow: 'transition-all duration-500 ease-in-out',
  colors: 'transition-colors duration-200',
  transform: 'transition-transform duration-300 ease-out',
  opacity: 'transition-opacity duration-300',
} as const

export type SemanticColor = keyof typeof SEMANTIC_COLORS
export type TransitionType = keyof typeof TRANSITIONS

export const ALERT_BANNER_COLORS = {
  neutral: {
    background: 'bg-alert-neutral',
    text: 'text-alert-neutral',
    border: 'border-alert-neutral',
    iconColor: 'text-alert-neutral',
  },
  informative: {
    background: 'bg-alert-informative',
    text: 'text-alert-informative',
    border: 'border-alert-informative',
    iconColor: 'text-alert-informative',
  },
  positive: {
    background: 'bg-alert-positive',
    text: 'text-alert-positive',
    border: 'border-alert-positive',
    iconColor: 'text-alert-positive',
  },
  negative: {
    background: 'bg-alert-negative',
    text: 'text-alert-negative',
    border: 'border-alert-negative',
    iconColor: 'text-alert-negative',
  },
  notice: {
    background: 'bg-alert-notice',
    text: 'text-alert-notice',
    border: 'border-alert-notice',
    iconColor: 'text-alert-notice',
  },
} as const

export const ALERT_DIALOG_COLORS = {
  confirmation: {
    iconColor: 'text-status-positive',
    titleColor: 'text-black',
    primaryButton: 'primary',
  },
  information: {
    iconColor: 'text-status-informative',
    titleColor: 'text-black',
    primaryButton: 'primary',
  },
  warning: {
    iconColor: 'text-red-600',
    titleColor: 'text-gray-900',
    primaryButton: 'secondary',
  },
  destructive: {
    iconColor: 'text-status-negative',
    titleColor: 'text-black',
    primaryButton: 'negative',
  },
  error: {
    iconColor: 'text-status-negative',
    titleColor: 'text-black',
    primaryButton: 'negative',
  },
} as const

export const BADGE_COLORS = {
  positive: { bg: 'bg-status-positive', text: 'text-white' },
  informative: { bg: 'bg-status-informative', text: 'text-white' },
  negative: { bg: 'bg-status-negative', text: 'text-white' },
  notice: { bg: 'bg-status-notice', text: 'text-white' },
  neutral: { bg: 'bg-status-neutral', text: 'text-white' },
  gray: { bg: 'bg-badge-gray', text: 'text-badge-gray' },
  red: { bg: 'bg-badge-red', text: 'text-badge-red' },
  orange: { bg: 'bg-badge-orange', text: 'text-badge-orange' },
  yellow: { bg: 'bg-status-yellow', text: 'text-white' },
  chartreuse: { bg: 'bg-status-chartreuse', text: 'text-white' },
  green: { bg: 'bg-badge-green', text: 'text-badge-green' },
  blue: { bg: 'bg-badge-blue', text: 'text-badge-blue' },
  indigo: { bg: 'bg-badge-indigo', text: 'text-badge-indigo' },
  purple: { bg: 'bg-badge-purple', text: 'text-badge-purple' },
  fuchsia: { bg: 'bg-badge-fuchsia', text: 'text-badge-fuchsia' },
} as const

export const STATUS_LIGHT_COLORS = {
  informative: 'bg-status-informative',
  neutral: 'bg-status-neutral',
  positive: 'bg-status-positive',
  notice: 'bg-status-notice',
  negative: 'bg-status-negative',
  indigo: 'bg-indigo-500',
  celery: 'bg-green-400',
  chartreuse: 'bg-lime-400',
  yellow: 'bg-yellow-400',
  magenta: 'bg-pink-500',
  fuchsia: 'bg-fuchsia-500',
  purple: 'bg-purple-500',
  seafoam: 'bg-teal-400',
} as const
