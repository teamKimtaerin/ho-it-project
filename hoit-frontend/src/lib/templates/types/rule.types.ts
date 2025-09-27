/**
 * Rule System Types
 *
 * Advanced typing for the template rule evaluation system
 */

import { AudioWord, AudioSegment, AudioAnalysisData } from './template.types'

// Supported field paths in audio analysis data
export type AudioFieldPath =
  // Word-level fields
  | 'word'
  | 'start'
  | 'end'
  | 'confidence'
  | 'volume_db'
  | 'pitch_hz'
  | 'harmonics_ratio'
  | 'spectral_centroid'

  // Segment-level fields
  | 'segment.duration'
  | 'segment.speaker.speaker_id'
  | 'segment.speaker.confidence'
  | 'segment.emotion.emotion'
  | 'segment.emotion.confidence'
  | 'segment.acoustic_features.energy'
  | 'segment.acoustic_features.pitch_mean'
  | 'segment.acoustic_features.pitch_std'
  | 'segment.acoustic_features.spectral_centroid'
  | 'segment.acoustic_features.spectral_rolloff'
  | 'segment.acoustic_features.zero_crossing_rate'

  // Global statistics
  | 'volume_statistics.global_min_db'
  | 'volume_statistics.global_max_db'
  | 'volume_statistics.global_mean_db'
  | 'volume_statistics.baseline_db'
  | 'volume_statistics.whisper_threshold_db'
  | 'volume_statistics.loud_threshold_db'
  | 'pitch_statistics.global_min_hz'
  | 'pitch_statistics.global_max_hz'
  | 'pitch_statistics.global_mean_hz'
  | 'pitch_statistics.baseline_range.min_hz'
  | 'pitch_statistics.baseline_range.max_hz'
  | 'harmonics_statistics.global_min_ratio'
  | 'harmonics_statistics.global_max_ratio'
  | 'harmonics_statistics.global_mean_ratio'
  | 'harmonics_statistics.baseline_ratio'
  | 'spectral_statistics.global_min_hz'
  | 'spectral_statistics.global_max_hz'
  | 'spectral_statistics.global_mean_hz'
  | 'spectral_statistics.baseline_hz'

  // Metadata fields
  | 'metadata.duration'
  | 'metadata.unique_speakers'
  | 'metadata.dominant_emotion'
  | 'metadata.avg_confidence'

// Comparison operators with their parameter requirements
export interface ComparisonOperators {
  gt: { value: number }
  gte: { value: number }
  lt: { value: number }
  lte: { value: number }
  eq: { value: number | string | boolean }
  neq: { value: number | string | boolean }
  in: { value: Array<number | string> }
  between: { value: number; secondValue: number }
  contains: { value: string }
  startsWith: { value: string }
  endsWith: { value: string }
  matches: { value: string } // regex pattern
}

export type ComparisonOperator = keyof ComparisonOperators

// Expression evaluation context
export interface ExpressionContext {
  // Current processing context
  word: AudioWord
  segment: AudioSegment
  audioData: AudioAnalysisData

  // Position information
  wordIndex: number
  segmentIndex: number
  wordPositionInSegment: number

  // Computed values
  variables: Record<string, unknown>

  // Helper functions available in expressions
  helpers: ExpressionHelpers
}

export interface ExpressionHelpers {
  // Math functions
  min: (...values: number[]) => number
  max: (...values: number[]) => number
  avg: (values: number[]) => number
  abs: (value: number) => number
  round: (value: number, decimals?: number) => number

  // Statistical functions
  percentile: (values: number[], p: number) => number
  standardDeviation: (values: number[]) => number

  // String functions
  toLowerCase: (str: string) => string
  toUpperCase: (str: string) => string
  trim: (str: string) => string

  // Audio-specific helpers
  dbToLinear: (db: number) => number
  linearToDb: (linear: number) => number
  hzToMidi: (hz: number) => number
  midiToHz: (midi: number) => number

  // Timing helpers
  secondsToFrames: (seconds: number, fps: number) => number
  framesToSeconds: (frames: number, fps: number) => number
}

// Pre-compiled rule condition for fast evaluation
export interface FastRuleCondition {
  // Direct field access path for performance
  fieldAccessor: (context: ExpressionContext) => unknown

  // Compiled comparison function
  comparator: (fieldValue: unknown, context: ExpressionContext) => boolean

  // Dependencies for caching optimization
  dependencies: Set<AudioFieldPath>

  // Static analysis info
  isConstant: boolean
  constantResult?: boolean
}

// Rule execution statistics
export interface RuleExecutionStats {
  evaluations: number
  matches: number
  averageExecutionTime: number
  cacheHits: number
  cacheMisses: number
}

// Template validation result
export interface TemplateValidationResult {
  isValid: boolean
  errors: TemplateValidationError[]
  warnings: TemplateValidationWarning[]
  fieldDependencies: Set<AudioFieldPath>
  estimatedComplexity: 'low' | 'medium' | 'high'
}

export interface TemplateValidationError {
  type: 'syntax' | 'reference' | 'type' | 'logic' | 'performance'
  message: string
  location: {
    ruleId?: string
    field?: string
    expression?: string
  }
  severity: 'error' | 'warning'
}

export interface TemplateValidationWarning {
  type: 'performance' | 'compatibility' | 'best-practice'
  message: string
  suggestion?: string
  location: {
    ruleId?: string
    field?: string
  }
}

// Animation intensity calculation
export interface IntensityCalculator {
  calculate: (
    conditionValue: number,
    thresholdValue: number,
    context: ExpressionContext
  ) => number

  mapping: 'linear' | 'exponential' | 'logarithmic' | 'custom'
  customFunction?: (value: number) => number

  clampMin: number
  clampMax: number
}

// Rule conflict resolution
export interface RuleConflict {
  conflictingRules: string[]
  type: 'priority' | 'exclusive' | 'parameter'
  resolution: 'highest-priority' | 'merge' | 'skip' | 'error'
  result?: {
    selectedRule: string
    mergedParams?: Record<string, unknown>
  }
}

// Performance optimization types
export interface RuleOptimizationHints {
  // Execution order optimization
  executionOrder: string[]

  // Caching strategies
  cacheableExpressions: Map<string, unknown>

  // Short-circuit conditions
  shortCircuitConditions: string[]

  // Batch processing groups
  batchGroups: Array<{
    ruleIds: string[]
    reason: string
  }>
}

// Debug information for rule evaluation
export interface RuleDebugInfo {
  ruleId: string
  executionTime: number
  conditionResult: boolean
  fieldValues: Record<string, unknown>
  expressionEvaluations: Array<{
    expression: string
    result: unknown
    executionTime: number
  }>
  cacheUsage: {
    hits: number
    misses: number
  }
}
