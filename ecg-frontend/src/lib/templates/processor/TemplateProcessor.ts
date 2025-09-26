/**
 * Template Processor
 *
 * Main interface for applying templates to audio data and generating motion text scenarios.
 * Coordinates all template system components.
 */

import {
  SubtitleTemplate,
  AudioAnalysisData,
  TemplateApplicationResult,
} from '../types/template.types'
import { RawAudioData, AudioDataMapper } from './AudioDataMapper'
import {
  AnimationSelector,
  BatchSelectionOptions,
} from '../engine/AnimationSelector'

export interface TemplateProcessorOptions {
  // Performance options
  enableCaching: boolean
  maxConcurrentProcessing: number

  // Quality options
  skipLowConfidenceWords: boolean
  confidenceThreshold: number

  // Debug options
  enableProfiling: boolean
  enableDebugOutput: boolean

  // Output options
  outputFormat: 'motiontext-v2' | 'legacy'
  includeTiming: boolean
  optimizeForPlayback: boolean
}

export interface ProcessingResult {
  success: boolean
  scenario?: unknown // MotionText renderer scenario
  templateApplication: TemplateApplicationResult
  animationTracks?: Array<{
    wordId: string
    assetId: string
    assetName: string
    pluginKey: string
    params: Record<string, unknown>
    timing: { start: number; end: number }
    intensity: { min: number; max: number }
    color: 'blue' | 'green' | 'purple'
  }>
  processingStats: {
    totalProcessingTime: number
    audioMappingTime: number
    templateApplicationTime: number
    scenarioGenerationTime: number
    wordsProcessed: number
    animationsGenerated: number
  }
  errors: string[]
  warnings: string[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Template system will be rewritten - temporarily disable any types
export class TemplateProcessor {
  private animationSelector: AnimationSelector
  private defaultOptions: TemplateProcessorOptions

  constructor(debugMode = false) {
    this.animationSelector = new AnimationSelector({ debugMode })
    this.defaultOptions = {
      enableCaching: true,
      maxConcurrentProcessing: 10,
      skipLowConfidenceWords: true,
      confidenceThreshold: 0.7,
      enableProfiling: false,
      enableDebugOutput: false,
      outputFormat: 'motiontext-v2',
      includeTiming: true,
      optimizeForPlayback: true,
    }
  }

  /**
   * Process template with raw audio data and generate motion text scenario
   */
  async processTemplate(
    template: SubtitleTemplate,
    rawAudioData: RawAudioData,
    options: Partial<TemplateProcessorOptions> = {}
  ): Promise<ProcessingResult> {
    const finalOptions = { ...this.defaultOptions, ...options }
    const startTime = performance.now()

    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Step 1: Map raw audio data to standardized format
      const mappingStartTime = performance.now()
      const audioData = AudioDataMapper.mapToStandardFormat(rawAudioData)
      const audioMappingTime = performance.now() - mappingStartTime

      if (finalOptions.enableDebugOutput) {
        console.log('Audio data mapping completed:', {
          segments: audioData.segments.length,
          totalWords: audioData.segments.reduce(
            (sum, s) => sum + s.words.length,
            0
          ),
          processingTime: audioMappingTime,
        })
      }

      // Step 2: Apply template to audio data
      const templateStartTime = performance.now()
      const batchOptions: BatchSelectionOptions = {
        enableCaching: finalOptions.enableCaching,
        maxConcurrentEvaluations: finalOptions.maxConcurrentProcessing,
        enableProfiling: finalOptions.enableProfiling,
        collectDebugInfo: finalOptions.enableDebugOutput,
        skipLowConfidenceWords: finalOptions.skipLowConfidenceWords,
        confidenceThreshold: finalOptions.confidenceThreshold,
      }

      const templateApplication = await this.animationSelector.applyTemplate(
        template,
        audioData,
        batchOptions
      )

      const templateApplicationTime = performance.now() - templateStartTime

      if (!templateApplication.success) {
        errors.push(...templateApplication.errors)
        warnings.push(...templateApplication.warnings)
      }

      // Step 3: Generate motion text scenario
      const scenarioStartTime = performance.now()
      let scenario: any | undefined

      if (
        templateApplication.success &&
        templateApplication.appliedRules.length > 0
      ) {
        scenario = await this.generateMotionTextScenario(
          template,
          audioData,
          templateApplication,
          finalOptions
        )
      }

      const scenarioGenerationTime = performance.now() - scenarioStartTime

      // Step 4: Generate animation tracks for editor integration
      const animationTracks = this.generateAnimationTracks(
        templateApplication,
        audioData
      )

      // Calculate final statistics
      const totalProcessingTime = performance.now() - startTime
      const wordsProcessed = audioData.segments.reduce(
        (sum, segment) => sum + segment.words.length,
        0
      )

      const processingStats = {
        totalProcessingTime,
        audioMappingTime,
        templateApplicationTime,
        scenarioGenerationTime,
        wordsProcessed,
        animationsGenerated: templateApplication.appliedRules.length,
      }

      if (finalOptions.enableProfiling) {
        console.log('Template processing completed:', processingStats)
      }

      return {
        success: errors.length === 0,
        scenario,
        templateApplication,
        animationTracks,
        processingStats,
        errors,
        warnings,
      }
    } catch (error) {
      return {
        success: false,
        templateApplication: {
          success: false,
          appliedRules: [],
          errors: [`Processing failed: ${error}`],
          warnings: [],
          performance: {
            processingTime: performance.now() - startTime,
            rulesEvaluated: 0,
            animationsApplied: 0,
          },
        },
        processingStats: {
          totalProcessingTime: performance.now() - startTime,
          audioMappingTime: 0,
          templateApplicationTime: 0,
          scenarioGenerationTime: 0,
          wordsProcessed: 0,
          animationsGenerated: 0,
        },
        errors: [`Unexpected error: ${error}`],
        warnings: [],
      }
    }
  }

  /**
   * Generate motion text renderer scenario from template application results
   */
  private async generateMotionTextScenario(
    template: SubtitleTemplate,
    audioData: AudioAnalysisData,
    applicationResult: TemplateApplicationResult,
    _options: TemplateProcessorOptions
  ): Promise<unknown> {
    // Create basic scenario structure
    const scenario: Record<string, unknown> = {
      version: '2.0',
      pluginApiVersion: '3.0',
      timebase: { unit: 'seconds' },
      stage: { baseAspect: '16:9' },
      tracks: [],
      cues: [],
    }

    // Add subtitle track with template styling
    const subtitleTrack = {
      id: 'subtitle-track',
      type: 'subtitle' as const,
      layer: 1,
      defaultStyle: this.convertTemplateStyleToMotionText(template.style),
    }

    ;(scenario.tracks as unknown[]).push(subtitleTrack)

    // Group applied rules by word/segment
    const rulesByWord = new Map<string, typeof applicationResult.appliedRules>()
    applicationResult.appliedRules.forEach((rule) => {
      if (!rulesByWord.has(rule.wordId)) {
        rulesByWord.set(rule.wordId, [])
      }
      rulesByWord.get(rule.wordId)!.push(rule)
    })

    // Generate cues for each segment
    for (
      let segmentIndex = 0;
      segmentIndex < audioData.segments.length;
      segmentIndex++
    ) {
      const segment = audioData.segments[segmentIndex]

      // Create group cue for the entire segment
      const groupCue = {
        id: `segment-${segmentIndex}`,
        track: 'subtitle-track',
        domLifetime: [segment.start_time, segment.end_time] as [number, number],
        root: {
          id: `group-${segmentIndex}`,
          eType: 'group' as const,
          displayTime: [segment.start_time, segment.end_time] as [
            number,
            number,
          ],
          layout: this.convertTemplateLayoutToMotionText(template.layout),
          children: [] as any[],
        },
      }

      // Add word elements with animations
      segment.words.forEach((word, wordIndex) => {
        const wordId = `${segmentIndex}-${wordIndex}`
        const appliedRules = rulesByWord.get(wordId) || []

        const wordElement = {
          id: `word-${segmentIndex}-${wordIndex}`,
          eType: 'text' as const,
          text: word.word,
          displayTime: [word.start, word.end] as [number, number],
          layout: {
            // Word positioning will be handled by the group
            display: 'inline',
          },
          style: {
            // Base text styling from template
            ...this.convertTemplateStyleToMotionText(template.style).text,
          },
          pluginChain: appliedRules.map((rule) => ({
            name: rule.animation.pluginName,
            baseTime: [word.start, word.end] as [number, number],
            timeOffset: rule.animation.timing.offset,
            params: {
              ...rule.animation.params,
              // Add intensity-based scaling
              intensity: rule.matchStrength,
            },
          })),
        }

        groupCue.root.children.push(wordElement)
      })
      ;(scenario.cues as unknown[]).push(groupCue)
    }

    return scenario
  }

  /**
   * Convert template style to motion text format
   */
  private convertTemplateStyleToMotionText(templateStyle: any): any {
    return {
      text: {
        fontFamily: templateStyle.text?.fontFamily || 'Roboto',
        fontSize: this.convertSizeValue(templateStyle.text?.fontSize || '5vh'),
        fontWeight: templateStyle.text?.fontWeight || 400,
        color: templateStyle.text?.color || '#ffffff',
        textAlign: templateStyle.text?.textAlign || 'center',
        textShadow: templateStyle.text?.textShadow,
        letterSpacing: templateStyle.text?.letterSpacing,
        lineHeight: templateStyle.text?.lineHeight || 1.2,
      },
      background: templateStyle.background
        ? {
            backgroundColor:
              templateStyle.background.color || 'rgba(0,0,0,0.9)',
            opacity: templateStyle.background.opacity || 0.9,
            borderRadius: templateStyle.background.borderRadius || 8,
            padding: this.convertSpacingValue(
              templateStyle.background.padding || '8px'
            ),
          }
        : undefined,
    }
  }

  /**
   * Convert template layout to motion text format
   */
  private convertTemplateLayoutToMotionText(templateLayout: any): any {
    return {
      position: 'absolute',
      bottom: templateLayout.track?.safeArea?.bottom || '7.5%',
      top: templateLayout.track?.safeArea?.top || '87.5%',
      left: templateLayout.track?.safeArea?.left || '5%',
      right: templateLayout.track?.safeArea?.right || '5%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent:
        templateLayout.track?.position === 'top'
          ? 'flex-start'
          : templateLayout.track?.position === 'bottom'
            ? 'flex-end'
            : 'center',
      alignItems:
        templateLayout.track?.alignment === 'left'
          ? 'flex-start'
          : templateLayout.track?.alignment === 'right'
            ? 'flex-end'
            : 'center',
      textAlign: templateLayout.track?.alignment || 'center',
    }
  }

  /**
   * Convert template size values to CSS
   */
  private convertSizeValue(value: any): string {
    if (typeof value === 'string') {
      return value
    }
    if (typeof value === 'number') {
      return `${value}px`
    }
    return '16px' // Default
  }

  /**
   * Convert template spacing values to CSS
   */
  private convertSpacingValue(value: any): string {
    if (typeof value === 'string') {
      return value
    }
    if (typeof value === 'number') {
      return `${value}px`
    }
    return '8px' // Default
  }

  /**
   * Validate template before processing
   */
  async validateTemplate(template: SubtitleTemplate): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    estimatedComplexity: 'low' | 'medium' | 'high'
  }> {
    return this.animationSelector.validateTemplate(template)
  }

