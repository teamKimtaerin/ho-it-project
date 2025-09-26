import { ClipItem, Word } from '@/app/(route)/editor/types'
import { generateSplitClipId } from './clipIdGenerator'

// duration 문자열에서 숫자 추출 (예: "1.283초" -> 1.283) - currently unused but kept for future use
// const parseDuration = (duration: string): number => {
//   const match = duration.match(/(\d+\.?\d*)/)
//   return match ? parseFloat(match[1]) : 0
// }

// 숫자를 duration 형식으로 변환
const formatDuration = (seconds: number): string => {
  return `${seconds.toFixed(3)}초`
}

// 넘버링에서 숫자를 파싱하는 함수
const parseNumbering = (timeline: string): number => {
  return parseInt(timeline, 10) || 0
}

// 숫자를 넘버링 형식으로 변환하는 함수
const numberToTimeline = (num: number): string => {
  return num.toString()
}

// Words 배열을 절반으로 나누는 함수
const splitWordsArray = (words: Word[]): [Word[], Word[]] => {
  if (words.length <= 1) {
    throw new Error('단어가 2개 이상이어야 나눌 수 있습니다.')
  }

  const midIndex = Math.ceil(words.length / 2)
  const firstHalf = words.slice(0, midIndex)
  const secondHalf = words.slice(midIndex)

  return [firstHalf, secondHalf]
}

// Words 배열에서 텍스트와 duration을 계산하는 함수
const calculateClipData = (words: Word[]) => {
  const subtitle = words.map((word) => word.text).join(' ')
  const fullText = subtitle

  if (words.length === 0) {
    return { subtitle, fullText, duration: 0 }
  }

  const startTime = words[0].start
  const endTime = words[words.length - 1].end
  const duration = endTime - startTime

  return { subtitle, fullText, duration }
}

// 클립을 두 개로 나누는 함수
export const splitClip = (clip: ClipItem): [ClipItem, ClipItem] => {
  if (clip.words.length <= 1) {
    throw new Error(
      `클립 "${clip.subtitle}"은 단어가 2개 이상이어야 나눌 수 있습니다.`
    )
  }

  // Words 배열을 절반으로 나누기
  const [firstWords, secondWords] = splitWordsArray(clip.words)

  // 각 클립의 데이터 계산
  const firstClipData = calculateClipData(firstWords)
  const secondClipData = calculateClipData(secondWords)

  // 새로운 ID 생성
  const firstClipId = generateSplitClipId(clip.id, 1)
  const secondClipId = generateSplitClipId(clip.id, 2)

  // 원본 클립의 넘버링 파싱
  const clipNumber = parseNumbering(clip.timeline)

  // Words 배열의 ID 업데이트
  const updatedFirstWords = firstWords.map((word, index) => ({
    ...word,
    id: `${firstClipId}_word_${index}`,
  }))

  const updatedSecondWords = secondWords.map((word, index) => ({
    ...word,
    id: `${secondClipId}_word_${index}`,
  }))

  // 첫 번째 클립 생성 (원본의 타임라인 유지)
  const firstClip: ClipItem = {
    id: firstClipId,
    timeline: numberToTimeline(clipNumber),
    speaker: clip.speaker,
    subtitle: firstClipData.subtitle,
    fullText: firstClipData.fullText,
    duration: formatDuration(firstClipData.duration),
    thumbnail: clip.thumbnail,
    words: updatedFirstWords,
    stickers: [],
  }

  // 두 번째 클립 생성 (다음 넘버링)
  const secondClip: ClipItem = {
    id: secondClipId,
    timeline: numberToTimeline(clipNumber + 1), // 임시 넘버링, 나중에 재정렬됨
    speaker: clip.speaker,
    subtitle: secondClipData.subtitle,
    fullText: secondClipData.fullText,
    duration: formatDuration(secondClipData.duration),
    thumbnail: clip.thumbnail,
    words: updatedSecondWords,
    stickers: [],
  }

  return [firstClip, secondClip]
}

// 클립 목록의 넘버링을 재정렬하는 함수
const reorderClipNumbers = (clips: ClipItem[]): ClipItem[] => {
  return clips.map((clip, index) => ({
    ...clip,
    timeline: numberToTimeline(index + 1),
  }))
}

// 클립 목록에서 특정 클립을 나누고 새로운 목록을 반환하는 함수
export const splitSelectedClip = (
  clips: ClipItem[],
  clipId: string
): ClipItem[] => {
  // 대상 클립 찾기
  const clipIndex = clips.findIndex((clip) => clip.id === clipId)
  if (clipIndex === -1) {
    throw new Error('나눌 클립을 찾을 수 없습니다.')
  }

  const targetClip = clips[clipIndex]

  // 클립 나누기
  const [firstClip, secondClip] = splitClip(targetClip)

  // 새로운 클립 목록 생성 (원본 클립을 나눠진 2개 클립으로 대체)
  const newClips = [...clips]
  newClips.splice(clipIndex, 1, firstClip, secondClip)

  // 넘버링 재정렬
  return reorderClipNumbers(newClips)
}
