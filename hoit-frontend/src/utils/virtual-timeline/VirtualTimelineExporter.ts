/**
 * Virtual Timeline Exporter
 * Virtual Timeline의 편집 결과를 표준 timeline.json 형식으로 export
 * Frame-by-frame export engine과 연동하여 비파괴 편집 결과를 최종 렌더링
 */

import { log } from '@/utils/logger'
import { ClipItem } from '@/app/(route)/editor/types'
import { VirtualTimelineManager } from './VirtualTimeline'
import { ECGTimelineMapper } from './ECGTimelineMapper'
import {
  TimelineJSON,
  CutEditOperation,
  SplitOperation,
  DeleteOperation,
  MoveOperation,
  VirtualTimelineConfig,
} from './types'

/**
 * Export 설정
 */
export interface ExportConfig {
  frameRate: number
  videoCodec: string
  audioCodec: string
  videoBitrate: number
  audioBitrate: number
  resolution: {
    width: number
    height: number
  }
  includeSubtitles: boolean
  includeEffects: boolean
  outputFormat: 'mp4' | 'mov' | 'webm'
}

/**
 * Export 진행 상태
 */
export interface ExportProgress {
  phase:
    | 'preparing'
    | 'rendering'
    | 'encoding'
    | 'finalizing'
    | 'completed'
    | 'error'
  progress: number // 0-100
  currentSegment: number
  totalSegments: number
  estimatedTimeRemaining?: number
  message?: string
  error?: string
}

/**
 * Frame-by-Frame Export 세그먼트
 */
export interface ExportSegment {
  id: string
  virtualStartTime: number
  virtualEndTime: number
  realStartTime: number
  realEndTime: number
  sourceClipId: string
  sourceClip: ClipItem
  effects: Array<{
    pluginName: string
    parameters: Record<string, unknown>
  }>
  renderOrder: number
}

export type ExportProgressCallback = (progress: ExportProgress) => void

export class VirtualTimelineExporter {
  private timelineManager: VirtualTimelineManager
  private timelineMapper: ECGTimelineMapper
  private config: VirtualTimelineConfig

  // Export 상태
  private isExporting: boolean = false
  private exportProgress: ExportProgress = {
    phase: 'preparing',
    progress: 0,
    currentSegment: 0,
    totalSegments: 0,
  }

  // 콜백들
  private progressCallbacks: Set<ExportProgressCallback> = new Set()

  constructor(
    timelineManager: VirtualTimelineManager,
    timelineMapper: ECGTimelineMapper,
    config: VirtualTimelineConfig
  ) {
    this.timelineManager = timelineManager
    this.timelineMapper = timelineMapper
    this.config = config

    log('VirtualTimelineExporter', 'Initialized')
  }

  /**
   * Timeline JSON 생성
   */
  exportTimelineJSON(): TimelineJSON {
    log('VirtualTimelineExporter', 'Generating timeline JSON')

    const timeline = this.timelineManager.getTimeline()
    const editHistory = this.timelineManager.getEditHistory()
    const exportSegments = this.generateExportSegments()

    const timelineJSON: TimelineJSON = {
      version: '1.0',
      metadata: {
        created: new Date().toISOString(),
        duration: timeline.duration,
        frameRate: this.config.frameRate,
        totalSegments: exportSegments.length,
      },
      source: {
        videoPath: '', // 실제 export 시 설정
        originalDuration: this.calculateOriginalDuration(),
      },
      segments: exportSegments.map((segment) => ({
        id: segment.id,
        virtualStart: segment.virtualStartTime,
        virtualEnd: segment.virtualEndTime,
        realStart: segment.realStartTime,
        realEnd: segment.realEndTime,
        sourceClipId: segment.sourceClipId,
        type: this.getSegmentType(segment.sourceClipId, editHistory),
      })),
      cutEdits: this.extractCutEdits(editHistory),
      effects: exportSegments.flatMap((segment) =>
        segment.effects.map((effect) => ({
          segmentId: segment.id,
          pluginName: effect.pluginName,
          parameters: effect.parameters,
        }))
      ),
    }

    log(
      'VirtualTimelineExporter',
      `Timeline JSON generated: ${exportSegments.length} segments`
    )
    return timelineJSON
  }

