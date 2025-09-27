/**
 * Rule Engine
 *
 * Evaluates animation rules and selects appropriate animations based on audio analysis data.
 * Handles rule priorities, conflicts, and performance optimization.
 */

import {
  AnimationRule,
  CompiledAnimationRule,
  RuleEvaluationContext,
  AnimationConfig,
  // AudioAnalysisData, // Unused import
  // AudioWord, // Unused import
  // AudioSegment, // Unused import
} from '../types/template.types'
import {
  RuleConflict,
  IntensityCalculator,
  RuleExecutionStats,
  RuleDebugInfo,
} from '../types/rule.types'
import { ExpressionEvaluator } from './ExpressionEvaluator'

export interface RuleEvaluationResult {
  selectedRules: Array<{
    rule: AnimationRule
    animation: AnimationConfig
    intensity: number
    matchStrength: number
    debugInfo?: RuleDebugInfo
  }>
  conflicts: RuleConflict[]
  executionStats: RuleExecutionStats
  totalExecutionTime: number
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Template system will be rewritten - temporarily disable any types
export class RuleEngine {
  private expressionEvaluator: ExpressionEvaluator
  private intensityCalculators: Map<string, IntensityCalculator>
  private executionStats: Map<string, RuleExecutionStats>
  private debugMode: boolean

  constructor(debugMode = false) {
    this.expressionEvaluator = new ExpressionEvaluator()
    this.intensityCalculators = new Map()
    this.executionStats = new Map()
    this.debugMode = debugMode
    this.initializeIntensityCalculators()
  }

  /**
   * Evaluate all rules for a given word and return matching animations
   */
  evaluateRules(
    rules: CompiledAnimationRule[],
    context: RuleEvaluationContext
  ): RuleEvaluationResult {
    const startTime = performance.now()
    const matchingRules: Array<{
      rule: AnimationRule
      animation: AnimationConfig
      intensity: number
      matchStrength: number
      debugInfo?: RuleDebugInfo
    }> = []

    const debugInfos: RuleDebugInfo[] = []
    const conflicts: RuleConflict[] = []

    // Evaluate each rule
    for (const compiledRule of rules) {
      const ruleStartTime = performance.now()
      let debugInfo: RuleDebugInfo | undefined

      if (this.debugMode) {
        debugInfo = {
          ruleId: compiledRule.id,
          executionTime: 0,
          conditionResult: false,
          fieldValues: {},
          expressionEvaluations: [],
          cacheUsage: { hits: 0, misses: 0 },
        }
        debugInfos.push(debugInfo)
      }

      try {
        // Evaluate rule condition
        const conditionResult = this.evaluateRuleCondition(
          compiledRule,
          context,
          debugInfo
        )

        if (conditionResult.matches) {
          // Calculate animation intensity
          const intensity = this.calculateAnimationIntensity(
            compiledRule,
            conditionResult.matchStrength,
            context
          )

          // Create animation config with calculated intensity
          const animationConfig = this.createAnimationConfig(
            compiledRule.animation,
            intensity,
            context
          )

          matchingRules.push({
            rule: compiledRule,
            animation: animationConfig,
            intensity,
            matchStrength: conditionResult.matchStrength,
            debugInfo,
          })
        }

        // Update debug info
        if (debugInfo) {
          debugInfo.conditionResult = conditionResult.matches
          debugInfo.executionTime = performance.now() - ruleStartTime
        }

        // Update execution stats
        this.updateExecutionStats(
          compiledRule.id,
          performance.now() - ruleStartTime,
          conditionResult.matches
        )
      } catch (_error) {
        console.warn(`Rule evaluation failed for ${compiledRule.id}:`, _error)

        if (debugInfo) {
          debugInfo.executionTime = performance.now() - ruleStartTime
        }
      }
    }

    // Resolve conflicts between matching rules
    const resolvedRules = this.resolveRuleConflicts(matchingRules, conflicts)

    const totalExecutionTime = performance.now() - startTime

    return {
      selectedRules: resolvedRules,
      conflicts,
      executionStats: this.getAggregatedStats(),
      totalExecutionTime,
    }
  }

