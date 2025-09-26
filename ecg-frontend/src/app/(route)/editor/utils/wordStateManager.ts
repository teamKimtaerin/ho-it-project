/**
 * Word State Manager Utility
 * Handles advanced debouncing and state synchronization for word interactions
 */

type StateChangeType = 'focus' | 'drag' | 'editing' | 'selection'

interface StateChangeQueue {
  type: StateChangeType
  wordId: string
  clipId?: string
  timestamp: number
  priority: number
}

class WordStateManager {
  private debounceTimers = new Map<string, NodeJS.Timeout>()
  private stateChangeQueue: StateChangeQueue[] = []
  private isProcessing = false

  // Debounce intervals by state type
  private debounceIntervals: Record<StateChangeType, number> = {
    focus: 50,
    drag: 100,
    editing: 150,
    selection: 75,
  }

  /**
   * Debounced state change with priority handling
   */
  public debouncedStateChange<T extends unknown[]>(
    key: string,
    stateType: StateChangeType,
    priority: number,
    callback: (...args: T) => void,
    ...args: T
  ): void {
    // Clear existing timer for this key
    const existingTimer = this.debounceTimers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Add to queue
    this.stateChangeQueue.push({
      type: stateType,
      wordId: key,
      timestamp: Date.now(),
      priority,
    })

    // Set new timer
    const timer = setTimeout(() => {
      this.processStateChange(key, callback, ...args)
      this.debounceTimers.delete(key)
    }, this.debounceIntervals[stateType])

    this.debounceTimers.set(key, timer)
  }

  /**
   * Process state change with conflict resolution
   */
  private processStateChange<T extends unknown[]>(
    key: string,
    callback: (...args: T) => void,
    ...args: T
  ): void {
    if (this.isProcessing) {
      // If already processing, queue for next tick
      setTimeout(() => this.processStateChange(key, callback, ...args), 0)
      return
    }

    this.isProcessing = true

    try {
      // Remove processed item from queue
      this.stateChangeQueue = this.stateChangeQueue.filter(
        (item) =>
          !(
            item.wordId === key &&
            Date.now() - item.timestamp > this.debounceIntervals[item.type]
          )
      )

      // Execute callback
      callback(...args)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Check if state change conflicts with queued changes
   */
  public hasConflictingStateChange(
    wordId: string,
    newPriority: number
  ): boolean {
    return this.stateChangeQueue.some(
      (item) => item.wordId === wordId && item.priority > newPriority
    )
  }

  /**
   * Clear all pending state changes for a word
   */
  public clearPendingChanges(wordId: string): void {
    const timer = this.debounceTimers.get(wordId)
    if (timer) {
      clearTimeout(timer)
      this.debounceTimers.delete(wordId)
    }

    this.stateChangeQueue = this.stateChangeQueue.filter(
      (item) => item.wordId !== wordId
    )
  }

  /**
   * Get pending state changes for debugging
   */
  public getPendingChanges(): StateChangeQueue[] {
    return [...this.stateChangeQueue]
  }

  /**
   * Clear all pending changes (useful for cleanup)
   */
  public clearAll(): void {
    this.debounceTimers.forEach((timer) => clearTimeout(timer))
    this.debounceTimers.clear()
    this.stateChangeQueue = []
  }
}

// Singleton instance
export const wordStateManager = new WordStateManager()

/**
 * Hook for using word state manager in components
 */
export function useWordStateManager() {
  return wordStateManager
}

/**
 * Utility for creating debounced word interaction handlers
 */
export function createDebouncedWordHandler<T extends unknown[]>(
  stateType: StateChangeType,
  priority: number,
  callback: (...args: T) => void
) {
  return (...args: T) => {
    const wordId = args[0] as string // Assume first arg is wordId
    wordStateManager.debouncedStateChange(
      wordId,
      stateType,
      priority,
      callback,
      ...args
    )
  }
}
