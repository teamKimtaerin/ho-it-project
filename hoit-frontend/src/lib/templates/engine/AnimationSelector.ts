/**
 * Animation Selector
 *
 * High-level interface for selecting and applying animations based on template rules.
 * Orchestrates the rule engine, expression evaluator, and template parser.
 */

import {
  SubtitleTemplate,
  CompiledTemplate,
  AudioAnalysisData,
  AudioWord,
  AudioSegment,
  RuleEvaluationContext,
  TemplateApplicationResult,
  // AnimationConfig, // Unused import
} from '../types/template.types'
import { ExpressionContext, ExpressionHelpers } from '../types/rule.types'
import { RuleEngine, RuleEvaluationResult } from './RuleEngine'
import { TemplateParser } from './TemplateParser'
import { ExpressionEvaluator } from './ExpressionEvaluator'

export interface AnimationSelection {
  wordId: string
  animations: Array<{
    pluginName: string
    params: Record<string, unknown>
    timing: {
      offset: [string, string]
      duration?: string
      easing?: string
    }
    intensity: number
    ruleId: string
  }>
  appliedRuleIds: string[]
  executionTime: number
}

export interface BatchSelectionOptions {
  // Performance optimization
  enableCaching: boolean
  maxConcurrentEvaluations: number

  // Debugging options
  enableProfiling: boolean
  collectDebugInfo: boolean

  // Filtering options
  skipLowConfidenceWords: boolean
  confidenceThreshold: number

  // Rule filtering
  enabledRuleIds?: string[]
  disabledRuleIds?: string[]
}

export class AnimationSelector {
  private templateParser: TemplateParser
  private ruleEngine: RuleEngine
  private expressionEvaluator: ExpressionEvaluator
  private compiledTemplates: Map<string, CompiledTemplate>
  private variableCache: Map<string, unknown>

  constructor(options: { debugMode?: boolean } = {}) {
    this.templateParser = new TemplateParser()
    this.ruleEngine = new RuleEngine(options.debugMode || false)
    this.expressionEvaluator = new ExpressionEvaluator()
    this.compiledTemplates = new Map()
    this.variableCache = new Map()
  }

  /**
   * Apply template to entire audio analysis data and return all animation selections
   */
  async applyTemplate(
    template: SubtitleTemplate,
    audioData: AudioAnalysisData,
    options: BatchSelectionOptions = this.getDefaultOptions()
  ): Promise<TemplateApplicationResult> {
    const startTime = performance.now()

    try {
      // Compile template if not already cached
      let compiledTemplate = this.compiledTemplates.get(template.id)
      if (!compiledTemplate) {
        compiledTemplate = await this.templateParser.parseTemplate(template)
        this.compiledTemplates.set(template.id, compiledTemplate)
      }

      if (compiledTemplate.validationErrors.length > 0) {
        return {
          success: false,
          appliedRules: [],
          errors: compiledTemplate.validationErrors,
          warnings: [`Template ${template.id} has validation errors`],
          performance: {
            processingTime: performance.now() - startTime,
            rulesEvaluated: 0,
            animationsApplied: 0,
          },
        }
      }

      // Pre-compute template variables
      const computedVariables = await this.computeTemplateVariables(
        compiledTemplate,
        audioData
      )

      const appliedRules: TemplateApplicationResult['appliedRules'] = []
      const errors: string[] = []
      const warnings: string[] = []
      let totalRulesEvaluated = 0
      let totalAnimationsApplied = 0

      // Process each segment and its words
      for (
        let segmentIndex = 0;
        segmentIndex < audioData.segments.length;
        segmentIndex++
      ) {
        const segment = audioData.segments[segmentIndex]

        for (let wordIndex = 0; wordIndex < segment.words.length; wordIndex++) {
          const word = segment.words[wordIndex]

          // Skip low confidence words if option is enabled
          if (
            options.skipLowConfidenceWords &&
            word.confidence < options.confidenceThreshold
          ) {
            continue
          }

          try {
            const selection = await this.selectAnimationsForWord(
              compiledTemplate,
              word,
              segment,
              audioData,
              {
                wordIndex: wordIndex + segmentIndex * 1000, // Unique word ID
                segmentIndex,
                wordPositionInSegment: wordIndex,
                variables: computedVariables,
              },
              options
            )

            totalRulesEvaluated += selection.result.executionStats.evaluations
            totalAnimationsApplied += selection.result.selectedRules.length

            // Convert to application result format
            selection.result.selectedRules.forEach((selectedRule) => {
              appliedRules.push({
                ruleId: selectedRule.rule.id,
                wordId: `${segmentIndex}-${wordIndex}`,
                animation: selectedRule.animation,
                matchStrength: selectedRule.matchStrength,
              })
            })

            // Collect warnings from conflicts
            selection.result.conflicts.forEach((conflict) => {
              warnings.push(
                `Rule conflict for word ${segmentIndex}-${wordIndex}: ${conflict.conflictingRules.join(', ')}`
              )
            })
          } catch (error) {
            errors.push(
              `Failed to select animations for word ${segmentIndex}-${wordIndex}: ${error}`
            )
          }
        }
      }

      const processingTime = performance.now() - startTime

      return {
        success: errors.length === 0,
        appliedRules,
        errors,
        warnings,
        performance: {
          processingTime,
          rulesEvaluated: totalRulesEvaluated,
          animationsApplied: totalAnimationsApplied,
        },
      }
    } catch (error) {
      return {
        success: false,
        appliedRules: [],
        errors: [`Template application failed: ${error}`],
        warnings: [],
        performance: {
          processingTime: performance.now() - startTime,
          rulesEvaluated: 0,
          animationsApplied: 0,
        },
      }
    }
  }

