/**
 * Template System - Main Export
 *
 * Provides a unified interface for the entire template system.
 */

// Core types
export type {
  SubtitleTemplate,
  TemplateCategory,
  AudioAnalysisData,
  AudioSegment,
  AudioWord,
  TemplateApplicationResult,
  AnimationRule,
  AnimationConfig,
  RuleEvaluationContext,
  CompiledTemplate,
} from './types/template.types'

export type {
  RuleExecutionStats,
  TemplateValidationResult,
  ExpressionContext,
  AudioFieldPath,
} from './types/rule.types'

// Core engine classes
export { TemplateParser } from './engine/TemplateParser'
export { RuleEngine } from './engine/RuleEngine'
export { ExpressionEvaluator } from './engine/ExpressionEvaluator'
export { AnimationSelector } from './engine/AnimationSelector'

// Processing classes
export { TemplateProcessor } from './processor/TemplateProcessor'
export { AudioDataMapper } from './processor/AudioDataMapper'

// Registry
export { TemplateRegistry } from './registry/TemplateRegistry'
export type {
  TemplateInfo,
  TemplateSearchOptions,
} from './registry/TemplateRegistry'

// Import types
import { TemplateRegistry } from './registry/TemplateRegistry'
import { TemplateProcessor } from './processor/TemplateProcessor'
import { SubtitleTemplate } from './types/template.types'

/* eslint-disable @typescript-eslint/no-explicit-any */
// Template system will be rewritten - temporarily disable any types
// Main template system facade
export class TemplateSystem {
  private registry: TemplateRegistry
  private processor: TemplateProcessor

  constructor(options: { debugMode?: boolean } = {}) {
    this.registry = new TemplateRegistry()
    this.processor = new TemplateProcessor(options.debugMode || false)
  }

  /**
   * Get the template registry
   */
  getRegistry(): TemplateRegistry {
    return this.registry
  }

  /**
   * Get the template processor
   */
  getProcessor(): TemplateProcessor {
    return this.processor
  }

  /**
   * Quick method to apply a template to audio data
   */
  async applyTemplate(
    templateId: string,
    rawAudioData: any,
    options?: any
  ): Promise<any> {
    const template = await this.registry.loadTemplate(templateId)
    return this.processor.processTemplate(template, rawAudioData, options)
  }

  /**
   * Get all available templates
   */
  getAvailableTemplates(filters?: any): any[] {
    return this.registry.getTemplateInfos(filters)
  }

  /**
   * Get recommended templates for audio content
   */
  getRecommendations(audioFeatures: {
    hasMultipleSpeakers: boolean
    hasEmotionalContent: boolean
    isDynamic: boolean
    contentType: 'conversation' | 'narration' | 'presentation' | 'other'
  }): any[] {
    return this.registry.getRecommendedTemplates(audioFeatures)
  }

  /**
   * Validate a template
   */
  async validateTemplate(template: SubtitleTemplate): Promise<any> {
    return this.processor.validateTemplate(template)
  }

  /**
   * Register a custom template
   */
  async registerCustomTemplate(template: SubtitleTemplate): Promise<void> {
    return this.registry.registerTemplate(template)
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.registry.clearCache()
    this.processor.clearCaches()
  }
}
