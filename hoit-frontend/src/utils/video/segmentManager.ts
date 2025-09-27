/**
 * Video Segment Manager
 * Manages video segments based on clip deletions
 * Calculates playable ranges and handles subtitle synchronization
 */

import { ClipItem } from '@/app/(route)/editor/types'
import { log } from '@/utils/logger'

export interface VideoSegment {
  startTime: number
  endTime: number
  clipId: string
  isDeleted: boolean
}

export interface PlayableRange {
  start: number
  end: number
  originalStart: number // Original timestamp before adjustments
  originalEnd: number
}

export interface SubtitleEntry {
  text: string
  startTime: number
  endTime: number
  speaker: string
  clipId: string
}

class VideoSegmentManager {
  private segments: VideoSegment[] = []
  private deletedClipIds: Set<string> = new Set()
  private videoDuration: number = 0

  /**
   * Initialize with clips and video duration
   */
  initialize(clips: ClipItem[], videoDuration: number): void {
    log('VideoSegmentManager', `Initializing with ${clips.length} clips`)

    this.videoDuration = videoDuration
    this.segments = clips.map((clip) => {
      // Parse timeline to get start time
      const startTime = this.parseTimeToSeconds(clip.timeline)
      const duration = this.parseDurationToSeconds(clip.duration)

      return {
        startTime,
        endTime: startTime + duration,
        clipId: clip.id,
        isDeleted: this.deletedClipIds.has(clip.id),
      }
    })

    // Sort segments by start time
    this.segments.sort((a, b) => a.startTime - b.startTime)
  }

  /**
   * Mark a clip as deleted (doesn't actually remove it)
   */
  deleteClip(clipId: string): void {
    log('VideoSegmentManager', `Marking clip as deleted: ${clipId}`)

    this.deletedClipIds.add(clipId)

    // Update segment status
    const segment = this.segments.find((s) => s.clipId === clipId)
    if (segment) {
      segment.isDeleted = true
    }
  }

  /**
   * Restore a deleted clip
   */
  restoreClip(clipId: string): void {
    log('VideoSegmentManager', `Restoring clip: ${clipId}`)

    this.deletedClipIds.delete(clipId)

    // Update segment status
    const segment = this.segments.find((s) => s.clipId === clipId)
    if (segment) {
      segment.isDeleted = false
    }
  }

  /**
   * Get playable video ranges (excluding deleted segments)
   */
  getPlayableRanges(): PlayableRange[] {
    const ranges: PlayableRange[] = []
    let currentStart = 0

    for (const segment of this.segments) {
      if (segment.isDeleted) {
        // If we have accumulated time, add it as a playable range
        if (currentStart < segment.startTime) {
          ranges.push({
            start: ranges.length > 0 ? ranges[ranges.length - 1].end : 0,
            end:
              ranges.length > 0
                ? ranges[ranges.length - 1].end +
                  (segment.startTime - currentStart)
                : segment.startTime - currentStart,
            originalStart: currentStart,
            originalEnd: segment.startTime,
          })
        }
        // Skip the deleted segment time
        currentStart = segment.endTime
      }
    }

    // Add remaining time if any
    if (currentStart < this.videoDuration) {
      ranges.push({
        start: ranges.length > 0 ? ranges[ranges.length - 1].end : 0,
        end:
          ranges.length > 0
            ? ranges[ranges.length - 1].end +
              (this.videoDuration - currentStart)
            : this.videoDuration - currentStart,
        originalStart: currentStart,
        originalEnd: this.videoDuration,
      })
    }

    return ranges
  }

  /**
   * Map adjusted time to original video time
   */
  mapToOriginalTime(adjustedTime: number): number {
    const ranges = this.getPlayableRanges()

    for (const range of ranges) {
      if (adjustedTime >= range.start && adjustedTime <= range.end) {
        const offset = adjustedTime - range.start
        return range.originalStart + offset
      }
    }

    // If time is beyond all ranges, return the last original time
    if (ranges.length > 0) {
      return ranges[ranges.length - 1].originalEnd
    }

    return adjustedTime
  }

