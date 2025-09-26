import type { StateCreator } from 'zustand'
import type { ClipItem, Word } from '../../types'

export interface IndexSlice {
  // Caches
  wordIdToClipId: Map<string, string>
  wordIdToIndex: Map<string, number>
  clipIdToWordIds: Map<string, string[]>
  clipIdToIndex: Map<string, number>

  // Builders
  rebuildIndexesFromClips: () => void

  // Getters
  getClipIdByWordId: (wordId: string) => string | null
  getWordIndexInClip: (
    wordId: string
  ) => { clipId: string; index: number } | null
  getWordEntryById: (
    wordId: string
  ) => { clipId: string; index: number; word: Word } | null
}

export const createIndexSlice: StateCreator<
  IndexSlice & { clips: ClipItem[]; deletedClipIds?: Set<string> },
  [],
  [],
  IndexSlice
> = (set, get) => ({
  wordIdToClipId: new Map<string, string>(),
  wordIdToIndex: new Map<string, number>(),
  clipIdToWordIds: new Map<string, string[]>(),
  clipIdToIndex: new Map<string, number>(),

  rebuildIndexesFromClips: () => {
    const state = get()
    const wordToClip = new Map<string, string>()
    const wordToIdx = new Map<string, number>()
    const clipToWords = new Map<string, string[]>()
    const clipToIndex = new Map<string, number>()

    // If deletedClipIds exists, exclude deleted clips
    const deleted =
      (state as unknown as { deletedClipIds?: Set<string> }).deletedClipIds ||
      new Set<string>()
    const clips = (state.clips || []).filter(
      (c: ClipItem) => !deleted.has(c.id)
    )
    clips.forEach((clip: ClipItem, ci: number) => {
      clipToIndex.set(clip.id, ci)
      const ids: string[] = []
      clip.words.forEach((w: Word, idx: number) => {
        wordToClip.set(w.id, clip.id)
        wordToIdx.set(w.id, idx)
        ids.push(w.id)
      })
      clipToWords.set(clip.id, ids)
    })

    set({
      wordIdToClipId: wordToClip,
      wordIdToIndex: wordToIdx,
      clipIdToWordIds: clipToWords,
      clipIdToIndex: clipToIndex,
    })
  },

  getClipIdByWordId: (wordId: string) => {
    const map = get().wordIdToClipId
    return map.get(wordId) || null
  },

  getWordIndexInClip: (wordId: string) => {
    const state = get()
    const clipId = state.wordIdToClipId.get(wordId)
    if (!clipId) return null
    const idx = state.wordIdToIndex.get(wordId)
    if (idx === undefined) return null
    return { clipId, index: idx }
  },

  getWordEntryById: (wordId: string) => {
    const state = get()
    const clipId = state.wordIdToClipId.get(wordId)
    if (!clipId) return null
    const wordIndex = state.wordIdToIndex.get(wordId)
    if (wordIndex === undefined) return null
    const clipIndex = state.clipIdToIndex.get(clipId)
    if (clipIndex === undefined) return null
    const clip = state.clips?.[clipIndex]
    if (!clip) return null
    const word = clip.words[wordIndex]
    if (!word) return null
    return { clipId, index: wordIndex, word }
  },
})
