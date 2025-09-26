import { ClipItem, Word } from '@/app/(route)/editor/types'
import type { RendererConfigV2 } from '@/app/shared/motiontext'
import { TextMeasurementService } from '../subtitle/textMeasurement'
import { calculateMaxWidthForFontSize } from '../subtitle/safeAreaCalculator'
import { generateMergedClipId, generateSplitClipId } from './clipIdGenerator'

export enum SplitMode {
  MANUAL_HALF = 'manual_half', // 기존 수동 절반 분할
  MANUAL_POSITION = 'manual_position', // 특정 위치에서 분할
  AUTO_LINE_BREAK = 'auto_line_break', // 자동 줄바꿈 분할
  AUTO_DURATION = 'auto_duration', // 길이 기반 분할
}

export enum MergeMode {
  MANUAL = 'manual', // 수동 선택 병합
  AUTO_SHORT = 'auto_short', // 짧은 클립 자동 병합
  AUTO_SPEAKER = 'auto_speaker', // 같은 화자 자동 병합
}

export interface ProcessorConfig {
  // 공통 설정
  videoWidth?: number
  videoHeight?: number

  // 텍스트 측정 설정
  fontFamily?: string
  fontSizeRel?: number
  scenario?: RendererConfigV2 // 현재 시나리오 (safe area 설정 포함)

  // 시간 기반 설정
  minClipDuration?: number
  maxClipDuration?: number

  // 병합 설정
  mergeSameSpeaker?: boolean
  mergeThreshold?: number
}

export class UnifiedClipProcessor {
  private textMeasurer: TextMeasurementService
  private defaultConfig: ProcessorConfig = {
    videoWidth: 1920,
    videoHeight: 1080,
    fontFamily: 'Arial, sans-serif',
    fontSizeRel: 0.05,
    scenario: undefined, // 외부에서 주입
    minClipDuration: 0.5,
    maxClipDuration: 5,
    mergeSameSpeaker: true,
    mergeThreshold: 0.1, // 0.1초 간격 이내면 병합 가능
  }

  constructor() {
    this.textMeasurer = new TextMeasurementService()
  }

  /**
   * 통합 분할 메서드 - 모든 분할 작업의 진입점
   */
  split(
    clip: ClipItem,
    mode: SplitMode = SplitMode.MANUAL_HALF,
    config?: Partial<ProcessorConfig>,
    position?: number // word index for MANUAL_POSITION mode
  ): ClipItem[] {
    const mergedConfig = { ...this.defaultConfig, ...config }

    switch (mode) {
      case SplitMode.MANUAL_HALF:
        return this.splitManualHalf(clip)

      case SplitMode.MANUAL_POSITION:
        if (position === undefined) {
          throw new Error('Position required for manual position split')
        }
        return this.splitAtPosition(clip, position)

      case SplitMode.AUTO_LINE_BREAK:
        return this.splitByLineWidth(clip, mergedConfig)

      case SplitMode.AUTO_DURATION:
        return this.splitByDuration(clip, mergedConfig)

      default:
        throw new Error(`Unknown split mode: ${mode}`)
    }
  }

  /**
   * 통합 병합 메서드 - 모든 병합 작업의 진입점
   */
  merge(
    clips: ClipItem[],
    mode: MergeMode = MergeMode.MANUAL,
    config?: Partial<ProcessorConfig>
  ): ClipItem[] {
    const mergedConfig = { ...this.defaultConfig, ...config }

    switch (mode) {
      case MergeMode.MANUAL:
        return this.mergeManual(clips)

      case MergeMode.AUTO_SHORT:
        return this.mergeShortClips(clips, mergedConfig)

      case MergeMode.AUTO_SPEAKER:
        return this.mergeBySpeaker(clips, mergedConfig)

      default:
        throw new Error(`Unknown merge mode: ${mode}`)
    }
  }

  /**
   * 일괄 처리 파이프라인 - 복합 작업용
   */
  processPipeline(
    clips: ClipItem[],
    operations: Array<{
      type: 'split' | 'merge'
      mode: SplitMode | MergeMode
      filter?: (clip: ClipItem) => boolean
      config?: Partial<ProcessorConfig>
    }>
  ): ClipItem[] {
    let result = [...clips]

    for (const op of operations) {
      if (op.type === 'split') {
        result = result.flatMap((clip) => {
          if (op.filter && !op.filter(clip)) {
            return [clip]
          }
          return this.split(clip, op.mode as SplitMode, op.config)
        })
      } else if (op.type === 'merge') {
        const toMerge = op.filter ? result.filter(op.filter) : result
        const notToMerge = op.filter ? result.filter((c) => !op.filter!(c)) : []
        const merged = this.merge(toMerge, op.mode as MergeMode, op.config)
        result = [...notToMerge, ...merged]
      }
    }

    return this.reorderClipNumbers(result)
  }

