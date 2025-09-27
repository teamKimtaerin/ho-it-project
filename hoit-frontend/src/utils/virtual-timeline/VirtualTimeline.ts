/**
 * Virtual Timeline 관리 클래스
 * Cut edit 결과를 반영한 virtual time 계산 및 관리
 */

import { ClipItem } from '@/app/(route)/editor/types'
import { log } from '@/utils/logger'
import {
  VirtualTimeline,
  VirtualSegment,
  CutEditOperation,
  TimelineMapping,
  VirtualTimelineConfig,
  SplitOperation,
  DeleteOperation,
  MoveOperation,
} from './types'

export class VirtualTimelineManager {
  private timeline: VirtualTimeline
  private config: VirtualTimelineConfig
  private editHistory: CutEditOperation[] = []

  constructor(config: Partial<VirtualTimelineConfig> = {}) {
    this.config = {
      enableFramePrecision: true,
      frameRate: 30,
      bufferSize: 10,
      syncThreshold: 16.67, // ~60fps
      debugMode: false,
      ...config,
    }

    this.timeline = {
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      segments: [],
      clipOrder: [],
      lastUpdated: Date.now(),
    }

    log('VirtualTimelineManager', 'Initialized with config:', this.config)
  }

  /**
   * ClipItem 배열로부터 Virtual Timeline 초기화
   */
  initializeFromClips(clips: ClipItem[]): void {
    log('VirtualTimelineManager', `Initializing from ${clips.length} clips`)

    const segments: VirtualSegment[] = []
    let virtualTime = 0

    // 클립 순서대로 virtual 세그먼트 생성
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i]
      const duration = this.parseClipDuration(clip)

      // 실제 비디오 시간 계산 (첫 번째 단어 기준)
      const realStartTime = clip.words.length > 0 ? clip.words[0].start : 0
      const realEndTime =
        clip.words.length > 0
          ? clip.words[clip.words.length - 1].end
          : realStartTime + duration

      const segment: VirtualSegment = {
        id: `virtual_${clip.id}`,
        virtualStartTime: virtualTime,
        virtualEndTime: virtualTime + duration,
        realStartTime,
        realEndTime,
        sourceClipId: clip.id,
        isEnabled: true,
        type: 'normal',
      }

