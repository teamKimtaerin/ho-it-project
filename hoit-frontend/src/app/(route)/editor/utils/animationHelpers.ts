/**
 * Animation Asset Helper Utilities
 * Centralized logic for animation parameter management
 */

import type { EditorStore } from '../store'

/**
 * Determines the target word ID for animation operations
 * Priority: expandedWordId > focusedWordId > single selected word
 */
export const determineTargetWordId = (store: EditorStore): string | null => {
  // 1. Expanded clip's focused word has highest priority (user is actively editing)
  if (store.expandedWordId) {
    return store.expandedWordId
  }

  // 2. Explicitly focused word
  if (store.focusedWordId) {
    return store.focusedWordId
  }

  // 3. Single selected word (not multi-selection)
  if (store.multiSelectedWordIds.size === 1) {
    return Array.from(store.multiSelectedWordIds)[0]
  }

  // 4. Fall back to selectedWordId for legacy compatibility
  if (store.selectedWordId && store.multiSelectedWordIds.size === 0) {
    return store.selectedWordId
  }

  return null
}

/**
 * Determines the target word IDs for multi-selection operations
 * Returns array of word IDs when multiple words are selected
 */
export const determineTargetWordIds = (store: EditorStore): string[] => {
  // For multi-selection, return all selected words
  if (store.multiSelectedWordIds.size > 1) {
    return Array.from(store.multiSelectedWordIds)
  }

  // For single selection, return as array for consistent interface
  const singleId = determineTargetWordId(store)
  return singleId ? [singleId] : []
}

/**
 * Checks if multiple words are currently selected
 */
export const isMultipleWordsSelected = (store: EditorStore): boolean => {
  return store.multiSelectedWordIds.size > 1
}

/**
 * Gets the display name for the current target word
 */
export const getTargetWordDisplayName = (store: EditorStore): string => {
  const wordId = determineTargetWordId(store)
  if (!wordId) return '선택된 단어 없음'

  // Fast path via indexes if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyStore = store as any
    const clipId: string | null = anyStore.getClipIdByWordId?.(wordId) || null
    if (clipId) {
      const clip = (store.clips || []).find((c) => c.id === clipId)
      if (clip) {
        const word = clip.words.find((w) => w.id === wordId)
        if (word) return `"${word.text}"`
      }
    }
  } catch {}

  // Fallback: linear search
  for (const clip of store.clips || []) {
    const word = clip.words.find((w) => w.id === wordId)
    if (word) {
      return `"${word.text}"`
    }
  }

  return '단어 정보 없음'
}

/**
 * Validates if a word can have animation operations performed on it
 */
export const canApplyAnimationToWord = (
  store: EditorStore,
  wordId?: string
): boolean => {
  const targetWordId = wordId || determineTargetWordId(store)
  if (!targetWordId) return false

  // Check if word exists in clips
  for (const clip of store.clips || []) {
    const word = clip.words.find((w) => w.id === targetWordId)
    if (word) return true
  }

  return false
}

/**
 * Gets existing animation track parameters for a word and asset
 */
export const getExistingTrackParams = (
  store: EditorStore,
  wordId: string,
  assetId: string
): Record<string, unknown> => {
  const tracks = store.wordAnimationTracks?.get(wordId) || []
  const track = tracks.find((t) => t.assetId === assetId)
  return track?.params || {}
}

/**
 * Debounce utility for high-frequency parameter updates
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createParameterDebounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 200
): T => {
  let timeoutId: NodeJS.Timeout

  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

/**
 * Gets the common animations across multiple selected words (intersection)
 */
export const getCommonAnimations = (
  store: EditorStore,
  wordIds: string[]
): string[] => {
  if (wordIds.length === 0) return []
  if (wordIds.length === 1) {
    const tracks = store.wordAnimationTracks?.get(wordIds[0]) || []
    return tracks.map((t) => t.assetId)
  }

  // Find intersection of all animation tracks
  const firstWordTracks = store.wordAnimationTracks?.get(wordIds[0]) || []
  const firstWordAssetIds = new Set(firstWordTracks.map((t) => t.assetId))

  return Array.from(firstWordAssetIds).filter((assetId) =>
    wordIds.slice(1).every((wordId) => {
      const tracks = store.wordAnimationTracks?.get(wordId) || []
      return tracks.some((t) => t.assetId === assetId)
    })
  )
}

