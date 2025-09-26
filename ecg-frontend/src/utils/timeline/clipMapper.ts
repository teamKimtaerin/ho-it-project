/**
 * 클립 매퍼 - 타임라인 클립과 원본 클립 간의 매핑 관리
 */

import { TimelineClip } from '@/app/(route)/editor/store/slices/timelineSlice'
import {
  ClipItem,
  Word,
} from '@/app/(route)/editor/components/ClipComponent/types'

export interface WordMapping {
  originalWord: Word
  timelineStartTime: number
  timelineEndTime: number
  sourceStartTime: number
  sourceEndTime: number
}

export interface ClipMapping {
  timelineClip: TimelineClip
  sourceClip: ClipItem
  wordMappings: WordMapping[]
}

export class ClipMapper {
  private mappings: Map<string, ClipMapping> = new Map()

  /**
   * 클립 매핑 생성
   */
  createMapping(timelineClip: TimelineClip, sourceClip: ClipItem): ClipMapping {
    const wordMappings = this.createWordMappings(timelineClip, sourceClip)

    const mapping: ClipMapping = {
      timelineClip,
      sourceClip,
      wordMappings,
    }

    this.mappings.set(timelineClip.id, mapping)
    return mapping
  }

  /**
   * 단어 레벨 매핑 생성
   */
  private createWordMappings(
    timelineClip: TimelineClip,
    sourceClip: ClipItem
  ): WordMapping[] {
    if (!sourceClip.words || sourceClip.words.length === 0) {
      return []
    }

    const wordMappings: WordMapping[] = []
    const clipDuration = timelineClip.outPoint - timelineClip.inPoint
    const sourceDuration =
      sourceClip.words[sourceClip.words.length - 1].end -
      sourceClip.words[0].start

    // 시간 스케일 계산 (타임라인 클립이 원본과 다른 재생 속도를 가질 수 있음)
    const timeScale = sourceDuration > 0 ? clipDuration / sourceDuration : 1

    for (const word of sourceClip.words) {
      // 원본 클립 내에서의 상대 시간
      const wordRelativeStart = word.start - sourceClip.words[0].start
      const wordRelativeEnd = word.end - sourceClip.words[0].start

      // 클립의 inPoint/outPoint 범위 내에 있는지 확인
      if (
        wordRelativeStart >= timelineClip.inPoint &&
        wordRelativeStart < timelineClip.outPoint
      ) {
        // 타임라인에서의 절대 시간 계산
        const timelineWordStart =
          timelineClip.startTime +
          (wordRelativeStart - timelineClip.inPoint) * timeScale
        const timelineWordEnd =
          timelineClip.startTime +
          (Math.min(wordRelativeEnd, timelineClip.outPoint) -
            timelineClip.inPoint) *
            timeScale

        const wordMapping: WordMapping = {
          originalWord: word,
          timelineStartTime: timelineWordStart,
          timelineEndTime: timelineWordEnd,
          sourceStartTime: word.start,
          sourceEndTime: word.end,
        }

        wordMappings.push(wordMapping)
      }
    }

    return wordMappings
  }

  /**
   * 매핑 가져오기
   */
  getMapping(timelineClipId: string): ClipMapping | undefined {
    return this.mappings.get(timelineClipId)
  }

  /**
   * 모든 매핑 가져오기
   */
  getAllMappings(): ClipMapping[] {
    return Array.from(this.mappings.values())
  }

  /**
   * 특정 타임라인 시간에서 활성 단어들 찾기
   */
  getActiveWordsAtTime(timelineTime: number): WordMapping[] {
    const activeWords: WordMapping[] = []

    for (const mapping of this.mappings.values()) {
      for (const wordMapping of mapping.wordMappings) {
        if (
          timelineTime >= wordMapping.timelineStartTime &&
          timelineTime < wordMapping.timelineEndTime
        ) {
          activeWords.push(wordMapping)
        }
      }
    }

    return activeWords
  }

  /**
   * 타임라인 시간을 소스 클립 시간으로 변환
   */
  timelineToSourceTime(
    timelineClipId: string,
    timelineTime: number
  ): number | null {
    const mapping = this.mappings.get(timelineClipId)
    if (!mapping) return null

    const clip = mapping.timelineClip

    // 타임라인 시간이 클립 범위 내에 있는지 확인
    if (
      timelineTime < clip.startTime ||
      timelineTime >= clip.startTime + clip.duration
    ) {
      return null
    }

    // 클립 내 상대 시간 계산
    const relativeTime = timelineTime - clip.startTime

    // 소스 시간으로 변환
    const sourceTime = clip.inPoint + relativeTime

    return sourceTime
  }

