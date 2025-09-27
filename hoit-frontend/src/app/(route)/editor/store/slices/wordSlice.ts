import { StateCreator } from 'zustand'
import { getPluginTimeOffset } from '../../utils/pluginManifestLoader'
import { Word, ClipItem } from '../../types'

// Helper function to convert percentage-based timeOffset to seconds
const convertTimeOffsetToSeconds = (
  timeOffset: [number, number] | [string, string],
  wordDuration: number
): [number, number] => {
  return timeOffset.map((offset) => {
    if (typeof offset === 'string' && offset.endsWith('%')) {
      const percentage = parseFloat(offset) / 100
      return wordDuration * percentage
    }
    return offset as number
  }) as [number, number]
}

// Helper function to apply and validate timeOffset
const applyTimeOffset = (
  baseTiming: { start: number; end: number },
  timeOffset?: [number, number] | [string, string]
): { start: number; end: number } => {
  if (!timeOffset) return baseTiming

  const wordDuration = baseTiming.end - baseTiming.start

  // Convert percentage strings to seconds
  const numericTimeOffset = convertTimeOffsetToSeconds(timeOffset, wordDuration)

  const start = baseTiming.start + numericTimeOffset[0]
  const end = baseTiming.end + numericTimeOffset[1]

  // Validate domLifeTime - ensure start is not negative
  const domLifeTimeStart = start
  if (domLifeTimeStart < 0) {
    // Adjust to start at 0 with minimum duration
    const adjustedStart = 0
    const adjustedEnd = Math.max(adjustedStart + 0.1, end) // Minimum 0.1s duration
    return { start: adjustedStart, end: adjustedEnd }
  }

  // Check if valid (start < end and reasonable duration)
  if (start >= end || end - start < 0.01) {
    // Center the animation at word midpoint with safe duration
    const wordCenter = baseTiming.start + wordDuration / 2
    const animDuration = Math.min(0.5, Math.max(0.1, wordDuration * 0.5)) // 10% to 50% of word, max 0.5s

    return {
      start: wordCenter - animDuration / 2,
      end: wordCenter + animDuration / 2,
    }
  }

  return { start, end }
}

export interface AnimationTrack {
  assetId: string
  assetName: string
  pluginKey?: string
  params?: Record<string, unknown>
  timing: { start: number; end: number }
  intensity: { min: number; max: number }
  color: 'blue' | 'green' | 'purple'
  timeOffset?: [number, number] | [string, string] // [preOffset, postOffset] from plugin manifest
}

export interface WordDragState {
  focusedWordId: string | null
  focusedClipId: string | null
  groupedWordIds: Set<string>
  isDraggingWord: boolean
  draggedWordId: string | null
  dropTargetWordId: string | null
  dropPosition: 'before' | 'after' | null
  isGroupSelecting: boolean
  groupSelectionStart: { clipId: string; wordId: string } | null
  // New state for inline editing and detail editor
  editingWordId: string | null
  editingClipId: string | null
  wordDetailOpen: boolean
  expandedClipId: string | null // For expanded waveform view
  expandedWordId: string | null // Which word triggered the expansion
  wordTimingAdjustments: Map<string, { start: number; end: number }>
  wordAnimationIntensity: Map<string, { min: number; max: number }>
  // Undo/Redo history for word timing
  wordTimingHistory: Map<string, Array<{ start: number; end: number }>>
  wordTimingHistoryIndex: Map<string, number>
  // Animation tracks per word (max 3 tracks)
  wordAnimationTracks: Map<string, AnimationTrack[]>
  // Multi-selection state
  lastSelectedWordId: string | null
  lastSelectedClipId: string | null
  multiSelectedWordIds: Set<string>
  multiSelectedClipIds: Set<string>
  // Video playback synchronization
  playingWordId: string | null // Currently playing word from video timeline
  playingClipId: string | null // Currently playing clip from video timeline
}

// State priority levels (higher number = higher priority)
export enum WordStatePriority {
  NORMAL = 0,
  GROUPED = 1,
  FOCUSED = 2,
  EDITING = 3,
}

export interface WordSlice extends WordDragState {
  // State priority and guards
  getWordStatePriority: (wordId: string) => WordStatePriority | null
  canChangeWordState: (
    wordId: string,
    newPriority: WordStatePriority
  ) => boolean

  // Focus management
  setFocusedWord: (clipId: string, wordId: string | null) => void
  clearWordFocus: () => void

  // Group selection
  startGroupSelection: (clipId: string, wordId: string) => void
  addToGroupSelection: (wordId: string) => void
  endGroupSelection: () => void
  clearGroupSelection: () => void
  toggleWordInGroup: (wordId: string) => void

  // Drag and drop
  startWordDrag: (wordId: string) => void
  endWordDrag: () => void
  setDropTarget: (
    wordId: string | null,
    position: 'before' | 'after' | null
  ) => void

  // Word reordering
  reorderWords: (
    clipId: string,
    sourceWordId: string,
    targetWordId: string,
    position: 'before' | 'after'
  ) => void

  // Inline editing and detail editor
  startInlineEdit: (clipId: string, wordId: string) => void
  endInlineEdit: () => void
  openWordDetailEditor: (clipId: string, wordId: string) => void
  closeWordDetailEditor: () => void
  expandClip: (clipId: string, wordId: string) => void
  collapseClip: () => void
  updateWordTiming: (wordId: string, start: number, end: number) => void
  updateAnimationIntensity: (wordId: string, min: number, max: number) => void
  undoWordTiming: (wordId: string) => void
  redoWordTiming: (wordId: string) => void

  // Animation tracks
  addAnimationTrack: (
    wordId: string,
    assetId: string,
    assetName: string,
    wordTiming?: { start: number; end: number },
    pluginKey?: string,
    timeOffset?: [number, number] | [string, string],
    params?: Record<string, unknown>
  ) => void
  addAnimationTrackAsync: (
    wordId: string,
    assetId: string,
    assetName: string,
    wordTiming?: { start: number; end: number },
    pluginKey?: string
  ) => Promise<void>
  setAnimationTrackPluginKey: (
    wordId: string,
    assetId: string,
    pluginKey: string
  ) => void
  updateAnimationTrackParams: (
    wordId: string,
    assetId: string,
    params: Record<string, unknown>
  ) => void
  removeAnimationTrack: (wordId: string, assetId: string) => void
  updateAnimationTrackTiming: (
    wordId: string,
    assetId: string,
    start: number,
    end: number
  ) => void
  updateAnimationTrackTimingImmediate: (
    wordId: string,
    assetId: string,
    start: number,
    end: number
  ) => void
  updateAnimationTrackIntensity: (
    wordId: string,
    assetId: string,
    min: number,
    max: number
  ) => void
  clearAnimationTracks: (wordId: string) => void

