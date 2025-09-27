// Asset control panel related types

export interface AssetSettings {
  speed: number
  intensity: number
  duration: number
  // Asset-specific properties (will be extended based on plugin analysis)
  [key: string]: unknown
}

// Asset-specific settings interfaces

// Rotation Text specific settings
export interface RotationTextSettings {
  rotationAngle: number // 0-360 degrees
  animationDuration: number // 0.5-5.0 seconds
  staggerDelay: number // 0.0-1.0 seconds
  rotationDirection: 'left' | 'right'
  enableGradient: boolean
}

// TypeWriter Text specific settings
export interface TypeWriterSettings {
  typingSpeed: number // 0.05-1.0 seconds
  startDelay: number // 0.0-3.0 seconds
  showCursor: boolean
  cursorBlinkSpeed: number // 0.3-2.0 seconds
  randomSpeed: boolean
}

// Elastic Bounce specific settings
export interface ElasticBounceSettings {
  bounceStrength: number // 0.1-2.0
  animationDuration: number // 0.5-4.0 seconds
  staggerDelay: number // 0.0-0.5 seconds
  startScale: number // 0.0-1.0
  overshoot: number // 1.0-2.0
}

// Glitch Effect specific settings
export interface GlitchEffectSettings {
  glitchIntensity: number // 1-20
  animationDuration: number // 0.5-5.0 seconds
  glitchFrequency: number // 0.1-1.0 seconds
  colorSeparation: boolean
  noiseEffect: boolean
}

// Scale Pop specific settings
export interface ScalePopSettings {
  startScale: number // 0.0-0.5
  maxScale: number // 1.0-2.0
  popDuration: number // 0.2-1.5 seconds
  staggerDelay: number // 0.02-0.3 seconds
  rotationAmount: number // 0-45 degrees
}

// Fade In Stagger specific settings
export interface FadeInStaggerSettings {
  staggerDelay: number // 0.02-0.5 seconds
  animationDuration: number // 0.2-2.0 seconds
  startOpacity: number // 0.0-0.5
  scaleStart: number // 0.5-1.0
  ease: 'power1.out' | 'power2.out' | 'power3.out' | 'back.out' | 'elastic.out'
}

// Slide Up specific settings
export interface SlideUpSettings {
  slideDistance: number // 20-150 pixels
  animationDuration: number // 0.3-2.0 seconds
  staggerDelay: number // 0.02-0.4 seconds
  overshoot: number // 0-30 pixels
  blurEffect: boolean
}

// Magnetic Pull specific settings
export interface MagneticPullSettings {
  scatterDistance: number // 50-500 pixels
  pullSpeed: number // 0.5-4.0 seconds
  staggerDelay: number // 0.0-0.2 seconds
  magneticStrength: number // 1.0-2.0
  elasticEffect: boolean
}

export interface AssetControlPanelProps {
  assetId: string
  assetName: string
  onClose: () => void
  onSettingsChange?: (settings: AssetSettings) => void
}
