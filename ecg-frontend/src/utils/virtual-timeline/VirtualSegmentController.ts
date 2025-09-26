/**
 * Virtual Segment Controller
 * 세그먼트 간 이동과 경계 처리를 전담하는 컨트롤러
 * 무한 반복 문제를 해결하고 정확한 세그먼트 제어를 제공
 */

import { log } from '@/utils/logger'
import { VirtualTimeline, VirtualSegment } from './types'

export interface SegmentControllerConfig {
  boundaryThreshold: number // 세그먼트 경계 감지 임계값 (초)
  debounceTime: number // 세그먼트 이동 후 디바운싱 시간 (ms)
  debugMode: boolean
}

export interface SegmentTransition {
  fromSegment: VirtualSegment | null
  toSegment: VirtualSegment | null
  transitionTime: number
  isLastSegment: boolean
}

export type SegmentTransitionCallback = (transition: SegmentTransition) => void
export type PlaybackCompleteCallback = () => void

export class VirtualSegmentController {
  private config: SegmentControllerConfig
  private timeline: VirtualTimeline | null = null

  // 현재 상태 추적
  private currentSegment: VirtualSegment | null = null
  private lastTransitionTime: number = 0
  private isTransitioning: boolean = false
  private debounceTimeoutId: NodeJS.Timeout | null = null

  // 콜백들
  private transitionCallbacks: Set<SegmentTransitionCallback> = new Set()
  private completeCallbacks: Set<PlaybackCompleteCallback> = new Set()

  constructor(config: Partial<SegmentControllerConfig> = {}) {
    this.config = {
      boundaryThreshold: 0.05, // 50ms
      debounceTime: 100, // 100ms
      debugMode: false,
      ...config,
    }

    if (this.config.debugMode) {
      log('VirtualSegmentController', 'Initialized with config:', this.config)
    }
  }

  /**
   * 타임라인 설정
   */
  setTimeline(timeline: VirtualTimeline): void {
    this.timeline = timeline
    this.currentSegment = null
    this.isTransitioning = false
    this.lastTransitionTime = 0

    if (this.config.debugMode) {
      log(
        'VirtualSegmentController',
        `Timeline set with ${timeline.segments.filter((s) => s.isEnabled).length} active segments`
      )
    }
  }

  /**
   * 현재 실시간 위치에서 세그먼트 정보 반환 (자동 점프 로직 제거)
   * @param _realTime 현재 실제 비디오 시간 (더 이상 사용되지 않음, 호환성을 위해 유지)
   * @returns 항상 needsTransition: false 반환 (가상 시간 기반 제어로 변경됨)
   */
  processCurrentTime(_realTime: number): {
    needsTransition: boolean
    targetTime?: number
    isPlaybackComplete?: boolean
  } {
    // 새로운 연속적 가상 시간 모델에서는 VirtualSegmentController가
    // 자동 점프를 하지 않고 VirtualPlayerController가 모든 제어를 담당
    return { needsTransition: false }
  }

  /**
   * 현재 실시간 위치에서 활성 세그먼트 찾기
   */
  private findActiveSegment(realTime: number): VirtualSegment | null {
    if (!this.timeline) return null

    return (
      this.timeline.segments.find(
        (segment) =>
          segment.isEnabled &&
          realTime >= segment.realStartTime &&
          realTime <= segment.realEndTime
      ) || null
    )
  }

  /**
   * 세그먼트 변경 처리
   */
  private handleSegmentChange(
    realTime: number,
    newSegment: VirtualSegment | null
  ): {
    needsTransition: boolean
    targetTime?: number
    isPlaybackComplete?: boolean
  } {
    const previousSegment = this.currentSegment
    this.currentSegment = newSegment

    const transition: SegmentTransition = {
      fromSegment: previousSegment,
      toSegment: newSegment,
      transitionTime: realTime,
      isLastSegment: this.isLastActiveSegment(newSegment),
    }

    this.notifyTransition(transition)

    if (this.config.debugMode) {
      log(
        'VirtualSegmentController',
        `Segment changed: ${previousSegment?.id || 'none'} → ${newSegment?.id || 'none'}`
      )
    }

    return { needsTransition: false }
  }

  /**
   * 현재 세그먼트 내에서 경계 체크
   */
  private checkSegmentBoundary(
    realTime: number,
    segment: VirtualSegment
  ): {
    needsTransition: boolean
    targetTime?: number
    isPlaybackComplete?: boolean
  } {
    const timeUntilEnd = segment.realEndTime - realTime

    if (timeUntilEnd <= this.config.boundaryThreshold && timeUntilEnd > 0) {
      // 세그먼트 끝에 가까움 - 다음 세그먼트로 이동 필요
      const nextSegment = this.findNextActiveSegment(segment.realEndTime)

      if (nextSegment) {
        // 다음 세그먼트로 이동
        this.startTransition()

        if (this.config.debugMode) {
          log(
            'VirtualSegmentController',
            `Segment boundary detected: moving from ${realTime.toFixed(3)}s to ${nextSegment.realStartTime.toFixed(3)}s`
          )
        }

        return {
          needsTransition: true,
          targetTime: nextSegment.realStartTime,
        }
      } else {
        // 마지막 세그먼트 - 재생 완료
        if (this.config.debugMode) {
          log(
            'VirtualSegmentController',
            'Last segment completed, ending playback'
          )
        }

        this.notifyPlaybackComplete()

        return {
          needsTransition: false,
          isPlaybackComplete: true,
        }
      }
    }

    return { needsTransition: false }
  }