  // Batch apply/toggle for multi-selection
  toggleAnimationForWords: (
    wordIds: string[],
    asset: { id: string; name: string; pluginKey?: string }
  ) => Promise<void>

  // Multi-selection methods
  selectWordRange: (toClipId: string, toWordId: string) => void
  toggleMultiSelectWord: (clipId: string, wordId: string) => void
  clearMultiSelection: () => void
  deleteSelectedWords: () => void
  isMultipleWordsSelected: () => boolean
  getSelectedWordsByClip: () => Map<string, string[]>
  setLastSelectedWord: (clipId: string, wordId: string) => void

  // Video playback synchronization
  setPlayingWord: (clipId: string | null, wordId: string | null) => void
  clearPlayingWord: () => void
  isWordPlaying: (wordId: string) => boolean

  // Multi-word batch operations
  updateMultipleWordsAnimationParams: (
    wordIds: string[],
    assetId: string,
    params: Record<string, unknown>
  ) => void
  removeAnimationFromMultipleWords: (wordIds: string[], assetId: string) => void

  // Template application
  applyTemplateToWords: (
    templateId: string,
    wordIds: string[],
    audioData?: unknown
  ) => Promise<void>
  applyTemplateToSelection: (
    templateId: string,
    audioData?: unknown
  ) => Promise<void>

  // Utility
  isWordFocused: (wordId: string) => boolean
  isWordInGroup: (wordId: string) => boolean
  canDragWord: (wordId: string) => boolean
  canDragSticker: (stickerId: string) => boolean
  isEditingWord: (wordId: string) => boolean
}

