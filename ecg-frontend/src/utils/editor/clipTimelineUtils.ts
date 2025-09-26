/**
 * 클립 타임라인 정렬 및 관리 유틸리티
 * 실제 비디오 타임라인 순서를 보장하는 함수들
 */

import { ClipItem } from '@/app/(route)/editor/types'

/**
 * 클립들을 실제 비디오 타임라인 순서로 정렬
 * startTime이 있으면 그것을 기준으로, 없으면 timeline 순서로 정렬
 */
export function sortClipsByTimeline(clips: ClipItem[]): ClipItem[] {
  return [...clips].sort((a, b) => {
    // startTime이 있으면 실제 타임라인 시간 기준으로 정렬
    if (a.startTime !== undefined && b.startTime !== undefined) {
      return a.startTime - b.startTime
    }

    // startTime이 없으면 timeline 문자열을 숫자로 변환해서 정렬
    const aTimeline = parseFloat(a.timeline) || parseInt(a.timeline, 10) || 0
    const bTimeline = parseFloat(b.timeline) || parseInt(b.timeline, 10) || 0

    return aTimeline - bTimeline
  })
}

/**
 * 클립 배열의 timeline 번호를 재정렬 (1부터 시작)
 * 정렬된 순서에 맞게 timeline 필드를 1, 2, 3... 순으로 업데이트
 */
export function reorderClipTimelines(clips: ClipItem[]): ClipItem[] {
  return clips.map((clip, index) => ({
    ...clip,
    timeline: (index + 1).toString(),
  }))
}

/**
 * 클립들을 타임라인 순서로 정렬하고 번호를 재정렬
 * 새로운 데이터 로드 시나 복구 시 사용
 */
export function normalizeClipOrder(clips: ClipItem[]): ClipItem[] {
  const sortedClips = sortClipsByTimeline(clips)
  return reorderClipTimelines(sortedClips)
}

/**
 * 클립의 실제 타임라인 정보가 유효한지 확인
 */
export function hasValidTimelineInfo(clip: ClipItem): boolean {
  return (
    clip.startTime !== undefined &&
    clip.endTime !== undefined &&
    clip.startTime >= 0 &&
    clip.endTime > clip.startTime
  )
}

/**
 * 클립 배열에서 타임라인 정보가 누락된 클립들을 찾아서 로그
 */
export function validateClipTimelines(clips: ClipItem[]): {
  valid: ClipItem[]
  invalid: ClipItem[]
} {
  const valid: ClipItem[] = []
  const invalid: ClipItem[] = []

  clips.forEach((clip) => {
    if (hasValidTimelineInfo(clip)) {
      valid.push(clip)
    } else {
      invalid.push(clip)
    }
  })

  if (invalid.length > 0) {
    console.warn(
      `Found ${invalid.length} clips with invalid timeline info:`,
      invalid.map((c) => ({
        id: c.id,
        timeline: c.timeline,
        startTime: c.startTime,
        endTime: c.endTime,
      }))
    )
  }

  return { valid, invalid }
}
