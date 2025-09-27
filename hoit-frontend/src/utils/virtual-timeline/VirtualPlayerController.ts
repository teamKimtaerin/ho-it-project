/**
 * Virtual Player Controller
 * RVFC 기반으로 Real Video Player와 Virtual Timeline을 연결하는 핵심 컨트롤러
 * MotionText Renderer와 연동하여 기존 자막 렌더링 시스템 활용
 */

import { log } from '@/utils/logger'
import { ECGTimelineMapper } from './ECGTimelineMapper'
import { VirtualSegmentController } from './VirtualSegmentController'
import {
  VirtualPlayerControl,
  VirtualPlayerEvents,
  VirtualFrameData,
  FrameCallback,
  PlayStateCallback,
  SeekCallback,
  SeekedCallback,
  TimeUpdateCallback,
  VirtualTimeline,
  VirtualTimelineConfig,
  VirtualSegment,
} from './types'

// MotionText Renderer 연동을 위한 콜백 타입
export type MotionTextSeekCallback = (virtualTime: number) => void
export type MotionTextRendererRef = {
  seek: (time: number) => void
  isPlaying: boolean
  pause: () => void
  play: () => void
}

interface RVFCMetadata {
  presentationTime: DOMHighResTimeStamp
  expectedDisplayTime: DOMHighResTimeStamp
  width: number
  height: number
  mediaTime: number
  presentedFrames: number
  processingDuration?: number
}