  // === 기존 기능 구현 (Backward Compatibility) ===

  /**
   * 수동 절반 분할 (기존 splitClip 대체)
   */
  private splitManualHalf(clip: ClipItem): ClipItem[] {
    if (clip.words.length <= 1) {
      throw new Error('단어가 2개 이상이어야 나눌 수 있습니다.')
    }

    const midIndex = Math.ceil(clip.words.length / 2)
    const firstWords = clip.words.slice(0, midIndex)
    const secondWords = clip.words.slice(midIndex)

    return [
      this.createSubClip(clip, firstWords, 0),
      this.createSubClip(clip, secondWords, 1),
    ]
  }

  /**
   * 특정 위치에서 분할
   */
  private splitAtPosition(clip: ClipItem, position: number): ClipItem[] {
    if (position <= 0 || position >= clip.words.length) {
      throw new Error('유효하지 않은 분할 위치입니다.')
    }

    const firstWords = clip.words.slice(0, position)
    const secondWords = clip.words.slice(position)

    return [
      this.createSubClip(clip, firstWords, 0),
      this.createSubClip(clip, secondWords, 1),
    ]
  }

  /**
   * 자동 줄바꿈 분할 (새 기능)
   */
  private splitByLineWidth(
    clip: ClipItem,
    config: ProcessorConfig
  ): ClipItem[] {
    const maxWidth = calculateMaxWidthForFontSize(
      config.fontSizeRel!,
      config.videoWidth!,
      config.videoHeight!,
      config.scenario
    )

    const measureConfig = {
      fontFamily: config.fontFamily!,
      fontSizeRel: config.fontSizeRel!,
      videoWidth: config.videoWidth!,
      videoHeight: config.videoHeight!,
    }

    const resultClips: ClipItem[] = []
    let currentWords: Word[] = []
    let currentWidth = 0

    for (const word of clip.words) {
      const wordWidth = this.textMeasurer.measureTextWidth(
        word.text,
        measureConfig
      )
      const spaceWidth =
        currentWords.length > 0
          ? this.textMeasurer.measureTextWidth(' ', measureConfig)
          : 0
      const totalWidth = currentWidth + spaceWidth + wordWidth

      if (totalWidth > maxWidth && currentWords.length > 0) {
        resultClips.push(
          this.createSubClip(clip, currentWords, resultClips.length)
        )
        currentWords = [word]
        currentWidth = wordWidth
      } else {
        currentWords.push(word)
        currentWidth = totalWidth
      }
    }

    if (currentWords.length > 0) {
      resultClips.push(
        this.createSubClip(clip, currentWords, resultClips.length)
      )
    }

    return resultClips.length > 0 ? resultClips : [clip]
  }

  /**
   * 길이 기반 분할
   */
  private splitByDuration(clip: ClipItem, config: ProcessorConfig): ClipItem[] {
    const maxDuration = config.maxClipDuration || 5
    const clipDuration = this.calculateDuration(clip.words)

    if (clipDuration <= maxDuration) {
      return [clip]
    }

    const targetClips = Math.ceil(clipDuration / maxDuration)
    const wordsPerClip = Math.ceil(clip.words.length / targetClips)
    const result: ClipItem[] = []

    for (let i = 0; i < clip.words.length; i += wordsPerClip) {
      const words = clip.words.slice(i, i + wordsPerClip)
      result.push(this.createSubClip(clip, words, result.length))
    }

    return result
  }

  /**
   * 수동 병합 (기존 mergeClips 대체)
   */
  private mergeManual(clips: ClipItem[]): ClipItem[] {
    if (clips.length === 0) return []
    if (clips.length === 1) return clips

    // Word ID는 유지 - 애니메이션 트랙 보존을 위해
    const mergedWords = clips.flatMap((clip) => clip.words)

    const firstClip = clips[0]
    const mergedClip: ClipItem = {
      ...firstClip,
      id: generateMergedClipId(),
      words: mergedWords,
      subtitle: mergedWords.map((w) => w.text).join(' '),
      fullText: mergedWords.map((w) => w.text).join(' '),
      duration: this.formatDuration(this.calculateDuration(mergedWords)),
      startTime: mergedWords[0]?.start,
      endTime: mergedWords[mergedWords.length - 1]?.end,
    }

    return [mergedClip]
  }

