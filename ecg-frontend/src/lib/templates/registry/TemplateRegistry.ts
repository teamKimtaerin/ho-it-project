/**
 * Template Registry
 *
 * Manages loading, caching, and validation of subtitle templates.
 * Provides a centralized interface for template management.
 */

import { SubtitleTemplate, TemplateCategory } from '../types/template.types'
import { TemplateParser } from '../engine/TemplateParser'

export interface TemplateInfo {
  id: string
  name: string
  description: string
  category: TemplateCategory
  author?: string
  version: string
  complexity: 'simple' | 'moderate' | 'complex'
  tags: string[]
  filePath: string
}

export interface TemplateSearchOptions {
  category?: TemplateCategory
  tags?: string[]
  complexity?: ('simple' | 'moderate' | 'complex')[]
  searchText?: string
  author?: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Template system will be rewritten - temporarily disable any types
export class TemplateRegistry {
  private templates: Map<string, SubtitleTemplate>
  private templateInfos: Map<string, TemplateInfo>
  private templateParser: TemplateParser
  private loadingPromises: Map<string, Promise<SubtitleTemplate>>

  constructor() {
    this.templates = new Map()
    this.templateInfos = new Map()
    this.templateParser = new TemplateParser()
    this.loadingPromises = new Map()
    this.initializeBuiltInTemplates()
  }

  /**
   * Initialize built-in template registry
   */
  private initializeBuiltInTemplates(): void {
    const builtInTemplates: TemplateInfo[] = [
      {
        id: 'caption-with-intention',
        name: 'Caption with Intention',
        description:
          'Dynamic captions that emphasize important words based on volume, pitch, and emotional content',
        category: 'emphasis',
        author: 'ECG Template System',
        version: '1.0.0',
        complexity: 'moderate',
        tags: ['emphasis', 'dynamic', 'audio-driven', 'emotional'],
        filePath: '/templates/caption-with-intention.json',
      },
      {
        id: 'smooth-narration',
        name: 'Smooth Narration',
        description:
          'Elegant, minimal captions perfect for narration and educational content',
        category: 'narrative',
        author: 'ECG Template System',
        version: '1.0.0',
        complexity: 'simple',
        tags: ['minimal', 'educational', 'professional', 'narration'],
        filePath: '/templates/smooth-narration.json',
      },
      {
        id: 'dynamic-conversation',
        name: 'Dynamic Conversation',
        description:
          'Vibrant captions designed for multi-speaker conversations',
        category: 'conversation',
        author: 'ECG Template System',
        version: '1.0.0',
        complexity: 'complex',
        tags: ['conversation', 'multi-speaker', 'dynamic', 'colorful'],
        filePath: '/templates/dynamic-conversation.json',
      },
    ]

    builtInTemplates.forEach((info) => {
      this.templateInfos.set(info.id, info)
    })
  }