export class VirtualPlayerController
  implements VirtualPlayerControl, VirtualPlayerEvents
{
  private video: HTMLVideoElement | null = null
  private timelineMapper: ECGTimelineMapper
  private config: VirtualTimelineConfig
  private segmentController: VirtualSegmentController

  // Event callbacks
  private frameCallbacks: Set<FrameCallback> = new Set()
  private playCallbacks: Set<PlayStateCallback> = new Set()
  private pauseCallbacks: Set<PlayStateCallback> = new Set()
  private stopCallbacks: Set<PlayStateCallback> = new Set()
  private seekCallbacks: Set<SeekCallback> = new Set()
  private seekedCallbacks: Set<SeekedCallback> = new Set()
  private timeUpdateCallbacks: Set<TimeUpdateCallback> = new Set()
  private timelineChangeCallbacks: Set<(timeline: VirtualTimeline) => void> =
    new Set()

  // MotionText Renderer 연동 콜백
  private motionTextSeekCallbacks: Set<MotionTextSeekCallback> = new Set()

  // MotionText 직접 제어 (프레임 동기화 통합)
  private motionTextRenderer: MotionTextRendererRef | null = null
  private motionTextIntegrationEnabled: boolean = false

  // State
  private isRVFCActive: boolean = false
  private currentVirtualTime: number = 0
  private isPlaying: boolean = false
  private playbackRate: number = 1.0
  private lastFrameTime: number = 0
  private frameCount: number = 0

  // RVFC handle for cleanup
  private rvfcHandle: number | null = null

  // 적응형 Frame processing debouncing (Anti-stuttering system)
  private baseFrameProcessingDebounceMs: number = 20 // ~50fps 기준 (더 보수적)
  private maxFrameProcessingDebounceMs: number = 40 // ~25fps 최대 (성능 저하시)
  private currentFrameProcessingDebounceMs: number = 20 // 현재 동적 값

  // 성능 모니터링을 위한 변수들
  private frameTimes: number[] = [] // 최근 프레임 시간들 (rolling window)
  private frameTimeWindowSize: number = 30 // 0.5초간의 프레임 기록
  private lastPerformanceCheck: number = 0
  private performanceCheckInterval: number = 500 // 0.5초마다 성능 체크
  private consecutiveSlowFrames: number = 0
  private maxConsecutiveSlowFrames: number = 5 // 5프레임 연속 느리면 조정

  // Continuous virtual time progression
  private virtualTimeStartTimestamp: number = 0 // 가상 시간 시작 기준점
  private virtualTimePausedAt: number = 0 // 일시정지된 가상 시간
  private isVirtualTimeRunning: boolean = false // 가상 시간 진행 상태

  // Current active segment tracking
  private currentActiveSegment: VirtualSegment | null = null

  // Sync lock and queue system for preventing concurrent seeks
  private syncLock: boolean = false
  private seekQueue: Array<{
    virtualTime: number
    resolve: (value: { realTime: number; virtualTime: number }) => void
    reject: (reason?: any) => void
  }> = []
  private lastVirtualTimeProcessed: number = -1

  // Performance optimization caching (Multi-Level)
  private cachedVirtualTime: number = 0
  private cachedActiveSegment: VirtualSegment | null = null
  private lastCacheUpdateTime: number = 0
  private cacheValidityThreshold: number = 10 // 10ms cache validity

  // 다중 레벨 캐싱 (Current + Neighbors)
  private segmentCacheMap: Map<string, VirtualSegment> = new Map()
  private neighborCache: {
    prev: VirtualSegment | null
    current: VirtualSegment | null
    next: VirtualSegment | null
  } = { prev: null, current: null, next: null }
  private cacheHitCount: number = 0
  private cacheMissCount: number = 0

  // Callback throttling
  private lastCallbackTime: number = 0
  private callbackThrottleMs: number = 5 // 5ms callback throttling (improved responsiveness)

  // 콜백 배치 처리
  private pendingCallbacks: {
    frameData?: VirtualFrameData
    timeUpdate?: number
    motionTextSeek?: number
  } = {}
  private callbackBatchScheduled: boolean = false

  // 메모리 최적화 - Object Pooling
  private frameDataPool: VirtualFrameData[] = []
  private maxPoolSize: number = 10
  private reusableFrameData: VirtualFrameData | null = null

  // 디버깅 성능 최적화
  private debugLogQueue: string[] = []
  private lastDebugFlush: number = 0
  private debugFlushInterval: number = 1000 // 1초마다 로그 플러시
  private debugLevel: 'none' | 'minimal' | 'verbose' = 'minimal'

  // 동기화 정밀도 상수 (33ms = 2프레임@60fps)
  private static readonly SYNC_THRESHOLD_SECONDS = 0.033
  private static readonly SEEK_THROTTLE_MS = 50

  // Video position update optimization
  private lastVideoUpdateTime: number = 0

  // 예측적 Seek 최적화
  private lastVideoSeekTime: number = 0
  private videoSeekTargetTime: number = -1
  private isVideoSeeking: boolean = false

  // 세그먼트 탐색 최적화 (Binary Search)
  private sortedActiveSegments: VirtualSegment[] = []
  private segmentsSortTimestamp: number = 0

  // Seeking state for bidirectional sync
  private _isSeeking: boolean = false
  private seekLockTimeout: NodeJS.Timeout | null = null

  constructor(
    timelineMapper: ECGTimelineMapper,
    config: Partial<VirtualTimelineConfig> = {}
  ) {
    this.timelineMapper = timelineMapper
    this.config = {
      enableFramePrecision: true,
      frameRate: 30,
      bufferSize: 10,
      syncThreshold: 16.67,
      debugMode: false,
      ...config,
    }

    // VirtualSegmentController 초기화
    this.segmentController = new VirtualSegmentController({
      boundaryThreshold: 0.05, // 50ms
      debounceTime: 100, // 100ms
      debugMode: this.config.debugMode,
    })

    // 디버깅 레벨 설정 (config에서 가져오거나 기본값)
    this.debugLevel = this.config.debugMode ? 'minimal' : 'none'

    // 세그먼트 완료 콜백 등록
    this.segmentController.onPlaybackComplete(() => {
      this.pauseAtEnd()
    })

    log('VirtualPlayerController', 'Initialized with config:', this.config)
  }

  /**
   * HTML5 video element 연결
   */
  attachVideo(video: HTMLVideoElement): void {
    if (this.video) {
      this.detachVideo()
    }

    this.video = video
    this.setupVideoEventListeners()
    this.startRVFC()

    log('VirtualPlayerController', 'Video attached and RVFC started')
  }

  /**
   * Video element 연결 해제
   */
  detachVideo(): void {
    if (this.video) {
      this.stopRVFC()
      this.removeVideoEventListeners()
      this.video = null
      log('VirtualPlayerController', 'Video detached')
    }
  }

  // VirtualPlayerControl 구현

  async play(): Promise<void> {
    if (!this.video) {
      throw new Error('Video not attached')
    }

    try {
      // Set playing state first
      this.isPlaying = true

      // 가상 시간 진행 시작
      this.startVirtualTimeProgression()

      // 현재 가상 시간에 해당하는 활성 세그먼트 찾기
      const activeSegment = this.getActiveSegmentOptimized(
        this.currentVirtualTime,
        performance.now()
      )

      if (activeSegment) {
        // 활성 세그먼트가 있으면 해당 세그먼트의 실제 비디오 시간으로 이동
        this.jumpToSegmentStart(activeSegment)
        this.currentActiveSegment = activeSegment

        // 비디오 재생 시작
        await this.video.play()

        if (this.config.debugMode) {
          log(
            'VirtualPlayerController',
            `Started playback at segment ${activeSegment.id}, virtual time: ${this.currentVirtualTime.toFixed(3)}s, real time: ${this.video.currentTime.toFixed(3)}s`
          )
        }
      } else {
        if (this.config.debugMode) {
          log(
            'VirtualPlayerController',
            `No active segment at virtual time ${this.currentVirtualTime.toFixed(3)}s`
          )
        }
      }

      this.notifyPlayCallbacks()

      // Dispatch global sync event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('playbackStateChange', {
            detail: { isPlaying: true, source: 'VirtualPlayerController' },
          })
        )
      }

      log('VirtualPlayerController', 'Virtual Timeline playback started')
    } catch (error) {
      // If play fails, reset state
      this.isPlaying = false
      log('VirtualPlayerController', 'Play failed:', error)
      throw error
    }
  }

  pause(): void {
    if (!this.video) return

    // Immediately set playing state to false to prevent auto-play
    this.isPlaying = false

    // 가상 시간 진행 일시정지
    this.pauseVirtualTimeProgression()
    this.video.pause()
    this.notifyPauseCallbacks()

    // Dispatch global sync event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('playbackStateChange', {
          detail: { isPlaying: false, source: 'VirtualPlayerController' },
        })
      )
    }

    log('VirtualPlayerController', 'Playback paused')
  }

  stop(): void {
    if (!this.video) return

    // 가상 시간 진행 중지 및 초기화
    this.stopVirtualTimeProgression()
    this.video.pause()
    this.isPlaying = false
    this.currentVirtualTime = 0
    this.currentActiveSegment = null
    this.lastVirtualTimeProcessed = -1
    this.notifyStopCallbacks()
    log('VirtualPlayerController', 'Playback stopped')
  }

  seek(
    virtualTime: number
  ): Promise<{ realTime: number; virtualTime: number }> {
    return new Promise((resolve, reject) => {
      if (!this.video) {
        reject(new Error('No video element attached'))
        return
      }

      // Check sync lock - if locked, queue this seek request
      if (this.syncLock) {
        return new Promise((queueResolve, queueReject) => {
          log(
            'VirtualPlayerController',
            `[SYNC] Seek queued for virtual time: ${virtualTime.toFixed(3)}s`
          )
          this.seekQueue.push({
            virtualTime,
            resolve: queueResolve,
            reject: queueReject,
          })
        })
      }

      // Acquire sync lock
      this.syncLock = true
      this._isSeeking = true

      // Execute seek
      const executeSeek = async () => {
        try {
          // 1. Pause first to stop any playback
          if (this.isPlaying) {
            this.pause()
          }

          // 2. Set virtual time
          this.currentVirtualTime = Math.max(
            0,
            Math.min(virtualTime, this.getDuration())
          )

          // 3. Find and set active segment immediately
          let activeSegment = this.getActiveSegmentOptimized(
            this.currentVirtualTime,
            performance.now()
          )

          if (!activeSegment) {
            // Try direct search in segments array as fallback
            const timeline = this.timelineMapper.timelineManager.getTimeline()
            const segments = timeline.segments.filter((s) => s.isEnabled)

            for (const segment of segments) {
              if (
                this.currentVirtualTime >= segment.virtualStartTime &&
                this.currentVirtualTime <= segment.virtualEndTime
              ) {
                activeSegment = segment
                log(
                  'VirtualPlayerController',
                  `[SYNC] Found segment via direct search: ${segment.id} for virtual time: ${this.currentVirtualTime.toFixed(3)}s`
                )
                break
              }
            }

            if (!activeSegment) {
              log(
                'VirtualPlayerController',
                `[SYNC] WARNING: No segment found for virtual time: ${this.currentVirtualTime.toFixed(3)}s after fallback search`
              )
              // Still continue with seek even without segment
            }
          }

          this.currentActiveSegment = activeSegment

          // 4. Calculate real time
          let targetRealTime = 0
          if (activeSegment) {
            const segmentProgress =
              (this.currentVirtualTime - activeSegment.virtualStartTime) /
              (activeSegment.virtualEndTime - activeSegment.virtualStartTime)
            targetRealTime =
              activeSegment.realStartTime +
              (activeSegment.realEndTime - activeSegment.realStartTime) *
                segmentProgress
          } else {
            // Fallback: try direct mapping
            targetRealTime = this.virtualToReal(this.currentVirtualTime)
          }

          // 5. Set video time and wait for seeked event
          if (this.video && targetRealTime >= 0) {
            const seekPromise = new Promise<void>((seekResolve) => {
              const onSeeked = () => {
                this.video?.removeEventListener('seeked', onSeeked)
                seekResolve()
              }
              this.video?.addEventListener('seeked', onSeeked, { once: true })

              // Set video current time
              this.video!.currentTime = targetRealTime

              // Reduced timeout for faster response (500ms)
              setTimeout(() => {
                this.video?.removeEventListener('seeked', onSeeked)
                seekResolve()
              }, 500)
            })

            await seekPromise
          }

          // 6. Update virtual time progression state
          if (this.isVirtualTimeRunning) {
            this.virtualTimePausedAt = this.currentVirtualTime
            this.virtualTimeStartTimestamp = performance.now()
          }

          // 7. Notify all callbacks
          this.notifySeekCallbacks(this.currentVirtualTime)
          this.notifyTimeUpdateCallbacks(this.currentVirtualTime)
          this.notifyMotionTextSeekCallbacks(this.currentVirtualTime)
          this.notifySeekedCallbacks({
            realTime: targetRealTime,
            virtualTime: this.currentVirtualTime,
          })

          // 8. Dispatch global sync event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('virtualTimeUpdate', {
                detail: {
                  virtualTime: this.currentVirtualTime,
                  realTime: targetRealTime,
                  source: 'seek',
                },
              })
            )
          }

          log(
            'VirtualPlayerController',
            `[SYNC] Seek completed - virtual: ${this.currentVirtualTime.toFixed(3)}s, real: ${targetRealTime.toFixed(3)}s`
          )

          // Resolve with times
          resolve({
            realTime: targetRealTime,
            virtualTime: this.currentVirtualTime,
          })
        } catch (error) {
          log('VirtualPlayerController', `[SYNC] Seek failed: ${error}`)
          reject(error)
        } finally {
          // Release sync lock
          this.syncLock = false
          this._isSeeking = false

          // Process next queued seek with error recovery
          setTimeout(() => {
            if (this.seekQueue.length > 0) {
              const nextSeek = this.seekQueue.shift()!
              log(
                'VirtualPlayerController',
                `[SYNC] Processing queued seek to: ${nextSeek.virtualTime.toFixed(3)}s`
              )

              this.seek(nextSeek.virtualTime)
                .then((result) => nextSeek.resolve(result))
                .catch((error) => {
                  log(
                    'VirtualPlayerController',
                    `[SYNC] Queued seek failed: ${error}`
                  )
                  nextSeek.reject(error)
                })
            }
          }, 0) // Use setTimeout to prevent stack overflow and ensure proper async handling
        }
      }

      executeSeek()
    })
  }

  getCurrentTime(): number {
    return this.currentVirtualTime
  }

  getDuration(): number {
    const timeline = this.timelineMapper.timelineManager.getTimeline()
    return timeline.duration
  }

  setPlaybackRate(rate: number): void {
    if (!this.video) return

    this.video.playbackRate = rate
    this.playbackRate = rate
    log('VirtualPlayerController', `Playback rate set to: ${rate}`)
  }

  getPlaybackRate(): number {
    return this.playbackRate
  }

  // VirtualPlayerEvents 구현

  onFrame(callback: FrameCallback): () => void {
    this.frameCallbacks.add(callback)
    return () => this.frameCallbacks.delete(callback)
  }

  onPlay(callback: PlayStateCallback): () => void {
    this.playCallbacks.add(callback)
    return () => this.playCallbacks.delete(callback)
  }

  onPause(callback: PlayStateCallback): () => void {
    this.pauseCallbacks.add(callback)
    return () => this.pauseCallbacks.delete(callback)
  }

  onStop(callback: PlayStateCallback): () => void {
    this.stopCallbacks.add(callback)
    return () => this.stopCallbacks.delete(callback)
  }

  onSeek(callback: SeekCallback): () => void {
    this.seekCallbacks.add(callback)
    return () => this.seekCallbacks.delete(callback)
  }

  onTimeUpdate(callback: TimeUpdateCallback): () => void {
    this.timeUpdateCallbacks.add(callback)
    return () => this.timeUpdateCallbacks.delete(callback)
  }

  onTimelineChange(callback: (timeline: VirtualTimeline) => void): () => void {
    this.timelineChangeCallbacks.add(callback)
    return () => this.timelineChangeCallbacks.delete(callback)
  }

  onSeeked(callback: SeekedCallback): () => void {
    this.seekedCallbacks.add(callback)
    return () => this.seekedCallbacks.delete(callback)
  }

  /**
   * 타임라인 변경 시 호출되는 핸들러 (VideoSection에서 직접 호출)
   */
  handleTimelineUpdate(timeline: VirtualTimeline): void {
    if (this.config.debugMode) {
      log(
        'VirtualPlayerController',
        `Timeline updated: ${timeline.segments.filter((s) => s.isEnabled).length} active segments of ${timeline.segments.length} total`
      )
    }

    // 세그먼트 컨트롤러에 새로운 타임라인 설정
    this.segmentController.setTimeline(timeline)

    // 현재 Virtual Time을 새로운 타임라인에 맞게 조정
    if (this.currentVirtualTime > timeline.duration) {
      this.currentVirtualTime = Math.min(
        this.currentVirtualTime,
        timeline.duration
      )
      log(
        'VirtualPlayerController',
        `Adjusted virtual time to ${this.currentVirtualTime} due to timeline shrinkage`
      )
    }

    // 현재 재생 중이고 유효하지 않은 위치에 있다면 조정
    if (this.video) {
      const currentRealTime = this.video.currentTime

      if (!this.isWithinValidSegment(currentRealTime)) {
        if (this.isPlaying) {
          // 재생 중이면 세그먼트 컨트롤러를 통해 처리
          const result =
            this.segmentController.processCurrentTime(currentRealTime)
          if (result.needsTransition && result.targetTime !== undefined) {
            this.video.currentTime = result.targetTime
          }
        } else {
          // 일시정지 중이면 첫 번째 유효한 세그먼트로 이동
          this.moveToFirstValidSegment()
        }
      }
    }

    // 모든 타임라인 변경 콜백 호출
    this.timelineChangeCallbacks.forEach((callback) => {
      try {
        callback(timeline)
      } catch (error) {
        log('VirtualPlayerController', 'Timeline change callback error:', error)
      }
    })

    // 상태 초기화 (새로운 타임라인이므로)
    this.lastVirtualTimeProcessed = -1
  }

  /**
   * 첫 번째 유효한 세그먼트로 이동 (일시정지 상태에서)
   */
  private moveToFirstValidSegment(): void {
    if (!this.video) return

    const timeline = this.timelineMapper.timelineManager.getTimeline()
    const firstSegment = timeline.segments
      .filter((segment) => segment.isEnabled)
      .sort((a, b) => a.realStartTime - b.realStartTime)[0]

    if (firstSegment) {
      this.video.currentTime = firstSegment.realStartTime
      const mapping = this.timelineMapper.toVirtual(firstSegment.realStartTime)
      if (mapping.isValid) {
        this.currentVirtualTime = mapping.virtualTime
        this.notifyTimeUpdateCallbacks(this.currentVirtualTime)
        this.notifyMotionTextSeekCallbacks(this.currentVirtualTime)
      }

      if (this.config.debugMode) {
        log(
          'VirtualPlayerController',
          `Moved to first valid segment: ${firstSegment.realStartTime.toFixed(3)}s`
        )
      }
    }
  }

  /**
   * MotionText Renderer seek 콜백 등록
   */
  onMotionTextSeek(callback: MotionTextSeekCallback): () => void {
    this.motionTextSeekCallbacks.add(callback)
    return () => this.motionTextSeekCallbacks.delete(callback)
  }

  /**
   * MotionText Renderer 직접 연결 (프레임 동기화 통합)
   */
  attachMotionTextRenderer(renderer: MotionTextRendererRef): void {
    this.motionTextRenderer = renderer
    this.motionTextIntegrationEnabled = true

    if (this.config.debugMode) {
      log(
        'VirtualPlayerController',
        'MotionText Renderer attached for direct frame synchronization'
      )
    }
  }

  /**
   * MotionText Renderer 연결 해제
   */
  detachMotionTextRenderer(): void {
    this.motionTextRenderer = null
    this.motionTextIntegrationEnabled = false

    if (this.config.debugMode) {
      log('VirtualPlayerController', 'MotionText Renderer detached')
    }
  }

  // RVFC 관리

  private startRVFC(): void {
    if (!this.video || this.isRVFCActive) return

    this.isRVFCActive = true
    this.scheduleNextFrame()
    log('VirtualPlayerController', 'RVFC started')
  }

  private stopRVFC(): void {
    if (this.rvfcHandle !== null) {
      this.video?.cancelVideoFrameCallback?.(this.rvfcHandle)
      this.rvfcHandle = null
    }
    this.isRVFCActive = false
    log('VirtualPlayerController', 'RVFC stopped')
  }

  private scheduleNextFrame(): void {
    if (!this.video || !this.isRVFCActive) return

    // Check if requestVideoFrameCallback is available
    if (typeof this.video.requestVideoFrameCallback !== 'function') {
      // Fallback to requestAnimationFrame for browsers without RVFC support
      this.fallbackToRAF()
      return
    }

    // Enhanced RVFC with error handling and timing optimization
    try {
      this.rvfcHandle = this.video.requestVideoFrameCallback(
        (now, metadata) => {
          // RVFC 타이밍 최적화 - 안정적인 프레임 처리
          this.handleVideoFrameWithOptimizedTiming(
            now,
            metadata as RVFCMetadata
          )

          // 재귀 호출을 안전하게 처리
          if (this.isRVFCActive) {
            this.scheduleNextFrame()
          }
        }
      )
    } catch (error) {
      log(
        'VirtualPlayerController',
        'RVFC scheduling failed, falling back to RAF:',
        error
      )
      this.fallbackToRAF()
    }
  }

  private fallbackToRAF(): void {
    log(
      'VirtualPlayerController',
      'RVFC not supported, falling back to optimized RAF'
    )

    const rafCallback = (timestamp: DOMHighResTimeStamp) => {
      if (this.video && this.isRVFCActive) {
        try {
          // Create synthetic metadata for RAF fallback
          const syntheticMetadata: RVFCMetadata = {
            presentationTime: timestamp,
            expectedDisplayTime: timestamp,
            width: this.video.videoWidth,
            height: this.video.videoHeight,
            mediaTime: this.video.currentTime,
            presentedFrames: this.frameCount++,
            processingDuration: 0,
          }

          // RAF 타이밍도 최적화된 핸들러 사용
          this.handleVideoFrameWithOptimizedTiming(timestamp, syntheticMetadata)

          // 안전한 재귀 호출
          if (this.isRVFCActive) {
            requestAnimationFrame(rafCallback)
          }
        } catch (error) {
          log('VirtualPlayerController', 'RAF callback error:', error)
          // 에러 발생 시에도 계속 진행
          if (this.isRVFCActive) {
            requestAnimationFrame(rafCallback)
          }
        }
      }
    }

    requestAnimationFrame(rafCallback)
  }

  /**
   * RVFC 타이밍 최적화된 프레임 핸들러
   */
  private handleVideoFrameWithOptimizedTiming(
    now: DOMHighResTimeStamp,
    metadata: RVFCMetadata
  ): void {
    // 기본 프레임 처리에 추가적인 타이밍 최적화 적용
    try {
      this.handleVideoFrame(now, metadata)
    } catch (error) {
      log('VirtualPlayerController', 'Frame processing error:', error)
      // 에러 발생 시에도 RVFC 계속 진행
    }
  }

  private handleVideoFrame(
    now: DOMHighResTimeStamp,
    metadata: RVFCMetadata
  ): void {
    if (!this.video) return

    // CRITICAL: Don't update video position during seek operations
    if (this._isSeeking || this.syncLock) {
      return // Skip frame processing during seek operations
    }

    // 적응형 Frame rate limiting with performance monitoring
    const timeSinceLastFrame = now - this.lastFrameTime

    // 성능 모니터링 및 적응형 조정
    this.monitorPerformanceAndAdjust(now, timeSinceLastFrame)

    if (timeSinceLastFrame < this.currentFrameProcessingDebounceMs) {
      return // Skip frame to maintain adaptive target frame rate
    }

    // 연속적인 가상 시간 진행 업데이트 (캐싱 적용)
    const previousVirtualTime = this.currentVirtualTime
    this.updateContinuousVirtualTimeOptimized(now)

    // 가상 시간 변화량이 극도로 미미하면 처리 스킵 (완화된 조건)
    const virtualTimeDelta = Math.abs(
      this.currentVirtualTime - previousVirtualTime
    )
    if (virtualTimeDelta < 0.001 && this.frameCount > 10) {
      // 1ms 미만 변화는 스킵 (10프레임 후부터)
      return
    }

    // 가상 시간이 총 길이를 초과하면 재생 완료
    const totalDuration = this.getDuration()
    if (this.currentVirtualTime >= totalDuration) {
      this.pauseAtEnd()
      return
    }

    // 캐시된 세그먼트 사용 또는 새로 탐색
    const activeSegment = this.getActiveSegmentOptimized(
      this.currentVirtualTime,
      now
    )

    // 세그먼트 변경 감지 및 처리
    if (activeSegment !== this.currentActiveSegment) {
      this.handleSegmentChangeOptimized(activeSegment)
    }

    // 비디오 위치 업데이트 (throttled)
    this.updateVideoPositionOptimized(now)

    // 콜백 호출 (throttled)
    this.notifyCallbacksOptimized(now, activeSegment, metadata)

    // Update frame processing state
    this.lastFrameTime = now
    this.lastVirtualTimeProcessed = this.currentVirtualTime
    this.frameCount++

    // 강화된 디버그 로깅 (30프레임마다)
    if (this.config.debugMode && this.frameCount % 30 === 0) {
      const fps = (1000 / timeSinceLastFrame).toFixed(1)
      const progress = activeSegment
        ? (
            ((this.currentVirtualTime - activeSegment.virtualStartTime) /
              (activeSegment.virtualEndTime - activeSegment.virtualStartTime)) *
            100
          ).toFixed(1)
        : 'N/A'

      log(
        'VirtualPlayerController',
        `Frame ${this.frameCount}: fps=${fps}, virtual=${this.currentVirtualTime.toFixed(3)}s, ` +
          `segment=${activeSegment?.id || 'none'} (${progress}%), ` +
          `delta=${virtualTimeDelta.toFixed(4)}s, adaptiveFPS=${(1000 / this.currentFrameProcessingDebounceMs).toFixed(1)}`
      )
    }
  }

  /**
   * 성능 모니터링 및 적응형 프레임 레이트 조정
   */
  private monitorPerformanceAndAdjust(
    now: DOMHighResTimeStamp,
    timeSinceLastFrame: number
  ): void {
    // 프레임 시간 기록 (rolling window)
    this.frameTimes.push(timeSinceLastFrame)
    if (this.frameTimes.length > this.frameTimeWindowSize) {
      this.frameTimes.shift()
    }

    // 정기적인 성능 체크
    if (
      now - this.lastPerformanceCheck > this.performanceCheckInterval &&
      this.frameTimes.length >= 10
    ) {
      this.adjustAdaptiveFrameRate()
      this.lastPerformanceCheck = now
    }

    // 즉시 반응 시스템 - 연속으로 느린 프레임 감지
    if (timeSinceLastFrame > this.currentFrameProcessingDebounceMs * 2) {
      this.consecutiveSlowFrames++
      if (this.consecutiveSlowFrames >= this.maxConsecutiveSlowFrames) {
        this.increaseFrameThreshold()
        this.consecutiveSlowFrames = 0
      }
    } else {
      this.consecutiveSlowFrames = 0
    }
  }

  /**
   * 적응형 프레임 레이트 조정
   */
  private adjustAdaptiveFrameRate(): void {
    if (this.frameTimes.length < 10) return

    // 평균 프레임 시간 계산
    const avgFrameTime =
      this.frameTimes.reduce((sum, time) => sum + time, 0) /
      this.frameTimes.length
    const currentTargetFrameTime = this.currentFrameProcessingDebounceMs

    // 성능 평가
    const performanceRatio = avgFrameTime / currentTargetFrameTime

    if (performanceRatio > 1.5) {
      // 성능이 나쁨 - 프레임 레이트 낮춤
      this.increaseFrameThreshold()
    } else if (
      performanceRatio < 0.8 &&
      avgFrameTime < this.baseFrameProcessingDebounceMs
    ) {
      // 성능이 좋음 - 프레임 레이트 높임
      this.decreaseFrameThreshold()
    }

    if (this.config.debugMode) {
      log(
        'VirtualPlayerController',
        `Performance check: avgFrame=${avgFrameTime.toFixed(1)}ms, ` +
          `target=${currentTargetFrameTime}ms, ratio=${performanceRatio.toFixed(2)}, ` +
          `adaptive=${this.currentFrameProcessingDebounceMs}ms`
      )
    }
  }

  /**
   * 프레임 임계값 증가 (프레임 레이트 감소)
   */
  private increaseFrameThreshold(): void {
    this.currentFrameProcessingDebounceMs = Math.min(
      this.currentFrameProcessingDebounceMs + 2,
      this.maxFrameProcessingDebounceMs
    )
  }

  /**
   * 프레임 임계값 감소 (프레임 레이트 증가)
   */
  private decreaseFrameThreshold(): void {
    this.currentFrameProcessingDebounceMs = Math.max(
      this.currentFrameProcessingDebounceMs - 1,
      this.baseFrameProcessingDebounceMs
    )
  }

  // Video event listeners

  private setupVideoEventListeners(): void {
    if (!this.video) return

    this.video.addEventListener('play', this.handleVideoPlay)
    this.video.addEventListener('pause', this.handleVideoPause)
    this.video.addEventListener('seeking', this.handleVideoSeeking)
    this.video.addEventListener('seeked', this.handleVideoSeeked)
    this.video.addEventListener('ended', this.handleVideoEnded)
    this.video.addEventListener('error', this.handleVideoError)
  }

  private removeVideoEventListeners(): void {
    if (!this.video) return

    this.video.removeEventListener('play', this.handleVideoPlay)
    this.video.removeEventListener('pause', this.handleVideoPause)
    this.video.removeEventListener('seeking', this.handleVideoSeeking)
    this.video.removeEventListener('seeked', this.handleVideoSeeked)
    this.video.removeEventListener('ended', this.handleVideoEnded)
    this.video.removeEventListener('error', this.handleVideoError)
  }

  private handleVideoPlay = (): void => {
    this.isPlaying = true
    this.notifyPlayCallbacks()
  }

  private handleVideoPause = (): void => {
    this.isPlaying = false
    this.notifyPauseCallbacks()
  }

  private handleVideoSeeking = (): void => {
    if (this.config.debugMode) {
      log('VirtualPlayerController', 'Video seeking started')
    }
  }

  private handleVideoSeeked = (): void => {
    if (!this.video) return

    const mapping = this.timelineMapper.toVirtual(this.video.currentTime)
    if (mapping.isValid) {
      this.currentVirtualTime = mapping.virtualTime
      this.notifySeekCallbacks(mapping.virtualTime)
    }
  }

  private handleVideoEnded = (): void => {
    this.isPlaying = false
    this.notifyStopCallbacks()
    log('VirtualPlayerController', 'Video ended')
  }

  private handleVideoError = (event: Event): void => {
    log('VirtualPlayerController', 'Video error:', event)
  }

  /**
   * Virtual Timeline 재생 시 유효한 시작 위치 보장
   */
  private ensureValidStartPosition(): void {
    if (!this.video) return

    const currentRealTime = this.video.currentTime

    // 현재 위치가 유효하지 않으면 첫 번째 유효한 세그먼트로 이동
    if (!this.isWithinValidSegment(currentRealTime)) {
      const timeline = this.timelineMapper.timelineManager.getTimeline()
      const firstSegment = timeline.segments
        .filter((segment) => segment.isEnabled)
        .sort((a, b) => a.realStartTime - b.realStartTime)[0]

      if (firstSegment) {
        this.video.currentTime = firstSegment.realStartTime
        const mapping = this.timelineMapper.toVirtual(
          firstSegment.realStartTime
        )
        if (mapping.isValid) {
          this.currentVirtualTime = mapping.virtualTime
        }

        if (this.config.debugMode) {
          log(
            'VirtualPlayerController',
            `Starting Virtual Timeline at first segment: ${firstSegment.realStartTime.toFixed(3)}s`
          )
        }
      }
    }
  }

  /**
   * 현재 시간이 유효한 세그먼트 내에 있는지 확인
   */
  private isWithinValidSegment(realTime: number): boolean {
    const timeline = this.timelineMapper.timelineManager.getTimeline()

    return timeline.segments.some(
      (segment) =>
        segment.isEnabled &&
        realTime >= segment.realStartTime &&
        realTime <= segment.realEndTime
    )
  }

  /**
   * Virtual Timeline 재생 완료 시 정지 (연속적 가상 시간 모델용)
   */
  private pauseAtEnd(): void {
    if (!this.video) return

    // 가상 시간 진행 중지
    this.pauseVirtualTimeProgression()

    // 재생 상태 변경
    this.isPlaying = false
    this.video.pause()

    // Virtual Timeline의 총 재생 시간으로 설정
    const totalDuration = this.getDuration()
    this.currentVirtualTime = totalDuration

    // 활성 세그먼트 초기화
    this.currentActiveSegment = null

    // 모든 콜백에 재생 완료 알림
    this.notifyTimeUpdateCallbacks(this.currentVirtualTime)
    this.notifyMotionTextSeekCallbacks(this.currentVirtualTime)
    this.notifyPauseCallbacks()

    if (this.config.debugMode) {
      log(
        'VirtualPlayerController',
        `Virtual Timeline playback completed: virtual=${this.currentVirtualTime.toFixed(3)}s/${totalDuration.toFixed(3)}s`
      )
    }

    // Virtual Timeline 완료 이벤트 콜백 호출
    this.notifyVirtualTimelineComplete()
  }

  /**
   * Virtual Timeline 완료 이벤트 알림
   */
  private notifyVirtualTimelineComplete(): void {
    // Virtual Timeline 전용 완료 콜백이 있다면 여기서 호출
    // 현재는 pause 콜백을 재사용하지만, 필요에 따라 별도 콜백 타입 추가 가능
    if (this.config.debugMode) {
      log('VirtualPlayerController', 'Virtual Timeline completion event fired')
    }
  }

  /**
   * 주어진 Virtual Time과 가장 가까운 유효한 Virtual Time 찾기
   */
  private findNearestValidVirtualTime(
    targetVirtualTime: number
  ): number | null {
    const timeline = this.timelineMapper.timelineManager.getTimeline()
    let nearestTime: number | null = null
    let minDistance = Infinity

    for (const segment of timeline.segments) {
      if (segment.isEnabled) {
        // 세그먼트 시작점과의 거리 계산
        const startDistance = Math.abs(
          segment.virtualStartTime - targetVirtualTime
        )
        if (startDistance < minDistance) {
          minDistance = startDistance
          nearestTime = segment.virtualStartTime
        }

        // 세그먼트 끝점과의 거리 계산
        const endDistance = Math.abs(segment.virtualEndTime - targetVirtualTime)
        if (endDistance < minDistance) {
          minDistance = endDistance
          nearestTime = segment.virtualEndTime
        }
      }
    }

    return nearestTime
  }

  // Callback notification methods

  private notifyFrameCallbacks(frameData: VirtualFrameData): void {
    this.frameCallbacks.forEach((callback) => {
      try {
        callback(frameData)
      } catch (error) {
        log('VirtualPlayerController', 'Frame callback error:', error)
      }
    })
  }

  private notifyPlayCallbacks(): void {
    this.playCallbacks.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        log('VirtualPlayerController', 'Play callback error:', error)
      }
    })
  }

  private notifyPauseCallbacks(): void {
    this.pauseCallbacks.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        log('VirtualPlayerController', 'Pause callback error:', error)
      }
    })
  }

  private notifyStopCallbacks(): void {
    this.stopCallbacks.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        log('VirtualPlayerController', 'Stop callback error:', error)
      }
    })
  }

  private notifySeekCallbacks(virtualTime: number): void {
    this.seekCallbacks.forEach((callback) => {
      try {
        callback(virtualTime)
      } catch (error) {
        log('VirtualPlayerController', 'Seek callback error:', error)
      }
    })
  }

  private notifyTimeUpdateCallbacks(virtualTime: number): void {
    this.timeUpdateCallbacks.forEach((callback) => {
      try {
        callback(virtualTime)
      } catch (error) {
        log('VirtualPlayerController', 'Time update callback error:', error)
      }
    })
  }

  private notifyMotionTextSeekCallbacks(virtualTime: number): void {
    // 직접 연결된 MotionText Renderer 우선 처리 (프레임 동기화 통합)
    if (this.motionTextIntegrationEnabled && this.motionTextRenderer) {
      try {
        this.motionTextRenderer.seek(virtualTime)
      } catch (error) {
        log('VirtualPlayerController', 'Direct MotionText seek error:', error)
      }
    } else {
      // 기존 콜백 방식 (레거시 지원)
      this.motionTextSeekCallbacks.forEach((callback) => {
        try {
          callback(virtualTime)
        } catch (error) {
          log(
            'VirtualPlayerController',
            'MotionText seek callback error:',
            error
          )
        }
      })
    }
  }

  private notifySeekedCallbacks(data: {
    realTime: number
    virtualTime: number
  }): void {
    this.seekedCallbacks.forEach((callback) => {
      try {
        callback(data)
      } catch (error) {
        console.error('[SYNC] Seeked callback error:', error)
      }
    })
  }

  /**
   * 리소스 정리
   */
  cleanup(): void {
    this.detachVideo()
    this.detachMotionTextRenderer()
    this.segmentController.dispose()
    this.frameCallbacks.clear()
    this.playCallbacks.clear()
    this.pauseCallbacks.clear()
    this.stopCallbacks.clear()
    this.seekCallbacks.clear()
    this.timeUpdateCallbacks.clear()
    this.timelineChangeCallbacks.clear()
    this.motionTextSeekCallbacks.clear()

    // 메모리 최적화 - Object Pool 정리
    this.clearObjectPools()
    this.segmentCacheMap.clear()
    this.neighborCache = { prev: null, current: null, next: null }

    log('VirtualPlayerController', 'Cleaned up')
  }

  /**
   * 가상 시간 진행 시작
   */
  private startVirtualTimeProgression(): void {
    this.isVirtualTimeRunning = true
    this.virtualTimeStartTimestamp = performance.now()
    this.virtualTimePausedAt = this.currentVirtualTime

    if (this.config.debugMode) {
      log(
        'VirtualPlayerController',
        `Started virtual time progression from ${this.currentVirtualTime.toFixed(3)}s`
      )
    }
  }

  /**
   * 가상 시간 진행 일시정지
   */
  private pauseVirtualTimeProgression(): void {
    if (this.isVirtualTimeRunning) {
      this.virtualTimePausedAt = this.currentVirtualTime
      this.isVirtualTimeRunning = false

      if (this.config.debugMode) {
        log(
          'VirtualPlayerController',
          `Paused virtual time progression at ${this.currentVirtualTime.toFixed(3)}s`
        )
      }
    }
  }

  /**
   * 가상 시간 진행 중지 및 초기화
   */
  private stopVirtualTimeProgression(): void {
    this.isVirtualTimeRunning = false
    this.virtualTimeStartTimestamp = 0
    this.virtualTimePausedAt = 0

    // 캐시 초기화
    this.cachedVirtualTime = 0
    this.cachedActiveSegment = null
    this.lastCacheUpdateTime = 0
    this.lastCallbackTime = 0
    this.lastVideoUpdateTime = 0

    if (this.config.debugMode) {
      log('VirtualPlayerController', 'Stopped virtual time progression')
    }
  }

  /**
   * 연속적인 가상 시간 업데이트
   */
  private updateContinuousVirtualTime(now: DOMHighResTimeStamp): void {
    if (!this.isVirtualTimeRunning || !this.isPlaying) {
      return
    }

    // 현재 시각에서 시작 시점 차이를 계산하여 가상 시간 진행
    const elapsedMs = now - this.virtualTimeStartTimestamp
    const elapsedSeconds = elapsedMs / 1000

    // 재생 속도 적용하여 가상 시간 계산
    this.currentVirtualTime =
      this.virtualTimePausedAt + elapsedSeconds * this.playbackRate

    // 총 길이를 초과하지 않도록 제한
    const totalDuration = this.getDuration()
    this.currentVirtualTime = Math.min(this.currentVirtualTime, totalDuration)
  }

  /**
   * 가상 시간 기준으로 활성 세그먼트 찾기
   */
  private findActiveSegmentAtVirtualTime(
    virtualTime: number
  ): VirtualSegment | null {
    const timeline = this.timelineMapper.timelineManager.getTimeline()

    return (
      timeline.segments.find(
        (segment) =>
          segment.isEnabled &&
          virtualTime >= segment.virtualStartTime &&
          virtualTime < segment.virtualEndTime
      ) || null
    )
  }

  /**
   * 세그먼트 변경 처리
   */
  private handleSegmentChange(newSegment: VirtualSegment | null): void {
    const previousSegment = this.currentActiveSegment
    this.currentActiveSegment = newSegment

    if (this.config.debugMode) {
      log(
        'VirtualPlayerController',
        `Segment changed: ${previousSegment?.id || 'none'} → ${newSegment?.id || 'none'} ` +
          `at virtual time ${this.currentVirtualTime.toFixed(3)}s`
      )
    }

    // 세그먼트 전환 시 필요한 추가 로직이 있다면 여기에 구현
    // 예: 세그먼트 전환 콜백 호출, 애니메이션 효과 등
  }

  /**
   * 연속적인 가상 시간 업데이트 (수정된 최적화 버전)
   */
  private updateContinuousVirtualTimeOptimized(now: DOMHighResTimeStamp): void {
    if (!this.isVirtualTimeRunning || !this.isPlaying) {
      return
    }

    // 가상 시간은 항상 계산하여 연속적 진행 보장
    const elapsedMs = now - this.virtualTimeStartTimestamp
    const elapsedSeconds = elapsedMs / 1000
    this.currentVirtualTime =
      this.virtualTimePausedAt + elapsedSeconds * this.playbackRate

    // 총 길이 제한
    const totalDuration = this.getDuration()
    this.currentVirtualTime = Math.min(this.currentVirtualTime, totalDuration)

    // 캐시는 계산 결과 저장만, 시간 진행은 방해하지 않음
    this.cachedVirtualTime = this.currentVirtualTime
    this.lastCacheUpdateTime = now
  }

  /**
   * 활성 세그먼트 탐색 (스마트 캐싱 + 이진 탐색 최적화 버전)
   */
  private getActiveSegmentOptimized(
    virtualTime: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _now: DOMHighResTimeStamp
  ): VirtualSegment | null {
    // 1단계: Neighbor Cache 확인 (가장 빠름)
    const neighborHit = this.checkNeighborCache(virtualTime)
    if (neighborHit) {
      this.cacheHitCount++
      return neighborHit
    }

    // 2단계: 기존 단일 캐시 확인
    if (
      this.cachedActiveSegment &&
      virtualTime >= this.cachedActiveSegment.virtualStartTime &&
      virtualTime < this.cachedActiveSegment.virtualEndTime
    ) {
      this.cacheHitCount++
      return this.cachedActiveSegment
    }

    // 3단계: Cache Miss - 이진 탐색 수행
    this.cacheMissCount++

    // 정렬된 세그먼트 배열 업데이트 확인
    this.updateSortedSegmentsIfNeeded()

    // 이진 탐색으로 활성 세그먼트 찾기
    const activeSegment = this.findActiveSegmentBinarySearch(virtualTime)

    // 캐시 업데이트 (Multi-Level)
    this.updateSmartCache(activeSegment, virtualTime)

    return activeSegment
  }

  /**
   * Neighbor Cache 확인 (인접 세그먼트 캐시)
   */
  private checkNeighborCache(virtualTime: number): VirtualSegment | null {
    // Current neighbor 확인
    if (
      this.neighborCache.current &&
      virtualTime >= this.neighborCache.current.virtualStartTime &&
      virtualTime < this.neighborCache.current.virtualEndTime
    ) {
      return this.neighborCache.current
    }

    // Next neighbor 확인
    if (
      this.neighborCache.next &&
      virtualTime >= this.neighborCache.next.virtualStartTime &&
      virtualTime < this.neighborCache.next.virtualEndTime
    ) {
      return this.neighborCache.next
    }

    // Previous neighbor 확인
    if (
      this.neighborCache.prev &&
      virtualTime >= this.neighborCache.prev.virtualStartTime &&
      virtualTime < this.neighborCache.prev.virtualEndTime
    ) {
      return this.neighborCache.prev
    }

    return null
  }

  /**
   * 스마트 캐시 업데이트 (Current + Neighbors)
   */
  private updateSmartCache(
    activeSegment: VirtualSegment | null,
    virtualTime: number
  ): void {
    this.cachedActiveSegment = activeSegment
    this.cachedVirtualTime = virtualTime
    this.lastCacheUpdateTime = performance.now()

    if (activeSegment) {
      // Neighbor Cache 업데이트
      this.updateNeighborCache(activeSegment)

      // Segment Cache Map 업데이트
      this.segmentCacheMap.set(activeSegment.id, activeSegment)
    }
  }

  /**
   * 인접 세그먼트 캐시 업데이트
   */
  private updateNeighborCache(currentSegment: VirtualSegment): void {
    const currentIndex = this.sortedActiveSegments.findIndex(
      (seg) => seg.id === currentSegment.id
    )

    if (currentIndex !== -1) {
      this.neighborCache.current = currentSegment
      this.neighborCache.prev =
        currentIndex > 0 ? this.sortedActiveSegments[currentIndex - 1] : null
      this.neighborCache.next =
        currentIndex < this.sortedActiveSegments.length - 1
          ? this.sortedActiveSegments[currentIndex + 1]
          : null

      if (this.config.debugMode && this.frameCount % 60 === 0) {
        log(
          'VirtualPlayerController',
          `Neighbor cache updated: ${this.neighborCache.prev?.id || 'none'} ← ` +
            `${this.neighborCache.current?.id || 'none'} → ${this.neighborCache.next?.id || 'none'}`
        )
      }
    }
  }

  /**
   * 세그먼트 배열이 최신인지 확인하고 필요시 업데이트
   */
  private updateSortedSegmentsIfNeeded(): void {
    const timeline = this.timelineMapper.timelineManager.getTimeline()
    const currentTimestamp = Date.now()

    // 타임라인이 변경되었거나 캐시가 없으면 재정렬
    if (
      this.segmentsSortTimestamp < timeline.lastUpdated ||
      this.sortedActiveSegments.length === 0 ||
      currentTimestamp - this.segmentsSortTimestamp > 1000
    ) {
      // 1초마다 갱신

      this.sortedActiveSegments = timeline.segments
        .filter((segment) => segment.isEnabled)
        .sort((a, b) => a.virtualStartTime - b.virtualStartTime)

      this.segmentsSortTimestamp = currentTimestamp

      if (this.config.debugMode && this.frameCount % 60 === 0) {
        log(
          'VirtualPlayerController',
          `Sorted segments updated: ${this.sortedActiveSegments.length} active segments`
        )
      }
    }
  }

  /**
   * 이진 탐색으로 활성 세그먼트 찾기 (O(log n))
   */
  private findActiveSegmentBinarySearch(
    virtualTime: number
  ): VirtualSegment | null {
    if (this.sortedActiveSegments.length === 0) {
      return null
    }

    let left = 0
    let right = this.sortedActiveSegments.length - 1
    let candidate: VirtualSegment | null = null

    // 이진 탐색
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const segment = this.sortedActiveSegments[mid]

      if (
        virtualTime >= segment.virtualStartTime &&
        virtualTime < segment.virtualEndTime
      ) {
        // 정확한 매치 찾음
        return segment
      } else if (virtualTime < segment.virtualStartTime) {
        // 더 이른 세그먼트 영역에서 찾기
        right = mid - 1
      } else {
        // 더 늦은 세그먼트 영역에서 찾기
        left = mid + 1

        // 현재 세그먼트가 candidate보다 가까우면 후보로 저장
        if (virtualTime >= segment.virtualStartTime) {
          candidate = segment
        }
      }
    }

    // 정확한 매치가 없으면 가장 가까운 후보 반환 (null일 수 있음)
    return candidate && virtualTime < candidate.virtualEndTime
      ? candidate
      : null
  }

  /**
   * 세그먼트 변경 처리 (최적화 버전)
   */
  private handleSegmentChangeOptimized(
    newSegment: VirtualSegment | null
  ): void {
    const previousSegment = this.currentActiveSegment
    this.currentActiveSegment = newSegment

    // 세그먼트 전환 시 비디오 위치 점프 처리
    if (newSegment && previousSegment && newSegment.id !== previousSegment.id) {
      this.performSegmentTransition(previousSegment, newSegment)
    } else if (newSegment && !previousSegment) {
      // 첫 번째 세그먼트 진입
      this.jumpToSegmentStart(newSegment)
    }

    // 디버그 로깅 빈도 감소
    if (this.config.debugMode && this.frameCount % 10 === 0) {
      log(
        'VirtualPlayerController',
        `Segment: ${previousSegment?.id || 'none'} → ${newSegment?.id || 'none'}`
      )
    }
  }

  /**
   * 세그먼트 전환 처리 (이전 세그먼트에서 새 세그먼트로 점프)
   */
  private performSegmentTransition(
    previousSegment: VirtualSegment,
    newSegment: VirtualSegment
  ): void {
    if (!this.video) return

    // 가상 시간에서 새 세그먼트 내 상대 위치 계산
    const virtualProgress =
      (this.currentVirtualTime - newSegment.virtualStartTime) /
      (newSegment.virtualEndTime - newSegment.virtualStartTime)

    // 새 세그먼트의 실제 시간 위치 계산
    const targetRealTime =
      newSegment.realStartTime +
      (newSegment.realEndTime - newSegment.realStartTime) * virtualProgress

    // 비디오 위치 점프
    this.video.currentTime = targetRealTime
    this.lastVideoSeekTime = performance.now()
    this.lastVideoUpdateTime = performance.now()

    if (this.config.debugMode) {
      log(
        'VirtualPlayerController',
        `Segment transition: ${previousSegment.id} → ${newSegment.id}, ` +
          `jumped to ${targetRealTime.toFixed(3)}s (progress: ${(virtualProgress * 100).toFixed(1)}%)`
      )
    }
  }

  /**
   * 세그먼트 시작점으로 점프
   */
  private jumpToSegmentStart(segment: VirtualSegment): void {
    if (!this.video) return

    // 가상 시간에서 세그먼트 내 상대 위치 계산
    const virtualProgress = Math.max(
      0,
      (this.currentVirtualTime - segment.virtualStartTime) /
        (segment.virtualEndTime - segment.virtualStartTime)
    )

    // 세그먼트의 실제 시간 위치 계산
    const targetRealTime =
      segment.realStartTime +
      (segment.realEndTime - segment.realStartTime) * virtualProgress

    this.video.currentTime = targetRealTime
    this.lastVideoSeekTime = performance.now()
    this.lastVideoUpdateTime = performance.now()

    if (this.config.debugMode) {
      log(
        'VirtualPlayerController',
        `Jumped to segment ${segment.id} at ${targetRealTime.toFixed(3)}s (progress: ${(virtualProgress * 100).toFixed(1)}%)`
      )
    }
  }

  /**
   * 비디오 위치 업데이트 (예측적 Seek 최적화 버전)
   */
  private updateVideoPositionOptimized(now: DOMHighResTimeStamp): void {
    if (!this.video) return

    // CRITICAL: Don't interfere with manual seeks
    if (this._isSeeking || this.syncLock) {
      return
    }

    const activeSegment = this.currentActiveSegment

    if (activeSegment) {
      // 세그먼트 경계에서 갭 체크 - 세그먼트 종료 지점 근처에서 다음 세그먼트와의 갭 감지
      if (this.currentVirtualTime >= activeSegment.virtualEndTime - 0.01) {
        const nextSegment = this.findNextActiveSegment(this.currentVirtualTime)
        if (
          nextSegment &&
          nextSegment.virtualStartTime > activeSegment.virtualEndTime + 0.01
        ) {
          // 세그먼트 경계에서 갭 감지됨 - 갭 처리로 넘김
          log(
            'VirtualPlayerController',
            `🔍 [BOUNDARY GAP] Detected gap at segment boundary: ${activeSegment.virtualEndTime.toFixed(3)}s → ${nextSegment.virtualStartTime.toFixed(3)}s`
          )
          this.handleGapBetweenSegments()
          return
        }
      }

      // 활성 세그먼트가 있을 때: 해당 세그먼트의 실제 시간으로 비디오 재생
      const segmentProgress =
        (this.currentVirtualTime - activeSegment.virtualStartTime) /
        (activeSegment.virtualEndTime - activeSegment.virtualStartTime)

      const targetRealTime =
        activeSegment.realStartTime +
        (activeSegment.realEndTime - activeSegment.realStartTime) *
          segmentProgress

      // 예측적 Seek 최적화
      this.performSmartVideoSeek(targetRealTime, now, activeSegment)

      // 비디오가 일시정지 상태라면 재생 (isPlaying이 true일 때만)
      if (this.video.paused && this.isPlaying) {
        this.video.play().catch((error) => {
          // Only log significant errors
          if (error?.name !== 'AbortError') {
            log('VirtualPlayerController', `Video play failed: ${error}`)
          }
        })
      }
    } else {
      // 갭 구간 처리 - 세그먼트 사이의 공백에서 다음 세그먼트로 자동 스킵
      this.handleGapBetweenSegments()
    }
  }

  /**
   * 갭 구간 처리 - 세그먼트 사이의 공백에서 다음 세그먼트로 자동 스킵
   */
  private handleGapBetweenSegments(): void {
    // 다음 활성 세그먼트 찾기
    const nextSegment = this.findNextActiveSegment(this.currentVirtualTime)

    if (nextSegment) {
      log(
        'VirtualPlayerController',
        `⏭️ [GAP] Skipping gap, jumping from virtual ${this.currentVirtualTime.toFixed(3)}s to ${nextSegment.virtualStartTime.toFixed(3)}s`
      )

      // 가상 시간을 다음 세그먼트로 즉시 이동
      this.currentVirtualTime = nextSegment.virtualStartTime

      // CRITICAL: 가상 시간 진행 동기화 - 타임스탬프 재설정
      if (this.isVirtualTimeRunning) {
        this.virtualTimePausedAt = nextSegment.virtualStartTime
        this.virtualTimeStartTimestamp = performance.now() // 시작 타임스탬프 재설정
      }

      // 비디오도 해당 실제 시간으로 이동
      if (this.video && !this._isSeeking) {
        this.video.currentTime = nextSegment.realStartTime
        this.lastVideoUpdateTime = performance.now()
      }

      // 현재 활성 세그먼트 업데이트
      this.currentActiveSegment = nextSegment

      // 비디오 재생 상태 확인 및 복원
      if (this.video && this.isPlaying && this.video.paused) {
        this.video.play().catch((error) => {
          log(
            'VirtualPlayerController',
            `Failed to resume playback after gap skip: ${error}`
          )
        })
      }

      // 즉시 콜백 알림으로 UI 동기화
      this.notifyTimeUpdateCallbacks(this.currentVirtualTime)
      this.notifyMotionTextSeekCallbacks(this.currentVirtualTime)

      // UI 업데이트를 위한 이벤트 발송
      window.dispatchEvent(
        new CustomEvent('gapSkipped', {
          detail: {
            fromVirtualTime: this.currentVirtualTime,
            toVirtualTime: nextSegment.virtualStartTime,
            realTime: nextSegment.realStartTime,
            segmentId: nextSegment.id,
          },
        })
      )
    } else {
      // 더 이상 세그먼트가 없으면 재생 완료 처리
      if (this.video && !this.video.paused) {
        this.video.pause()
        log(
          'VirtualPlayerController',
          '🏁 [GAP] No more segments, playback completed'
        )
      }
    }
  }

  /**
   * 현재 가상 시간 이후의 다음 활성 세그먼트 찾기
   */
  private findNextActiveSegment(
    currentVirtualTime: number
  ): VirtualSegment | null {
    const timeline = this.timelineMapper.timelineManager.getTimeline()
    const segments = timeline.segments.filter((s) => s.isEnabled)

    // 가상 시간 순으로 정렬하여 다음 세그먼트 찾기
    const sortedSegments = segments.sort(
      (a, b) => a.virtualStartTime - b.virtualStartTime
    )

    return (
      sortedSegments.find(
        (segment) => segment.virtualStartTime > currentVirtualTime
      ) || null
    )
  }

  /**
   * 스마트 비디오 Seek (예측적 + 자연 재생 우선)
   */
  private performSmartVideoSeek(
    targetRealTime: number,
    now: DOMHighResTimeStamp,
    activeSegment: VirtualSegment
  ): void {
    if (!this.video) return

    const currentVideoTime = this.video.currentTime
    const timeDifference = Math.abs(currentVideoTime - targetRealTime)
    const timeSinceLastSeek = now - this.lastVideoSeekTime

    // 자연스러운 재생 허용 영역 (동기화 임계값 이내)
    const isWithinNaturalPlaybackRange =
      currentVideoTime >= activeSegment.realStartTime &&
      currentVideoTime <= activeSegment.realEndTime &&
      timeDifference < VirtualPlayerController.SYNC_THRESHOLD_SECONDS

    // Seek 필요성 판단
    const shouldSeek = this.shouldPerformVideoSeek(
      timeDifference,
      timeSinceLastSeek,
      0, // timeSinceLastUpdate 제거 (사용하지 않음)
      isWithinNaturalPlaybackRange
    )

    if (shouldSeek) {
      // predictiveOffset 제거하고 직접 설정 (정확도 우선)
      this.video.currentTime = targetRealTime
      this.lastVideoSeekTime = now
      this.lastVideoUpdateTime = now
      this.videoSeekTargetTime = targetRealTime
      this.isVideoSeeking = true

      if (this.config.debugMode) {
        log(
          'VirtualPlayerController',
          `Precise seek: ${targetRealTime.toFixed(3)}s (diff: ${timeDifference.toFixed(3)}s)`
        )
      }
    }
  }

  /**
   * Seek 필요성 판단 (정확한 동기화 우선 - 33ms 기준)
   */
  private shouldPerformVideoSeek(
    timeDifference: number,
    timeSinceLastSeek: number,
    timeSinceLastUpdate: number,
    isWithinNaturalPlaybackRange: boolean
  ): boolean {
    // 자연스러운 재생 범위 내에서는 Seek 하지 않음
    if (isWithinNaturalPlaybackRange) {
      return false
    }

    // 동기화 임계값 이상 차이면 즉시 보정
    if (timeDifference > VirtualPlayerController.SYNC_THRESHOLD_SECONDS) {
      return true
    }

    // 연속된 Seek 방지
    if (timeSinceLastSeek < VirtualPlayerController.SEEK_THROTTLE_MS) {
      return false
    }

    return false
  }

  /**
   * 예측적 Seek 오프셋 계산
   */
  private calculatePredictiveOffset(activeSegment: VirtualSegment): number {
    if (!this.video) return 0

    // 재생 속도에 따른 기본 오프셋
    const baseOffset = (this.playbackRate - 1) * 0.1 // 재생 속도가 빠를수록 더 많이 앞서감

    // 세그먼트 길이에 따른 조정
    const segmentDuration =
      activeSegment.realEndTime - activeSegment.realStartTime
    const segmentFactor = Math.min(segmentDuration / 10, 0.05) // 최대 50ms

    // 현재 적응형 프레임 레이트에 따른 조정 (낮은 fps에서는 더 많은 예측 필요)
    const frameTimeDelta = this.currentFrameProcessingDebounceMs / 1000
    const frameFactor = frameTimeDelta * this.playbackRate

    return baseOffset + segmentFactor + frameFactor
  }

  /**
   * 콜백 호출 최적화 (배치 처리 버전)
   */
  private notifyCallbacksOptimized(
    now: DOMHighResTimeStamp,
    activeSegment: VirtualSegment | null,
    metadata: RVFCMetadata
  ): void {
    // throttling: 5ms마다만 콜백 호출 (더 반응적)
    const timeSinceLastCallback = now - this.lastCallbackTime
    if (timeSinceLastCallback < this.callbackThrottleMs) {
      // 빈번한 업데이트는 배치 처리로 대기
      this.enqueueBatchedCallbacks(metadata)
      return
    }

    // 즉시 콜백 호출
    this.executeBatchedCallbacks(now, activeSegment, metadata)
  }

  /**
   * 콜백 배치 큐에 추가
   */
  private enqueueBatchedCallbacks(metadata: RVFCMetadata): void {
    // 최신 데이터로 업데이트 (overwrite 방식) - Object Pooling 적용
    this.pendingCallbacks.frameData = this.createPooledFrameData(
      this.currentVirtualTime,
      this.video!.currentTime,
      metadata.expectedDisplayTime
    )
    this.pendingCallbacks.timeUpdate = this.currentVirtualTime
    this.pendingCallbacks.motionTextSeek = this.currentVirtualTime

    // 배치 실행이 예약되지 않았으면 예약
    if (!this.callbackBatchScheduled) {
      this.callbackBatchScheduled = true

      // 다음 마이크로태스크에서 실행 (더 빠른 배치 처리)
      Promise.resolve().then(() => {
        this.flushBatchedCallbacks()
      })
    }
  }

  /**
   * 배치된 콜백 즉시 실행
   */
  private executeBatchedCallbacks(
    now: DOMHighResTimeStamp,
    activeSegment: VirtualSegment | null,
    metadata: RVFCMetadata
  ): void {
    // Object Pooling으로 frame data 생성
    const frameData = this.createPooledFrameData(
      this.currentVirtualTime,
      this.video!.currentTime,
      metadata.expectedDisplayTime
    )

    // 콜백 호출
    this.notifyFrameCallbacks(frameData)
    this.notifyTimeUpdateCallbacks(this.currentVirtualTime)
    this.notifyMotionTextSeekCallbacks(this.currentVirtualTime)

    this.lastCallbackTime = now

    // 강화된 디버깅 정보
    if (this.config.debugMode && this.frameCount % 30 === 0) {
      const syncStatus = activeSegment ? 'synced' : 'empty'
      const timeDiff = activeSegment
        ? Math.abs(
            this.video!.currentTime -
              (activeSegment.realStartTime +
                (this.currentVirtualTime - activeSegment.virtualStartTime))
          )
        : 0

      const cacheHitRate =
        this.cacheHitCount + this.cacheMissCount > 0
          ? (
              (this.cacheHitCount /
                (this.cacheHitCount + this.cacheMissCount)) *
              100
            ).toFixed(1)
          : '0'

      log(
        'VirtualPlayerController',
        `Status: ${syncStatus}, VTime: ${this.currentVirtualTime.toFixed(3)}s, ` +
          `RTime: ${this.video!.currentTime.toFixed(3)}s, Diff: ${timeDiff.toFixed(3)}s, ` +
          `Cache Hit Rate: ${cacheHitRate}%, Pool Size: ${this.frameDataPool.length}`
      )
    }
  }

  /**
   * 배치된 콜백 플러시
   */
  private flushBatchedCallbacks(): void {
    if (
      !this.callbackBatchScheduled ||
      Object.keys(this.pendingCallbacks).length === 0
    ) {
      this.callbackBatchScheduled = false
      return
    }

    // 배치된 콜백 실행
    if (this.pendingCallbacks.frameData) {
      this.notifyFrameCallbacks(this.pendingCallbacks.frameData)
      // 사용된 frameData를 풀로 반환
      this.returnFrameDataToPool(this.pendingCallbacks.frameData)
    }
    if (this.pendingCallbacks.timeUpdate !== undefined) {
      this.notifyTimeUpdateCallbacks(this.pendingCallbacks.timeUpdate)
    }
    if (this.pendingCallbacks.motionTextSeek !== undefined) {
      this.notifyMotionTextSeekCallbacks(this.pendingCallbacks.motionTextSeek)
    }

    // 배치 상태 초기화
    this.pendingCallbacks = {}
    this.callbackBatchScheduled = false
    this.lastCallbackTime = performance.now()

    if (this.config.debugMode && this.frameCount % 60 === 0) {
      log('VirtualPlayerController', 'Batched callbacks flushed')
    }
  }

  /**
   * Object Pooling - 풀에서 VirtualFrameData 가져오기 또는 생성
   */
  private createPooledFrameData(
    virtualTime: number,
    mediaTime: number,
    displayTime: DOMHighResTimeStamp
  ): VirtualFrameData {
    // 재사용 가능한 객체가 있으면 재사용
    if (this.reusableFrameData) {
      const frameData = this.reusableFrameData
      this.reusableFrameData = null

      // 기존 객체 재활용 (속성 업데이트)
      frameData.virtualTime = virtualTime
      frameData.mediaTime = mediaTime
      frameData.displayTime = displayTime
      frameData.activeSegments =
        this.timelineMapper.timelineManager.getActiveSegments(virtualTime)

      return frameData
    }

    // 풀에서 가져오기
    let frameData = this.frameDataPool.pop()

    if (!frameData) {
      // 풀이 비어있으면 새로 생성
      frameData = this.timelineMapper.createVirtualFrameData(
        virtualTime,
        mediaTime,
        displayTime
      )
    } else {
      // 풀에서 가져온 객체 재활용
      frameData.virtualTime = virtualTime
      frameData.mediaTime = mediaTime
      frameData.displayTime = displayTime
      frameData.activeSegments =
        this.timelineMapper.timelineManager.getActiveSegments(virtualTime)
    }

    return frameData
  }

  /**
   * Object Pooling - VirtualFrameData를 풀로 반환
   */
  private returnFrameDataToPool(frameData: VirtualFrameData): void {
    // 풀 크기 제한
    if (this.frameDataPool.length < this.maxPoolSize) {
      // activeSegments 배열 클리어 (메모리 누수 방지)
      frameData.activeSegments = []
      this.frameDataPool.push(frameData)
    } else {
      // 풀이 가득 찼으면 재사용 객체로 저장
      frameData.activeSegments = []
      this.reusableFrameData = frameData
    }
  }

  /**
   * Object Pool 정리 (메모리 최적화)
   */
  private clearObjectPools(): void {
    this.frameDataPool = []
    this.reusableFrameData = null

    this.logDebug('minimal', 'Object pools cleared')
  }

  /**
   * 최적화된 디버그 로깅 (레벨별, 배치 처리)
   */
  private logDebug(level: 'minimal' | 'verbose', message: string): void {
    if (this.debugLevel === 'none') return

    // 레벨 체크
    if (level === 'verbose' && this.debugLevel !== 'verbose') return

    const logMessage = `[VirtualPlayerController] ${message}`

    // 즉시 로깅 (minimal) 또는 배치 로깅 (verbose)
    if (level === 'minimal') {
      log('VirtualPlayerController', message)
    } else {
      this.debugLogQueue.push(logMessage)
      this.scheduleDebugFlush()
    }
  }

  /**
   * 디버그 로그 배치 플러시 예약
   */
  private scheduleDebugFlush(): void {
    const now = performance.now()

    if (now - this.lastDebugFlush > this.debugFlushInterval) {
      this.flushDebugLogs()
    }
  }

  /**
   * 배치된 디버그 로그 플러시
   */
  private flushDebugLogs(): void {
    if (this.debugLogQueue.length === 0) return

    // 배치로 로그 출력
    const batchMessage = this.debugLogQueue.join('\n')
    console.group('VirtualPlayerController Debug Batch')
    console.log(batchMessage)
    console.groupEnd()

    this.debugLogQueue = []
    this.lastDebugFlush = performance.now()
  }

  /**
   * 디버그 레벨 변경
   */
  setDebugLevel(level: 'none' | 'minimal' | 'verbose'): void {
    this.debugLevel = level
    this.logDebug('minimal', `Debug level set to: ${level}`)
  }

  /**
   * Get current real time based on virtual time mapping
   */
  getCurrentRealTime(): number {
    if (!this.video) return 0

    const activeSegment = this.currentActiveSegment
    if (!activeSegment) return this.video.currentTime

    const segmentProgress =
      (this.currentVirtualTime - activeSegment.virtualStartTime) /
      (activeSegment.virtualEndTime - activeSegment.virtualStartTime)

    const realTime =
      activeSegment.realStartTime +
      (activeSegment.realEndTime - activeSegment.realStartTime) *
        segmentProgress

    return realTime
  }

  /**
   * Convert virtual time to real time
   */
  virtualToReal(virtualTime: number): number {
    const segments = this.timelineMapper.timelineManager.getTimeline().segments
    const activeSegments = segments.filter((s) => s.isEnabled)

    for (const segment of activeSegments) {
      if (
        virtualTime >= segment.virtualStartTime &&
        virtualTime <= segment.virtualEndTime
      ) {
        const segmentProgress =
          (virtualTime - segment.virtualStartTime) /
          (segment.virtualEndTime - segment.virtualStartTime)

        return (
          segment.realStartTime +
          (segment.realEndTime - segment.realStartTime) * segmentProgress
        )
      }
    }

    return 0
  }

  /**
   * Convert real time to virtual time (reverse mapping)
   */
  realToVirtual(realTime: number): number {
    const segments = this.timelineMapper.timelineManager.getTimeline().segments
    const activeSegments = segments.filter((s) => s.isEnabled)

    for (const segment of activeSegments) {
      if (
        realTime >= segment.realStartTime &&
        realTime <= segment.realEndTime
      ) {
        const segmentProgress =
          (realTime - segment.realStartTime) /
          (segment.realEndTime - segment.realStartTime)

        return (
          segment.virtualStartTime +
          (segment.virtualEndTime - segment.virtualStartTime) * segmentProgress
        )
      }
    }

    // If real time is outside any segment, try to estimate
    if (activeSegments.length > 0) {
      const firstSegment = activeSegments[0]
      const lastSegment = activeSegments[activeSegments.length - 1]

      if (realTime < firstSegment.realStartTime) {
        // Before first segment
        return 0
      } else if (realTime > lastSegment.realEndTime) {
        // After last segment
        return lastSegment.virtualEndTime
      }
    }

    return realTime // Fallback to 1:1 mapping
  }

  /**
   * Update virtual time based on video playback (for bidirectional sync)
   * Called during natural video playback to keep virtual timeline in sync
   */
  updateVirtualTimeFromVideo(realTime: number): void {
    // Don't update if we're in the middle of a seek operation
    if (this._isSeeking) {
      return
    }

    // Convert real time to virtual time
    const newVirtualTime = this.realToVirtual(realTime)

    // Only update if there's a significant change (>100ms)
    if (Math.abs(newVirtualTime - this.currentVirtualTime) > 0.1) {
      this.currentVirtualTime = newVirtualTime

      // Update virtual time tracking
      if (this.isVirtualTimeRunning) {
        this.virtualTimePausedAt = newVirtualTime
        this.virtualTimeStartTimestamp = performance.now()
      }

      // Notify callbacks about the time update
      this.notifyTimeUpdateCallbacks(newVirtualTime)
      this.notifyMotionTextSeekCallbacks(newVirtualTime)

      // Find and update current segment
      const activeSegment = this.findActiveSegmentAtVirtualTime(newVirtualTime)
      if (activeSegment !== this.currentActiveSegment) {
        this.currentActiveSegment = activeSegment
      }

      // Log sync update periodically
      if (this.frameCount % 60 === 0) {
        log(
          'VirtualPlayerController',
          `[SYNC] Updated virtual time from video: real=${realTime.toFixed(3)}s → virtual=${newVirtualTime.toFixed(3)}s`
        )
      }
    }
  }

  /**
   * Getter for isSeeking flag (for external use)
   */
  get isSeeking(): boolean {
    return this._isSeeking
  }

  /**
   * 현재 가상 시간에 따른 비디오 위치 업데이트 (레거시 - 호환성용)
   */
  private updateVideoPositionFromVirtualTime(): void {
    // 최적화된 버전으로 리다이렉트
    this.updateVideoPositionOptimized(performance.now())
  }

  /**
   * 디버그 정보
   */
  getDebugInfo(): object {
    return {
      isRVFCActive: this.isRVFCActive,
      currentVirtualTime: this.currentVirtualTime,
      isPlaying: this.isPlaying,
      playbackRate: this.playbackRate,
      frameCount: this.frameCount,
      isVirtualTimeRunning: this.isVirtualTimeRunning,
      virtualTimePausedAt: this.virtualTimePausedAt,
      currentActiveSegment: this.currentActiveSegment?.id || null,
      lastVirtualTimeProcessed: this.lastVirtualTimeProcessed,
      frameProcessingDebounceMs: this.currentFrameProcessingDebounceMs,
      callbackCounts: {
        frame: this.frameCallbacks.size,
        play: this.playCallbacks.size,
        pause: this.pauseCallbacks.size,
        seek: this.seekCallbacks.size,
        motionTextSeek: this.motionTextSeekCallbacks.size,
      },
      segmentController: this.segmentController.getDebugInfo(),
    }
  }
}