  /**
   * Select animations for a single word
   */
  async selectAnimationsForWord(
    compiledTemplate: CompiledTemplate,
    word: AudioWord,
    segment: AudioSegment,
    audioData: AudioAnalysisData,
    contextInfo: {
      wordIndex: number
      segmentIndex: number
      wordPositionInSegment: number
      variables: Record<string, unknown>
    },
    options: BatchSelectionOptions = this.getDefaultOptions()
  ): Promise<{
    selection: AnimationSelection
    result: RuleEvaluationResult
  }> {
    // Filter rules based on options
    let rules = compiledTemplate.compiledRules
    if (options.enabledRuleIds) {
      rules = rules.filter((rule) => options.enabledRuleIds!.includes(rule.id))
    }
    if (options.disabledRuleIds) {
      rules = rules.filter(
        (rule) => !options.disabledRuleIds!.includes(rule.id)
      )
    }

    // Create evaluation context
    const context: RuleEvaluationContext = {
      word,
      segment,
      audioData,
      variables: contextInfo.variables,
      wordIndex: contextInfo.wordIndex,
      segmentIndex: contextInfo.segmentIndex,
      wordPositionInSegment: this.calculateWordPositionInSegment(word, segment),
      totalWords: this.countTotalWords(audioData),
      totalSegments: audioData.segments.length,
      helpers: this.createExpressionHelpers(),
    }

    // Evaluate rules
    const result = this.ruleEngine.evaluateRules(rules, context)

    // Convert to animation selection format
    const selection: AnimationSelection = {
      wordId: `${contextInfo.segmentIndex}-${contextInfo.wordPositionInSegment}`,
      animations: result.selectedRules.map((selectedRule) => ({
        pluginName: selectedRule.animation.pluginName,
        params: selectedRule.animation.params || {},
        timing: selectedRule.animation.timing,
        intensity: selectedRule.intensity,
        ruleId: selectedRule.rule.id,
      })),
      appliedRuleIds: result.selectedRules.map((sr) => sr.rule.id),
      executionTime: result.totalExecutionTime,
    }

    return { selection, result }
  }

  /**
   * Pre-compute template variables for performance
   */
  private async computeTemplateVariables(
    template: CompiledTemplate,
    audioData: AudioAnalysisData
  ): Promise<Record<string, unknown>> {
    const variables: Record<string, unknown> = {}

    if (!template.variables) {
      return variables
    }

    // Create dummy context for variable computation
    const dummyContext: ExpressionContext = {
      word: audioData.segments[0]?.words[0] || ({} as AudioWord),
      segment: audioData.segments[0] || ({} as AudioSegment),
      audioData,
      wordIndex: 0,
      segmentIndex: 0,
      wordPositionInSegment: 0,
      variables: {},
      helpers: {} as ExpressionHelpers, // Will be filled by expression evaluator
    }

    // Compute each variable
    for (const [name, variableConfig] of Object.entries(template.variables)) {
      try {
        // Check cache first
        const cacheKey = `${template.id}-${name}-${JSON.stringify(audioData.metadata)}`

        if (variableConfig.cached && this.variableCache.has(cacheKey)) {
          variables[name] = this.variableCache.get(cacheKey)
          continue
        }

        // Evaluate variable expression
        const value = this.expressionEvaluator.evaluate(
          variableConfig.expression,
          dummyContext
        )

        variables[name] = value

        // Cache if enabled
        if (variableConfig.cached) {
          this.variableCache.set(cacheKey, value)
        }
      } catch (error) {
        console.warn(`Failed to compute variable ${name}:`, error)
        variables[name] = null
      }
    }

    return variables
  }