  /**
   * 소스 클립 시간을 타임라인 시간으로 변환
   */
  sourceToTimelineTime(
    timelineClipId: string,
    sourceTime: number
  ): number | null {
    const mapping = this.mappings.get(timelineClipId)
    if (!mapping) return null

    const clip = mapping.timelineClip

    // 소스 시간이 클립의 inPoint/outPoint 범위 내에 있는지 확인
    if (sourceTime < clip.inPoint || sourceTime >= clip.outPoint) {
      return null
    }

    // 클립 내 상대 시간 계산
    const relativeTime = sourceTime - clip.inPoint

    // 타임라인 시간으로 변환
    const timelineTime = clip.startTime + relativeTime

    return timelineTime
  }

  /**
   * 특정 단어의 타임라인 시간 범위 가져오기
   */
  getWordTimelineRange(wordId: string): { start: number; end: number } | null {
    for (const mapping of this.mappings.values()) {
      for (const wordMapping of mapping.wordMappings) {
        if (wordMapping.originalWord.id === wordId) {
          return {
            start: wordMapping.timelineStartTime,
            end: wordMapping.timelineEndTime,
          }
        }
      }
    }
    return null
  }

  /**
   * 클립의 표시 텍스트 가져오기 (시간 범위에 따른)
   */
  getClipDisplayText(
    timelineClipId: string,
    startTime?: number,
    endTime?: number
  ): string {
    const mapping = this.mappings.get(timelineClipId)
    if (!mapping) return ''

    let relevantWords = mapping.wordMappings

    // 시간 범위가 지정된 경우 필터링
    if (startTime !== undefined || endTime !== undefined) {
      relevantWords = mapping.wordMappings.filter((wordMapping) => {
        const wordStart = wordMapping.timelineStartTime
        const wordEnd = wordMapping.timelineEndTime

        const afterStart = startTime === undefined || wordEnd > startTime
        const beforeEnd = endTime === undefined || wordStart < endTime

        return afterStart && beforeEnd
      })
    }

    return relevantWords
      .map((wordMapping) => wordMapping.originalWord.text)
      .join(' ')
  }

  /**
   * 매핑 업데이트 (클립이 편집된 경우)
   */
  updateMapping(
    timelineClipId: string,
    updatedTimelineClip: TimelineClip
  ): void {
    const existingMapping = this.mappings.get(timelineClipId)
    if (!existingMapping) return

    // 새로운 매핑 생성
    const newMapping = this.createMapping(
      updatedTimelineClip,
      existingMapping.sourceClip
    )
    this.mappings.set(timelineClipId, newMapping)
  }

  /**
   * 매핑 제거
   */
  removeMapping(timelineClipId: string): void {
    this.mappings.delete(timelineClipId)
  }

  /**
   * 모든 매핑 제거
   */
  clearMappings(): void {
    this.mappings.clear()
  }

  /**
   * 매핑 통계 정보
   */
  getMappingStats(): {
    totalClips: number
    totalWords: number
    averageWordsPerClip: number
  } {
    const mappings = Array.from(this.mappings.values())
    const totalClips = mappings.length
    const totalWords = mappings.reduce(
      (sum, mapping) => sum + mapping.wordMappings.length,
      0
    )
    const averageWordsPerClip = totalClips > 0 ? totalWords / totalClips : 0

    return {
      totalClips,
      totalWords,
      averageWordsPerClip,
    }
  }

  /**
   * 디버깅용 매핑 정보 출력
   */
  debugMapping(timelineClipId: string): void {
    const mapping = this.mappings.get(timelineClipId)
    if (!mapping) {
      console.log(`No mapping found for clip: ${timelineClipId}`)
      return
    }

    console.log('=== Clip Mapping Debug ===')
    console.log('Timeline Clip:', mapping.timelineClip)
    console.log(
      'Source Clip:',
      mapping.sourceClip.id,
      mapping.sourceClip.fullText
    )
    console.log('Word Mappings:')

    mapping.wordMappings.forEach((wordMapping, index) => {
      console.log(`  ${index}: "${wordMapping.originalWord.text}"`)
      console.log(
        `    Timeline: ${wordMapping.timelineStartTime.toFixed(2)}s - ${wordMapping.timelineEndTime.toFixed(2)}s`
      )
      console.log(
        `    Source: ${wordMapping.sourceStartTime.toFixed(2)}s - ${wordMapping.sourceEndTime.toFixed(2)}s`
      )
    })
  }
}

// 싱글톤 인스턴스
export const clipMapper = new ClipMapper()
