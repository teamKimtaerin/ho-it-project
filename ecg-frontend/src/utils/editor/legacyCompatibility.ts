import { ClipItem } from '@/app/(route)/editor/types'
import { clipProcessor, SplitMode, MergeMode } from './UnifiedClipProcessor'

/**
 * 기존 splitClip 함수 호환성 유지
 * @deprecated Use clipProcessor.split() instead
 */
export const splitClip = (clip: ClipItem): [ClipItem, ClipItem] => {
  const result = clipProcessor.split(clip, SplitMode.MANUAL_HALF)
  if (result.length !== 2) {
    throw new Error('Unexpected split result')
  }
  return [result[0], result[1]]
}

/**
 * 기존 splitSelectedClip 함수 호환성 유지
 * @deprecated Use clipProcessor methods instead
 */
export const splitSelectedClip = (
  clips: ClipItem[],
  clipId: string
): ClipItem[] => {
  const clipIndex = clips.findIndex((clip) => clip.id === clipId)
  if (clipIndex === -1) {
    throw new Error('나눌 클립을 찾을 수 없습니다.')
  }

  const targetClip = clips[clipIndex]
  const splitClips = clipProcessor.split(targetClip, SplitMode.MANUAL_HALF)

  const newClips = [...clips]
  newClips.splice(clipIndex, 1, ...splitClips)

  return newClips.map((clip, index) => ({
    ...clip,
    timeline: (index + 1).toString(),
  }))
}

/**
 * 기존 mergeClips 함수 호환성 유지
 * @deprecated Use clipProcessor.merge() instead
 */
export const mergeClips = (
  clips: ClipItem[],
  selectedIds: string[]
): ClipItem => {
  const selectedClips = selectedIds
    .map((id) => clips.find((c) => c.id === id))
    .filter(Boolean) as ClipItem[]

  const merged = clipProcessor.merge(selectedClips, MergeMode.MANUAL)
  return merged[0]
}

/**
 * 기존 mergeSelectedClips 함수 호환성 유지
 * @deprecated Use clipProcessor methods instead
 */
export const mergeSelectedClips = (
  clips: ClipItem[],
  selectedIds: string[],
  checkedIds: string[]
): ClipItem[] => {
  const allSelectedIds = Array.from(new Set([...selectedIds, ...checkedIds]))

  const selectedClips = allSelectedIds
    .map((id) => clips.find((c) => c.id === id))
    .filter(Boolean) as ClipItem[]

  const merged = clipProcessor.merge(selectedClips, MergeMode.MANUAL)

  const firstSelectedIndex = Math.min(
    ...allSelectedIds
      .map((id) => clips.findIndex((clip) => clip.id === id))
      .filter((index) => index !== -1)
  )

  const newClips = clips.filter((clip) => !allSelectedIds.includes(clip.id))
  newClips.splice(firstSelectedIndex, 0, ...merged)

  return newClips.map((clip, index) => ({
    ...clip,
    timeline: (index + 1).toString(),
  }))
}

// Re-export utility functions that don't need changes
export { areClipsConsecutive } from './clipMerger'
