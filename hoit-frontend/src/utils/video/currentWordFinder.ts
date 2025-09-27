/**
 * Video Playback Word Synchronization Utility
 * Finds the currently playing word based on video time
 */

import { ClipItem, Word } from '@/app/(route)/editor/types'
import { log } from '@/utils/logger'

export interface CurrentWordInfo {
  clipId: string
  wordId: string
  word: Word
  clip: ClipItem
}

/**
 * Find the currently playing word based on video time
 */
export function findCurrentWord(
  currentTime: number,
  clips: ClipItem[]
): CurrentWordInfo | null {
  if (!clips || clips.length === 0 || currentTime < 0) {
    return null
  }

  // Find the active clip for this time
  for (const clip of clips) {
    if (!clip || !clip.words || clip.words.length === 0) {
      continue
    }

    const clipStartTime = parseTimeToSeconds(clip.timeline)
    const clipDuration = parseDurationToSeconds(clip.duration)
    const clipEndTime = clipStartTime + clipDuration

    // Check if current time falls within this clip
    if (currentTime >= clipStartTime && currentTime <= clipEndTime) {
      // Find the active word within this clip
      const relativeTime = currentTime - clipStartTime

      for (const word of clip.words) {
        if (
          !word ||
          typeof word.start !== 'number' ||
          typeof word.end !== 'number'
        ) {
          continue
        }

        // Add small tolerance to handle edge cases
        const tolerance = 0.05
        const wordAbsoluteStart = clipStartTime + word.start
        const wordAbsoluteEnd = clipStartTime + word.end

        if (
          currentTime >= wordAbsoluteStart - tolerance &&
          currentTime < wordAbsoluteEnd + tolerance
        ) {
          // Only log occasionally to avoid spam
          if (Math.random() < 0.01) {
            // 1% chance
            log(
              'currentWordFinder',
              `Found current word: "${word.text}" at ${currentTime}s (word: ${wordAbsoluteStart}-${wordAbsoluteEnd})`
            )
          }
          return {
            clipId: clip.id,
            wordId: word.id,
            word,
            clip,
          }
        }
      }

      // Less verbose logging for debugging
      if (Math.random() < 0.001) {
        // 0.1% chance
        log(
          'currentWordFinder',
          `In clip ${clip.id} at ${currentTime}s (relative: ${relativeTime}s) but no active word found`
        )
      }
    }
  }

  return null
}

/**
 * Helper to parse time string (MM:SS or HH:MM:SS) to seconds
 */
function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') {
    return 0
  }

  // Handle timeline format "MM:SS → MM:SS" by taking the first part
  const startTimeStr = timeStr.includes(' → ')
    ? timeStr.split(' → ')[0]
    : timeStr

  if (startTimeStr.includes(':')) {
    const parts = startTimeStr.split(':').map(Number)
    if (parts.length === 3) {
      // HH:MM:SS format
      const [hours, minutes, seconds] = parts
      return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0)
    } else if (parts.length === 2) {
      // MM:SS format
      const [minutes, seconds] = parts
      return (minutes || 0) * 60 + (seconds || 0)
    }
  }

  return parseFloat(startTimeStr) || 0
}

/**
 * Helper to parse duration string to seconds
 */
function parseDurationToSeconds(durationStr: string): number {
  if (!durationStr || typeof durationStr !== 'string') {
    return 0
  }

  // Remove '초' suffix if present and parse
  const cleanStr = durationStr.replace('초', '').trim()
  return parseFloat(cleanStr) || 0
}

/**
 * Check if word selection should be updated based on current playback
 */
export function shouldUpdateWordSelection(
  currentTime: number,
  lastUpdateTime: number,
  threshold: number = 0.2 // Increased threshold to reduce frequency
): boolean {
  // More conservative throttling to improve performance
  return Math.abs(currentTime - lastUpdateTime) >= threshold
}