      segments.push(segment)
      virtualTime += duration
    }

    this.timeline = {
      currentTime: 0,
      duration: virtualTime,
      isPlaying: false,
      segments,
      clipOrder: clips.map((clip) => clip.id),
      lastUpdated: Date.now(),
    }

    log(
      'VirtualTimelineManager',
      `Timeline initialized: ${segments.length} segments, duration: ${virtualTime}s`
    )
  }

  /**
   * Virtual time을 Real time으로 변환
   */
  virtualToReal(virtualTime: number): TimelineMapping {
    // Virtual time이 범위를 벗어나는 경우
    if (virtualTime < 0 || virtualTime > this.timeline.duration) {
      return {
        isValid: false,
        virtualTime,
        realTime: 0,
        activeSegment: null,
        error: `Virtual time ${virtualTime} out of range [0, ${this.timeline.duration}]`,
      }
    }

    // 해당 virtual time에 활성화된 세그먼트 찾기
    const activeSegment = this.timeline.segments.find(
      (segment) =>
        segment.isEnabled &&
        virtualTime >= segment.virtualStartTime &&
        virtualTime < segment.virtualEndTime
    )

    if (!activeSegment) {
      return {
        isValid: false,
        virtualTime,
        realTime: 0,
        activeSegment: null,
        error: `No active segment found for virtual time ${virtualTime}`,
      }
    }

    // Virtual time을 세그먼트 내 상대 시간으로 변환
    const segmentRelativeTime = virtualTime - activeSegment.virtualStartTime
    const segmentDuration =
      activeSegment.virtualEndTime - activeSegment.virtualStartTime
    const realSegmentDuration =
      activeSegment.realEndTime - activeSegment.realStartTime

    // 세그먼트 내에서의 비율을 실제 시간에 적용
    const timeRatio =
      segmentDuration > 0 ? segmentRelativeTime / segmentDuration : 0
    const realTime =
      activeSegment.realStartTime + realSegmentDuration * timeRatio

    return {
      isValid: true,
      virtualTime,
      realTime,
      activeSegment,
    }
  }

  /**
   * Real time을 Virtual time으로 변환
   */
  realToVirtual(realTime: number): TimelineMapping {
    // 해당 real time을 포함하는 세그먼트 찾기
    const activeSegment = this.timeline.segments.find(
      (segment) =>
        segment.isEnabled &&
        realTime >= segment.realStartTime &&
        realTime <= segment.realEndTime
    )

    if (!activeSegment) {
      return {
        isValid: false,
        virtualTime: 0,
        realTime,
        activeSegment: null,
        error: `No active segment found for real time ${realTime}`,
      }
    }

    // Real time을 세그먼트 내 상대 시간으로 변환
    const realRelativeTime = realTime - activeSegment.realStartTime
    const realSegmentDuration =
      activeSegment.realEndTime - activeSegment.realStartTime
    const virtualSegmentDuration =
      activeSegment.virtualEndTime - activeSegment.virtualStartTime

    // 세그먼트 내에서의 비율을 virtual time에 적용
    const timeRatio =
      realSegmentDuration > 0 ? realRelativeTime / realSegmentDuration : 0
    const virtualTime =
      activeSegment.virtualStartTime + virtualSegmentDuration * timeRatio

    return {
      isValid: true,
      virtualTime,
      realTime,
      activeSegment,
    }
  }

  /**
   * 클립 분할 작업 적용
   */
  applySplitOperation(operation: SplitOperation): void {
    log(
      'VirtualTimelineManager',
      `Applying split operation: ${operation.targetClipId}`
    )

    const targetSegment = this.timeline.segments.find(
      (s) => s.sourceClipId === operation.targetClipId
    )
    if (!targetSegment) {
      throw new Error(`Target segment not found: ${operation.targetClipId}`)
    }

    // 분할 지점이 세그먼트 범위 내에 있는지 확인
    if (
      operation.splitPoint <= targetSegment.virtualStartTime ||
      operation.splitPoint >= targetSegment.virtualEndTime
    ) {
      throw new Error(
        `Split point ${operation.splitPoint} is outside segment range`
      )
    }

    // 원본 세그먼트를 두 개로 분할
    const splitRatio =
      (operation.splitPoint - targetSegment.virtualStartTime) /
      (targetSegment.virtualEndTime - targetSegment.virtualStartTime)

    const realSplitPoint =
      targetSegment.realStartTime +
      (targetSegment.realEndTime - targetSegment.realStartTime) * splitRatio

    // 첫 번째 분할 세그먼트
    const firstSegment: VirtualSegment = {
      ...targetSegment,
      id: `split_${operation.resultClipIds[0]}`,
      virtualEndTime: operation.splitPoint,
      realEndTime: realSplitPoint,
      sourceClipId: operation.resultClipIds[0],
      type: 'split',
    }

    // 두 번째 분할 세그먼트
    const secondSegment: VirtualSegment = {
      ...targetSegment,
      id: `split_${operation.resultClipIds[1]}`,
      virtualStartTime: operation.splitPoint,
      realStartTime: realSplitPoint,
      sourceClipId: operation.resultClipIds[1],
      type: 'split',
    }

    // 원본 세그먼트를 분할된 세그먼트들로 교체
    const segmentIndex = this.timeline.segments.findIndex(
      (s) => s.id === targetSegment.id
    )
    this.timeline.segments.splice(segmentIndex, 1, firstSegment, secondSegment)

    // 클립 순서 업데이트
    const clipIndex = this.timeline.clipOrder.findIndex(
      (id) => id === operation.targetClipId
    )
    this.timeline.clipOrder.splice(clipIndex, 1, ...operation.resultClipIds)

    this.editHistory.push(operation)
    this.timeline.lastUpdated = Date.now()
  }

  /**
   * 클립 삭제 작업 적용
   */
  applyDeleteOperation(operation: DeleteOperation): void {
    log(
      'VirtualTimelineManager',
      `Applying delete operation: ${operation.targetClipId}`
    )

    const targetSegment = this.timeline.segments.find(
      (s) => s.sourceClipId === operation.targetClipId
    )
    if (!targetSegment) {
      throw new Error(`Target segment not found: ${operation.targetClipId}`)
    }

    // 세그먼트를 비활성화 (실제로 제거하지 않음)
    targetSegment.isEnabled = false

    // Virtual timeline 재계산 (삭제된 세그먼트 제외)
    this.recalculateVirtualTimes()

    this.editHistory.push(operation)
    this.timeline.lastUpdated = Date.now()
  }

  /**
   * 클립 이동 작업 적용
   */
  applyMoveOperation(operation: MoveOperation): void {
    log(
      'VirtualTimelineManager',
      `Applying move operation: ${operation.targetClipId}`
    )

    // 클립 순서 변경
    const clipIndex = this.timeline.clipOrder.findIndex(
      (id) => id === operation.targetClipId
    )
    if (clipIndex === -1) {
      throw new Error(
        `Target clip not found in order: ${operation.targetClipId}`
      )
    }

    // 클립을 새 위치로 이동
    const [movedClip] = this.timeline.clipOrder.splice(clipIndex, 1)
    this.timeline.clipOrder.splice(operation.toPosition, 0, movedClip)

    // Virtual timeline 재계산
    this.recalculateVirtualTimes()

    this.editHistory.push(operation)
    this.timeline.lastUpdated = Date.now()
  }

  /**
   * Virtual timeline의 시간들을 재계산
   */
  private recalculateVirtualTimes(): void {
    let virtualTime = 0

    // 클립 순서에 따라 활성화된 세그먼트들의 virtual time 재계산
    for (const clipId of this.timeline.clipOrder) {
      const segment = this.timeline.segments.find(
        (s) => s.sourceClipId === clipId && s.isEnabled
      )

      if (segment) {
        const duration = segment.virtualEndTime - segment.virtualStartTime
        segment.virtualStartTime = virtualTime
        segment.virtualEndTime = virtualTime + duration
        virtualTime += duration
      }
    }

    this.timeline.duration = virtualTime
  }

  /**
   * 현재 virtual time에서 활성화된 세그먼트들 반환
   */
  getActiveSegments(
    virtualTime: number = this.timeline.currentTime
  ): VirtualSegment[] {
    return this.timeline.segments.filter(
      (segment) =>
        segment.isEnabled &&
        virtualTime >= segment.virtualStartTime &&
        virtualTime < segment.virtualEndTime
    )
  }

  /**
   * Timeline 상태 반환
   */
  getTimeline(): VirtualTimeline {
    return { ...this.timeline }
  }

  /**
   * Timeline 설정 업데이트
   */
  updateConfig(config: Partial<VirtualTimelineConfig>): void {
    this.config = { ...this.config, ...config }
    log('VirtualTimelineManager', 'Config updated:', this.config)
  }

  /**
   * Cut edit 히스토리 반환
   */
  getEditHistory(): CutEditOperation[] {
    return [...this.editHistory]
  }

  /**
   * 클립 duration 파싱 헬퍼
   */
  private parseClipDuration(clip: ClipItem): number {
    // duration 문자열에서 숫자 추출 (예: "1.283초" -> 1.283)
    const match = clip.duration.match(/(\d+\.?\d*)/)
    return match ? parseFloat(match[1]) : 0
  }

  /**
   * 디버그 정보 출력
   */
  debugInfo(): void {
    if (!this.config.debugMode) return

    console.group('VirtualTimeline Debug Info')
    console.log('Timeline:', this.timeline)
    console.log('Config:', this.config)
    console.log('Edit History:', this.editHistory)
    console.groupEnd()
  }
}