  /**
   * Evaluate a single rule condition
   */
  private evaluateRuleCondition(
    rule: CompiledAnimationRule,
    context: RuleEvaluationContext,
    debugInfo?: RuleDebugInfo
  ): { matches: boolean; matchStrength: number } {
    try {
      const matches = rule.compiledCondition.evaluate(context)

      // Calculate match strength for intensity calculation
      let matchStrength = matches ? 1.0 : 0.0

      if (matches && rule.condition.operator) {
        matchStrength = this.calculateMatchStrength(rule.condition, context)
      }

      // Collect field values for debugging
      if (debugInfo) {
        rule.compiledCondition.dependencies.forEach((fieldPath) => {
          debugInfo!.fieldValues[fieldPath] = this.getFieldValue(
            fieldPath,
            context
          )
        })
      }

      return { matches, matchStrength }
    } catch (_error) {
      console.warn(`Condition evaluation failed for rule ${rule.id}:`, _error)
      return { matches: false, matchStrength: 0 }
    }
  }

  /**
   * Calculate how strongly a condition matches (for intensity scaling)
   */
  private calculateMatchStrength(
    condition: any,
    context: RuleEvaluationContext
  ): number {
    try {
      const fieldValue = this.getFieldValue(condition.field, context)
      const compareValue = this.expressionEvaluator.evaluate(
        condition.value,
        context
      )

      // For numeric comparisons, calculate relative strength
      if (typeof fieldValue === 'number' && typeof compareValue === 'number') {
        switch (condition.operator) {
          case 'gt':
          case 'gte':
            // Strength based on how much greater the value is
            return Math.min(
              1.0,
              Math.max(0.1, (fieldValue - compareValue) / compareValue)
            )

          case 'lt':
          case 'lte':
            // Strength based on how much smaller the value is
            return Math.min(
              1.0,
              Math.max(0.1, (compareValue - fieldValue) / compareValue)
            )

          case 'between':
            if (condition.secondValue !== undefined) {
              const secondValue = this.expressionEvaluator.evaluate(
                condition.secondValue,
                context
              ) as number
              // Strength based on position within range
              const range = secondValue - compareValue
              const position = fieldValue - compareValue
              return Math.min(
                1.0,
                Math.max(
                  0.1,
                  1.0 - Math.abs(position - range / 2) / (range / 2)
                )
              )
            }
            return 1.0

          default:
            return 1.0
        }
      }

      return 1.0
    } catch (_error) {
      return 0.5 // Default strength if calculation fails
    }
  }

  /**
   * Calculate animation intensity based on rule match strength
   */
  private calculateAnimationIntensity(
    rule: AnimationRule,
    matchStrength: number,
    context: RuleEvaluationContext
  ): number {
    const intensityConfig = rule.animation.intensity

    if (!intensityConfig) {
      return 1.0 // Default intensity
    }

    const calculator = this.intensityCalculators.get(
      intensityConfig.mapping || 'linear'
    )

    if (calculator) {
      return calculator.calculate(
        matchStrength,
        0.5, // threshold value
        context
      )
    }

    // Default linear mapping
    const range = intensityConfig.max - intensityConfig.min
    return intensityConfig.min + range * matchStrength
  }

  /**
   * Create animation config with computed intensity
   */
  private createAnimationConfig(
    baseAnimation: AnimationConfig,
    intensity: number,
    _context: RuleEvaluationContext
  ): AnimationConfig {
    // Clone the base animation config
    const animationConfig: AnimationConfig = {
      ...baseAnimation,
      params: { ...baseAnimation.params },
    }

    // Apply intensity to relevant parameters
    if (animationConfig.params) {
      // Common intensity-sensitive parameters
      if ('scale' in animationConfig.params) {
        animationConfig.params.scale = this.scaleValue(
          animationConfig.params.scale,
          intensity
        )
      }

      if ('opacity' in animationConfig.params) {
        animationConfig.params.opacity = this.scaleValue(
          animationConfig.params.opacity,
          intensity
        )
      }

      if ('rotation' in animationConfig.params) {
        animationConfig.params.rotation = this.scaleValue(
          animationConfig.params.rotation,
          intensity
        )
      }

      if ('amplitude' in animationConfig.params) {
        animationConfig.params.amplitude = this.scaleValue(
          animationConfig.params.amplitude,
          intensity
        )
      }
    }

    return animationConfig
  }