  /**
   * Get all available template information
   */
  getTemplateInfos(options?: TemplateSearchOptions): TemplateInfo[] {
    let templates = Array.from(this.templateInfos.values())

    if (options) {
      // Filter by category
      if (options.category) {
        templates = templates.filter((t) => t.category === options.category)
      }

      // Filter by complexity
      if (options.complexity && options.complexity.length > 0) {
        templates = templates.filter((t) =>
          options.complexity!.includes(t.complexity)
        )
      }

      // Filter by tags
      if (options.tags && options.tags.length > 0) {
        templates = templates.filter((t) =>
          options.tags!.some((tag) => t.tags.includes(tag))
        )
      }

      // Filter by author
      if (options.author) {
        templates = templates.filter((t) =>
          t.author?.toLowerCase().includes(options.author!.toLowerCase())
        )
      }

      // Filter by search text
      if (options.searchText) {
        const searchLower = options.searchText.toLowerCase()
        templates = templates.filter(
          (t) =>
            t.name.toLowerCase().includes(searchLower) ||
            t.description.toLowerCase().includes(searchLower) ||
            t.tags.some((tag) => tag.toLowerCase().includes(searchLower))
        )
      }
    }

    // Sort by category, then by name
    return templates.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      return a.name.localeCompare(b.name)
    })
  }

  /**
   * Get template info by ID
   */
  getTemplateInfo(id: string): TemplateInfo | undefined {
    return this.templateInfos.get(id)
  }

  /**
   * Load a template by ID
   */
  async loadTemplate(id: string): Promise<SubtitleTemplate> {
    // Check if already cached
    if (this.templates.has(id)) {
      return this.templates.get(id)!
    }

    // Check if already loading
    if (this.loadingPromises.has(id)) {
      return this.loadingPromises.get(id)!
    }

    // Start loading
    const loadingPromise = this.loadTemplateFromFile(id)
    this.loadingPromises.set(id, loadingPromise)

    try {
      const template = await loadingPromise
      this.templates.set(id, template)
      return template
    } catch (error) {
      this.loadingPromises.delete(id)
      throw error
    } finally {
      this.loadingPromises.delete(id)
    }
  }

  /**
   * Load template from file
   */
  private async loadTemplateFromFile(id: string): Promise<SubtitleTemplate> {
    const info = this.templateInfos.get(id)
    if (!info) {
      throw new Error(`Template ${id} not found in registry`)
    }

    try {
      const response = await fetch(info.filePath)
      if (!response.ok) {
        throw new Error(
          `Failed to fetch template ${id}: ${response.statusText}`
        )
      }

      const templateData = await response.json()

      // Validate the template structure
      if (!this.isValidTemplateStructure(templateData)) {
        throw new Error(`Invalid template structure for ${id}`)
      }

      // Parse and validate the template
      const compiledTemplate =
        await this.templateParser.parseTemplate(templateData)

      if (compiledTemplate.validationErrors.length > 0) {
        console.warn(
          `Template ${id} has validation warnings:`,
          compiledTemplate.validationErrors
        )
      }

      return templateData as SubtitleTemplate
    } catch (error) {
      throw new Error(`Failed to load template ${id}: ${error}`)
    }
  }

  /**
   * Validate basic template structure
   */
  private isValidTemplateStructure(template: any): boolean {
    const required = [
      'id',
      'name',
      'version',
      'category',
      'style',
      'layout',
      'animationRules',
      'metadata',
    ]

    for (const field of required) {
      if (!(field in template)) {
        console.error(`Template missing required field: ${field}`)
        return false
      }
    }

    if (!Array.isArray(template.animationRules)) {
      console.error('animationRules must be an array')
      return false
    }

    return true
  }

  /**
   * Register a new template (for custom templates)
   */
  async registerTemplate(
    template: SubtitleTemplate,
    filePath?: string
  ): Promise<void> {
    // Validate the template
    const validationResult = this.templateParser.validateTemplate(template)

    if (!validationResult.isValid) {
      throw new Error(
        `Template validation failed: ${validationResult.errors.map((e) => e.message).join(', ')}`
      )
    }

    // Create template info
    const templateInfo: TemplateInfo = {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      author: template.author,
      version: template.version,
      complexity: template.metadata.complexity,
      tags: template.metadata.tags,
      filePath: filePath || `custom-${template.id}`,
    }

    // Register the template
    this.templateInfos.set(template.id, templateInfo)
    this.templates.set(template.id, template)
  }

  /**
   * Unregister a template
   */
  unregisterTemplate(id: string): boolean {
    const removed = this.templates.delete(id) && this.templateInfos.delete(id)
    this.loadingPromises.delete(id)
    return removed
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(
    category: TemplateCategory
  ): Promise<TemplateInfo[]> {
    return this.getTemplateInfos({ category })
  }

  /**
   * Search templates by tags
   */
  async searchTemplatesByTags(tags: string[]): Promise<TemplateInfo[]> {
    return this.getTemplateInfos({ tags })
  }

  /**
   * Get recommended templates based on audio features
   */
  getRecommendedTemplates(audioFeatures: {
    hasMultipleSpeakers: boolean
    hasEmotionalContent: boolean
    isDynamic: boolean
    contentType: 'conversation' | 'narration' | 'presentation' | 'other'
  }): TemplateInfo[] {
    const recommendations: TemplateInfo[] = []

    // Rule-based recommendations
    if (audioFeatures.hasMultipleSpeakers) {
      recommendations.push(
        ...this.getTemplateInfos({
          tags: ['conversation', 'multi-speaker'],
        })
      )
    }

    if (audioFeatures.hasEmotionalContent && audioFeatures.isDynamic) {
      recommendations.push(
        ...this.getTemplateInfos({
          tags: ['emphasis', 'dynamic', 'emotional'],
        })
      )
    }

    if (audioFeatures.contentType === 'narration') {
      recommendations.push(
        ...this.getTemplateInfos({
          category: 'narrative',
        })
      )
    }

    if (audioFeatures.contentType === 'conversation') {
      recommendations.push(
        ...this.getTemplateInfos({
          category: 'conversation',
        })
      )
    }

    // Remove duplicates
    const unique = Array.from(
      new Map(recommendations.map((t) => [t.id, t])).values()
    )

    // Sort by relevance (simplified scoring)
    return unique
      .sort((a, b) => {
        let scoreA = 0
        let scoreB = 0

        // Boost score for matching content type
        if (a.category === audioFeatures.contentType) scoreA += 10
        if (b.category === audioFeatures.contentType) scoreB += 10

        // Boost score for dynamic content if audio is dynamic
        if (audioFeatures.isDynamic) {
          if (a.tags.includes('dynamic')) scoreA += 5
          if (b.tags.includes('dynamic')) scoreB += 5
        }

        return scoreB - scoreA
      })
      .slice(0, 5) // Top 5 recommendations
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templates.clear()
    this.loadingPromises.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cachedTemplates: number
    loadingTemplates: number
    registeredTemplates: number
  } {
    return {
      cachedTemplates: this.templates.size,
      loadingTemplates: this.loadingPromises.size,
      registeredTemplates: this.templateInfos.size,
    }
  }

  /**
   * Preload commonly used templates
   */
  async preloadTemplates(templateIds: string[]): Promise<void> {
    const loadPromises = templateIds.map((id) =>
      this.loadTemplate(id).catch((error) => {
        console.warn(`Failed to preload template ${id}:`, error)
        return null
      })
    )

    await Promise.all(loadPromises)
  }
}