  /**
   * 짧은 클립 자동 병합
   */
  private mergeShortClips(
    clips: ClipItem[],
    config: ProcessorConfig
  ): ClipItem[] {
    const minDuration = config.minClipDuration || 0.5
    const result: ClipItem[] = []
    let buffer: ClipItem[] = []
    let currentSpeaker: string | undefined = undefined

    for (const clip of clips) {
      const clipDuration = this.calculateDuration(clip.words)
      const clipSpeaker = clip.speaker

      // 화자가 바뀌면 버퍼를 비우고 새로 시작
      if (buffer.length > 0 && clipSpeaker !== currentSpeaker) {
        result.push(...this.mergeManual(buffer))
        buffer = []
        currentSpeaker = undefined
      }

      if (clipDuration < minDuration) {
        buffer.push(clip)
        currentSpeaker = clipSpeaker
      } else {
        if (buffer.length > 0) {
          result.push(...this.mergeManual(buffer))
          buffer = []
          currentSpeaker = undefined
        }
        result.push(clip)
      }
    }

    if (buffer.length > 0) {
      result.push(...this.mergeManual(buffer))
    }

    return result
  }

  /**
   * 같은 화자별 병합
   */
  private mergeBySpeaker(
    clips: ClipItem[],
    config: ProcessorConfig
  ): ClipItem[] {
    if (!config.mergeSameSpeaker) return clips

    const result: ClipItem[] = []
    let speakerGroup: ClipItem[] = []
    let currentSpeaker: string | null = null

    for (const clip of clips) {
      if (clip.speaker === currentSpeaker) {
        speakerGroup.push(clip)
      } else {
        if (speakerGroup.length > 0) {
          result.push(...this.mergeWithMaxWidth(speakerGroup, config))
        }
        speakerGroup = [clip]
        currentSpeaker = clip.speaker
      }
    }

    if (speakerGroup.length > 0) {
      result.push(...this.mergeWithMaxWidth(speakerGroup, config))
    }

    return result
  }

  /**
   * 최대 너비를 고려한 병합
   */
  private mergeWithMaxWidth(
    clips: ClipItem[],
    config: ProcessorConfig
  ): ClipItem[] {
    const maxWidth = calculateMaxWidthForFontSize(
      config.fontSizeRel!,
      config.videoWidth!,
      config.videoHeight!,
      config.scenario
    )

    const result: ClipItem[] = []
    let buffer: ClipItem[] = []
    let bufferWidth = 0

    for (const clip of clips) {
      const clipText = clip.words.map((w) => w.text).join(' ')
      const clipWidth = this.textMeasurer.measureTextWidth(clipText, {
        fontFamily: config.fontFamily!,
        fontSizeRel: config.fontSizeRel!,
        videoWidth: config.videoWidth!,
        videoHeight: config.videoHeight!,
      })

      if (buffer.length > 0) {
        const spaceWidth = this.textMeasurer.measureTextWidth(' ', {
          fontFamily: config.fontFamily!,
          fontSizeRel: config.fontSizeRel!,
          videoWidth: config.videoWidth!,
          videoHeight: config.videoHeight!,
        })

        if (bufferWidth + spaceWidth + clipWidth <= maxWidth) {
          buffer.push(clip)
          bufferWidth += spaceWidth + clipWidth
        } else {
          result.push(...this.mergeManual(buffer))
          buffer = [clip]
          bufferWidth = clipWidth
        }
      } else {
        buffer.push(clip)
        bufferWidth = clipWidth
      }
    }

    if (buffer.length > 0) {
      result.push(...this.mergeManual(buffer))
    }

    return result
  }

  // === 유틸리티 메서드 ===

  private createSubClip(
    originalClip: ClipItem,
    words: Word[],
    index: number
  ): ClipItem {
    const clipId = generateSplitClipId(originalClip.id, index)

    // Word ID는 유지 - 애니메이션 트랙 보존을 위해
    const updatedWords = words

    const duration = this.calculateDuration(words)

    return {
      ...originalClip,
      id: clipId,
      words: updatedWords,
      subtitle: words.map((w) => w.text).join(' '),
      fullText: words.map((w) => w.text).join(' '),
      duration: this.formatDuration(duration),
      startTime: words[0]?.start,
      endTime: words[words.length - 1]?.end,
    }
  }

  private calculateDuration(words: Word[]): number {
    if (words.length === 0) return 0
    return words[words.length - 1].end - words[0].start
  }

  private formatDuration(seconds: number): string {
    return `${seconds.toFixed(3)}초`
  }

  private reorderClipNumbers(clips: ClipItem[]): ClipItem[] {
    return clips.map((clip, index) => ({
      ...clip,
      timeline: (index + 1).toString(),
    }))
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.textMeasurer.dispose()
  }
}

// 싱글톤 인스턴스
export const clipProcessor = new UnifiedClipProcessor()
