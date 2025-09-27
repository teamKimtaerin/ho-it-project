import { ClipItem } from '@/app/(route)/editor/types'
import { getSpeakerColorByIndex } from '@/utils/editor/speakerColors'

/**
 * 클립에서 실제 사용된 화자들을 추출합니다
 */
export function extractSpeakersFromClips(clips: ClipItem[]): string[] {
  const speakerSet = new Set<string>()

  clips.forEach((clip) => {
    if (clip.speaker && clip.speaker.trim() !== '') {
      speakerSet.add(clip.speaker.trim())
    }
  })

  // 화자 이름 순서로 정렬 (화자1, 화자2, ... 순서)
  const speakers = Array.from(speakerSet).sort((a, b) => {
    // "화자X" 패턴인 경우 숫자로 정렬
    const aMatch = a.match(/^화자(\d+)$/)
    const bMatch = b.match(/^화자(\d+)$/)

    if (aMatch && bMatch) {
      return parseInt(aMatch[1]) - parseInt(bMatch[1])
    }

    // 그 외의 경우 문자열 정렬
    return a.localeCompare(b)
  })

  return speakers
}

/**
 * 화자 목록을 정규화하고 색상을 자동 할당합니다
 */
export function normalizeSpeakerList(speakers: string[]): {
  speakers: string[]
  colors: Record<string, string>
} {
  // 중복 제거 및 빈 문자열 필터링
  const uniqueSpeakers = Array.from(
    new Set(speakers.filter((speaker) => speaker && speaker.trim() !== ''))
  )

  // 정렬
  const sortedSpeakers = uniqueSpeakers.sort((a, b) => {
    const aMatch = a.match(/^화자(\d+)$/)
    const bMatch = b.match(/^화자(\d+)$/)

    if (aMatch && bMatch) {
      return parseInt(aMatch[1]) - parseInt(bMatch[1])
    }

    return a.localeCompare(b)
  })

  // 색상 자동 할당
  const colors: Record<string, string> = {}
  sortedSpeakers.forEach((speaker, index) => {
    colors[speaker] = getSpeakerColorByIndex(index)
  })

  return {
    speakers: sortedSpeakers,
    colors,
  }
}

/**
 * 최소 1명의 기본 화자를 보장합니다
 */
export function ensureMinimumSpeakers(speakers: string[]): string[] {
  if (speakers.length === 0) {
    return ['화자1']
  }

  return speakers
}

/**
 * 화자 목록에서 사용 가능한 다음 화자 번호를 찾습니다
 */
export function getNextSpeakerNumber(existingSpeakers: string[]): number {
  const existingNumbers = existingSpeakers
    .map((speaker) => {
      const match = speaker.match(/^화자(\d+)$/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter((num) => num > 0)

  let nextNumber = 1
  while (existingNumbers.includes(nextNumber)) {
    nextNumber++
  }

  return nextNumber
}

/**
 * 클립들의 화자 정보를 분석하여 통계를 반환합니다
 */
export function analyzeSpeakerUsage(clips: ClipItem[]): Record<
  string,
  {
    clipCount: number
    wordCount: number
    totalDuration: number
  }
> {
  const stats: Record<
    string,
    {
      clipCount: number
      wordCount: number
      totalDuration: number
    }
  > = {}

  clips.forEach((clip) => {
    const speaker = clip.speaker || 'Unknown'

    if (!stats[speaker]) {
      stats[speaker] = {
        clipCount: 0,
        wordCount: 0,
        totalDuration: 0,
      }
    }

    stats[speaker].clipCount++
    stats[speaker].wordCount += clip.words.length

    // 클립 지속 시간 계산 (단어들의 시작~끝 시간)
    if (clip.words.length > 0) {
      const firstWord = clip.words[0]
      const lastWord = clip.words[clip.words.length - 1]
      const duration = lastWord.end - firstWord.start
      stats[speaker].totalDuration += duration
    }
  })

  return stats
}

/**
 * ML 분석 결과에서 화자 매핑을 정규화합니다
 */
export function normalizeSpeakerMapping(
  speakerMapping?: Record<string, string>
): Record<string, string> {
  if (!speakerMapping) {
    return {}
  }

  // 매핑 값들을 정규화
  const normalizedMapping: Record<string, string> = {}

  Object.entries(speakerMapping).forEach(([originalId, mappedName]) => {
    if (originalId && mappedName) {
      normalizedMapping[originalId.trim()] = mappedName.trim()
    }
  })

  return normalizedMapping
}

/**
 * 화자 정보가 없는 클립들을 찾습니다
 */
export function findUnassignedClips(clips: ClipItem[]): ClipItem[] {
  return clips.filter(
    (clip) =>
      !clip.speaker || clip.speaker.trim() === '' || clip.speaker === 'Unknown'
  )
}

/**
 * 화자 이름의 유효성을 검사합니다
 */
export function validateSpeakerName(
  name: string,
  existingSpeakers: string[]
): {
  isValid: boolean
  error?: string
} {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return { isValid: false, error: '화자 이름을 입력해주세요.' }
  }

  if (trimmedName.length > 20) {
    return { isValid: false, error: '화자 이름은 20자 이하로 입력해주세요.' }
  }

  if (existingSpeakers.includes(trimmedName)) {
    return { isValid: false, error: '이미 존재하는 화자명입니다.' }
  }

  // 특수문자 제한 (한글, 영문, 숫자만 허용)
  const invalidChars = /[^\w가-힣\s]/
  if (invalidChars.test(trimmedName)) {
    return { isValid: false, error: '한글, 영문, 숫자만 사용할 수 있습니다.' }
  }

  return { isValid: true }
}

/**
 * 두 화자 목록을 병합하고 중복을 제거합니다
 */
export function mergeSpeakerLists(list1: string[], list2: string[]): string[] {
  const combined = [...list1, ...list2]
  const { speakers } = normalizeSpeakerList(combined)
  return speakers
}