  /**
   * Map original video time to adjusted time
   */
  mapToAdjustedTime(originalTime: number): number | null {
    const ranges = this.getPlayableRanges()

    for (const range of ranges) {
      if (
        originalTime >= range.originalStart &&
        originalTime <= range.originalEnd
      ) {
        const offset = originalTime - range.originalStart
        return range.start + offset
      }
    }

    // If the original time falls within a deleted segment, return null
    return null
  }

  /**
   * Get active subtitles for a given video time
   */
  getActiveSubtitles(
    currentTime: number,
    clips: ClipItem[]
  ): SubtitleEntry | null {
    // Map to original time first
    const originalTime = this.mapToOriginalTime(currentTime)

    // Find the active clip for this time
    for (const clip of clips) {
      // Skip deleted clips
      if (this.deletedClipIds.has(clip.id)) {
        continue
      }

      const segment = this.segments.find((s) => s.clipId === clip.id)
      if (
        segment &&
        originalTime >= segment.startTime &&
        originalTime <= segment.endTime
      ) {
        return {
          text: clip.fullText,
          startTime: segment.startTime,
          endTime: segment.endTime,
          speaker: clip.speaker,
          clipId: clip.id,
        }
      }
    }

    return null
  }

  /**
   * Get total adjusted duration (excluding deleted segments)
   */
  getAdjustedDuration(): number {
    const ranges = this.getPlayableRanges()
    if (ranges.length > 0) {
      return ranges[ranges.length - 1].end
    }
    return this.videoDuration
  }

  /**
   * Check if we should skip to next segment
   */
  shouldSkipSegment(currentTime: number): { skip: boolean; skipTo?: number } {
    const originalTime = this.mapToOriginalTime(currentTime)

    // Check if we're in a deleted segment
    for (const segment of this.segments) {
      if (
        segment.isDeleted &&
        originalTime >= segment.startTime &&
        originalTime < segment.endTime
      ) {
        // Find the next playable time
        const nextPlayableTime = this.mapToAdjustedTime(segment.endTime)
        if (nextPlayableTime !== null) {
          return { skip: true, skipTo: nextPlayableTime }
        }
      }
    }

    return { skip: false }
  }

  /**
   * Get deleted clips count
   */
  getDeletedClipsCount(): number {
    return this.deletedClipIds.size
  }

  /**
   * Get all deleted clip IDs
   */
  getDeletedClipIds(): string[] {
    return Array.from(this.deletedClipIds)
  }

  /**
   * Clear all deletions
   */
  clearDeletions(): void {
    log('VideoSegmentManager', 'Clearing all deletions')
    this.deletedClipIds.clear()
    this.segments.forEach((segment) => {
      segment.isDeleted = false
    })
  }

  /**
   * Helper to parse time string (MM:SS or seconds) to seconds
   */
  private parseTimeToSeconds(timeStr: string): number {
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':').map(Number)
      if (parts.length === 3) {
        const [hours, minutes, seconds] = parts
        return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0)
      }
      const [minutes, seconds] = parts
      return (minutes || 0) * 60 + (seconds || 0)
    }
    return parseFloat(timeStr)
  }

  /**
   * Helper to parse duration string to seconds
   */
  private parseDurationToSeconds(durationStr: string): number {
    // Remove '초' suffix if present and parse
    const cleanStr = durationStr.replace('초', '').trim()
    return parseFloat(cleanStr)
  }

  /**
   * Export segment data for debugging
   */
  exportSegmentData(): {
    segments: VideoSegment[]
    deletedClipIds: string[]
    playableRanges: PlayableRange[]
    adjustedDuration: number
  } {
    return {
      segments: this.segments,
      deletedClipIds: this.getDeletedClipIds(),
      playableRanges: this.getPlayableRanges(),
      adjustedDuration: this.getAdjustedDuration(),
    }
  }
}

// Export singleton instance
export const videoSegmentManager = new VideoSegmentManager()
export default videoSegmentManager
