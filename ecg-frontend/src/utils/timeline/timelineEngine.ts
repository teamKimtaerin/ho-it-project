/**
 * 타임라인 엔진 - 비파괴 편집 로직 처리
 */

import {
  TimelineClip,
  TrackType,
} from '@/app/(route)/editor/store/slices/timelineSlice'
import { ClipItem } from '@/app/(route)/editor/components/ClipComponent/types'

export interface ClipMapper {
  sourceClipId: string
  timelineClipId: string
  sourceClip: ClipItem
}

export class TimelineEngine {
  private clipMappers: Map<string, ClipMapper> = new Map()

  /**
   * 원본 클립들로부터 타임라인을 초기화
   */
  initializeFromClips(originalClips: ClipItem[]): TimelineClip[] {
    this.clipMappers.clear()

    const timelineClips: TimelineClip[] = []
    let currentTime = 0

    for (const [_index, originalClip] of originalClips.entries()) {
      // 클립의 실제 시작/끝 시간 계산
      const startTime =
        originalClip.words.length > 0
          ? originalClip.words[0].start
          : currentTime
      const endTime =
        originalClip.words.length > 0
          ? originalClip.words[originalClip.words.length - 1].end
          : startTime + 5 // 기본 5초

      const duration = Math.max(0.1, endTime - startTime) // 최소 0.1초

      const timelineClip: TimelineClip = {
        id: `timeline_${originalClip.id}`,
        sourceClipId: originalClip.id,
        inPoint: 0, // 원본 클립의 시작점
        outPoint: duration, // 원본 클립의 끝점
        startTime: startTime, // 타임라인상 위치
        duration: duration,
        track: 'subtitle',
        trackIndex: 0,
        enabled: true,
        locked: false,
        effects: [],
        transitions: [],
        volume: 1.0,
        opacity: 1.0,
      }

      timelineClips.push(timelineClip)

      // 매퍼 등록
      this.clipMappers.set(timelineClip.id, {
        sourceClipId: originalClip.id,
        timelineClipId: timelineClip.id,
        sourceClip: originalClip,
      })

      currentTime = endTime + 0.1 // 다음 클립을 위한 간격
    }

    return timelineClips
  }

  /**
   * 타임라인 클립을 원본 클립 시간으로 매핑
   */
  mapTimelineToSource(
    timelineClip: TimelineClip,
    timelineTime: number
  ): {
    sourceClipId: string
    sourceTime: number
    isValid: boolean
  } {
    // 타임라인 시간이 클립 범위 내에 있는지 확인
    if (
      timelineTime < timelineClip.startTime ||
      timelineTime > timelineClip.startTime + timelineClip.duration
    ) {
      return {
        sourceClipId: timelineClip.sourceClipId,
        sourceTime: 0,
        isValid: false,
      }
    }

    // 타임라인 시간을 클립 내 상대 시간으로 변환
    const relativeTime = timelineTime - timelineClip.startTime

    // 클립 내 상대 시간을 원본 클립 시간으로 매핑
    const sourceTime = timelineClip.inPoint + relativeTime

    return {
      sourceClipId: timelineClip.sourceClipId,
      sourceTime: sourceTime,
      isValid:
        sourceTime >= timelineClip.inPoint &&
        sourceTime <= timelineClip.outPoint,
    }
  }

  /**
   * 특정 타임라인 시간에서 활성 클립들 찾기
   */
  getActiveClipsAtTime(
    clips: TimelineClip[],
    time: number,
    track?: TrackType
  ): TimelineClip[] {
    return clips.filter((clip) => {
      const isInTimeRange =
        time >= clip.startTime && time < clip.startTime + clip.duration
      const isTrackMatch = !track || clip.track === track
      const isEnabled = clip.enabled

      return isInTimeRange && isTrackMatch && isEnabled
    })
  }

