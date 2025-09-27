import { ClipItem } from '@/app/(route)/editor/components/ClipComponent'
import { generateMergedClipId } from './clipIdGenerator'

// 넘버링에서 숫자를 파싱하는 함수
const parseNumbering = (timeline: string): number => {
  return parseInt(timeline, 10) || 0
}

// 숫자를 넘버링 형식으로 변환하는 함수
const numberToTimeline = (num: number): string => {
  return num.toString()
}

// duration 문자열에서 숫자 추출 (예: "1.283초" -> 1.283)
const parseDuration = (duration: string): number => {
  const match = duration.match(/(\d+\.?\d*)/)
  return match ? parseFloat(match[1]) : 0
}

// 숫자를 duration 형식으로 변환
const formatDuration = (seconds: number): string => {
  return `${seconds.toFixed(3)}초`
}

// 연속된 클립인지 확인하는 함수
export const areClipsConsecutive = (
  clips: ClipItem[],
  selectedIds: string[]
): boolean => {
  if (selectedIds.length < 2) return true

  // 클립 인덱스들을 정렬
  const indices = selectedIds
    .map((id) => clips.findIndex((clip) => clip.id === id))
    .filter((index) => index !== -1)
    .sort((a, b) => a - b)

  // 연속된 인덱스인지 확인
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) {
      return false
    }
  }
  return true
}

// 클립들을 합치는 함수
export const mergeClips = (
  clips: ClipItem[],
  selectedIds: string[]
): ClipItem => {
  if (selectedIds.length === 0) {
    throw new Error('선택된 클립이 없습니다.')
  }

  // 선택된 클립들을 원본 배열에서의 순서대로 정렬
  const selectedClips = selectedIds
    .map((id) => {
      const clip = clips.find((c) => c.id === id)
      const index = clips.findIndex((c) => c.id === id)
      return { clip, index }
    })
    .filter((item) => item.clip !== undefined)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.clip!) as ClipItem[]

  if (selectedClips.length === 0) {
    throw new Error('유효한 클립이 없습니다.')
  }

  // 첫 번째 클립
  const firstClip = selectedClips[0]
  const mergedId = generateMergedClipId()

  // 넘버링 계산 (첫 번째 클립의 번호 사용)
  const clipNumber = parseNumbering(firstClip.timeline)

  // duration 합산
  const totalDuration = selectedClips.reduce((sum, clip) => {
    return sum + parseDuration(clip.duration)
  }, 0)

  // 자막과 전체 텍스트 합치기
  const mergedSubtitle = selectedClips.map((clip) => clip.subtitle).join(' ')
  const mergedFullText = selectedClips.map((clip) => clip.fullText).join(' ')

  // words 합치기
  const mergedWords = selectedClips.flatMap((clip, clipIndex) => {
    return clip.words.map((word, wordIndex) => ({
      ...word,
      id: `${mergedId}_word_${clipIndex}_${wordIndex}`,
    }))
  })

  // 합쳐진 클립 생성
  const mergedClip: ClipItem = {
    id: mergedId,
    timeline: numberToTimeline(clipNumber),
    speaker: firstClip.speaker, // 첫 번째 클립의 speaker 사용
    subtitle: mergedSubtitle,
    fullText: mergedFullText,
    duration: formatDuration(totalDuration),
    thumbnail: firstClip.thumbnail, // 첫 번째 클립의 thumbnail 사용
    words: mergedWords,
    stickers: [],
  }

  return mergedClip
}

// 클립 목록의 넘버링을 재정렬하는 함수
const reorderClipNumbers = (clips: ClipItem[]): ClipItem[] => {
  return clips.map((clip, index) => ({
    ...clip,
    timeline: numberToTimeline(index + 1),
  }))
}

// 클립 목록에서 선택된 클립들을 합치고 새로운 목록을 반환하는 함수
export const mergeSelectedClips = (
  clips: ClipItem[],
  selectedIds: string[],
  checkedIds: string[]
): ClipItem[] => {
  // 선택된 클립 ID들 (클릭된 것 + 체크된 것)
  const allSelectedIds = Array.from(new Set([...selectedIds, ...checkedIds]))

  if (allSelectedIds.length === 0) {
    throw new Error('선택된 클립이 없습니다.')
  }

  // 연속성 확인
  if (!areClipsConsecutive(clips, allSelectedIds)) {
    throw new Error('선택된 클립들이 연속되어 있지 않습니다.')
  }

  // 클립들을 합치기
  const mergedClip = mergeClips(clips, allSelectedIds)

  // 선택된 클립들의 첫 번째 인덱스 찾기
  const firstSelectedIndex = Math.min(
    ...allSelectedIds
      .map((id) => clips.findIndex((clip) => clip.id === id))
      .filter((index) => index !== -1)
  )

  // 새로운 클립 목록 생성 (선택된 클립들을 합쳐진 클립으로 대체)
  const newClips = clips.filter((clip) => !allSelectedIds.includes(clip.id))
  newClips.splice(firstSelectedIndex, 0, mergedClip)

  // 넘버링 재정렬
  return reorderClipNumbers(newClips)
}