  /**
   * Frame-by-Frame Export 실행
   */
  async exportVideo(
    config: ExportConfig,
    outputPath: string,
    videoElement: HTMLVideoElement
  ): Promise<void> {
    if (this.isExporting) {
      throw new Error('Export already in progress')
    }

    this.isExporting = true
    this.resetProgress()

    try {
      log('VirtualTimelineExporter', 'Starting frame-by-frame export')

      // Phase 1: 준비
      this.updateProgress({
        phase: 'preparing',
        progress: 0,
        message: 'Preparing export...',
      })
      const exportSegments = this.generateExportSegments()
      // Timeline JSON for metadata (optional)
      // const timelineJSON = this.exportTimelineJSON()

      // Phase 2: 렌더링 준비
      this.updateProgress({
        phase: 'rendering',
        progress: 5,
        totalSegments: exportSegments.length,
        message: 'Initializing frame renderer...',
      })

      // Canvas 및 렌더링 컨텍스트 준비
      const canvas = document.createElement('canvas')
      canvas.width = config.resolution.width
      canvas.height = config.resolution.height
      const ctx = canvas.getContext('2d')!

      // WebCodecs VideoEncoder 준비 (브라우저 지원 시)
      const encoder = await this.createVideoEncoder(config)

      // Phase 3: 세그먼트별 프레임 렌더링
      for (let i = 0; i < exportSegments.length; i++) {
        const segment = exportSegments[i]

        this.updateProgress({
          phase: 'rendering',
          progress: 10 + (i / exportSegments.length) * 70,
          currentSegment: i + 1,
          message: `Rendering segment ${i + 1}/${exportSegments.length}`,
        })

        await this.renderSegment(
          segment,
          videoElement,
          canvas,
          ctx,
          encoder,
          config
        )
      }

      // Phase 4: 인코딩 완료
      this.updateProgress({
        phase: 'encoding',
        progress: 85,
        message: 'Finalizing video encoding...',
      })

      await this.finalizeEncoding(encoder, outputPath)

      // Phase 5: 완료
      this.updateProgress({
        phase: 'completed',
        progress: 100,
        message: 'Export completed successfully',
      })

      log(
        'VirtualTimelineExporter',
        'Frame-by-frame export completed successfully'
      )
    } catch (error) {
      this.updateProgress({
        phase: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown export error',
      })

      log('VirtualTimelineExporter', 'Export failed:', error)
      throw error
    } finally {
      this.isExporting = false
    }
  }

  /**
   * Export 세그먼트 생성
   */
  private generateExportSegments(): ExportSegment[] {
    const playbackSegments = this.timelineMapper.generateExportSegments()

    return playbackSegments.map((segment, index) => ({
      id: `export_segment_${index}`,
      virtualStartTime: segment.virtualStartTime,
      virtualEndTime: segment.virtualEndTime,
      realStartTime: segment.realStartTime,
      realEndTime: segment.realEndTime,
      sourceClipId: segment.sourceClipId,
      sourceClip: segment.sourceClip,
      effects: [], // 실제 구현에서는 플러그인 효과 추가
      renderOrder: index,
    }))
  }

