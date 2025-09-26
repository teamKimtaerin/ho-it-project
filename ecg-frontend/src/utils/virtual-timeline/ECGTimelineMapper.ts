/**
 * ECG Timeline Mapper
 * 기존 Cut Edit 시스템을 Virtual Timeline과 통합
 * VideoSegmentManager + PlaybackEngine 로직을 Virtual Timeline 기반으로 재구성
 */

import { ClipItem } from '@/app/(route)/editor/types'
import { log } from '@/utils/logger'
import { VirtualTimelineManager } from './VirtualTimeline'
import {
  VirtualSegment,
  TimelineMapping,
  SplitOperation,
  DeleteOperation,
  MoveOperation,
  VirtualFrameData,
} from './types'

// 기존 PlaybackEngine의 PlaybackSegment와 유사한 구조
export interface ECGPlaybackSegment {
  virtualStartTime: number
  virtualEndTime: number
  realStartTime: number
  realEndTime: number
  sourceClipId: string
  sourceClip: ClipItem
  isActive: boolean
}

export class ECGTimelineMapper {
  public readonly timelineManager: VirtualTimelineManager
  private originalClips: ClipItem[] = []
  private deletedClipIds: Set<string> = new Set()
  private splitClipMapping: Map<string, string[]> = new Map() // 원본 -> 분할된 클립들
  private wordMovements: Map<
    string,
    { fromClipId: string; toClipId: string; position: number }
  > = new Map()

  constructor(virtualTimeline: VirtualTimelineManager) {
    this.timelineManager = virtualTimeline
    log('ECGTimelineMapper', 'Initialized')
  }

  /**
   * 원본 클립들로 초기화
   */
  initialize(clips: ClipItem[]): void {
    log('ECGTimelineMapper', `Initializing with ${clips.length} clips`)

    this.originalClips = [...clips]
    this.timelineManager.initializeFromClips(clips)
  }

  /**
   * 기존 VideoSegmentManager의 deleteClip 기능을 Virtual Timeline으로 통합
   */
  deleteClip(clipId: string): void {
    log('ECGTimelineMapper', `Deleting clip: ${clipId}`)

    this.deletedClipIds.add(clipId)

    const deleteOperation: DeleteOperation = {
      id: `delete_${clipId}_${Date.now()}`,
      type: 'delete',
      targetClipId: clipId,
      timestamp: Date.now(),
      originalSegment: this.findSegmentByClipId(clipId)!,
    }

    this.timelineManager.applyDeleteOperation(deleteOperation)
  }

  /**
   * 기존 ClipSplitter의 splitClip 기능을 Virtual Timeline으로 통합
   */
  splitClip(clipId: string, splitVirtualTime: number): [string, string] {
    log(
      'ECGTimelineMapper',
      `Splitting clip ${clipId} at virtual time ${splitVirtualTime}`
    )

    const originalClip = this.originalClips.find((clip) => clip.id === clipId)
    if (!originalClip) {
      throw new Error(`Original clip not found: ${clipId}`)
    }

    // 새로운 클립 ID 생성 (기존 clipSplitter 방식과 유사)
    const timestamp = Date.now()
    const firstClipId = `${clipId}_split_1_${timestamp}`
    const secondClipId = `${clipId}_split_2_${timestamp}`

    // 분할 지점에서 단어 분할 계산
    const splitResult = this.calculateWordSplit(originalClip, splitVirtualTime)

    // 분할된 클립들 생성
    const firstClip = this.createSplitClip(
      originalClip,
      firstClipId,
      splitResult.firstWords
    )
    const secondClip = this.createSplitClip(
      originalClip,
      secondClipId,
      splitResult.secondWords
    )

    // 원본 클립 배열 업데이트
    const clipIndex = this.originalClips.findIndex((clip) => clip.id === clipId)
    this.originalClips.splice(clipIndex, 1, firstClip, secondClip)

    // 분할 매핑 저장
    this.splitClipMapping.set(clipId, [firstClipId, secondClipId])

    // Virtual Timeline에 분할 작업 적용
    const splitOperation: SplitOperation = {
      id: `split_${clipId}_${timestamp}`,
      type: 'split',
      targetClipId: clipId,
      timestamp,
      splitPoint: splitVirtualTime,
      resultClipIds: [firstClipId, secondClipId],
    }

    this.timelineManager.applySplitOperation(splitOperation)

    return [firstClipId, secondClipId]
  }

