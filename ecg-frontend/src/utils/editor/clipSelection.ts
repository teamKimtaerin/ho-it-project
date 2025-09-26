import { ClipItem } from '@/app/(route)/editor/types'

/**
 * 클립 범위 문자열을 파싱하여 인덱스 배열로 변환
 * @example "1-5, 8, 11-13" → [1,2,3,4,5,8,11,12,13]
 */
export const parseClipRange = (input: string, totalClips: number): number[] => {
  const indices: number[] = []

  // 빈 입력 처리
  if (!input.trim()) return indices

  // 쉼표로 구분된 각 부분 처리
  const parts = input.split(',').map((s) => s.trim())

  parts.forEach((part) => {
    if (part.includes('-')) {
      // 범위 처리 (예: "1-5")
      const [startStr, endStr] = part.split('-').map((s) => s.trim())
      const start = parseInt(startStr)
      const end = parseInt(endStr)

      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end && i <= totalClips; i++) {
          if (i > 0) indices.push(i)
        }
      }
    } else {
      // 단일 숫자 처리 (예: "8")
      const num = parseInt(part)
      if (!isNaN(num) && num > 0 && num <= totalClips) {
        indices.push(num)
      }
    }
  })

  // 중복 제거 및 정렬
  return [...new Set(indices)].sort((a, b) => a - b)
}

/**
 * 홀수 번째 클립들의 ID 배열 반환
 */
export const selectOddClips = (clips: ClipItem[]): string[] => {
  return clips
    .filter((_, index) => (index + 1) % 2 === 1)
    .map((clip) => clip.id)
}

/**
 * 짝수 번째 클립들의 ID 배열 반환
 */
export const selectEvenClips = (clips: ClipItem[]): string[] => {
  return clips
    .filter((_, index) => (index + 1) % 2 === 0)
    .map((clip) => clip.id)
}

/**
 * 선택 반전 - 선택되지 않은 클립들을 선택
 */
export const invertSelection = (
  allClipIds: string[],
  selectedIds: Set<string>
): Set<string> => {
  return new Set(allClipIds.filter((id) => !selectedIds.has(id)))
}

/**
 * 인덱스 배열을 클립 ID 배열로 변환
 */
export const indicesToClipIds = (
  indices: number[],
  clips: ClipItem[]
): string[] => {
  return indices
    .map((index) => clips[index - 1]) // 인덱스는 1부터 시작
    .filter((clip) => clip !== undefined)
    .map((clip) => clip.id)
}

/**
 * 클립 범위 문자열 유효성 검증
 */
export const validateClipRange = (input: string): boolean => {
  if (!input.trim()) return false

  // 유효한 패턴: 숫자, 범위(1-5), 쉼표 구분
  const pattern = /^(\d+(-\d+)?)(,\s*\d+(-\d+)?)*$/
  return pattern.test(input.trim())
}

/**
 * 현재 클립 선택 (activeClipId 기준)
 */
export const selectCurrentClip = (activeClipId: string | null): Set<string> => {
  if (!activeClipId) return new Set()
  return new Set([activeClipId])
}

/**
 * 모든 클립 선택
 */
export const selectAllClips = (clips: ClipItem[]): Set<string> => {
  return new Set(clips.map((clip) => clip.id))
}

/**
 * 선택 모드 타입
 */
export type ClipSelectionMode =
  | 'current'
  | 'all'
  | 'custom'
  | 'odd'
  | 'even'
  | 'invert'

/**
 * 선택 모드에 따른 클립 선택
 */
export const applySelectionMode = (
  mode: ClipSelectionMode,
  clips: ClipItem[],
  currentSelection: Set<string>,
  activeClipId: string | null,
  customRange?: string
): Set<string> => {
  switch (mode) {
    case 'current':
      return selectCurrentClip(activeClipId)

    case 'all':
      return selectAllClips(clips)

    case 'custom':
      if (!customRange) return new Set()
      const indices = parseClipRange(customRange, clips.length)
      const ids = indicesToClipIds(indices, clips)
      return new Set(ids)

    case 'odd':
      return new Set(selectOddClips(clips))

    case 'even':
      return new Set(selectEvenClips(clips))

    case 'invert':
      const allIds = clips.map((c) => c.id)
      return invertSelection(allIds, currentSelection)

    default:
      return currentSelection
  }
}