  /**
   * Scale a parameter value by intensity
   */
  private scaleValue(value: any, intensity: number): any {
    if (typeof value === 'number') {
      return value * intensity
    }
    if (Array.isArray(value) && value.length === 2) {
      // For [min, max] ranges
      return [value[0] * intensity, value[1] * intensity]
    }
    return value
  }

  /**
   * Resolve conflicts between multiple matching rules
   */
  private resolveRuleConflicts(
    matchingRules: Array<{
      rule: AnimationRule
      animation: AnimationConfig
      intensity: number
      matchStrength: number
      debugInfo?: RuleDebugInfo
    }>,
    conflicts: RuleConflict[]
  ): typeof matchingRules {
    if (matchingRules.length <= 1) {
      return matchingRules
    }

    // Group rules by plugin name to detect conflicts
    const rulesByPlugin = new Map<string, typeof matchingRules>()

    matchingRules.forEach((ruleResult) => {
      const pluginName = ruleResult.animation.pluginName
      if (!rulesByPlugin.has(pluginName)) {
        rulesByPlugin.set(pluginName, [])
      }
      rulesByPlugin.get(pluginName)!.push(ruleResult)
    })

    const resolvedRules: typeof matchingRules = []

    // Resolve conflicts for each plugin
    rulesByPlugin.forEach((rulesForPlugin, pluginName) => {
      if (rulesForPlugin.length === 1) {
        resolvedRules.push(rulesForPlugin[0])
      } else {
        // Multiple rules for same plugin - resolve conflict
        const conflict = this.createRuleConflict(rulesForPlugin)
        conflicts.push(conflict)

        switch (conflict.resolution) {
          case 'highest-priority':
            const highestPriority = Math.max(
              ...rulesForPlugin.map((r) => r.rule.priority)
            )
            const selectedRule = rulesForPlugin.find(
              (r) => r.rule.priority === highestPriority
            )!
            resolvedRules.push(selectedRule)
            break

          case 'merge':
            const mergedRule = this.mergeRules(rulesForPlugin)
            resolvedRules.push(mergedRule)
            break

          case 'skip':
            // Don't add any rule for this plugin
            break

          case 'error':
            throw new Error(
              `Unresolvable rule conflict for plugin ${pluginName}`
            )
        }
      }
    })

    return resolvedRules
  }

  /**
   * Create conflict information
   */
  private createRuleConflict(
    conflictingRules: Array<{
      rule: AnimationRule
      animation: AnimationConfig
      intensity: number
      matchStrength: number
    }>
  ): RuleConflict {
    const ruleIds = conflictingRules.map((r) => r.rule.id)
    const hasExclusiveRule = conflictingRules.some((r) => r.rule.exclusive)

    let resolution: RuleConflict['resolution'] = 'highest-priority'

    if (hasExclusiveRule) {
      resolution = 'highest-priority'
    } else {
      // Check if rules can be merged
      const canMerge = this.canMergeRules(conflictingRules)
      resolution = canMerge ? 'merge' : 'highest-priority'
    }

    return {
      conflictingRules: ruleIds,
      type: 'priority',
      resolution,
      result:
        resolution === 'highest-priority'
          ? {
              selectedRule: conflictingRules.reduce((highest, current) =>
                current.rule.priority > highest.rule.priority
                  ? current
                  : highest
              ).rule.id,
            }
          : undefined,
    }
  }

