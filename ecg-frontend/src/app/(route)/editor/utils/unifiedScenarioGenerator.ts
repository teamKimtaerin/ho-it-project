import type { ClipItem } from '../types'
import type { InsertedText } from '../types/textInsertion'
import type { RendererConfigV2 } from '@/app/shared/motiontext'
import {
  buildInitialScenarioFromClips,
  type InitialScenarioOptions,
  type InitialScenarioResult,
} from './initialScenario'
import {
  insertedTextsToCues,
  isInsertedTextCue,
  extractInsertedTextId,
} from './insertedTextToCue'

export interface UnifiedScenarioOptions extends InitialScenarioOptions {
  includeInsertedTexts?: boolean
}

export interface UnifiedScenarioResult extends InitialScenarioResult {
  insertedTextCueIds: string[] // Track which cues are from inserted texts
  subtitleCueIds: string[] // Track which cues are from subtitles
}

/**
 * Build unified scenario from both clips and inserted texts
 */
export function buildUnifiedScenario(
  clips: ClipItem[],
  insertedTexts: InsertedText[],
  opts: UnifiedScenarioOptions = {}
): UnifiedScenarioResult {
  const includeInsertedTexts = opts.includeInsertedTexts ?? true

  // Generate base scenario from clips (subtitles)
  const baseScenario = buildInitialScenarioFromClips(clips, opts)

  if (!includeInsertedTexts || insertedTexts.length === 0) {
    return {
      ...baseScenario,
      insertedTextCueIds: [],
      subtitleCueIds: baseScenario.config.cues.map((cue) => cue.id),
    }
  }

  // Generate cues from inserted texts
  const insertedTextCues = insertedTextsToCues(insertedTexts)

  // Combine all cues and sort by start time for optimal rendering
  const allCues = [...baseScenario.config.cues, ...insertedTextCues].sort(
    (a, b) => {
      const aStart = a.domLifetime?.[0] ?? 0
      const bStart = b.domLifetime?.[0] ?? 0
      return aStart - bStart
    }
  )

  // Use existing tracks (no need for separate insertedText track)
  const tracks = [...baseScenario.config.tracks]

  // Build index for all cues (existing subtitle index + new inserted text index)
  const combinedIndex = { ...baseScenario.index }

  // Add index entries for inserted text cues
  allCues.forEach((cue, cueIndex) => {
    if (isInsertedTextCue(cue)) {
      // For inserted text cues, index the root group node
      combinedIndex[cue.root.id] = {
        cueIndex,
        path: [], // Root level
      }

      // Also index the text node if it has children
      if (cue.root.children && cue.root.children.length > 0) {
        cue.root.children.forEach((child, childIndex) => {
          combinedIndex[child.id] = {
            cueIndex,
            path: [childIndex],
          }
        })
      }
    }
  })

  // Track cue IDs by type
  const insertedTextCueIds = insertedTextCues.map((cue) => cue.id)
  const subtitleCueIds = baseScenario.config.cues.map((cue) => cue.id)

  const unifiedConfig: RendererConfigV2 = {
    ...baseScenario.config,
    tracks,
    cues: allCues,
  }

  return {
    config: unifiedConfig,
    index: combinedIndex,
    insertedTextCueIds,
    subtitleCueIds,
  }
}

/**
 * Update a single inserted text cue in an existing scenario
 */
export function updateInsertedTextCueInScenario(
  scenario: RendererConfigV2,
  insertedText: InsertedText
): RendererConfigV2 {
  const cueId = `text-${insertedText.id}`
  const cueIndex = scenario.cues.findIndex((cue) => cue.id === cueId)

  if (cueIndex === -1) {
    // Cue doesn't exist, add it
    const newCue = insertedTextsToCues([insertedText])[0]
    if (newCue) {
      const newCues = [...scenario.cues, newCue].sort((a, b) => {
        return (a.domLifetime?.[0] ?? 0) - (b.domLifetime?.[0] ?? 0)
      })

      return {
        ...scenario,
        cues: newCues,
      }
    }
    return scenario
  }

  // Cue exists, update it
  const updatedCue = insertedTextsToCues([insertedText])[0]
  if (!updatedCue) {
    return scenario
  }

  const newCues = [...scenario.cues]
  newCues[cueIndex] = updatedCue

  // Re-sort cues by start time
  newCues.sort((a, b) => (a.domLifetime?.[0] ?? 0) - (b.domLifetime?.[0] ?? 0))

  return {
    ...scenario,
    cues: newCues,
  }
}

/**
 * Remove an inserted text cue from scenario
 */
export function removeInsertedTextCueFromScenario(
  scenario: RendererConfigV2,
  insertedTextId: string
): RendererConfigV2 {
  const cueId = `text-${insertedTextId}`
  const filteredCues = scenario.cues.filter((cue) => cue.id !== cueId)

  return {
    ...scenario,
    cues: filteredCues,
  }
}

/**
 * Extract inserted text IDs from a scenario
 */
export function getInsertedTextIdsFromScenario(
  scenario: RendererConfigV2
): string[] {
  return scenario.cues
    .filter(isInsertedTextCue)
    .map((cue) => extractInsertedTextId(cue.id))
    .filter((id): id is string => id !== null)
}

/**
 * Check if scenario has any inserted text cues
 */
export function hasInsertedTextCues(scenario: RendererConfigV2): boolean {
  return scenario.cues.some(isInsertedTextCue)
}