  /**
   * 클립 순서 변경 (기존 TimelineSlice의 reorderTimelineClips와 유사)
   */
  reorderClips(newOrder: string[]): void {
    log('ECGTimelineMapper', `Reordering clips to: ${newOrder.join(', ')}`)

    // 각 클립의 이동을 MoveOperation으로 변환
    const currentOrder = this.getCurrentClipOrder()

    for (let newIndex = 0; newIndex < newOrder.length; newIndex++) {
      const clipId = newOrder[newIndex]
      const currentIndex = currentOrder.findIndex((id) => id === clipId)

      if (currentIndex !== newIndex) {
        const moveOperation: MoveOperation = {
          id: `move_${clipId}_${Date.now()}`,
          type: 'move',
          targetClipId: clipId,
          timestamp: Date.now(),
          fromPosition: currentIndex,
          toPosition: newIndex,
        }

        this.timelineManager.applyMoveOperation(moveOperation)
      }
    }
  }

  /**
   * Word-level 이동 (기존 WordDragAndDrop 기능 통합)
   */
  moveWordBetweenClips(
    wordId: string,
    sourceClipId: string,
    targetClipId: string,
    targetPosition: number
  ): void {
    log(
      'ECGTimelineMapper',
      `Moving word ${wordId} from ${sourceClipId} to ${targetClipId}`
    )

    // Word 이동 기록
    this.wordMovements.set(wordId, {
      fromClipId: sourceClipId,
      toClipId: targetClipId,
      position: targetPosition,
    })

    // Virtual Timeline 재계산 트리거
    // 실제 ClipItem 업데이트는 기존 clipSlice의 moveWordBetweenClips 사용
    this.refreshVirtualTimeline()
  }

  /**
   * Virtual time을 Real video time으로 변환
   */
  toReal(virtualTime: number): TimelineMapping {
    return this.timelineManager.virtualToReal(virtualTime)
  }

  /**
   * Real video time을 Virtual time으로 변환
   */
  toVirtual(realTime: number): TimelineMapping {
    return this.timelineManager.realToVirtual(realTime)
  }

  /**
   * 현재 Virtual time에서 활성화된 재생 세그먼트들 반환
   */
  getActivePlaybackSegments(virtualTime: number): ECGPlaybackSegment[] {
    const activeSegments = this.timelineManager.getActiveSegments(virtualTime)

    return activeSegments.map((segment) => ({
      virtualStartTime: segment.virtualStartTime,
      virtualEndTime: segment.virtualEndTime,
      realStartTime: segment.realStartTime,
      realEndTime: segment.realEndTime,
      sourceClipId: segment.sourceClipId,
      sourceClip: this.findClipById(segment.sourceClipId)!,
      isActive: true,
    }))
  }

  /**
   * Virtual Frame 데이터 생성 (RVFC 콜백에서 사용)
   */
  createVirtualFrameData(
    virtualTime: number,
    mediaTime: number,
    displayTime: DOMHighResTimeStamp
  ): VirtualFrameData {
    const activeSegments = this.timelineManager.getActiveSegments(virtualTime)

    return {
      virtualTime,
      mediaTime,
      displayTime,
      activeSegments,
    }
  }

  /**
   * 현재 클립 순서 반환
   */
  getCurrentClipOrder(): string[] {
    return this.timelineManager.getTimeline().clipOrder
  }