  /**
   * Check if rules can be merged
   */
  private canMergeRules(rules: Array<{ rule: AnimationRule }>): boolean {
    // Simple heuristic: rules can be merged if they have different parameter focuses
    const parameterSets = rules.map(
      (r) => new Set(Object.keys(r.rule.animation.params || {}))
    )

    // Check for parameter overlap
    for (let i = 0; i < parameterSets.length; i++) {
      for (let j = i + 1; j < parameterSets.length; j++) {
        const intersection = new Set(
          [...parameterSets[i]].filter((x) => parameterSets[j].has(x))
        )
        if (intersection.size > 0) {
          return false // Overlapping parameters can't be merged
        }
      }
    }

    return true
  }

  /**
   * Merge multiple rules into one
   */
  private mergeRules(
    rules: Array<{
      rule: AnimationRule
      animation: AnimationConfig
      intensity: number
      matchStrength: number
    }>
  ): (typeof rules)[0] {
    const baseRule = rules[0]
    const mergedParams = { ...baseRule.animation.params }

    // Merge parameters from all rules
    rules.slice(1).forEach((ruleResult) => {
      Object.assign(mergedParams, ruleResult.animation.params)
    })

    return {
      ...baseRule,
      animation: {
        ...baseRule.animation,
        params: mergedParams,
      },
      intensity: Math.max(...rules.map((r) => r.intensity)),
      matchStrength: Math.max(...rules.map((r) => r.matchStrength)),
    }
  }

  /**
   * Get field value from context
   */
  private getFieldValue(
    fieldPath: string,
    context: RuleEvaluationContext
  ): any {
    if (fieldPath in context.word) {
      return (context.word as any)[fieldPath]
    }

    if (fieldPath.startsWith('segment.')) {
      const segmentField = fieldPath.substring(8)
      return this.getNestedValue(context.segment, segmentField)
    }

    return this.getNestedValue(context.audioData, fieldPath)
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Update execution statistics for a rule
   */
  private updateExecutionStats(
    ruleId: string,
    executionTime: number,
    matched: boolean
  ): void {
    if (!this.executionStats.has(ruleId)) {
      this.executionStats.set(ruleId, {
        evaluations: 0,
        matches: 0,
        averageExecutionTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
      })
    }

    const stats = this.executionStats.get(ruleId)!
    stats.evaluations++
    if (matched) stats.matches++

    // Update rolling average
    stats.averageExecutionTime =
      (stats.averageExecutionTime * (stats.evaluations - 1) + executionTime) /
      stats.evaluations
  }

  /**
   * Get aggregated execution statistics
   */
  private getAggregatedStats(): RuleExecutionStats {
    const allStats = Array.from(this.executionStats.values())

    return {
      evaluations: allStats.reduce((sum, stats) => sum + stats.evaluations, 0),
      matches: allStats.reduce((sum, stats) => sum + stats.matches, 0),
      averageExecutionTime:
        allStats.reduce((sum, stats) => sum + stats.averageExecutionTime, 0) /
          allStats.length || 0,
      cacheHits: allStats.reduce((sum, stats) => sum + stats.cacheHits, 0),
      cacheMisses: allStats.reduce((sum, stats) => sum + stats.cacheMisses, 0),
    }
  }

  /**
   * Initialize intensity calculators
   */
  private initializeIntensityCalculators(): void {
    this.intensityCalculators.set('linear', {
      calculate: (value: number, _threshold: number, _context) => value,
      mapping: 'linear',
      clampMin: 0,
      clampMax: 1,
    })

    this.intensityCalculators.set('exponential', {
      calculate: (value: number, _threshold: number, _context) =>
        Math.pow(value, 2),
      mapping: 'exponential',
      clampMin: 0,
      clampMax: 1,
    })

    this.intensityCalculators.set('logarithmic', {
      calculate: (value: number, _threshold: number, _context) =>
        Math.log(1 + value),
      mapping: 'logarithmic',
      clampMin: 0,
      clampMax: 1,
    })
  }

  /**
   * Clear execution statistics
   */
  clearStats(): void {
    this.executionStats.clear()
  }

  /**
   * Get execution statistics for a specific rule
   */
  getStatsForRule(ruleId: string): RuleExecutionStats | undefined {
    return this.executionStats.get(ruleId)
  }
}