  /**
   * 클립을 분할
   */
  splitClip(
    clip: TimelineClip,
    splitTime: number
  ): [TimelineClip, TimelineClip] | null {
    // 분할 시간이 클립 범위 내에 있는지 확인
    if (
      splitTime <= clip.startTime ||
      splitTime >= clip.startTime + clip.duration
    ) {
      return null
    }

    const relativeTime = splitTime - clip.startTime

    // 첫 번째 클립 (분할 지점 이전)
    const firstClip: TimelineClip = {
      ...clip,
      id: `${clip.id}_split1_${Date.now()}`,
      outPoint: clip.inPoint + relativeTime,
      duration: relativeTime,
    }

    // 두 번째 클립 (분할 지점 이후)
    const secondClip: TimelineClip = {
      ...clip,
      id: `${clip.id}_split2_${Date.now()}`,
      inPoint: clip.inPoint + relativeTime,
      startTime: splitTime,
      duration: clip.duration - relativeTime,
    }

    return [firstClip, secondClip]
  }

  /**
   * 클립 트리밍 (In/Out 포인트 조정)
   */
  trimClip(
    clip: TimelineClip,
    newInPoint?: number,
    newOutPoint?: number
  ): TimelineClip {
    const inPoint =
      newInPoint !== undefined ? Math.max(0, newInPoint) : clip.inPoint
    const outPoint =
      newOutPoint !== undefined
        ? Math.max(inPoint + 0.1, newOutPoint)
        : clip.outPoint

    const duration = outPoint - inPoint

    return {
      ...clip,
      inPoint,
      outPoint,
      duration,
    }
  }

  /**
   * 클립들 간의 겹침 검사
   */
  findOverlappingClips(
    clips: TimelineClip[],
    trackType?: TrackType
  ): TimelineClip[][] {
    const overlapping: TimelineClip[][] = []

    // 같은 트랙의 클립들만 비교
    const trackedClips = trackType
      ? clips.filter((clip) => clip.track === trackType)
      : clips

    for (let i = 0; i < trackedClips.length; i++) {
      for (let j = i + 1; j < trackedClips.length; j++) {
        const clipA = trackedClips[i]
        const clipB = trackedClips[j]

        // 같은 트랙 인덱스이고 시간이 겹치는지 확인
        if (clipA.trackIndex === clipB.trackIndex) {
          const aStart = clipA.startTime
          const aEnd = clipA.startTime + clipA.duration
          const bStart = clipB.startTime
          const bEnd = clipB.startTime + clipB.duration

          // 겹침 검사
          if (aStart < bEnd && aEnd > bStart) {
            overlapping.push([clipA, clipB])
          }
        }
      }
    }

    return overlapping
  }

  /**
   * 리플 편집 - 클립을 이동할 때 후속 클립들도 함께 이동
   */
  rippleEdit(
    clips: TimelineClip[],
    clipId: string,
    newStartTime: number
  ): TimelineClip[] {
    const clipIndex = clips.findIndex((c) => c.id === clipId)
    if (clipIndex === -1) return clips

    const clip = clips[clipIndex]
    const timeDelta = newStartTime - clip.startTime

    if (timeDelta === 0) return clips

    const newClips = clips.map((c, index) => {
      if (index === clipIndex) {
        // 이동할 클립
        return { ...c, startTime: newStartTime }
      } else if (index > clipIndex && c.trackIndex === clip.trackIndex) {
        // 같은 트랙의 후속 클립들
        return { ...c, startTime: c.startTime + timeDelta }
      }
      return c
    })

    return newClips
  }

  /**
   * 삽입 편집 - 클립을 삽입하면 후속 클립들을 밀어냄
   */
  insertEdit(clips: TimelineClip[], insertClip: TimelineClip): TimelineClip[] {
    const _existingClips = clips.filter(
      (c) =>
        c.trackIndex === insertClip.trackIndex && c.track === insertClip.track
    )

    // 삽입 지점 이후의 클립들을 삽입될 클립의 길이만큼 뒤로 이동
    const adjustedClips = clips.map((clip) => {
      if (
        clip.trackIndex === insertClip.trackIndex &&
        clip.track === insertClip.track &&
        clip.startTime >= insertClip.startTime
      ) {
        return {
          ...clip,
          startTime: clip.startTime + insertClip.duration,
        }
      }
      return clip
    })

    return [...adjustedClips, insertClip]
  }