  /**
   * Count total words in audio data
   */
  private countTotalWords(audioData: AudioAnalysisData): number {
    return audioData.segments.reduce(
      (total, segment) => total + segment.words.length,
      0
    )
  }

  /**
   * Get default batch selection options
   */
  private getDefaultOptions(): BatchSelectionOptions {
    return {
      enableCaching: true,
      maxConcurrentEvaluations: 100,
      enableProfiling: false,
      collectDebugInfo: false,
      skipLowConfidenceWords: true,
      confidenceThreshold: 0.5,
    }
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.compiledTemplates.clear()
    this.variableCache.clear()
    this.ruleEngine.clearStats()
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    compiledTemplates: number
    cachedVariables: number
    ruleEngineStats: unknown
  } {
    return {
      compiledTemplates: this.compiledTemplates.size,
      cachedVariables: this.variableCache.size,
      ruleEngineStats: this.ruleEngine.getStatsForRule, // Method reference
    }
  }

  /**
   * Validate template without applying it
   */
  async validateTemplate(template: SubtitleTemplate): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    estimatedComplexity: 'low' | 'medium' | 'high'
  }> {
    try {
      const validationResult = this.templateParser.validateTemplate(template)

      return {
        isValid: validationResult.isValid,
        errors: validationResult.errors
          .filter((e) => e.severity === 'error')
          .map((e) => e.message),
        warnings: validationResult.warnings.map((w) => w.message),
        estimatedComplexity: validationResult.estimatedComplexity,
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error}`],
        warnings: [],
        estimatedComplexity: 'high',
      }
    }
  }

  /**
   * Calculate word position within segment
   */
  private calculateWordPositionInSegment(
    word: AudioWord,
    segment: AudioSegment
  ): number {
    return segment.words.findIndex(
      (w) => w.word === word.word && w.start === word.start
    )
  }

  /**
   * Create expression helpers
   */
  private createExpressionHelpers(): ExpressionHelpers {
    return {
      // Math functions
      min: (...values: number[]) => Math.min(...values),
      max: (...values: number[]) => Math.max(...values),
      avg: (values: number[]) =>
        values.reduce((a, b) => a + b, 0) / values.length,
      abs: Math.abs,
      round: (value: number, decimals: number = 0) => {
        const factor = Math.pow(10, decimals)
        return Math.round(value * factor) / factor
      },

      // Statistical functions
      percentile: (values: number[], p: number) => {
        const sorted = [...values].sort((a, b) => a - b)
        const index = (p / 100) * (sorted.length - 1)
        const lower = Math.floor(index)
        const upper = Math.ceil(index)
        const weight = index % 1

        if (upper >= sorted.length) return sorted[sorted.length - 1]
        return sorted[lower] * (1 - weight) + sorted[upper] * weight
      },
      standardDeviation: (values: number[]) => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        const squareDiffs = values.map((value) => Math.pow(value - avg, 2))
        const avgSquareDiff =
          squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length
        return Math.sqrt(avgSquareDiff)
      },

      // String functions
      toLowerCase: (str: string) => str.toLowerCase(),
      toUpperCase: (str: string) => str.toUpperCase(),
      trim: (str: string) => str.trim(),

      // Audio-specific helpers
      dbToLinear: (db: number) => Math.pow(10, db / 20),
      linearToDb: (linear: number) => 20 * Math.log10(linear),
      hzToMidi: (hz: number) => 69 + 12 * Math.log2(hz / 440),
      midiToHz: (midi: number) => 440 * Math.pow(2, (midi - 69) / 12),

      // Timing helpers
      secondsToFrames: (seconds: number, fps: number) => seconds * fps,
      framesToSeconds: (frames: number, fps: number) => frames / fps,
    }
  }
}