  /**
   * Get processing performance statistics
   */
  getPerformanceStats(): any {
    return this.animationSelector.getPerformanceStats()
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.animationSelector.clearCaches()
  }

  /**
   * Generate animation tracks for editor integration
   */
  private generateAnimationTracks(
    templateApplication: TemplateApplicationResult,
    audioData: AudioAnalysisData
  ) {
    const animationTracks: Array<{
      wordId: string
      assetId: string
      assetName: string
      pluginKey: string
      params: Record<string, unknown>
      timing: { start: number; end: number }
      intensity: { min: number; max: number }
      color: 'blue' | 'green' | 'purple'
    }> = []

    const colorMap: Record<string, 'blue' | 'green' | 'purple'> = {
      'loud-word-bounce': 'blue',
      'very-loud-scale': 'green',
      'high-pitch-rotation': 'purple',
      'emotional-glow': 'blue',
      'question-pulse': 'green',
    }

    // Convert template application results to animation tracks
    templateApplication.appliedRules.forEach((appliedRule) => {
      const word = this.findWordById(audioData, appliedRule.wordId)
      if (!word) return

      const animation = appliedRule.animation
      const pluginKey = this.mapPluginNameToKey(animation.pluginName)

      const track = {
        wordId: appliedRule.wordId,
        assetId: `${animation.pluginName}-${appliedRule.ruleId}`,
        assetName: appliedRule.ruleId, // Use ruleId as name
        pluginKey,
        params: animation.params || {},
        timing: {
          start: (word as any).start_time || (word as any).startTime,
          end: (word as any).end_time || (word as any).endTime,
        },
        intensity: {
          min: animation.intensity?.min || 0.5,
          max: animation.intensity?.max || 1.0,
        },
        color: colorMap[appliedRule.ruleId] || 'blue',
      }

      animationTracks.push(track)
    })

    return animationTracks
  }

  /**
   * Find word by ID in audio data
   */
  private findWordById(audioData: AudioAnalysisData, wordId: string) {
    for (const segment of audioData.segments) {
      const word = segment.words.find((w) => (w as any).id === wordId)
      if (word) return word
    }
    return null
  }

  /**
   * Map plugin names to plugin keys used by the editor
   */
  private mapPluginNameToKey(pluginName: string): string {
    if (!pluginName) return ''
    return pluginName.includes('@') ? pluginName : `${pluginName}@2.0.0`
  }

  /**
   * Update processor options
   */
  updateOptions(options: Partial<TemplateProcessorOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options }
  }
}