  /**
   * 삭제된 클립 복원
   */
  restoreClip(clipId: string): void {
    if (!this.deletedClipIds.has(clipId)) {
      return
    }

    log('ECGTimelineMapper', `Restoring clip: ${clipId}`)
    this.deletedClipIds.delete(clipId)

    // Virtual Timeline에서 세그먼트 재활성화
    const timeline = this.timelineManager.getTimeline()
    const segment = timeline.segments.find((s) => s.sourceClipId === clipId)

    if (segment) {
      segment.isEnabled = true
      this.refreshVirtualTimeline()
    }
  }

  /**
   * Export용 재생 세그먼트 목록 생성 (기존 PlaybackEngine과 유사)
   */
  generateExportSegments(): ECGPlaybackSegment[] {
    const timeline = this.timelineManager.getTimeline()
    const segments: ECGPlaybackSegment[] = []

    // 활성화된 세그먼트들만 시간순으로 정렬
    const activeSegments = timeline.segments
      .filter((segment) => segment.isEnabled)
      .sort((a, b) => a.virtualStartTime - b.virtualStartTime)

    for (const segment of activeSegments) {
      const sourceClip = this.findClipById(segment.sourceClipId)
      if (sourceClip) {
        segments.push({
          virtualStartTime: segment.virtualStartTime,
          virtualEndTime: segment.virtualEndTime,
          realStartTime: segment.realStartTime,
          realEndTime: segment.realEndTime,
          sourceClipId: segment.sourceClipId,
          sourceClip,
          isActive: true,
        })
      }
    }

    return segments
  }

  /**
   * 현재 상태 디버깅 정보
   */
  getDebugInfo(): object {
    return {
      originalClips: this.originalClips.length,
      deletedClips: Array.from(this.deletedClipIds),
      splitMappings: Object.fromEntries(this.splitClipMapping),
      wordMovements: Object.fromEntries(this.wordMovements),
      virtualTimeline: this.timelineManager.getTimeline(),
    }
  }

  // Private helper methods

  private findSegmentByClipId(clipId: string): VirtualSegment | null {
    const timeline = this.timelineManager.getTimeline()
    return timeline.segments.find((s) => s.sourceClipId === clipId) || null
  }

  private findClipById(clipId: string): ClipItem | null {
    return this.originalClips.find((clip) => clip.id === clipId) || null
  }

  private calculateWordSplit(
    clip: ClipItem,
    splitVirtualTime: number
  ): {
    firstWords: typeof clip.words
    secondWords: typeof clip.words
  } {
    // Virtual time에 해당하는 단어 위치 찾기
    const mapping = this.toReal(splitVirtualTime)
    if (!mapping.isValid) {
      throw new Error(`Invalid split time: ${splitVirtualTime}`)
    }

    // 실제 시간 기준으로 단어 분할점 찾기
    const splitRealTime = mapping.realTime
    const splitIndex = clip.words.findIndex((word) => word.end > splitRealTime)

    if (splitIndex === -1) {
      // 모든 단어가 분할점 이전인 경우
      return {
        firstWords: clip.words,
        secondWords: [],
      }
    }

    return {
      firstWords: clip.words.slice(0, splitIndex),
      secondWords: clip.words.slice(splitIndex),
    }
  }

  private createSplitClip(
    originalClip: ClipItem,
    newClipId: string,
    words: typeof originalClip.words
  ): ClipItem {
    const subtitle = words.map((word) => word.text).join(' ')
    const duration =
      words.length > 0 ? words[words.length - 1].end - words[0].start : 0

    // Word ID 업데이트
    const updatedWords = words.map((word, index) => ({
      ...word,
      id: `${newClipId}_word_${index}`,
    }))

    return {
      id: newClipId,
      timeline: originalClip.timeline, // 임시, 나중에 재정렬됨
      speaker: originalClip.speaker,
      subtitle,
      fullText: subtitle,
      duration: `${duration.toFixed(3)}초`,
      thumbnail: originalClip.thumbnail,
      words: updatedWords,
      stickers: [],
    }
  }

  private refreshVirtualTimeline(): void {
    // 현재 클립 상태로 Virtual Timeline 재초기화
    this.timelineManager.initializeFromClips(this.originalClips)
  }
}
