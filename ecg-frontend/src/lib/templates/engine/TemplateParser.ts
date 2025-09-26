/**
 * Template Parser
 *
 * Parses template files and handles variable interpolation with support for:
 * - Global variables: {{variable_name}} - from audio analysis statistics
 * - Word-level variables: [[field_name]] - from current word being processed
 * - Mathematical expressions and helper functions
 */

import {
  SubtitleTemplate,
  CompiledTemplate,
  // TemplateExpression, // Unused import
  // AudioAnalysisData, // Unused import
  // AudioWord, // Unused import
  // AudioSegment, // Unused import
  RuleEvaluationContext,
} from '../types/template.types'
import {
  ExpressionContext,
  ExpressionHelpers,
  TemplateValidationResult,
  TemplateValidationError,
  AudioFieldPath,
} from '../types/rule.types'

/* eslint-disable @typescript-eslint/no-explicit-any */
// Template system will be rewritten - temporarily disable any types
export class TemplateParser {
  private static readonly GLOBAL_VAR_PATTERN = /\{\{([^}]+)\}\}/g
  private static readonly WORD_VAR_PATTERN = /\[\[([^\]]+)\]\]/g
  private static readonly EXPRESSION_PATTERN = /\$\{([^}]+)\}/g

  private expressionHelpers: ExpressionHelpers

  constructor() {
    this.expressionHelpers = this.createExpressionHelpers()
  }

  /**
   * Parse and compile a template for efficient runtime execution
   */
  async parseTemplate(template: SubtitleTemplate): Promise<CompiledTemplate> {
    const validationResult = this.validateTemplate(template)

    if (!validationResult.isValid) {
      throw new Error(
        `Template validation failed: ${validationResult.errors
          .map((e) => e.message)
          .join(', ')}`
      )
    }

    // Pre-compile rules for faster execution
    const compiledRules = template.animationRules.map((rule) => ({
      ...rule,
      compiledCondition: this.compileCondition(rule.condition),
    }))

    const compiledTemplate: CompiledTemplate = {
      ...template,
      compiledRules,
      computedVariables: {},
      validationErrors: validationResult.errors
        .filter((e) => e.severity === 'error')
        .map((e) => e.message),
    }

    return compiledTemplate
  }

  /**
   * Validate template structure and expressions
   */
  validateTemplate(template: SubtitleTemplate): TemplateValidationResult {
    const errors: TemplateValidationError[] = []
    const fieldDependencies = new Set<string>()

    // Validate basic structure
    if (!template.id || !template.name || !template.version) {
      errors.push({
        type: 'syntax',
        message: 'Template must have id, name, and version',
        location: {},
        severity: 'error',
      })
    }

    // Validate animation rules
    template.animationRules.forEach((rule, _index) => {
      try {
        this.validateRuleCondition(rule.condition)
        this.extractFieldDependencies(rule.condition, fieldDependencies)
      } catch (_error) {
        errors.push({
          type: 'syntax',
          message: `Rule ${rule.id} has invalid condition: ${_error}`,
          location: { ruleId: rule.id },
          severity: 'error',
        })
      }

      // Validate animation plugin exists
      if (!this.isValidPluginName(rule.animation.pluginName)) {
        errors.push({
          type: 'reference',
          message: `Unknown plugin: ${rule.animation.pluginName}`,
          location: { ruleId: rule.id },
          severity: 'error',
        })
      }
    })

    // Validate variables
    if (template.variables) {
      Object.entries(template.variables).forEach(([name, variable]) => {
        try {
          this.validateExpression(variable.expression)
        } catch (_error) {
          errors.push({
            type: 'syntax',
            message: `Variable ${name} has invalid expression: ${_error}`,
            location: { field: `variables.${name}` },
            severity: 'error',
          })
        }
      })
    }

    const warnings = errors
      .filter((e) => e.severity === 'warning')
      .map((e) => ({
        type: (e.type === 'performance' ? 'performance' : 'best-practice') as
          | 'performance'
          | 'best-practice'
          | 'compatibility',
        message: e.message,
        location: e.location,
      }))

    return {
      isValid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
      warnings,
      fieldDependencies: fieldDependencies as Set<AudioFieldPath>,
      estimatedComplexity: this.estimateComplexity(template),
    }
  }

  /**
   * Interpolate variables in a string expression
   */
  interpolateExpression(
    expression: string,
    context: ExpressionContext
  ): string {
    let result = expression

    // Replace global variables {{variable}}
    result = result.replace(
      TemplateParser.GLOBAL_VAR_PATTERN,
      (match, varPath) => {
        const value = this.resolveGlobalVariable(varPath.trim(), context)
        return this.formatValue(value)
      }
    )

    // Replace word-level variables [[field]]
    result = result.replace(
      TemplateParser.WORD_VAR_PATTERN,
      (match, fieldPath) => {
        const value = this.resolveWordVariable(fieldPath.trim(), context)
        return this.formatValue(value)
      }
    )

    return result
  }

  /**
   * Evaluate a mathematical expression with variables
   */
  evaluateExpression(
    expression: string,
    context: ExpressionContext
  ): number | string | boolean {
    // First interpolate variables
    const interpolated = this.interpolateExpression(expression, context)

    // Then evaluate mathematical expression
    try {
      return this.evaluateMathExpression(interpolated, context)
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error}`)
    }
  }

  /**
   * Resolve global variable path (e.g., "volume_statistics.global_max_db")
   */
  private resolveGlobalVariable(path: string, context: ExpressionContext): any {
    const pathParts = path.split('.')
    let value: any = context.audioData

    // Handle special variables
    if (path === 'wordIndex') return context.wordIndex
    if (path === 'segmentIndex') return context.segmentIndex
    if (path === 'wordPositionInSegment') return context.wordPositionInSegment

    // Handle computed variables
    if (context.variables[path] !== undefined) {
      return context.variables[path]
    }

    // Navigate through object path
    for (const part of pathParts) {
      if (value === null || value === undefined) {
        throw new Error(`Cannot access property '${part}' of ${value}`)
      }
      value = value[part]
    }

    return value
  }

  /**
   * Resolve word-level variable (e.g., "volume_db", "pitch_hz")
   */
  private resolveWordVariable(
    fieldName: string,
    context: ExpressionContext
  ): any {
    // Handle word fields
    if (fieldName in context.word) {
      return (context.word as any)[fieldName]
    }

    // Handle segment fields with prefix
    if (fieldName.startsWith('segment.')) {
      const segmentField = fieldName.substring(8)
      return this.getNestedValue(context.segment, segmentField)
    }

    throw new Error(`Unknown word variable: ${fieldName}`)
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Format value for string interpolation
   */
  private formatValue(value: any): string {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toString() : value.toFixed(3)
    }
    return String(value)
  }

  /**
   * Evaluate mathematical expression using a safe evaluation method
   */
  private evaluateMathExpression(
    expression: string,
    context: ExpressionContext
  ): any {
    // Simple expression evaluator for basic math operations
    // In a real implementation, you'd use a library like expr-eval
    try {
      // Create safe evaluation context
      const evalContext = {
        ...context.helpers,
        Math,
      }

      // Very basic eval replacement for demo - in production use a proper expression evaluator
      const sanitizedExpression = expression.replace(/[^0-9+\-*/.() ]/g, '')

      if (sanitizedExpression !== expression) {
        // If expression contains functions or variables, handle them
        return this.evaluateComplexExpression(expression, evalContext)
      }

      // For simple numeric expressions, use Function constructor (safer than eval)
      return new Function(`"use strict"; return (${sanitizedExpression})`)()
    } catch (_error) {
      throw new Error(`Invalid expression: ${expression}`)
    }
  }

  /**
   * Handle complex expressions with functions and variables
   */
  private evaluateComplexExpression(expression: string, evalContext: any): any {
    // This is a simplified version - use a proper expression parser in production
    let result = expression

    // Replace function calls
    Object.entries(evalContext).forEach(([name, func]) => {
      if (typeof func === 'function') {
        const pattern = new RegExp(`${name}\\(([^)]+)\\)`, 'g')
        result = result.replace(pattern, (match, args) => {
          const argValues = args
            .split(',')
            .map((arg: string) => parseFloat(arg.trim()))
          return func(...argValues).toString()
        })
      }
    })

    return parseFloat(result) || result
  }

  /**
   * Compile rule condition for fast evaluation
   */
  private compileCondition(condition: any) {
    // Simplified version - in production, create optimized condition evaluators
    return {
      evaluate: (context: RuleEvaluationContext) => {
        try {
          const fieldValue = this.resolveFieldValue(condition.field, context)
          const compareValue = this.evaluateExpression(condition.value, context)

          return this.compareValues(
            fieldValue,
            compareValue,
            condition.operator,
            condition.secondValue
              ? this.evaluateExpression(condition.secondValue, context)
              : undefined
          )
        } catch (_error) {
          console.warn(`Rule condition evaluation failed: ${_error}`)
          return false
        }
      },
      dependencies: [condition.field],
    }
  }

  /**
   * Compare values based on operator
   */
  private compareValues(
    fieldValue: any,
    compareValue: any,
    operator: string,
    secondValue?: any
  ): boolean {
    switch (operator) {
      case 'gt':
        return fieldValue > compareValue
      case 'gte':
        return fieldValue >= compareValue
      case 'lt':
        return fieldValue < compareValue
      case 'lte':
        return fieldValue <= compareValue
      case 'eq':
        return fieldValue === compareValue
      case 'neq':
        return fieldValue !== compareValue
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue)
      case 'between':
        return (
          secondValue !== undefined &&
          fieldValue >= compareValue &&
          fieldValue <= secondValue
        )
      default:
        throw new Error(`Unknown operator: ${operator}`)
    }
  }

  /**
   * Resolve field value from context
   */
  private resolveFieldValue(
    field: string,
    context: RuleEvaluationContext
  ): any {
    if (field.startsWith('segment.')) {
      return this.getNestedValue(context.segment, field.substring(8))
    }
    if (field in context.word) {
      return (context.word as any)[field]
    }
    return this.getNestedValue(context.audioData, field)
  }

  /**
   * Create helper functions for expressions
   */
  private createExpressionHelpers(): ExpressionHelpers {
    return {
      min: Math.min,
      max: Math.max,
      avg: (values: number[]) =>
        values.reduce((sum, val) => sum + val, 0) / values.length,
      abs: Math.abs,
      round: (value: number, decimals = 0) =>
        Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals),

      percentile: (values: number[], p: number) => {
        const sorted = values.sort((a, b) => a - b)
        const index = (p / 100) * (sorted.length - 1)
        const lower = Math.floor(index)
        const upper = Math.ceil(index)
        return lower === upper
          ? sorted[lower]
          : sorted[lower] * (upper - index) + sorted[upper] * (index - lower)
      },

      standardDeviation: (values: number[]) => {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length
        const squareDiffs = values.map((val) => Math.pow(val - avg, 2))
        const avgSquareDiff =
          squareDiffs.reduce((sum, val) => sum + val, 0) / values.length
        return Math.sqrt(avgSquareDiff)
      },

      toLowerCase: (str: string) => str.toLowerCase(),
      toUpperCase: (str: string) => str.toUpperCase(),
      trim: (str: string) => str.trim(),

      dbToLinear: (db: number) => Math.pow(10, db / 20),
      linearToDb: (linear: number) => 20 * Math.log10(linear),
      hzToMidi: (hz: number) => 12 * Math.log2(hz / 440) + 69,
      midiToHz: (midi: number) => 440 * Math.pow(2, (midi - 69) / 12),

      secondsToFrames: (seconds: number, fps: number) => seconds * fps,
      framesToSeconds: (frames: number, fps: number) => frames / fps,
    }
  }

  /**
   * Extract field dependencies from condition
   */
  private extractFieldDependencies(condition: any, deps: Set<string>): void {
    if (condition.field) {
      deps.add(condition.field)
    }
    if (condition.and) {
      condition.and.forEach((c: any) => this.extractFieldDependencies(c, deps))
    }
    if (condition.or) {
      condition.or.forEach((c: any) => this.extractFieldDependencies(c, deps))
    }
    if (condition.not) {
      this.extractFieldDependencies(condition.not, deps)
    }
  }

  /**
   * Validate rule condition structure
   */
  private validateRuleCondition(condition: any): void {
    if (!condition.field || !condition.operator) {
      throw new Error('Condition must have field and operator')
    }

    const validOperators = [
      'gt',
      'gte',
      'lt',
      'lte',
      'eq',
      'neq',
      'in',
      'between',
    ]
    if (!validOperators.includes(condition.operator)) {
      throw new Error(`Invalid operator: ${condition.operator}`)
    }

    if (
      condition.operator === 'between' &&
      condition.secondValue === undefined
    ) {
      throw new Error('Between operator requires secondValue')
    }
  }

  /**
   * Validate expression syntax
   */
  private validateExpression(expression: string): void {
    // Basic validation - in production, use proper expression parser
    if (!expression || typeof expression !== 'string') {
      throw new Error('Expression must be a non-empty string')
    }

    // Check for balanced brackets
    const globalBrackets = (expression.match(/\{\{/g) || []).length
    const globalClosing = (expression.match(/\}\}/g) || []).length
    if (globalBrackets !== globalClosing) {
      throw new Error('Unbalanced global variable brackets {{}}')
    }

    const wordBrackets = (expression.match(/\[\[/g) || []).length
    const wordClosing = (expression.match(/\]\]/g) || []).length
    if (wordBrackets !== wordClosing) {
      throw new Error('Unbalanced word variable brackets [[]]')
    }
  }

  /**
   * Check if plugin name is valid
   */
  private isValidPluginName(pluginName: string): boolean {
    // In production, check against available plugins
    const knownPlugins = [
      'cwi-loud',
      'cwi-bouncing',
      'rotation',
      'elastic',
      'fade',
    ]
    return knownPlugins.includes(pluginName)
  }

  /**
   * Estimate template complexity
   */
  private estimateComplexity(
    template: SubtitleTemplate
  ): 'low' | 'medium' | 'high' {
    let score = 0

    // Count rules
    score += template.animationRules.length

    // Count complex conditions
    template.animationRules.forEach((rule) => {
      if (rule.condition.and || rule.condition.or) score += 2
      if (rule.condition.not) score += 1
    })

    // Count variables
    if (template.variables) {
      score += Object.keys(template.variables).length
    }

    if (score < 5) return 'low'
    if (score < 15) return 'medium'
    return 'high'
  }
}
