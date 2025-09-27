/**
 * Template System Types
 *
 * Defines the structure for subtitle templates that apply consistent styling
 * and rule-based animations based on audio analysis data.
 */

import { ExpressionHelpers } from './rule.types'
// Audio Analysis Data Types (from real.json)
export interface AudioAnalysisData {
  metadata: {
    filename: string
    duration: number
    total_segments: number
    unique_speakers: number
    dominant_emotion: string
    avg_confidence: number
  }
  speakers: Record<
    string,
    {
      total_duration: number
      segment_count: number
      avg_confidence: number
      emotions: string[]
    }
  >
  segments: AudioSegment[]
  volume_statistics: {
    global_min_db: number
    global_max_db: number
    global_mean_db: number
    baseline_db: number
    whisper_threshold_db: number
    loud_threshold_db: number
  }
  pitch_statistics: {
    global_min_hz: number
    global_max_hz: number
    global_mean_hz: number
    baseline_range: {
      min_hz: number
      max_hz: number
    }
  }
  harmonics_statistics: {
    global_min_ratio: number
    global_max_ratio: number
    global_mean_ratio: number
    baseline_ratio: number
  }
  spectral_statistics: {
    global_min_hz: number
    global_max_hz: number
    global_mean_hz: number
    baseline_hz: number
  }
}

export interface AudioSegment {
  start_time: number
  end_time: number
  duration: number
  speaker: {
    speaker_id: string
    confidence: number
    gender?: string
    age_group?: string
  }
  emotion: {
    emotion: string
    confidence: number
    probabilities: Record<string, number>
  }
  acoustic_features: {
    spectral_centroid: number
    spectral_rolloff: number
    zero_crossing_rate: number
    energy: number
    pitch_mean: number
    pitch_std: number
    mfcc_mean: number[]
  }
  text: string
  words: AudioWord[]
}

export interface AudioWord {
  word: string
  start: number
  end: number
  confidence: number
  volume_db: number
  pitch_hz: number
  harmonics_ratio: number
  spectral_centroid: number
}

// Template Definition Types
export interface SubtitleTemplate {
  id: string
  name: string
  description: string
  version: string
  author?: string
  category: TemplateCategory

  // Basic styling configuration
  style: TemplateStyle

  // Layout and positioning
  layout: TemplateLayout

  // Animation rules based on audio analysis
  animationRules: AnimationRule[]

  // Variables and constants used in rules
  variables?: Record<string, TemplateVariable>

  // Template metadata
  metadata: TemplateMetadata
}

export type TemplateCategory =
  | 'dynamic'
  | 'narrative'
  | 'conversation'
  | 'emphasis'
  | 'minimal'
  | 'custom'

export interface TemplateStyle {
  // Text styling
  text: {
    fontFamily: string
    fontSize: SizeValue // Can reference screen dimensions
    fontWeight: number | string
    color: string
    textAlign: 'left' | 'center' | 'right'
    textShadow?: string
    letterSpacing?: string
    lineHeight?: number | string
  }

  // Background/container styling
  background: {
    type: 'none' | 'box' | 'outline'
    color?: string
    opacity?: number
    borderRadius?: number
    padding?: SpacingValue
    borderWidth?: number
    borderColor?: string
  }

  // Effects
  effects?: {
    dropShadow?: string
    blur?: number
    brightness?: number
  }
}

export interface TemplateLayout {
  // Track positioning
  track: {
    position: 'top' | 'center' | 'bottom' | 'custom'
    customPosition?: {
      top?: PercentageValue
      bottom?: PercentageValue
      left?: PercentageValue
      right?: PercentageValue
    }
    safeArea: {
      top: PercentageValue
      bottom: PercentageValue
      left: PercentageValue
      right: PercentageValue
    }
    maxWidth?: PercentageValue
    alignment: 'left' | 'center' | 'right'
  }

  // Word spacing and arrangement
  words: {
    spacing: SpacingValue
    lineBreaking: 'auto' | 'manual' | 'none'
    maxWordsPerLine?: number
  }
}

export interface AnimationRule {
  id: string
  name: string
  description?: string

  // Condition that triggers this rule
  condition: RuleCondition

  // Animation to apply when condition is met
  animation: AnimationConfig

  // Priority for rule resolution (higher = higher priority)
  priority: number

  // Whether this rule can be combined with others
  exclusive?: boolean
}

export interface RuleCondition {
  // Field from audio analysis to evaluate
  field: string // e.g., "volume_db", "pitch_hz", "emotion.emotion"

  // Comparison operator
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'in' | 'between'

  // Value to compare against (can be expression)
  value: TemplateExpression | number | string | boolean

  // Additional value for 'between' operator
  secondValue?: TemplateExpression | number

  // Logical operators for combining conditions
  and?: RuleCondition[]
  or?: RuleCondition[]
  not?: RuleCondition
}

export interface AnimationConfig {
  // Plugin to use
  pluginName: string

  // Animation parameters
  params?: Record<string, unknown>

  // Timing configuration
  timing: {
    // Relative to word timing
    offset: [string, string] // e.g., ["-0.1s", "+0.1s"]

    // Duration override
    duration?: string

    // Easing
    easing?: string
  }

  // Intensity based on condition match strength
  intensity?: {
    min: number
    max: number
    // How to map condition value to intensity
    mapping?: 'linear' | 'exponential' | 'logarithmic'
  }
}

// Expression system for dynamic values
export interface TemplateExpression {
  type: 'expression'
  expression: string // e.g., "{{volume_statistics.global_max_db}} - 5"
}

export interface TemplateVariable {
  name: string
  description?: string
  expression: string
  cached?: boolean
}

// Value types that can reference template variables
export type SizeValue = string | number | TemplateExpression
export type PercentageValue = string | TemplateExpression
export type SpacingValue = string | number | TemplateExpression

export interface TemplateMetadata {
  tags: string[]
  useCase: string[]
  audioFeatures: string[] // Which audio features this template uses
  complexity: 'simple' | 'moderate' | 'complex'
  performance: {
    estimatedRenderTime: 'fast' | 'medium' | 'slow'
    memoryUsage: 'low' | 'medium' | 'high'
  }
  compatibility: {
    minRendererVersion: string
    supportedAspectRatios: string[]
  }
}

// Runtime types for template processing
export interface CompiledTemplate extends SubtitleTemplate {
  compiledRules: CompiledAnimationRule[]
  computedVariables: Record<string, unknown>
  validationErrors: string[]
}

export interface CompiledAnimationRule extends AnimationRule {
  compiledCondition: CompiledCondition
}

export interface CompiledCondition {
  evaluate: (context: RuleEvaluationContext) => boolean
  dependencies: string[] // Fields this condition depends on
}

export interface RuleEvaluationContext {
  // Current word being processed
  word: AudioWord

  // Parent segment
  segment: AudioSegment

  // Global audio analysis data
  audioData: AudioAnalysisData

  // Computed template variables
  variables: Record<string, unknown>

  // Index information
  wordIndex: number
  segmentIndex: number
  wordPositionInSegment: number
  totalWords: number
  totalSegments: number

  // Helper functions available in expressions
  helpers: ExpressionHelpers
}

// Template application result
export interface TemplateApplicationResult {
  success: boolean
  appliedRules: Array<{
    ruleId: string
    wordId: string
    animation: AnimationConfig
    matchStrength: number
  }>
  errors: string[]
  warnings: string[]
  performance: {
    processingTime: number
    rulesEvaluated: number
    animationsApplied: number
  }
}
