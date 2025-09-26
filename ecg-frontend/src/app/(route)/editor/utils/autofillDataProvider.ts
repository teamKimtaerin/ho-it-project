/**
 * Autofill Data Provider
 * 플러그인 파라미터의 autofill 기능을 위한 데이터 제공자
 */

import type { EditorStore } from '../store/editorStore'
import { getSpeakerColor } from '@/utils/editor/speakerColors'

export interface AutofillContext {
  store: EditorStore
  targetWordId?: string | null
  targetClipId?: string | null
}

/**
 * autofill 소스별 데이터 제공 함수들
 */
export const autofillProviders = {
  /**
   * 현재 클립의 화자 정보 가져오기
   */
  'clip.speaker': (context: AutofillContext): string | null => {
    const { store, targetWordId } = context

    console.log('🔍 [AUTOFILL Provider] clip.speaker called:', {
      targetWordId,
      hasTargetWordId: !!targetWordId,
    })

    if (!targetWordId) return null

    // wordId에서 clipId 추출
    // Handle multiple formats:
    // - Standard: "word-0-0" (segment-wordIndex)
    // - With prefix: "word-word-0-0" (double prefix from initialScenario)
    // First, normalize the ID by removing duplicate "word-" prefix if present
    const normalizedWordId = targetWordId.replace(/^word-word-/, 'word-')

    // Extract segment ID from normalized format: word-{segmentId}-{wordIndex}
    const wordIdMatch = normalizedWordId.match(/^word-(\d+)-\d+$/)
    console.log('🔍 [AUTOFILL Provider] Word ID match:', {
      original: targetWordId,
      normalized: normalizedWordId,
      match: wordIdMatch,
    })

    if (!wordIdMatch) return null

    const segmentId = wordIdMatch[1]

    // Try to find the clip with different possible ID formats
    // 1. Original format: clip-{segmentId}
    // 2. Split format: clip-{segmentId}_split_{index}_{timestamp}
    // 3. Nested split: clip-{segmentId}_split_*_split_* (from multiple splits)
    const clip = store.clips.find((c) => {
      // Direct match
      if (c.id === `clip-${segmentId}`) return true

      // Check if it's a split clip from the same segment
      // Handle both simple and nested split patterns
      if (c.id.startsWith(`clip-${segmentId}_split_`)) return true

      // Also handle case where the base clip ID itself contains underscores
      // Extract the first numeric segment after "clip-"
      const baseClipMatch = c.id.match(/^clip-(\d+)/)
      return baseClipMatch && baseClipMatch[1] === segmentId
    })

    console.log('🔍 [AUTOFILL Provider] Found clip:', {
      segmentId,
      searchedPatterns: [`clip-${segmentId}`, `clip-${segmentId}_split_*`],
      clip: clip ? { id: clip.id, speaker: clip.speaker } : null,
      speaker: clip?.speaker,
      allClipIds: store.clips.map((c) => c.id), // Debug: show all clip IDs
    })

    return clip?.speaker || null
  },

  /**
   * 전체 화자-색상 매핑 정보 가져오기
   */
  'editor.speakerColors': (
    context: AutofillContext
  ): Record<string, string> => {
    const { store } = context

    // store에서 speakerColors 가져오기
    const speakerColors = store.speakerColors || {}

    // 등록된 모든 speaker에 대해 색상 정보 생성
    const speakers = store.clips
      .map((clip) => clip.speaker)
      .filter(
        (speaker, index, arr) => speaker && arr.indexOf(speaker) === index
      )

    const palette: Record<string, string> = {}

    speakers.forEach((speaker) => {
      if (speaker) {
        palette[speaker] =
          speakerColors[speaker] || getSpeakerColor(speaker, speakerColors)
      }
    })

    console.log('🔍 [AUTOFILL Provider] speakerColors called:', {
      speakerColors: store.speakerColors,
      speakers: store.speakers,
      clipsCount: store.clips.length,
      extractedSpeakers: speakers,
      resultPalette: palette,
    })

    return palette
  },

  /**
   * 현재 클립의 모든 단어 목록 가져오기
   */
  'clip.words': (context: AutofillContext): string[] => {
    const { store, targetWordId } = context

    if (!targetWordId) return []

    // wordId에서 clipId 추출
    const clipIdMatch = targetWordId.match(/^word-(.+)_word_\d+$/)
    if (!clipIdMatch) return []

    const clipId = clipIdMatch[1]
    const clip = store.clips.find((c) => c.id === clipId)

    return clip?.words.map((w) => w.text) || []
  },

  /**
   * 전체 화자 목록 가져오기
   */
  'editor.speakers': (context: AutofillContext): string[] => {
    const { store } = context

    return store.clips
      .map((clip) => clip.speaker)
      .filter(
        (speaker, index, arr) => speaker && arr.indexOf(speaker) === index
      )
  },
}

/**
 * autofill 데이터를 가져오는 메인 함수
 */
export function getAutofillData(
  source: string,
  context: AutofillContext
): unknown {
  const provider = autofillProviders[source as keyof typeof autofillProviders]

  if (!provider) {
    console.warn(`Unknown autofill source: ${source}`)
    return null
  }

  try {
    return provider(context)
  } catch (error) {
    console.warn(`Failed to get autofill data for source "${source}":`, error)
    return null
  }
}

/**
 * 여러 autofill 소스에서 데이터를 한번에 가져오기
 */
export function getMultipleAutofillData(
  sources: Record<string, string>,
  context: AutofillContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  Object.entries(sources).forEach(([paramKey, source]) => {
    result[paramKey] = getAutofillData(source, context)
  })

  return result
}

/**
 * 플러그인 매니페스트에서 autofill 소스 추출
 */
export function extractAutofillSources(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: Record<string, any>
): Record<string, string> {
  const sources: Record<string, string> = {}

  Object.entries(schema).forEach(([key, property]) => {
    if (property.ui?.autofill?.source) {
      sources[key] = property.ui.autofill.source
    }
  })

  return sources
}