  /**
   * 개별 세그먼트 렌더링
   */
  private async renderSegment(
    segment: ExportSegment,
    videoElement: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    encoder: VideoEncoder,
    config: ExportConfig
  ): Promise<void> {
    const { realStartTime, realEndTime } = segment
    const duration = realEndTime - realStartTime
    const frameCount = Math.ceil(duration * config.frameRate)

    // 세그먼트 시작 지점으로 비디오 시크
    videoElement.currentTime = realStartTime

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
      const frameTime = realStartTime + frameIndex / config.frameRate

      // 프레임 정확도를 위해 RVFC 사용 (가능한 경우)
      await this.seekAndWaitForFrame(videoElement, frameTime)

      // Canvas에 비디오 프레임 렌더링
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

      // 자막 렌더링 (config.includeSubtitles가 true인 경우)
      if (config.includeSubtitles) {
        await this.renderSubtitleOnCanvas(ctx, segment, frameTime)
      }

      // 효과 렌더링 (config.includeEffects가 true인 경우)
      if (config.includeEffects && segment.effects.length > 0) {
        await this.renderEffectsOnCanvas(ctx, segment.effects)
      }

      // 프레임을 encoder에 전달
      const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      await this.encodeFrame(encoder, frameData, frameIndex)
    }
  }

  /**
   * VideoEncoder 생성
   */
  private async createVideoEncoder(
    config: ExportConfig
  ): Promise<VideoEncoder> {
    // WebCodecs API 지원 확인
    if (typeof VideoEncoder === 'undefined') {
      throw new Error('WebCodecs API not supported')
    }

    const encoder = new VideoEncoder({
      output: (chunk: EncodedVideoChunk) => {
        // 인코딩된 청크 처리
        log(
          'VirtualTimelineExporter',
          `Encoded chunk: ${chunk.byteLength} bytes`
        )
      },
      error: (error: Error) => {
        log('VirtualTimelineExporter', 'Encoding error:', error)
        throw error
      },
    })

    encoder.configure({
      codec: config.videoCodec,
      width: config.resolution.width,
      height: config.resolution.height,
      bitrate: config.videoBitrate,
      framerate: config.frameRate,
    })

    return encoder
  }

  /**
   * 프레임 정확한 시크 및 대기
   */
  private async seekAndWaitForFrame(
    video: HTMLVideoElement,
    targetTime: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked)

        // RVFC가 지원되는 경우 사용
        if (typeof video.requestVideoFrameCallback === 'function') {
          video.requestVideoFrameCallback(() => {
            resolve()
          })
        } else {
          // 폴백: 다음 프레임까지 대기
          requestAnimationFrame(() => resolve())
        }
      }

      video.addEventListener('seeked', onSeeked)
      video.currentTime = targetTime
    })
  }

  /**
   * Canvas에 자막 렌더링
   */
  private async renderSubtitleOnCanvas(
    ctx: CanvasRenderingContext2D,
    segment: ExportSegment,
    currentTime: number
  ): Promise<void> {
    // Virtual time 변환
    const mapping = this.timelineMapper.toVirtual(currentTime)
    if (!mapping.isValid) return

    // 현재 시간에 활성화된 자막 찾기
    const clip = segment.sourceClip
    const activeWords = clip.words.filter(
      (word) => currentTime >= word.start && currentTime <= word.end
    )

    if (activeWords.length === 0) return

    // 자막 스타일 설정
    ctx.font = 'bold 24px Arial'
    ctx.fillStyle = 'white'
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 2
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'

    // 자막 텍스트 렌더링
    const subtitleText = activeWords.map((word) => word.text).join(' ')
    const x = ctx.canvas.width / 2
    const y = ctx.canvas.height - 50

    ctx.strokeText(subtitleText, x, y)
    ctx.fillText(subtitleText, x, y)
  }

  /**
   * Canvas에 효과 렌더링
   */
  private async renderEffectsOnCanvas(
    ctx: CanvasRenderingContext2D,
    effects: ExportSegment['effects']
  ): Promise<void> {
    // 효과 플러그인들을 순서대로 적용
    for (const effect of effects) {
      // 실제 구현에서는 플러그인 시스템과 연동
      log('VirtualTimelineExporter', `Applying effect: ${effect.pluginName}`)
    }
  }

  /**
   * 프레임 인코딩
   */
  private async encodeFrame(
    encoder: VideoEncoder,
    frameData: ImageData,
    frameIndex: number
  ): Promise<void> {
    // Canvas를 통해 VideoFrame 생성
    const canvas = document.createElement('canvas')
    canvas.width = frameData.width
    canvas.height = frameData.height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(frameData, 0, 0)

    const frame = new VideoFrame(canvas, {
      timestamp: frameIndex * (1000000 / this.config.frameRate), // 마이크로초
    })

    encoder.encode(frame)
    frame.close()
  }

  /**
   * 인코딩 완료 및 파일 저장
   */
  private async finalizeEncoding(
    encoder: VideoEncoder,
    outputPath: string
  ): Promise<void> {
    await encoder.flush()
    encoder.close()

    // 실제 구현에서는 파일 시스템 API 또는 다운로드 처리
    log('VirtualTimelineExporter', `Export saved to: ${outputPath}`)
  }

  /**
   * Cut Edit 추출
   */
  private extractCutEdits(editHistory: CutEditOperation[]) {
    const splits = editHistory.filter(
      (op) => op.type === 'split'
    ) as SplitOperation[]
    const deletions = editHistory.filter(
      (op) => op.type === 'delete'
    ) as DeleteOperation[]
    const moves = editHistory.filter(
      (op) => op.type === 'move'
    ) as MoveOperation[]

    return { splits, deletions, moves }
  }

  /**
   * 세그먼트 타입 결정
   */
  private getSegmentType(
    clipId: string,
    editHistory: CutEditOperation[]
  ): string {
    if (
      editHistory.some(
        (op) => op.type === 'split' && op.targetClipId === clipId
      )
    ) {
      return 'split'
    }
    if (
      editHistory.some((op) => op.type === 'move' && op.targetClipId === clipId)
    ) {
      return 'moved'
    }
    return 'normal'
  }

  /**
   * 원본 비디오 길이 계산
   */
  private calculateOriginalDuration(): number {
    const timeline = this.timelineManager.getTimeline()
    const segments = timeline.segments

    if (segments.length === 0) return 0

    return Math.max(...segments.map((s) => s.realEndTime))
  }

  /**
   * 진행 상태 업데이트
   */
  private updateProgress(update: Partial<ExportProgress>): void {
    this.exportProgress = { ...this.exportProgress, ...update }
    this.notifyProgressCallbacks()
  }

  /**
   * 진행 상태 초기화
   */
  private resetProgress(): void {
    this.exportProgress = {
      phase: 'preparing',
      progress: 0,
      currentSegment: 0,
      totalSegments: 0,
    }
  }

  /**
   * 진행 상태 콜백 등록
   */
  onProgress(callback: ExportProgressCallback): () => void {
    this.progressCallbacks.add(callback)
    return () => this.progressCallbacks.delete(callback)
  }

  /**
   * 현재 진행 상태 반환
   */
  getProgress(): ExportProgress {
    return { ...this.exportProgress }
  }

  /**
   * Export 중단
   */
  cancelExport(): void {
    if (this.isExporting) {
      this.isExporting = false
      this.updateProgress({
        phase: 'error',
        progress: 0,
        error: 'Export cancelled by user',
      })
      log('VirtualTimelineExporter', 'Export cancelled')
    }
  }

  /**
   * 리소스 정리
   */
  cleanup(): void {
    this.cancelExport()
    this.progressCallbacks.clear()
    log('VirtualTimelineExporter', 'Cleaned up')
  }

  // Private helper methods

  private notifyProgressCallbacks(): void {
    this.progressCallbacks.forEach((callback) => {
      try {
        callback(this.exportProgress)
      } catch (error) {
        log('VirtualTimelineExporter', 'Progress callback error:', error)
      }
    })
  }
}