  /**
   * 덮어쓰기 편집 - 클립을 배치하면 겹치는 부분을 덮어씀
   */
  overwriteEdit(clips: TimelineClip[], newClip: TimelineClip): TimelineClip[] {
    const newStart = newClip.startTime
    const newEnd = newClip.startTime + newClip.duration

    // 겹치는 클립들을 찾고 처리
    const processedClips = clips.reduce<TimelineClip[]>((acc, clip) => {
      // 다른 트랙이면 그대로 추가
      if (
        clip.track !== newClip.track ||
        clip.trackIndex !== newClip.trackIndex
      ) {
        acc.push(clip)
        return acc
      }

      const clipStart = clip.startTime
      const clipEnd = clip.startTime + clip.duration

      // 완전히 겹치면 제거
      if (clipStart >= newStart && clipEnd <= newEnd) {
        return acc
      }

      // 부분적으로 겹치면 트리밍
      if (clipStart < newStart && clipEnd > newStart && clipEnd <= newEnd) {
        // 앞부분만 남김
        const trimmedDuration = newStart - clipStart
        acc.push({
          ...clip,
          outPoint: clip.inPoint + trimmedDuration,
          duration: trimmedDuration,
        })
      } else if (
        clipStart >= newStart &&
        clipStart < newEnd &&
        clipEnd > newEnd
      ) {
        // 뒷부분만 남김
        const trimmedInPoint = clip.inPoint + (newEnd - clipStart)
        const trimmedDuration = clipEnd - newEnd
        acc.push({
          ...clip,
          inPoint: trimmedInPoint,
          startTime: newEnd,
          duration: trimmedDuration,
        })
      } else if (clipStart < newStart && clipEnd > newEnd) {
        // 가운데 부분을 제거하고 두 개로 분할
        const firstClipDuration = newStart - clipStart
        const secondClipStart = newEnd
        const secondClipDuration = clipEnd - newEnd
        const secondClipInPoint = clip.inPoint + (newEnd - clipStart)

        acc.push({
          ...clip,
          id: `${clip.id}_split1_${Date.now()}`,
          outPoint: clip.inPoint + firstClipDuration,
          duration: firstClipDuration,
        })

        acc.push({
          ...clip,
          id: `${clip.id}_split2_${Date.now()}`,
          inPoint: secondClipInPoint,
          startTime: secondClipStart,
          duration: secondClipDuration,
        })
      } else {
        // 겹치지 않음
        acc.push(clip)
      }

      return acc
    }, [])

    // 새 클립 추가
    processedClips.push(newClip)

    return processedClips
  }

  /**
   * 타임라인의 전체 지속 시간 계산
   */
  calculateTotalDuration(clips: TimelineClip[]): number {
    if (clips.length === 0) return 0

    const maxEndTime = Math.max(
      ...clips.map((clip) => clip.startTime + clip.duration)
    )

    return Math.max(maxEndTime, 0)
  }

  /**
   * 클립 매퍼 정보 가져오기
   */
  getClipMapper(timelineClipId: string): ClipMapper | undefined {
    return this.clipMappers.get(timelineClipId)
  }

  /**
   * 모든 클립 매퍼 정보 가져오기
   */
  getAllClipMappers(): ClipMapper[] {
    return Array.from(this.clipMappers.values())
  }

  /**
   * 클립 매퍼 업데이트
   */
  updateClipMapper(timelineClipId: string, mapper: ClipMapper): void {
    this.clipMappers.set(timelineClipId, mapper)
  }
}

// 싱글톤 인스턴스
export const timelineEngine = new TimelineEngine()