/**
 * Gets the common parameters for an animation across multiple words
 * Returns intersection of parameters with their common values
 */
export const getCommonAnimationParams = (
  store: EditorStore,
  wordIds: string[],
  assetId: string
): Record<string, unknown> => {
  if (wordIds.length === 0) return {}

  const allParams = wordIds.map((wordId) => {
    const tracks = store.wordAnimationTracks?.get(wordId) || []
    const track = tracks.find((t) => t.assetId === assetId)
    return track?.params || {}
  })

  if (allParams.length === 0) return {}
  if (allParams.length === 1) return allParams[0]

  // Find common parameters with same values
  const commonParams: Record<string, unknown> = {}
  const firstParams = allParams[0]

  Object.keys(firstParams).forEach((key) => {
    const firstValue = firstParams[key]
    const allHaveSameValue = allParams.every(
      (params) =>
        params[key] !== undefined &&
        JSON.stringify(params[key]) === JSON.stringify(firstValue)
    )

    if (allHaveSameValue) {
      commonParams[key] = firstValue
    }
  })

  return commonParams
}

/**
 * Checks if all selected words can accept a new animation (under 3 limit)
 */
export const canAddAnimationToSelection = (
  store: EditorStore,
  wordIds: string[]
): { canAdd: boolean; wordCount: number; blockedWords: string[] } => {
  const blockedWords: string[] = []

  for (const wordId of wordIds) {
    const tracks = store.wordAnimationTracks?.get(wordId) || []
    if (tracks.length >= 3) {
      blockedWords.push(wordId)
    }
  }

  return {
    canAdd: blockedWords.length === 0,
    wordCount: wordIds.length,
    blockedWords,
  }
}

/**
 * Gets display names for multiple words
 */
export const getMultipleWordsDisplayText = (
  store: EditorStore,
  wordIds: string[]
): string => {
  if (wordIds.length === 0) return '선택된 단어 없음'
  if (wordIds.length === 1) return getTargetWordDisplayName(store)

  const words: string[] = []
  for (const wordId of wordIds) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyStore = store as any
      const clipId: string | null = anyStore.getClipIdByWordId?.(wordId) || null
      if (clipId) {
        const clip = (store.clips || []).find((c) => c.id === clipId)
        if (clip) {
          const word = clip.words.find((w) => w.id === wordId)
          if (word) {
            words.push(word.text)
          }
        }
      }
    } catch {
      // Fallback: linear search
      for (const clip of store.clips || []) {
        const word = clip.words.find((w) => w.id === wordId)
        if (word) {
          words.push(word.text)
          break
        }
      }
    }
  }

  if (words.length <= 3) {
    return `"${words.join('", "')}"`
  }
  return `"${words.slice(0, 2).join('", "')}" 외 ${words.length - 2}개`
}

/**
 * Creates a batched update function for multiple parameter changes
 */
export const createBatchUpdater = <T>(
  updateFn: (updates: T[]) => Promise<void>,
  batchDelay: number = 100
) => {
  let pendingUpdates: T[] = []
  let timeoutId: NodeJS.Timeout | null = null

  const flush = async () => {
    if (pendingUpdates.length === 0) return

    const updates = [...pendingUpdates]
    pendingUpdates = []
    timeoutId = null

    try {
      await updateFn(updates)
    } catch (error) {
      console.error('Batch update failed:', error)
      // Re-add failed updates for retry
      pendingUpdates.unshift(...updates)
    }
  }

  return {
    add: (update: T) => {
      pendingUpdates.push(update)

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(flush, batchDelay)
    },

    flush: () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        return flush()
      }
      return Promise.resolve()
    },

    clear: () => {
      pendingUpdates = []
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    },
  }
}