  /**
   * 유효하지 않은 위치 처리
   */
  private handleInvalidPosition(realTime: number): {
    needsTransition: boolean
    targetTime?: number
    isPlaybackComplete?: boolean
  } {
    const nextSegment = this.findNextActiveSegment(realTime)

    if (nextSegment) {
      this.startTransition()

      if (this.config.debugMode) {
        log(
          'VirtualSegmentController',
          `Invalid position at ${realTime.toFixed(3)}s, moving to next segment at ${nextSegment.realStartTime.toFixed(3)}s`
        )
      }

      return {
        needsTransition: true,
        targetTime: nextSegment.realStartTime,
      }
    } else {
      // 더 이상 유효한 세그먼트가 없음
      if (this.config.debugMode) {
        log(
          'VirtualSegmentController',
          'No more segments available, ending playback'
        )
      }

      this.notifyPlaybackComplete()

      return {
        needsTransition: false,
        isPlaybackComplete: true,
      }
    }
  }

  /**
   * 지정된 시간 이후의 다음 활성 세그먼트 찾기
   */
  private findNextActiveSegment(afterTime: number): VirtualSegment | null {
    if (!this.timeline) return null

    const nextSegments = this.timeline.segments
      .filter(
        (segment) => segment.isEnabled && segment.realStartTime > afterTime
      )
      .sort((a, b) => a.realStartTime - b.realStartTime)

    return nextSegments[0] || null
  }

  /**
   * 해당 세그먼트가 마지막 활성 세그먼트인지 확인
   */
  private isLastActiveSegment(segment: VirtualSegment | null): boolean {
    if (!segment || !this.timeline) return false

    const activeSegments = this.timeline.segments
      .filter((s) => s.isEnabled)
      .sort((a, b) => a.realStartTime - b.realStartTime)

    return activeSegments[activeSegments.length - 1]?.id === segment.id
  }

  /**
   * 세그먼트 전환 시작
   */
  private startTransition(): void {
    this.isTransitioning = true
    this.lastTransitionTime = Date.now()

    // 기존 디바운스 타이머 클리어
    if (this.debounceTimeoutId) {
      clearTimeout(this.debounceTimeoutId)
    }

    // 새 디바운스 타이머 설정
    this.debounceTimeoutId = setTimeout(() => {
      this.isTransitioning = false
      this.debounceTimeoutId = null
    }, this.config.debounceTime)
  }

  /**
   * 디바운스 상태 확인
   */
  private isInDebounceState(): boolean {
    return (
      this.isTransitioning ||
      Date.now() - this.lastTransitionTime < this.config.debounceTime
    )
  }

  /**
   * 세그먼트 전환 콜백 등록
   */
  onSegmentTransition(callback: SegmentTransitionCallback): () => void {
    this.transitionCallbacks.add(callback)
    return () => this.transitionCallbacks.delete(callback)
  }

  /**
   * 재생 완료 콜백 등록
   */
  onPlaybackComplete(callback: PlaybackCompleteCallback): () => void {
    this.completeCallbacks.add(callback)
    return () => this.completeCallbacks.delete(callback)
  }

  /**
   * 세그먼트 전환 알림
   */
  private notifyTransition(transition: SegmentTransition): void {
    this.transitionCallbacks.forEach((callback) => {
      try {
        callback(transition)
      } catch (error) {
        log('VirtualSegmentController', 'Transition callback error:', error)
      }
    })
  }

  /**
   * 재생 완료 알림
   */
  private notifyPlaybackComplete(): void {
    this.completeCallbacks.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        log(
          'VirtualSegmentController',
          'Playback complete callback error:',
          error
        )
      }
    })
  }

  /**
   * 현재 세그먼트 정보 반환
   */
  getCurrentSegment(): VirtualSegment | null {
    return this.currentSegment
  }

  /**
   * 디버그 정보 반환
   */
  getDebugInfo(): object {
    return {
      currentSegment: this.currentSegment?.id || null,
      isTransitioning: this.isTransitioning,
      lastTransitionTime: this.lastTransitionTime,
      activeSegments:
        this.timeline?.segments.filter((s) => s.isEnabled).length || 0,
      totalSegments: this.timeline?.segments.length || 0,
    }
  }

  /**
   * 정리
   */
  dispose(): void {
    if (this.debounceTimeoutId) {
      clearTimeout(this.debounceTimeoutId)
      this.debounceTimeoutId = null
    }

    this.transitionCallbacks.clear()
    this.completeCallbacks.clear()
    this.currentSegment = null
    this.timeline = null
    this.isTransitioning = false

    if (this.config.debugMode) {
      log('VirtualSegmentController', 'Disposed')
    }
  }
}
