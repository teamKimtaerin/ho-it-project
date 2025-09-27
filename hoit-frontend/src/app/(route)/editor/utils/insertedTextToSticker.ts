import type { InsertedText } from '../types/textInsertion'
import type { Sticker, ClipItem } from '../types'

/**
 * Convert InsertedText to Clip Sticker
 */
export function insertedTextToSticker(
  insertedText: Pick<
    InsertedText,
    'id' | 'content' | 'startTime' | 'endTime' | 'animation'
  >
): Sticker {
  return {
    id: `sticker_${insertedText.id}`, // Sticker prefix
    text: insertedText.content,
    start: insertedText.startTime,
    end: insertedText.endTime,
    originalInsertedTextId: insertedText.id,
    appliedAssets: [], // Will be populated based on animation
    // Initialize with spin animation if present
    animationTracks: insertedText.animation?.plugin
      ? [
          {
            assetId: `spin-${insertedText.id}`, // Temporary asset ID for spin
            assetName: 'Spin Animation',
            pluginKey: insertedText.animation.plugin,
            params: insertedText.animation.parameters,
            timing: {
              start: insertedText.startTime,
              end: insertedText.endTime,
            },
            intensity: { min: 0.5, max: 1.0 }, // Default intensity
            color: 'purple' as const, // Purple for inserted text animations
          },
        ]
      : [],
  }
}

/**
 * Find clips that overlap with the given time range
 */
export function findOverlappingClips(
  clips: ClipItem[],
  startTime: number,
  endTime: number
): ClipItem[] {
  return clips.filter((clip) => {
    // Use clip timing if available, otherwise use word timing
    const clipStart = clip.startTime ?? (clip.words[0]?.start || 0)
    const clipEnd =
      clip.endTime ?? (clip.words[clip.words.length - 1]?.end || 0)

    // Check for overlap: clip and inserted text have overlapping time ranges
    return clipStart < endTime && clipEnd > startTime
  })
}

/**
 * Find the best matching clip for an inserted text
 * Prioritizes clips with the most overlap
 */
export function findBestMatchingClip(
  clips: ClipItem[],
  insertedText: Pick<InsertedText, 'startTime' | 'endTime'>
): ClipItem | null {
  const overlappingClips = findOverlappingClips(
    clips,
    insertedText.startTime,
    insertedText.endTime
  )

  if (overlappingClips.length === 0) return null

  // Calculate overlap duration for each clip and pick the best one
  let bestClip = overlappingClips[0]
  let maxOverlap = 0

  overlappingClips.forEach((clip) => {
    const clipStart = clip.startTime ?? (clip.words[0]?.start || 0)
    const clipEnd =
      clip.endTime ?? (clip.words[clip.words.length - 1]?.end || 0)

    const overlapStart = Math.max(clipStart, insertedText.startTime)
    const overlapEnd = Math.min(clipEnd, insertedText.endTime)
    const overlapDuration = Math.max(0, overlapEnd - overlapStart)

    if (overlapDuration > maxOverlap) {
      maxOverlap = overlapDuration
      bestClip = clip
    }
  })

  return bestClip
}

/**
 * Find the single clip that contains the given timestamp
 * Used for finding the current clip at a specific playback time
 */
export function findClipAtTime(
  clips: ClipItem[],
  targetTime: number
): ClipItem | null {
  // Find clips that contain the target time
  const containingClips = clips.filter((clip) => {
    const clipStartTime = Math.min(...clip.words.map((w) => w.start))
    const clipEndTime = Math.max(...clip.words.map((w) => w.end))
    return targetTime >= clipStartTime && targetTime <= clipEndTime
  })

  // If exactly one clip contains the time, return it
  if (containingClips.length === 1) {
    return containingClips[0]
  }

  // If multiple clips contain the time, find the one with the closest center
  if (containingClips.length > 1) {
    let bestClip = containingClips[0]
    let minDistance = Infinity

    for (const clip of containingClips) {
      const clipStartTime = Math.min(...clip.words.map((w) => w.start))
      const clipEndTime = Math.max(...clip.words.map((w) => w.end))
      const clipCenter = (clipStartTime + clipEndTime) / 2
      const distance = Math.abs(targetTime - clipCenter)

      if (distance < minDistance) {
        minDistance = distance
        bestClip = clip
      }
    }

    return bestClip
  }

  // If no clip contains the time, return null (don't add sticker)
  return null
}

/**
 * Insert sticker into clip's stickers array at the correct position
 * Stickers are ordered by start time
 */
export function insertStickerIntoClip(
  clip: ClipItem,
  sticker: Sticker
): ClipItem {
  const stickers = [...(clip.stickers || [])]

  // Find insertion position based on start time
  const insertIndex = stickers.findIndex((s) => s.start > sticker.start)

  if (insertIndex === -1) {
    // Insert at end if no sticker starts after this one
    stickers.push(sticker)
  } else {
    // Insert at the found position
    stickers.splice(insertIndex, 0, sticker)
  }

  return {
    ...clip,
    stickers,
  }
}

/**
 * Remove all stickers from clip
 */
export function removeStickersFromClip(clip: ClipItem): ClipItem {
  return {
    ...clip,
    stickers: [],
  }
}

/**
 * Extract original inserted text ID from sticker ID
 */
export function extractInsertedTextIdFromSticker(
  stickerId: string
): string | null {
  const match = stickerId.match(/^sticker_(.+)$/)
  return match ? match[1] : null
}

/**
 * Check if a sticker represents inserted text
 */
export function isInsertedTextSticker(sticker: Sticker): boolean {
  return sticker.originalInsertedTextId !== undefined
}

/**
 * Update sticker from inserted text changes
 */
export function updateStickerFromInsertedText(
  sticker: Sticker,
  insertedText: Pick<
    InsertedText,
    'id' | 'content' | 'startTime' | 'endTime' | 'animation'
  >
): Sticker {
  return {
    ...sticker,
    text: insertedText.content,
    start: insertedText.startTime,
    end: insertedText.endTime,
    // Update animation tracks if animation changed
    animationTracks: insertedText.animation?.plugin
      ? [
          {
            assetId: `spin-${insertedText.id}`,
            assetName: 'Spin Animation',
            pluginKey: insertedText.animation.plugin,
            params: insertedText.animation.parameters,
            timing: {
              start: insertedText.startTime,
              end: insertedText.endTime,
            },
            intensity: { min: 0.5, max: 1.0 },
            color: 'purple' as const,
          },
        ]
      : [],
  }
}