export const createWordSlice: StateCreator<WordSlice, [], [], WordSlice> = (
  set,
  get
) => ({
  // Initial state
  focusedWordId: null,
  focusedClipId: null,
  groupedWordIds: new Set(),
  isDraggingWord: false,
  draggedWordId: null,
  dropTargetWordId: null,
  dropPosition: null,
  isGroupSelecting: false,
  groupSelectionStart: null,
  editingWordId: null,
  editingClipId: null,
  wordDetailOpen: false,
  expandedClipId: null,
  expandedWordId: null,
  wordTimingAdjustments: new Map(),
  wordAnimationIntensity: new Map(),
  wordTimingHistory: new Map(),
  wordTimingHistoryIndex: new Map(),
  wordAnimationTracks: new Map(),
  // Multi-selection initial state
  lastSelectedWordId: null,
  lastSelectedClipId: null,
  multiSelectedWordIds: new Set(),
  multiSelectedClipIds: new Set(),
  playingWordId: null,
  playingClipId: null,

  // Focus management
  setFocusedWord: (clipId, wordId) =>
    set((state) => {
      // Prevent unnecessary updates if already focused on the same word
      if (state.focusedClipId === clipId && state.focusedWordId === wordId) {
        return state
      }

      // Check if clip focus is changing - if so, close waveform modal
      const isClipFocusChanging =
        state.focusedClipId && state.focusedClipId !== clipId

      return {
        focusedClipId: clipId,
        focusedWordId: wordId,
        groupedWordIds: wordId ? new Set([wordId]) : new Set(),
        // Clear editing state when focusing on different word
        editingWordId:
          state.editingWordId === wordId ? state.editingWordId : null,
        editingClipId:
          state.editingClipId === clipId ? state.editingClipId : null,
        // Close waveform modal if clip focus is changing
        expandedClipId: isClipFocusChanging ? null : state.expandedClipId,
        expandedWordId: isClipFocusChanging ? null : state.expandedWordId,
      }
    }),

  clearWordFocus: () =>
    set((state) => {
      // Only clear if there's actually something to clear
      if (
        !state.focusedWordId &&
        !state.focusedClipId &&
        state.groupedWordIds.size === 0
      ) {
        return state
      }

      return {
        focusedWordId: null,
        focusedClipId: null,
        groupedWordIds: new Set(),
        // Close waveform modal when clearing focus
        expandedClipId: null,
        expandedWordId: null,
      }
    }),

  // Group selection
  startGroupSelection: (clipId, wordId) =>
    set({
      isGroupSelecting: true,
      groupSelectionStart: { clipId, wordId },
      groupedWordIds: new Set([wordId]),
      focusedClipId: clipId,
    }),

  addToGroupSelection: (wordId) =>
    set((state) => ({
      groupedWordIds: new Set([...state.groupedWordIds, wordId]),
    })),

  endGroupSelection: () =>
    set({
      isGroupSelecting: false,
      groupSelectionStart: null,
    }),

  clearGroupSelection: () =>
    set({
      groupedWordIds: new Set(),
      isGroupSelecting: false,
      groupSelectionStart: null,
    }),

  toggleWordInGroup: (wordId) =>
    set((state) => {
      const newGroup = new Set(state.groupedWordIds)
      if (newGroup.has(wordId)) {
        newGroup.delete(wordId)
      } else {
        newGroup.add(wordId)
      }
      return { groupedWordIds: newGroup }
    }),

  // Drag and drop
  startWordDrag: (wordId) =>
    set((state) => {
      // Only allow dragging if the word is focused or in group
      if (state.focusedWordId === wordId || state.groupedWordIds.has(wordId)) {
        return {
          isDraggingWord: true,
          draggedWordId: wordId,
        }
      }
      return state
    }),

  endWordDrag: () =>
    set({
      isDraggingWord: false,
      draggedWordId: null,
      dropTargetWordId: null,
      dropPosition: null,
    }),

  setDropTarget: (wordId, position) =>
    set({
      dropTargetWordId: wordId,
      dropPosition: position,
    }),

  // Word reordering (to be implemented with clip store integration)
  reorderWords: (clipId, sourceWordId, targetWordId, position) => {
    // This will be integrated with the clip store to update word order
    // and reconstruct the full text
    console.log('Reordering words:', {
      clipId,
      sourceWordId,
      targetWordId,
      position,
    })
  },

  // Inline editing and detail editor
  startInlineEdit: (clipId, wordId) =>
    set({
      editingWordId: wordId,
      editingClipId: clipId,
    }),

  endInlineEdit: () =>
    set({
      editingWordId: null,
      editingClipId: null,
    }),

  openWordDetailEditor: (clipId, wordId) =>
    set({
      wordDetailOpen: true,
      focusedWordId: wordId,
      focusedClipId: clipId,
    }),

  closeWordDetailEditor: () =>
    set({
      wordDetailOpen: false,
    }),

  expandClip: (clipId, wordId) =>
    set((state) => {
      // Don't expand if multiple words are selected
      if (state.multiSelectedWordIds.size > 1) {
        return state
      }
      return {
        ...state,
        expandedClipId: clipId,
        expandedWordId: wordId,
        wordDetailOpen: false, // Close modal if open
      }
    }),

  collapseClip: () =>
    set({
      expandedClipId: null,
      expandedWordId: null,
    }),

  updateWordTiming: (wordId, start, end) =>
    set((state) => {
      const newTimings = new Map(state.wordTimingAdjustments)
      newTimings.set(wordId, { start, end })

      // Add to history
      const history = state.wordTimingHistory.get(wordId) || []
      const historyIndex = state.wordTimingHistoryIndex.get(wordId) || 0

      // Remove any future history if we're not at the end
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push({ start, end })

      // Limit history to 50 items
      if (newHistory.length > 50) {
        newHistory.shift()
      }

      const newWordHistory = new Map(state.wordTimingHistory)
      const newHistoryIndex = new Map(state.wordTimingHistoryIndex)
      newWordHistory.set(wordId, newHistory)
      newHistoryIndex.set(wordId, newHistory.length - 1)

      // Reflect timing change into scenario (update baseTime and recompute pluginChain)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        anyGet.updateWordBaseTime?.(wordId, start, end)
        anyGet.refreshWordPluginChain?.(wordId)
      } catch {
        // ignore if scenario slice not present
      }

      return {
        wordTimingAdjustments: newTimings,
        wordTimingHistory: newWordHistory,
        wordTimingHistoryIndex: newHistoryIndex,
      }
    }),

  updateAnimationIntensity: (wordId, min, max) =>
    set((state) => {
      const newIntensity = new Map(state.wordAnimationIntensity)
      newIntensity.set(wordId, { min, max })
      return { wordAnimationIntensity: newIntensity }
    }),

  undoWordTiming: (wordId) =>
    set((state) => {
      const history = state.wordTimingHistory.get(wordId)
      const currentIndex = state.wordTimingHistoryIndex.get(wordId)

      if (!history || currentIndex === undefined || currentIndex <= 0) {
        return state // Nothing to undo
      }

      const newIndex = currentIndex - 1
      const previousTiming = history[newIndex]

      const newTimings = new Map(state.wordTimingAdjustments)
      const newHistoryIndex = new Map(state.wordTimingHistoryIndex)

      newTimings.set(wordId, previousTiming)
      newHistoryIndex.set(wordId, newIndex)

      return {
        wordTimingAdjustments: newTimings,
        wordTimingHistoryIndex: newHistoryIndex,
      }
    }),

  redoWordTiming: (wordId) =>
    set((state) => {
      const history = state.wordTimingHistory.get(wordId)
      const currentIndex = state.wordTimingHistoryIndex.get(wordId)

      if (
        !history ||
        currentIndex === undefined ||
        currentIndex >= history.length - 1
      ) {
        return state // Nothing to redo
      }

      const newIndex = currentIndex + 1
      const nextTiming = history[newIndex]

      const newTimings = new Map(state.wordTimingAdjustments)
      const newHistoryIndex = new Map(state.wordTimingHistoryIndex)

      newTimings.set(wordId, nextTiming)
      newHistoryIndex.set(wordId, newIndex)

      return {
        wordTimingAdjustments: newTimings,
        wordTimingHistoryIndex: newHistoryIndex,
      }
    }),

  // Animation tracks
  addAnimationTrack: (
    wordId,
    assetId,
    assetName,
    wordTiming,
    pluginKey,
    timeOffset,
    params
  ) =>
    set((state) => {
      const newTracks = new Map(state.wordAnimationTracks)
      const existingTracks = newTracks.get(wordId) || []

      // Check if already exists or if we've reached max (3)
      if (
        existingTracks.find((t) => t.assetId === assetId) ||
        existingTracks.length >= 3
      ) {
        return state
      }

      // Assign color based on current track count
      const colors: ('blue' | 'green' | 'purple')[] = [
        'blue',
        'green',
        'purple',
      ]
      const color = colors[existingTracks.length]

      // Use provided wordTiming or get from adjustments or default
      const baseTiming = wordTiming ||
        state.wordTimingAdjustments.get(wordId) || { start: 0, end: 1 }

      // Apply timeOffset to timing for soundWave visualization
      const adjustedTiming = applyTimeOffset(baseTiming, timeOffset)

      // For cwi-color plugin, ensure palette uses define.speakerPalette and add speaker info
      let adjustedParams = params
      if (pluginKey === 'cwi-color@2.0.0') {
        // Update palette reference and ensure speaker is included
        adjustedParams = {
          ...params,
          palette: 'define.speakerPalette',
        }

        // Try to get speaker from the clip containing this word
        if (!adjustedParams.speaker) {
          try {
            const anyGet = get() as any
            const clips = anyGet.clips || []

            // Normalize wordId by removing duplicate "word-" prefix if present
            const normalizedWordId = wordId.replace(/^word-word-/, 'word-')

            const clip = clips.find((c: any) => {
              if (!c.words) return false
              return c.words.some((w: any) => {
                // Also normalize the word IDs in clips for comparison
                const normalizedWId = (w.id || '').replace(
                  /^word-word-/,
                  'word-'
                )
                return normalizedWId === normalizedWordId || w.id === wordId
              })
            })

            if (clip?.speaker) {
              adjustedParams.speaker = clip.speaker
              console.log('🔍 [cwi-color] Found speaker for word:', {
                wordId,
                normalizedWordId,
                clipId: clip.id,
                speaker: clip.speaker,
              })
            } else {
              console.log('🔍 [cwi-color] No speaker found for word:', {
                wordId,
                normalizedWordId,
                clipsChecked: clips.length,
              })
            }
          } catch (error) {
            console.warn('[cwi-color] Error getting speaker:', error)
          }
        }
      }

      const newTrack: AnimationTrack = {
        assetId,
        assetName,
        pluginKey,
        timing: adjustedTiming,
        intensity: { min: 0.3, max: 0.7 },
        color,
        timeOffset,
        params: adjustedParams,
      }

      newTracks.set(wordId, [...existingTracks, newTrack])

      // Update scenario pluginChain for this word
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        anyGet.refreshWordPluginChain?.(wordId)
      } catch {
        // ignore
      }

      // Also sync with word.appliedAssets and word.animationTracks in clips
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        if (
          (anyGet.applyAssetsToWord || anyGet.updateWordAnimationTracks) &&
          anyGet.clips
        ) {
          const clipId = anyGet.getClipIdByWordId?.(wordId)
          if (clipId) {
            const allTracks = newTracks.get(wordId) || []
            const assetIds = allTracks.map((track) => track.assetId)
            if (anyGet.applyAssetsToWord) {
              anyGet.applyAssetsToWord(clipId, wordId, assetIds)
            }
            if (anyGet.updateWordAnimationTracks) {
              anyGet.updateWordAnimationTracks(clipId, wordId, allTracks)
            }
          }
        }
      } catch {
        // ignore
      }

      return { wordAnimationTracks: newTracks }
    }),

  removeAnimationTrack: (wordId, assetId) => {
    // 1. First update the state
    set((state) => {
      const newTracks = new Map(state.wordAnimationTracks)
      const existingTracks = newTracks.get(wordId) || []

      const filteredTracks = existingTracks.filter((t) => t.assetId !== assetId)

      // Reassign colors after removal
      const colors: ('blue' | 'green' | 'purple')[] = [
        'blue',
        'green',
        'purple',
      ]
      const recoloredTracks = filteredTracks.map((track, index) => ({
        ...track,
        color: colors[index],
      }))

      if (recoloredTracks.length === 0) {
        newTracks.delete(wordId)
      } else {
        newTracks.set(wordId, recoloredTracks)
      }

      return { wordAnimationTracks: newTracks }
    })

    // 2. After state update, sync with clips and refresh plugin chain
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyGet = get() as any
      const updatedTracks = anyGet.wordAnimationTracks?.get(wordId) || []

      // Sync with word.appliedAssets and word.animationTracks in clips
      if (
        (anyGet.applyAssetsToWord || anyGet.updateWordAnimationTracks) &&
        anyGet.clips
      ) {
        const clipId = anyGet.getClipIdByWordId?.(wordId)
        if (clipId) {
          const assetIds = updatedTracks.map(
            (track: AnimationTrack) => track.assetId
          )
          if (anyGet.applyAssetsToWord) {
            anyGet.applyAssetsToWord(clipId, wordId, assetIds)
          }
          if (anyGet.updateWordAnimationTracks) {
            anyGet.updateWordAnimationTracks(clipId, wordId, updatedTracks)
          }
        }
      }

      // Update scenario pluginChain for this word (now with correct state)
      anyGet.refreshWordPluginChain?.(wordId)
    } catch {
      // ignore
    }
  },

  updateAnimationTrackTiming: (wordId, assetId, start, end) =>
    set((state) => {
      const newTracks = new Map(state.wordAnimationTracks)
      const existingTracks = newTracks.get(wordId) || []

      // Find the word's original baseTime from clips (not wordTimingAdjustments)
      let wordBaseTime: { start: number; end: number } | undefined = undefined
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        const clips = anyGet.clips || []
        for (const clip of clips) {
          const word = clip.words?.find((w: Word) => w.id === wordId)
          if (word) {
            wordBaseTime = { start: word.start, end: word.end }
            break
          }
        }
      } catch {
        // ignore
      }

      const updatedTracks = existingTracks.map((track) => {
        if (track.assetId === assetId) {
          // Calculate timeOffset based on difference from word's original baseTime
          let timeOffset: [number, number] | undefined = undefined
          if (wordBaseTime) {
            const preOffset = start - wordBaseTime.start
            const postOffset = end - wordBaseTime.end
            timeOffset = [preOffset, postOffset]
          }

          return {
            ...track,
            timing: { start, end },
            timeOffset,
          }
        }
        return track
      })

      newTracks.set(wordId, updatedTracks)

      // Recompute pluginChain timeOffset for this word
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        anyGet.refreshWordPluginChain?.(wordId)
      } catch {
        // ignore
      }

      // Mirror timing to word.animationTracks for UI sync
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        if (anyGet.updateWordAnimationTracks && anyGet.clips) {
          const clipId = anyGet.getClipIdByWordId?.(wordId)
          if (clipId) {
            anyGet.updateWordAnimationTracks(clipId, wordId, updatedTracks)
          }
        }
      } catch {}

      return { wordAnimationTracks: newTracks }
    }),

  updateAnimationTrackTimingImmediate: (wordId, assetId, start, end) =>
    set((state) => {
      const newTracks = new Map(state.wordAnimationTracks)
      const existingTracks = newTracks.get(wordId) || []

      // Find the word's original baseTime from clips (not wordTimingAdjustments)
      let wordBaseTime: { start: number; end: number } | undefined = undefined
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        const clips = anyGet.clips || []
        for (const clip of clips) {
          const word = clip.words?.find((w: Word) => w.id === wordId)
          if (word) {
            wordBaseTime = { start: word.start, end: word.end }
            break
          }
        }
      } catch {
        // ignore
      }

      const updatedTracks = existingTracks.map((track) => {
        if (track.assetId === assetId) {
          // Calculate timeOffset based on difference from word's original baseTime
          let timeOffset: [number, number] | undefined = undefined
          if (wordBaseTime) {
            const preOffset = start - wordBaseTime.start
            const postOffset = end - wordBaseTime.end
            timeOffset = [preOffset, postOffset]
          }

          return {
            ...track,
            timing: { start, end },
            timeOffset,
          }
        }
        return track
      })

      newTracks.set(wordId, updatedTracks)

      // Immediately update scenario pluginChain for this word (no debounce)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        anyGet.refreshWordPluginChain?.(wordId)
      } catch {
        // ignore
      }

      // Mirror timing to word.animationTracks for UI sync
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        if (anyGet.updateWordAnimationTracks && anyGet.clips) {
          const clipId = anyGet.getClipIdByWordId?.(wordId)
          if (clipId) {
            anyGet.updateWordAnimationTracks(clipId, wordId, updatedTracks)
          }
        }
      } catch {}

      return { wordAnimationTracks: newTracks }
    }),

  updateAnimationTrackIntensity: (wordId, assetId, min, max) =>
    set((state) => {
      const newTracks = new Map(state.wordAnimationTracks)
      const existingTracks = newTracks.get(wordId) || []

      const updatedTracks = existingTracks.map((track) =>
        track.assetId === assetId
          ? { ...track, intensity: { min, max } }
          : track
      )

      newTracks.set(wordId, updatedTracks)
      return { wordAnimationTracks: newTracks }
    }),

  clearAnimationTracks: (wordId) =>
    set((state) => {
      const newTracks = new Map(state.wordAnimationTracks)
      newTracks.delete(wordId)
      // Clear pluginChain for this word in scenario as well
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        anyGet.refreshWordPluginChain?.(wordId)
      } catch {
        // ignore
      }
      // Also clear word.animationTracks in clips
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        if (anyGet.updateWordAnimationTracks && anyGet.clips) {
          const clipId = anyGet.getClipIdByWordId?.(wordId)
          if (clipId) {
            anyGet.updateWordAnimationTracks(clipId, wordId, [])
          }
        }
      } catch {}
      return { wordAnimationTracks: newTracks }
    }),

  // Batch apply/toggle for multi-selection (async version)
  toggleAnimationForWords: async (wordIds, asset) => {
    const state = get()
    const newTracks = new Map(state.wordAnimationTracks)
    const colors: ('blue' | 'green' | 'purple')[] = ['blue', 'green', 'purple']

    // Helper to find timing fallback from clips
    const findTiming = (wordId: string): { start: number; end: number } => {
      const adj = state.wordTimingAdjustments.get(wordId)
      if (adj) return adj
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        const clips = anyGet.clips || []
        for (const clip of clips) {
          const w = clip.words?.find((x: Word) => x.id === wordId)
          if (w) return { start: w.start, end: w.end }
        }
      } catch {}
      return { start: 0, end: 1 }
    }

    // Load plugin manifest data for new animations
    let timeOffset: [number, number] | [string, string] | undefined = undefined
    let defaultParams: Record<string, unknown> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let manifest: any = null

    try {
      if (asset.pluginKey) {
        // Load timeOffset and default params from plugin manifest
        timeOffset = await getPluginTimeOffset(asset.pluginKey)
        const { getPluginDefaultParams, loadPluginManifest } = await import(
          '../../utils/pluginManifestLoader'
        )
        defaultParams = await getPluginDefaultParams(asset.pluginKey)

        // Load full manifest for autofill
        manifest = await loadPluginManifest(asset.pluginKey)
      }
    } catch (error) {}

    // Apply toggles in memory first
    for (const wordId of wordIds) {
      const existing = newTracks.get(wordId) || []
      const already = existing.findIndex((t) => t.assetId === asset.id)
      if (already >= 0) {
        // Remove this asset, then recolor
        const filtered = existing.filter((t) => t.assetId !== asset.id)
        if (filtered.length === 0) {
          newTracks.delete(wordId)
        } else {
          const recolored = filtered.map((t, i) => ({
            ...t,
            color: colors[i],
          }))
          newTracks.set(wordId, recolored)
        }
      } else {
        if (existing.length >= 3) continue // respect max 3 per word
        const baseTiming = findTiming(wordId)
        const color = colors[existing.length]

        // Apply timeOffset to timing for soundWave visualization
        const adjustedTiming = applyTimeOffset(baseTiming, timeOffset)

        // Apply autofill logic for each word
        const finalParams = { ...defaultParams }
        try {
          if (manifest) {
            // Extract autofill sources from manifest
            const { extractAutofillSources, getAutofillData } = await import(
              '../../utils/autofillDataProvider'
            )
            const autofillSources = extractAutofillSources(
              manifest?.schema || {}
            )

            if (Object.keys(autofillSources).length > 0) {
              // Get store state for autofill context
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const anyState = state as any

              const autofillContext = {
                store: anyState,
                targetWordId: wordId,
                targetClipId: wordId
                  ? wordId.match(/^word-(\d+)-\d+$/)?.[1]
                  : null,
              }

              console.log(
                '🔍 [AUTOFILL MULTI] ==================================='
              )
              console.log('🔍 [AUTOFILL MULTI] Target Word ID:', wordId)
              console.log('🔍 [AUTOFILL MULTI] Plugin Key:', asset.pluginKey)
              console.log(
                '🔍 [AUTOFILL MULTI] Extracted Sources:',
                autofillSources
              )

              // Get autofill data
              const autofillData: Record<string, unknown> = {}
              Object.entries(autofillSources).forEach(([paramKey, source]) => {
                const data = getAutofillData(source, autofillContext)
                console.log(
                  `🔍 [AUTOFILL MULTI] Getting data for ${paramKey}:`,
                  {
                    source,
                    result: data,
                  }
                )
                if (data !== null && data !== undefined) {
                  autofillData[paramKey] = data
                }
              })

              // Apply autofill data to parameters
              Object.entries(autofillData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                  finalParams[key] = value
                }
              })

              console.log('🔍 [AUTOFILL MULTI] Final Params:', {
                defaultParams,
                autofillData,
                finalMerged: finalParams,
              })
              console.log(
                '🔍 [AUTOFILL MULTI] ==================================='
              )
            }
          }
        } catch (error) {
          console.warn(
            'Failed to apply autofill in toggleAnimationForWords:',
            error
          )
          // Continue with default params if autofill fails
        }

        const track: AnimationTrack = {
          assetId: asset.id,
          assetName: asset.name,
          pluginKey: asset.pluginKey,
          timing: adjustedTiming,
          intensity: { min: 0.3, max: 0.7 },
          color,
          timeOffset, // Apply loaded timeOffset
          params: finalParams, // Apply autofilled parameters
        }
        newTracks.set(wordId, [...existing, track])
      }
    }

    // Update the state with new tracks
    set({ wordAnimationTracks: newTracks })

    // Reflect into clips + scenario for each affected word
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyGet = get() as any
      for (const wordId of wordIds) {
        const tracks = newTracks.get(wordId) || []
        // appliedAssets
        if (anyGet.applyAssetsToWord) {
          const clipId = anyGet.getClipIdByWordId?.(wordId)
          if (clipId) {
            anyGet.applyAssetsToWord(
              clipId,
              wordId,
              tracks.map((t: AnimationTrack) => t.assetId)
            )
          }
        }
        // mirror animationTracks onto word
        if (anyGet.updateWordAnimationTracks) {
          const clipId = anyGet.getClipIdByWordId?.(wordId)
          if (clipId) {
            anyGet.updateWordAnimationTracks(clipId, wordId, tracks)
          }
        }
        // scenario refresh
        anyGet.refreshWordPluginChain?.(wordId)
      }
    } catch {}
  },

  // Atomic update params for a track with rollback support
  updateAnimationTrackParams: (
    wordId: string,
    assetId: string,
    partialParams: Record<string, unknown>
  ) =>
    set((state) => {
      // Create backup for rollback
      const backupTracks = new Map(state.wordAnimationTracks)

      try {
        const newTracks = new Map(state.wordAnimationTracks)
        const existing = newTracks.get(wordId) || []

        // Validate that the track exists
        const trackExists = existing.some((t) => t.assetId === assetId)
        if (!trackExists) {
          console.warn(
            `Animation track ${assetId} not found for word ${wordId}`
          )
          return state // No change if track doesn't exist
        }

        const updated = existing.map((t) =>
          t.assetId === assetId
            ? { ...t, params: { ...(t.params || {}), ...partialParams } }
            : t
        )
        newTracks.set(wordId, updated)

        // Atomic updates: all operations must succeed or rollback
        let scenarioUpdateFailed = false
        let clipUpdateFailed = false

        // Update scenario
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyGet = get() as any
          anyGet.refreshWordPluginChain?.(wordId)
        } catch (error) {
          console.error('Failed to update scenario for word params:', error)
          scenarioUpdateFailed = true
        }

        // Update clip data
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyGet = get() as any
          if (anyGet.updateWordAnimationTracks && anyGet.clips) {
            const clipId = anyGet.getClipIdByWordId?.(wordId)
            if (clipId) {
              anyGet.updateWordAnimationTracks(clipId, wordId, updated)
            }
          }
        } catch (error) {
          console.error('Failed to update clip data for word params:', error)
          clipUpdateFailed = true
        }

        // If critical updates failed, rollback
        if (scenarioUpdateFailed) {
          console.warn(
            'Rolling back parameter update due to scenario update failure'
          )
          return { wordAnimationTracks: backupTracks }
        }

        // Clip update failure is less critical, just log it
        if (clipUpdateFailed) {
          console.warn('Clip data sync failed, but parameter update succeeded')
        }

        return { wordAnimationTracks: newTracks }
      } catch (error) {
        console.error('Failed to update animation track params:', error)
        return { wordAnimationTracks: backupTracks }
      }
    }),

  // Video playback synchronization
  setPlayingWord: (clipId, wordId) =>
    set((state) => {
      // Only update if the playing word has actually changed
      if (state.playingClipId === clipId && state.playingWordId === wordId) {
        return state
      }

      return {
        playingClipId: clipId,
        playingWordId: wordId,
      }
    }),

  clearPlayingWord: () =>
    set({
      playingWordId: null,
      playingClipId: null,
    }),

  isWordPlaying: (wordId) => {
    const state = get()
    return state.playingWordId === wordId
  },

  // Utility functions
  isWordFocused: (wordId) => {
    const state = get()
    return state.focusedWordId === wordId
  },

  isWordInGroup: (wordId) => {
    const state = get()
    return state.groupedWordIds.has(wordId)
  },

  canDragWord: (wordId) => {
    const state = get()
    return state.focusedWordId === wordId || state.groupedWordIds.has(wordId)
  },

  canDragSticker: (stickerId) => {
    // For now, all stickers are draggable
    // This can be extended later to include specific conditions
    return true
  },

  isEditingWord: (wordId) => {
    const state = get()
    return state.editingWordId === wordId
  },

  getWordStatePriority: (wordId) => {
    const state = get()
    if (state.editingWordId === wordId) return WordStatePriority.EDITING
    if (state.focusedWordId === wordId) return WordStatePriority.FOCUSED
    if (state.groupedWordIds.has(wordId)) return WordStatePriority.GROUPED
    return WordStatePriority.NORMAL
  },

  canChangeWordState: (wordId, newPriority) => {
    const state = get()
    if (state.isDraggingWord || state.isGroupSelecting) return false

    const currentPriority = get().getWordStatePriority(wordId)
    if (currentPriority === null) return true

    // Higher priority states can override lower ones
    return newPriority >= currentPriority
  },

  // Async animation track management
  addAnimationTrackAsync: async (
    wordId,
    assetId,
    assetName,
    wordTiming,
    pluginKey
  ) => {
    // Fetch timeOffset and default params from plugin manifest
    const timeOffset = await getPluginTimeOffset(pluginKey)
    // Lazy import to avoid cycle; use same loader file
    const { getPluginDefaultParams, loadPluginManifest } = await import(
      '../../utils/pluginManifestLoader'
    )
    const defaultParams = await getPluginDefaultParams(pluginKey)

    // Apply autofill logic similar to AssetControlPanel
    const finalParams = { ...defaultParams }

    try {
      if (pluginKey) {
        // Load plugin manifest to get autofill sources
        const manifest = await loadPluginManifest(pluginKey)

        // Extract autofill sources from manifest
        const { extractAutofillSources, getAutofillData } = await import(
          '../../utils/autofillDataProvider'
        )
        const autofillSources = extractAutofillSources(manifest?.schema || {})

        if (Object.keys(autofillSources).length > 0) {
          // Get store state for autofill context
          const state = get()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyState = state as any

          const autofillContext = {
            store: anyState,
            targetWordId: wordId,
            targetClipId: wordId ? wordId.match(/^word-(\d+)-\d+$/)?.[1] : null,
          }

          console.log(
            '🔍 [AUTOFILL ADDTRACK] ==================================='
          )
          console.log('🔍 [AUTOFILL ADDTRACK] Target Word ID:', wordId)
          console.log('🔍 [AUTOFILL ADDTRACK] Plugin Key:', pluginKey)
          console.log(
            '🔍 [AUTOFILL ADDTRACK] Extracted Sources:',
            autofillSources
          )

          // Get autofill data
          const autofillData: Record<string, unknown> = {}
          Object.entries(autofillSources).forEach(([paramKey, source]) => {
            const data = getAutofillData(source, autofillContext)
            console.log(
              `🔍 [AUTOFILL ADDTRACK] Getting data for ${paramKey}:`,
              {
                source,
                result: data,
              }
            )
            if (data !== null && data !== undefined) {
              autofillData[paramKey] = data
            }
          })

          // Apply autofill data to parameters
          Object.entries(autofillData).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              finalParams[key] = value
            }
          })

          console.log('🔍 [AUTOFILL ADDTRACK] Final Params:', {
            defaultParams,
            autofillData,
            finalMerged: finalParams,
          })
          console.log(
            '🔍 [AUTOFILL ADDTRACK] ==================================='
          )
        }
      }
    } catch (error) {
      console.warn('Failed to apply autofill in addAnimationTrackAsync:', error)
      // Continue with default params if autofill fails
    }

    // Call the regular addAnimationTrack with the fetched timeOffset and autofilled params
    // Use get() to get current state and call addAnimationTrack method
    const { addAnimationTrack } = get()
    addAnimationTrack(
      wordId,
      assetId,
      assetName,
      wordTiming,
      pluginKey,
      timeOffset,
      finalParams
    )

    // Ensure refreshWordPluginChain is called after the async operation completes
    // Use setTimeout to ensure it runs after the state update
    setTimeout(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        anyGet.refreshWordPluginChain?.(wordId)
      } catch (error) {
        console.warn(
          'Failed to refresh plugin chain after async track addition:',
          error
        )
      }
    }, 0)
  },

  setAnimationTrackPluginKey: (wordId, assetId, pluginKey) =>
    set((state) => {
      const newTracks = new Map(state.wordAnimationTracks)
      const existing = newTracks.get(wordId) || []
      let changed = false
      const updated = existing.map((t) => {
        if (t.assetId === assetId && t.pluginKey !== pluginKey) {
          changed = true
          return { ...t, pluginKey }
        }
        return t
      })
      if (!changed) return state
      newTracks.set(wordId, updated)

      // Mirror to clips and refresh scenario
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        if (anyGet.updateWordAnimationTracks && anyGet.clips) {
          const clipId = anyGet.getClipIdByWordId?.(wordId)
          if (clipId) {
            anyGet.updateWordAnimationTracks(clipId, wordId, updated)
          }
        }
        anyGet.refreshWordPluginChain?.(wordId)
      } catch {}

      return { wordAnimationTracks: newTracks }
    }),

  // Multi-selection implementations
  selectWordRange: (toClipId, toWordId) =>
    set((state) => {
      // Get clips from store (assuming clips are available in the global store)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyGet = get() as any
      const clips = anyGet.clips || []

      const selectedIds = new Set<string>()
      const selectedClipIds = new Set<string>()

      const fromClipId = state.lastSelectedClipId
      const fromWordId = state.lastSelectedWordId

      // Find clip indices
      const fromClipIndex = clips.findIndex(
        (c: ClipItem) => c.id === fromClipId
      )
      const toClipIndex = clips.findIndex((c: ClipItem) => c.id === toClipId)

      if (fromClipIndex === -1 || toClipIndex === -1) return state

      const startClipIndex = Math.min(fromClipIndex, toClipIndex)
      const endClipIndex = Math.max(fromClipIndex, toClipIndex)

      // Select words across clips
      for (let ci = startClipIndex; ci <= endClipIndex; ci++) {
        const clip = clips[ci]
        selectedClipIds.add(clip.id)

        if (ci === fromClipIndex && ci === toClipIndex) {
          // Same clip - select range within
          const fromIdx = clip.words.findIndex((w: Word) => w.id === fromWordId)
          const toIdx = clip.words.findIndex((w: Word) => w.id === toWordId)
          const start = Math.min(fromIdx, toIdx)
          const end = Math.max(fromIdx, toIdx)

          for (let wi = start; wi <= end; wi++) {
            selectedIds.add(clip.words[wi].id)
          }
        } else if (ci === fromClipIndex) {
          // Start clip - select from word to end
          const fromIdx = clip.words.findIndex((w: Word) => w.id === fromWordId)
          for (let wi = fromIdx; wi < clip.words.length; wi++) {
            selectedIds.add(clip.words[wi].id)
          }
        } else if (ci === toClipIndex) {
          // End clip - select from start to word
          const toIdx = clip.words.findIndex((w: Word) => w.id === toWordId)
          for (let wi = 0; wi <= toIdx; wi++) {
            selectedIds.add(clip.words[wi].id)
          }
        } else {
          // Middle clips - select all words
          clip.words.forEach((w: Word) => selectedIds.add(w.id))
        }
      }

      return {
        multiSelectedWordIds: selectedIds,
        multiSelectedClipIds: selectedClipIds,
        lastSelectedWordId: toWordId,
        lastSelectedClipId: toClipId,
        focusedWordId: toWordId,
        focusedClipId: toClipId,
        expandedClipId: null, // Close waveform
        expandedWordId: null,
      }
    }),

  toggleMultiSelectWord: (clipId, wordId) =>
    set((state) => {
      const newSelection = new Set(state.multiSelectedWordIds)
      const newClipSelection = new Set(state.multiSelectedClipIds)

      if (newSelection.has(wordId)) {
        newSelection.delete(wordId)

        // Check if clip still has selected words

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGet = get() as any
        const clips = anyGet.clips || []
        const clip = clips.find((c: ClipItem) => c.id === clipId)
        if (clip) {
          const hasOtherSelectedWords = clip.words.some(
            (w: Word) => w.id !== wordId && newSelection.has(w.id)
          )
          if (!hasOtherSelectedWords) {
            newClipSelection.delete(clipId)
          }
        }
      } else {
        newSelection.add(wordId)
        newClipSelection.add(clipId)
      }

      return {
        multiSelectedWordIds: newSelection,
        multiSelectedClipIds: newClipSelection,
        lastSelectedWordId: wordId,
        lastSelectedClipId: clipId,
        focusedWordId: wordId,
        focusedClipId: clipId,
        expandedClipId: null, // Close waveform for multi-selection
        expandedWordId: null,
      }
    }),

  clearMultiSelection: () =>
    set({
      multiSelectedWordIds: new Set(),
      multiSelectedClipIds: new Set(),
      lastSelectedWordId: null,
      lastSelectedClipId: null,
    }),

  deleteSelectedWords: () =>
    set(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyGet = get() as any
      const clips = anyGet.clips || []
      const selectedByClip = get().getSelectedWordsByClip()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedClips = clips.map((clip: any) => {
        const selectedInClip = selectedByClip.get(clip.id)
        if (!selectedInClip || selectedInClip.length === 0) {
          return clip
        }

        // Filter out selected words
        const remainingWords = clip.words.filter(
          (w: Word) => !selectedInClip.includes(w.id)
        )

        // Rebuild fullText and subtitle
        const fullText = remainingWords.map((w: Word) => w.text).join(' ')

        return {
          ...clip,
          words: remainingWords,
          fullText,
          subtitle: fullText, // Update subtitle too
        }
      })

      // Update clips in global store
      try {
        anyGet.updateClips?.(updatedClips)
      } catch {
        // ignore if update method not available
      }

      // Clear selection after delete
      return {
        multiSelectedWordIds: new Set(),
        multiSelectedClipIds: new Set(),
        focusedWordId: null,
        focusedClipId: null,
        lastSelectedWordId: null,
        lastSelectedClipId: null,
        expandedClipId: null,
        expandedWordId: null,
      }
    }),

  setLastSelectedWord: (clipId, wordId) =>
    set({
      lastSelectedWordId: wordId,
      lastSelectedClipId: clipId,
    }),

  // Utility methods
  isMultipleWordsSelected: () => {
    const state = get()
    return state.multiSelectedWordIds.size > 1
  },

  getSelectedWordsByClip: () => {
    const state = get()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyGet = get() as any
    const clips = anyGet.clips || []
    const result = new Map<string, string[]>()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clips.forEach((clip: any) => {
      const selectedInClip = clip.words
        .filter((w: Word) => state.multiSelectedWordIds.has(w.id))
        .map((w: Word) => w.id)

      if (selectedInClip.length > 0) {
        result.set(clip.id, selectedInClip)
      }
    })

    return result
  },

  // Template application implementation
  applyTemplateToWords: async (templateId, wordIds, audioData) => {
    try {
      // Load the template system
      const { TemplateSystem } = await import('@/lib/templates')
      const templateSystem = new TemplateSystem({ debugMode: false })

      // Apply template to each word
      for (const wordId of wordIds) {
        // Load audio data if not provided
        let processedAudioData = audioData
        if (!processedAudioData) {
          // Get audio data from real.json
          try {
            const response = await fetch('/real.json')
            processedAudioData = await response.json()
          } catch (error) {
            console.error('Failed to load audio data:', error)
            continue
          }
        }

        // Apply template to generate animation tracks
        const result = await templateSystem.applyTemplate(
          templateId,
          processedAudioData,
          { targetWordId: wordId }
        )

        // Convert template results to animation tracks
        if (result.animationTracks) {
          const state = get()

          // Clear existing animation tracks for the word
          state.clearAnimationTracks(wordId)

          // Add new animation tracks from template
          for (const track of result.animationTracks) {
            await state.addAnimationTrackAsync(
              wordId,
              track.assetId,
              track.assetName,
              track.timing,
              track.pluginKey
            )

            // Apply template parameters
            if (track.params) {
              // Use the existing method for updating animation track parameters
              const animationTracks =
                state.wordAnimationTracks.get(wordId) || []
              const updatedTracks = animationTracks.map((t) =>
                t.assetId === track.assetId
                  ? { ...t, params: { ...t.params, ...track.params } }
                  : t
              )
              state.wordAnimationTracks.set(wordId, updatedTracks)
            }

            // Apply intensity settings
            if (track.intensity) {
              state.updateAnimationTrackIntensity(
                wordId,
                track.assetId,
                track.intensity.min,
                track.intensity.max
              )
            }
          }
        }
      }

      console.log(`Applied template ${templateId} to ${wordIds.length} words`)
    } catch (error) {
      console.error('Failed to apply template:', error)
      throw error
    }
  },

  applyTemplateToSelection: async (templateId, audioData) => {
    const state = get()
    const selectedWordIds = Array.from(state.multiSelectedWordIds)

    if (selectedWordIds.length === 0) {
      // If no multi-selection, apply to focused word
      if (state.focusedWordId) {
        await get().applyTemplateToWords(
          templateId,
          [state.focusedWordId],
          audioData
        )
      } else {
        console.warn('No words selected for template application')
      }
    } else {
      await get().applyTemplateToWords(templateId, selectedWordIds, audioData)
    }
  },

  // Multi-word batch operations
  updateMultipleWordsAnimationParams: (wordIds, assetId, params) =>
    set((state) => {
      const newTracks = new Map(state.wordAnimationTracks)
      let hasChanges = false

      for (const wordId of wordIds) {
        const existingTracks = newTracks.get(wordId) || []
        const trackIndex = existingTracks.findIndex(
          (t) => t.assetId === assetId
        )

        if (trackIndex >= 0) {
          const updatedTracks = [...existingTracks]
          updatedTracks[trackIndex] = {
            ...updatedTracks[trackIndex],
            params: { ...updatedTracks[trackIndex].params, ...params },
          }
          newTracks.set(wordId, updatedTracks)
          hasChanges = true

          // Update scenario for this word
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const anyGet = get() as any
            anyGet.refreshWordPluginChain?.(wordId)
          } catch {
            // ignore
          }

          // Update clip data
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const anyGet = get() as any
            if (anyGet.updateWordAnimationTracks && anyGet.clips) {
              const clipId = anyGet.getClipIdByWordId?.(wordId)
              if (clipId) {
                anyGet.updateWordAnimationTracks(clipId, wordId, updatedTracks)
              }
            }
          } catch {
            // ignore
          }
        }
      }

      return hasChanges ? { wordAnimationTracks: newTracks } : state
    }),

  removeAnimationFromMultipleWords: (wordIds, assetId) => {
    const colors: ('blue' | 'green' | 'purple')[] = ['blue', 'green', 'purple']

    // 1. First update the state
    let hasChanges = false
    const affectedWordIds: string[] = []

    set((state) => {
      const newTracks = new Map(state.wordAnimationTracks)

      for (const wordId of wordIds) {
        const existingTracks = newTracks.get(wordId) || []
        const filteredTracks = existingTracks.filter(
          (t) => t.assetId !== assetId
        )

        if (filteredTracks.length !== existingTracks.length) {
          hasChanges = true
          affectedWordIds.push(wordId)

          // Reassign colors after removal
          const recoloredTracks = filteredTracks.map((track, index) => ({
            ...track,
            color: colors[index],
          }))

          if (recoloredTracks.length === 0) {
            newTracks.delete(wordId)
          } else {
            newTracks.set(wordId, recoloredTracks)
          }
        }
      }

      return hasChanges ? { wordAnimationTracks: newTracks } : state
    })

    // 2. After state update, refresh plugin chains and update clip data
    if (hasChanges) {
      for (const wordId of affectedWordIds) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyGet = get() as any
          const updatedTracks = anyGet.wordAnimationTracks?.get(wordId) || []

          // Update clip data
          if (anyGet.updateWordAnimationTracks && anyGet.clips) {
            const clipId = anyGet.getClipIdByWordId?.(wordId)
            if (clipId) {
              anyGet.updateWordAnimationTracks(clipId, wordId, updatedTracks)
            }
          }
          if (anyGet.applyAssetsToWord) {
            const clipId = anyGet.getClipIdByWordId?.(wordId)
            if (clipId) {
              const assetIds = updatedTracks.map(
                (track: AnimationTrack) => track.assetId
              )
              anyGet.applyAssetsToWord(clipId, wordId, assetIds)
            }
          }

          // Update scenario plugin chain (now with correct state)
          anyGet.refreshWordPluginChain?.(wordId)
        } catch {
          // ignore
        }
      }
    }
  },
})
