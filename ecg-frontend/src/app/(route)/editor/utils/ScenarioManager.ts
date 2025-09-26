import type { ClipItem } from '../types'
import type { InsertedText } from '../types/textInsertion'
import type { RendererConfigV2 } from '@/app/shared/motiontext'
import {
  buildUnifiedScenario,
  updateInsertedTextCueInScenario,
  removeInsertedTextCueFromScenario,
  getInsertedTextIdsFromScenario,
  type UnifiedScenarioOptions,
  type UnifiedScenarioResult,
} from './unifiedScenarioGenerator'

export type ScenarioUpdateListener = (scenario: RendererConfigV2) => void

export interface ScenarioManagerOptions extends UnifiedScenarioOptions {
  autoUpdate?: boolean // Automatically trigger listeners on changes
}

/**
 * Manages unified scenario state with incremental updates
 */
export class ScenarioManager {
  private currentScenario: RendererConfigV2 | null = null
  private currentIndex: Record<string, { cueIndex: number; path: number[] }> =
    {}
  private clips: ClipItem[] = []
  private insertedTexts: InsertedText[] = []
  private options: ScenarioManagerOptions
  private listeners: Set<ScenarioUpdateListener> = new Set()
  private updateTimeout: NodeJS.Timeout | null = null

  constructor(options: ScenarioManagerOptions = {}) {
    this.options = {
      autoUpdate: true,
      ...options,
    }
  }

  /**
   * Initialize scenario with clips and inserted texts
   */
  initialize(
    clips: ClipItem[],
    insertedTexts: InsertedText[] = []
  ): RendererConfigV2 {
    this.clips = [...clips]
    this.insertedTexts = [...insertedTexts]

    const result = buildUnifiedScenario(
      this.clips,
      this.insertedTexts,
      this.options
    )
    this.currentScenario = result.config
    this.currentIndex = result.index

    if (this.options.autoUpdate) {
      this.notifyListeners()
    }

    return this.currentScenario
  }

  /**
   * Get current scenario (read-only)
   */
  getScenario(): RendererConfigV2 | null {
    return this.currentScenario ? { ...this.currentScenario } : null
  }

  /**
   * Get current index (read-only)
   */
  getIndex(): Record<string, { cueIndex: number; path: number[] }> {
    return { ...this.currentIndex }
  }

  /**
   * Add or update an inserted text
   */
  updateInsertedText(insertedText: InsertedText): void {
    if (!this.currentScenario) {
      throw new Error(
        'ScenarioManager not initialized. Call initialize() first.'
      )
    }

    // Update local state
    const existingIndex = this.insertedTexts.findIndex(
      (text) => text.id === insertedText.id
    )
    if (existingIndex >= 0) {
      this.insertedTexts[existingIndex] = insertedText
    } else {
      this.insertedTexts.push(insertedText)
    }

    // Update scenario
    this.currentScenario = updateInsertedTextCueInScenario(
      this.currentScenario,
      insertedText
    )

    this.scheduleUpdate()
  }

  /**
   * Remove an inserted text
   */
  removeInsertedText(insertedTextId: string): void {
    if (!this.currentScenario) {
      throw new Error(
        'ScenarioManager not initialized. Call initialize() first.'
      )
    }

    // Update local state
    this.insertedTexts = this.insertedTexts.filter(
      (text) => text.id !== insertedTextId
    )

    // Update scenario
    this.currentScenario = removeInsertedTextCueFromScenario(
      this.currentScenario,
      insertedTextId
    )

    this.scheduleUpdate()
  }

  /**
   * Batch update multiple inserted texts
   */
  batchUpdateInsertedTexts(insertedTexts: InsertedText[]): void {
    if (!this.currentScenario) {
      throw new Error(
        'ScenarioManager not initialized. Call initialize() first.'
      )
    }

    // Update local state
    this.insertedTexts = [...insertedTexts]

    // Rebuild scenario for batch operations (more efficient than individual updates)
    const result = buildUnifiedScenario(
      this.clips,
      this.insertedTexts,
      this.options
    )
    this.currentScenario = result.config
    this.currentIndex = result.index

    this.scheduleUpdate()
  }

  /**
   * Update clips (subtitle data)
   */
  updateClips(clips: ClipItem[]): void {
    this.clips = [...clips]
    this.rebuildScenario()
  }

  /**
   * Add a single clip
   */
  addClip(clip: ClipItem): void {
    this.clips.push(clip)
    this.rebuildScenario()
  }

  /**
   * Remove a clip
   */
  removeClip(clipId: string): void {
    this.clips = this.clips.filter((clip) => clip.id !== clipId)
    this.rebuildScenario()
  }

  /**
   * Rebuild entire scenario (use for major changes)
   */
  rebuildScenario(): void {
    if (!this.currentScenario) {
      throw new Error(
        'ScenarioManager not initialized. Call initialize() first.'
      )
    }

    const result = buildUnifiedScenario(
      this.clips,
      this.insertedTexts,
      this.options
    )
    this.currentScenario = result.config
    this.currentIndex = result.index

    this.scheduleUpdate()
  }

  /**
   * Get all inserted texts currently in scenario
   */
  getInsertedTexts(): InsertedText[] {
    return [...this.insertedTexts]
  }

  /**
   * Get all clips currently in scenario
   */
  getClips(): ClipItem[] {
    return [...this.clips]
  }

  /**
   * Find inserted text by ID
   */
  findInsertedText(id: string): InsertedText | undefined {
    return this.insertedTexts.find((text) => text.id === id)
  }

  /**
   * Find clip by ID
   */
  findClip(id: string): ClipItem | undefined {
    return this.clips.find((clip) => clip.id === id)
  }

  /**
   * Check scenario consistency with local state
   */
  validateConsistency(): boolean {
    if (!this.currentScenario) return false

    const scenarioInsertedTextIds = getInsertedTextIdsFromScenario(
      this.currentScenario
    )
    const localInsertedTextIds = this.insertedTexts.map((text) => text.id)

    // Check if all local inserted texts are in scenario
    return (
      localInsertedTextIds.every((id) =>
        scenarioInsertedTextIds.includes(id)
      ) &&
      scenarioInsertedTextIds.every((id) => localInsertedTextIds.includes(id))
    )
  }

  /**
   * Add update listener
   */
  addUpdateListener(listener: ScenarioUpdateListener): () => void {
    this.listeners.add(listener)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Remove update listener
   */
  removeUpdateListener(listener: ScenarioUpdateListener): void {
    this.listeners.delete(listener)
  }

  /**
   * Manually trigger update notification
   */
  forceUpdate(): void {
    this.notifyListeners()
  }

  /**
   * Clear all listeners
   */
  clearListeners(): void {
    this.listeners.clear()
  }

  /**
   * Schedule batched update (debounced)
   */
  private scheduleUpdate(): void {
    if (!this.options.autoUpdate) return

    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }

    this.updateTimeout = setTimeout(() => {
      this.notifyListeners()
      this.updateTimeout = null
    }, 16) // ~60fps update rate
  }

  /**
   * Notify all listeners of scenario changes
   */
  private notifyListeners(): void {
    if (!this.currentScenario) return

    this.listeners.forEach((listener) => {
      try {
        listener(this.currentScenario!)
      } catch (error) {
        console.error('Error in scenario update listener:', error)
      }
    })
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
      this.updateTimeout = null
    }
    this.clearListeners()
    this.currentScenario = null
    this.currentIndex = {}
    this.clips = []
    this.insertedTexts = []
  }
}
