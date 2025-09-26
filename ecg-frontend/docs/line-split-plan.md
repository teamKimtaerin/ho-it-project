<!-- - 글꼴, 글자 크기에 따라 자동으로 group(clip)을 구분해야함.
- UI 상 clip이 구분되었다는 것은 시나리오에서 cue가 구분되어 자막이 분리된다는 것을 의미
- 현재는 음성분석 파일에서 나누어져 있는 문장이 그대로 clip으로 들어오기에, 해당 문장이 길면 자막이 여러줄로 나와서 가독성이 떨어짐. 폰트 패밀리, 폰트 크기, safe-area를 고려한 자막 width를 입력받아. 자막이 줄 바꿈이 되기 전에 clip단위로 쪼개주는 함수가 필요.
  - 함수로 쪼갤 때는 단어 중간에 쪼개지면 안되고, 줄바뀜이 되기 전 단어 단위로 쪼개져야함.
  - 너무 짧은 클립들이 같은 화자로 지정되어 분리되어있다면, 합칠 수 있어야함.
- 처음 음성 분석 파일 바탕으로 UI를 만들기 전 이 함수가 실행되어서 줄바꿈이 되지 않는 자막으로 바꾸어주고 init하기
- 편집 항목에 자동 줄바꿈 버튼을 만들고, 해당 버튼을 눌리면 이 함수가 실행되어서 줄바꿈 진행 (중간에 유저가 글꼴, 글자 크기를 바꾼 후 이 버튼을 눌러 줄바꿈을 다시 할 수 있도록)

-> 이렇게 줄바꿈이 적용된 UI를 바탕으로 최초 시나리오를 만들 것

--- -->

## 📋 자막 자동 줄바꿈 구현 계획

### 1. 핵심 개념 이해

#### 1.1 fontSizeRel 시스템

- `fontSizeRel`은 **화면 높이의 비율**로 작동
- 기본값: 0.07 (화면 높이의 7%)
- 100% = 0.07, 50% = 0.035, 200% = 0.14
- 실제 픽셀 크기 = videoHeight \* fontSizeRel

#### 1.2 좌표계 및 safe area

- 비디오 기본 해상도: 16:9 (예: 1920x1080)
- Safe area margin: 좌우 각 10% (기본값)
- 실제 자막 가능 너비 = videoWidth \* 0.8

### 2. 구현 구조

#### 2.1 텍스트 너비 측정 유틸리티

**파일**: `src/utils/subtitle/textMeasurement.ts`

```typescript
interface TextMeasureConfig {
  fontFamily: string
  fontSizeRel: number // 화면 높이 비율 (0.07 = 100%)
  videoWidth: number // 비디오 픽셀 너비
  videoHeight: number // 비디오 픽셀 높이
}

class TextMeasurementService {
  private canvas: HTMLCanvasElement
  private context: CanvasRenderingContext2D
  private cache: Map<string, number>

  // fontSizeRel을 실제 픽셀로 변환
  private calculatePixelFontSize(
    fontSizeRel: number,
    videoHeight: number
  ): number {
    return Math.round(videoHeight * fontSizeRel)
  }

  // 텍스트 너비 측정 (픽셀 단위)
  measureTextWidth(text: string, config: TextMeasureConfig): number {
    const pixelFontSize = this.calculatePixelFontSize(
      config.fontSizeRel,
      config.videoHeight
    )
    const cacheKey = `${text}_${config.fontFamily}_${pixelFontSize}`

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    this.context.font = `${pixelFontSize}px ${config.fontFamily}`
    const width = this.context.measureText(text).width
    this.cache.set(cacheKey, width)
    return width
  }

  // 단어 배열의 총 너비 계산
  measureWordsWidth(words: Word[], config: TextMeasureConfig): number {
    const texts = words.map((w) => w.text)
    const fullText = texts.join(' ')
    return this.measureTextWidth(fullText, config)
  }
}
```

#### 2.2 Safe Area 계산

**파일**: `src/utils/subtitle/safeAreaCalculator.ts`

```typescript
interface SafeAreaConfig {
  videoWidth: number
  videoHeight: number
  safeMarginPercent?: number // 기본값 10 (좌우 각 10%)
}

export function calculateMaxSubtitleWidth(config: SafeAreaConfig): number {
  const marginPercent = config.safeMarginPercent ?? 10
  const safeAreaWidth = config.videoWidth * (1 - (marginPercent * 2) / 100)
  return Math.floor(safeAreaWidth)
}

// fontSizeRel 기반 최대 너비 계산
export function calculateMaxWidthForFontSize(
  fontSizeRel: number,
  videoWidth: number,
  videoHeight: number,
  safeMarginPercent = 10
): number {
  // Safe area 적용
  const maxWidth = calculateMaxSubtitleWidth({
    videoWidth,
    videoHeight,
    safeMarginPercent,
  })

  // 폰트 크기에 따른 추가 여백 고려 (선택적)
  // 큰 폰트일수록 좌우 여백을 더 줌
  const fontSizeAdjustment = fontSizeRel > 0.07 ? 0.95 : 1.0

  return Math.floor(maxWidth * fontSizeAdjustment)
}
```

#### 2.3 클립 분리/병합 로직

**파일**: `src/utils/subtitle/clipSplitter.ts`

```typescript
interface LineSplitConfig {
  fontFamily: string
  fontSizeRel: number // 화면 높이 비율 (0.07 = 100%)
  videoWidth?: number // 기본값: 1920
  videoHeight?: number // 기본값: 1080
  safeMarginPercent?: number // 기본값: 10
  minClipDuration?: number // 최소 클립 길이 (초, 기본값: 0.5)
  maxClipDuration?: number // 최대 클립 길이 (초, 기본값: 5)
  mergeSameSpeaker?: boolean // 같은 화자 병합 여부
}

export class ClipSplitterService {
  private textMeasurer: TextMeasurementService

  constructor() {
    this.textMeasurer = new TextMeasurementService()
  }

  // 단일 클립을 여러 클립으로 분리
  splitClipByLineWidth(clip: ClipItem, config: LineSplitConfig): ClipItem[] {
    const videoWidth = config.videoWidth ?? 1920
    const videoHeight = config.videoHeight ?? 1080

    // 시나리오 기반 최대 허용 너비 계산
    const maxWidth = calculateMaxWidthForFontSize(
      config.fontSizeRel,
      videoWidth,
      videoHeight,
      config.scenario // 시나리오 전달
    )

    const measureConfig = {
      fontFamily: config.fontFamily,
      fontSizeRel: config.fontSizeRel,
      videoWidth,
      videoHeight,
    }

    const resultClips: ClipItem[] = []
    let currentWords: Word[] = []
    let currentWidth = 0

    for (const word of clip.words) {
      const wordWidth = this.textMeasurer.measureTextWidth(
        word.text,
        measureConfig
      )

      // 공백 너비 추가 (단어 사이)
      const spaceWidth =
        currentWords.length > 0
          ? this.textMeasurer.measureTextWidth(' ', measureConfig)
          : 0

      const totalWidth = currentWidth + spaceWidth + wordWidth

      if (totalWidth > maxWidth && currentWords.length > 0) {
        // 현재까지의 단어들로 새 클립 생성
        resultClips.push(
          this.createSubClip(clip, currentWords, resultClips.length)
        )

        // 새로운 그룹 시작
        currentWords = [word]
        currentWidth = wordWidth
      } else {
        // 현재 그룹에 단어 추가
        currentWords.push(word)
        currentWidth = totalWidth
      }
    }

    // 마지막 그룹 처리
    if (currentWords.length > 0) {
      resultClips.push(
        this.createSubClip(clip, currentWords, resultClips.length)
      )
    }

    return resultClips
  }

  // 서브클립 생성
  private createSubClip(
    originalClip: ClipItem,
    words: Word[],
    index: number
  ): ClipItem {
    const startTime = words[0].start
    const endTime = words[words.length - 1].end
    const duration = endTime - startTime

    return {
      ...originalClip,
      id: `${originalClip.id}_${index}`,
      words: words,
      subtitle: words.map((w) => w.text).join(' '),
      fullText: words.map((w) => w.text).join(' '),
      duration: `${duration.toFixed(1)}초`,
      startTime,
      endTime,
    }
  }

  // 짧은 클립들 병합
  mergeShorterClips(clips: ClipItem[], config: LineSplitConfig): ClipItem[] {
    const minDuration = config.minClipDuration ?? 0.5
    const maxDuration = config.maxClipDuration ?? 5
    const videoWidth = config.videoWidth ?? 1920
    const videoHeight = config.videoHeight ?? 1080

    const maxWidth = calculateMaxWidthForFontSize(
      config.fontSizeRel,
      videoWidth,
      videoHeight,
      config.safeMarginPercent
    )

    const result: ClipItem[] = []
    let buffer: ClipItem | null = null

    for (const clip of clips) {
      const clipDuration = (clip.endTime ?? 0) - (clip.startTime ?? 0)

      if (buffer) {
        const bufferDuration = (buffer.endTime ?? 0) - (buffer.startTime ?? 0)
        const combinedDuration = bufferDuration + clipDuration
        const canMerge =
          buffer.speaker === clip.speaker &&
          combinedDuration <= maxDuration &&
          this.checkCombinedWidth(buffer, clip, config) <= maxWidth

        if (
          canMerge &&
          (bufferDuration < minDuration || clipDuration < minDuration)
        ) {
          // 병합
          buffer = this.mergeClips(buffer, clip)
        } else {
          // buffer를 결과에 추가하고 현재 클립을 새 buffer로
          result.push(buffer)
          buffer = clip
        }
      } else {
        buffer = clip
      }
    }

    if (buffer) {
      result.push(buffer)
    }

    return result
  }

  // 두 클립 병합 가능 너비 체크
  private checkCombinedWidth(
    clip1: ClipItem,
    clip2: ClipItem,
    config: LineSplitConfig
  ): number {
    const combinedWords = [...clip1.words, ...clip2.words]
    const videoWidth = config.videoWidth ?? 1920
    const videoHeight = config.videoHeight ?? 1080

    return this.textMeasurer.measureWordsWidth(combinedWords, {
      fontFamily: config.fontFamily,
      fontSizeRel: config.fontSizeRel,
      videoWidth,
      videoHeight,
    })
  }

  // 두 클립 병합
  private mergeClips(clip1: ClipItem, clip2: ClipItem): ClipItem {
    const words = [...clip1.words, ...clip2.words]
    return {
      ...clip1,
      id: `${clip1.id}_merged`,
      words,
      subtitle: words.map((w) => w.text).join(' '),
      fullText: words.map((w) => w.text).join(' '),
      startTime: clip1.startTime,
      endTime: clip2.endTime,
      duration: `${((clip2.endTime ?? 0) - (clip1.startTime ?? 0)).toFixed(1)}초`,
    }
  }

  // 전체 처리 파이프라인
  processClipsForLineBreak(
    clips: ClipItem[],
    config: LineSplitConfig
  ): ClipItem[] {
    // 1. 각 클립을 필요시 분리
    const splitClips = clips.flatMap((clip) =>
      this.splitClipByLineWidth(clip, config)
    )

    // 2. 짧은 클립들 병합 (옵션)
    if (config.mergeSameSpeaker) {
      return this.mergeShorterClips(splitClips, config)
    }

    return splitClips
  }
}
```

### 3. UI/Store 통합

#### 3.1 Store 액션 추가

**파일**: `src/app/(route)/editor/store/slices/clipSlice.ts`

```typescript
export interface ClipSlice {
  // ... 기존 state ...

  // 자동 줄바꿈 적용
  applyAutoLineBreak: (config?: Partial<LineSplitConfig>) => void
}

// slice 구현에 추가
applyAutoLineBreak: (config) => {
  const state = get()
  const defaultConfig: LineSplitConfig = {
    fontFamily: 'Arial, sans-serif', // 현재 선택된 폰트에서 가져올 수 있음
    fontSizeRel: 0.07, // 현재 subtitleSize에서 계산
    videoWidth: 1920,
    videoHeight: 1080,
    safeMarginPercent: 10,
    minClipDuration: 0.5,
    maxClipDuration: 5,
    mergeSameSpeaker: true,
  }

  const finalConfig = { ...defaultConfig, ...config }
  const splitter = new ClipSplitterService()

  const processedClips = splitter.processClipsForLineBreak(
    state.clips,
    finalConfig
  )

  set({
    clips: processedClips,
    // 필요시 다른 상태 업데이트
  })
}
```

#### 3.2 편집 툴바에 버튼 추가

**파일**: `src/app/(route)/editor/components/Toolbars/EditToolbar.tsx`

```typescript
// 자동 줄바꿈 버튼 추가
<ToolbarButton
  icon={<LineBreakIcon />}
  label="자동 줄바꿈"
  onClick={() => {
    // 현재 설정 가져오기
    const currentScenario = useEditorStore.getState().currentScenario
    const fontFamily = currentScenario?.tracks?.[0]?.defaultStyle?.fontFamily ?? 'Arial'
    const fontSizeRel = currentScenario?.tracks?.[0]?.defaultStyle?.fontSizeRel ?? 0.07

    // 자동 줄바꿈 적용
    applyAutoLineBreak({
      fontFamily,
      fontSizeRel,
    })
  }}
/>
```

### 4. 초기 로드 시 자동 적용

**파일**: `src/utils/transcription/segmentConverter.ts`

```typescript
export function convertSegmentsToClips(
  segments: Segment[],
  options?: {
    autoSplitLines?: boolean
    fontFamily?: string
    fontSizeRel?: number
  }
): ClipItem[] {
  const sortedSegments = [...segments].sort(
    (a, b) => a.start_time - b.start_time
  )

  let clips = sortedSegments.map((segment, index) =>
    convertSegmentToClip(segment, index)
  )

  // 자동 줄바꿈 적용 (옵션)
  if (options?.autoSplitLines) {
    const splitter = new ClipSplitterService()
    clips = splitter.processClipsForLineBreak(clips, {
      fontFamily: options.fontFamily ?? 'Arial, sans-serif',
      fontSizeRel: options.fontSizeRel ?? 0.07,
      mergeSameSpeaker: true,
    })
  }

  return clips
}
```

---

## 🔄 통합 클립 처리 시스템 (Unified Clip Processing System)

### 개요

기존의 수동 클립 분할/병합 기능과 새로운 자동 줄바꿈 시스템을 하나의 통합된 아키텍처로 구현합니다.

### 핵심 설계 원칙

1. **단일 진실 원천 (Single Source of Truth)**
   - 모든 클립 처리 로직을 `UnifiedClipProcessor` 클래스로 통합
   - 기존 `clipSplitter.ts`, `clipMerger.ts` 기능 흡수

2. **하위 호환성 (Backward Compatibility)**
   - 기존 UI 컴포넌트와 동일한 인터페이스 유지
   - 레거시 함수들은 새 시스템의 Wrapper로 구현

3. **시나리오 동기화**
   - 모든 클립 변경은 자동으로 시나리오 업데이트 트리거
   - Store와 Renderer 간 일관성 보장

### 통합 아키텍처

#### 1. 중앙 처리 클래스

**파일**: `src/utils/editor/UnifiedClipProcessor.ts`

```typescript
import { ClipItem, Word } from '@/app/(route)/editor/types'
import { TextMeasurementService } from '../subtitle/textMeasurement'
import { calculateMaxWidthForFontSize } from '../subtitle/safeAreaCalculator'

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
  safeMarginPercent?: number

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
    fontSizeRel: 0.07,
    safeMarginPercent: 10,
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
      config.safeMarginPercent
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

    const mergedWords = clips.flatMap((clip, clipIndex) =>
      clip.words.map((word, wordIndex) => ({
        ...word,
        id: `merged_${Date.now()}_word_${clipIndex}_${wordIndex}`,
      }))
    )

    const firstClip = clips[0]
    const mergedClip: ClipItem = {
      ...firstClip,
      id: `merged_${Date.now()}`,
      words: mergedWords,
      subtitle: mergedWords.map((w) => w.text).join(' '),
      fullText: mergedWords.map((w) => w.text).join(' '),
      duration: this.formatDuration(this.calculateDuration(mergedWords)),
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

    for (const clip of clips) {
      const clipDuration = this.calculateDuration(clip.words)

      if (clipDuration < minDuration) {
        buffer.push(clip)
      } else {
        if (buffer.length > 0) {
          result.push(...this.mergeManual(buffer))
          buffer = []
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
      config.safeMarginPercent
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
    const timestamp = Date.now()
    const clipId = `${originalClip.id}_split_${index}_${timestamp}`

    const updatedWords = words.map((word, wordIndex) => ({
      ...word,
      id: `${clipId}_word_${wordIndex}`,
    }))

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
}

// 싱글톤 인스턴스
export const clipProcessor = new UnifiedClipProcessor()
```

#### 2. 레거시 인터페이스 Wrapper

**파일**: `src/utils/editor/legacyCompatibility.ts`

```typescript
import { ClipItem } from '@/app/(route)/editor/types'
import { clipProcessor, SplitMode, MergeMode } from './UnifiedClipProcessor'

/**
 * 기존 splitClip 함수 호환성 유지
 * @deprecated Use clipProcessor.split() instead
 */
export const splitClip = (clip: ClipItem): [ClipItem, ClipItem] => {
  const result = clipProcessor.split(clip, SplitMode.MANUAL_HALF)
  if (result.length !== 2) {
    throw new Error('Unexpected split result')
  }
  return [result[0], result[1]]
}

/**
 * 기존 splitSelectedClip 함수 호환성 유지
 * @deprecated Use clipProcessor methods instead
 */
export const splitSelectedClip = (
  clips: ClipItem[],
  clipId: string
): ClipItem[] => {
  const clipIndex = clips.findIndex((clip) => clip.id === clipId)
  if (clipIndex === -1) {
    throw new Error('나눌 클립을 찾을 수 없습니다.')
  }

  const targetClip = clips[clipIndex]
  const splitClips = clipProcessor.split(targetClip, SplitMode.MANUAL_HALF)

  const newClips = [...clips]
  newClips.splice(clipIndex, 1, ...splitClips)

  return newClips.map((clip, index) => ({
    ...clip,
    timeline: (index + 1).toString(),
  }))
}

/**
 * 기존 mergeClips 함수 호환성 유지
 * @deprecated Use clipProcessor.merge() instead
 */
export const mergeClips = (
  clips: ClipItem[],
  selectedIds: string[]
): ClipItem => {
  const selectedClips = selectedIds
    .map((id) => clips.find((c) => c.id === id))
    .filter(Boolean) as ClipItem[]

  const merged = clipProcessor.merge(selectedClips, MergeMode.MANUAL)
  return merged[0]
}

/**
 * 기존 mergeSelectedClips 함수 호환성 유지
 * @deprecated Use clipProcessor methods instead
 */
export const mergeSelectedClips = (
  clips: ClipItem[],
  selectedIds: string[],
  checkedIds: string[]
): ClipItem[] => {
  const allSelectedIds = Array.from(new Set([...selectedIds, ...checkedIds]))

  const selectedClips = allSelectedIds
    .map((id) => clips.find((c) => c.id === id))
    .filter(Boolean) as ClipItem[]

  const merged = clipProcessor.merge(selectedClips, MergeMode.MANUAL)

  const firstSelectedIndex = Math.min(
    ...allSelectedIds
      .map((id) => clips.findIndex((clip) => clip.id === id))
      .filter((index) => index !== -1)
  )

  const newClips = clips.filter((clip) => !allSelectedIds.includes(clip.id))
  newClips.splice(firstSelectedIndex, 0, ...merged)

  return newClips.map((clip, index) => ({
    ...clip,
    timeline: (index + 1).toString(),
  }))
}

// Re-export utility functions that don't need changes
export { areClipsConsecutive } from './clipMerger'
```

#### 3. Store 통합

**파일 수정**: `src/app/(route)/editor/store/slices/clipSlice.ts`

```typescript
// 추가 imports
import {
  clipProcessor,
  SplitMode,
  MergeMode,
  ProcessorConfig,
} from '@/utils/editor/UnifiedClipProcessor'

export interface ClipSlice {
  // ... existing fields ...

  // 새로운 통합 메서드
  splitClipUnified: (
    clipId: string,
    mode?: SplitMode,
    config?: ProcessorConfig,
    position?: number
  ) => void

  mergeClipsUnified: (
    clipIds: string[],
    mode?: MergeMode,
    config?: ProcessorConfig
  ) => void

  applyAutoLineBreak: (config?: ProcessorConfig) => void

  // 레거시 호환 메서드 (기존 UI가 사용)
  splitClipLegacy: (clipId: string) => void
  mergeClipsLegacy: (clipIds: string[]) => void
}

// slice 구현에 추가
const createClipSlice = (set, get) => ({
  // ... existing implementation ...

  splitClipUnified: (
    clipId,
    mode = SplitMode.MANUAL_HALF,
    config,
    position
  ) => {
    const state = get()
    const clipIndex = state.clips.findIndex((c) => c.id === clipId)
    if (clipIndex === -1) return

    const clip = state.clips[clipIndex]
    const splitClips = clipProcessor.split(clip, mode, config, position)

    const newClips = [...state.clips]
    newClips.splice(clipIndex, 1, ...splitClips)

    set({
      clips: clipProcessor.reorderClipNumbers(newClips),
    })

    // 시나리오 업데이트 트리거
    state.buildInitialScenario?.(newClips)
  },

  mergeClipsUnified: (clipIds, mode = MergeMode.MANUAL, config) => {
    const state = get()
    const selectedClips = clipIds
      .map((id) => state.clips.find((c) => c.id === id))
      .filter(Boolean) as ClipItem[]

    if (selectedClips.length === 0) return

    const merged = clipProcessor.merge(selectedClips, mode, config)
    const firstIndex = Math.min(
      ...clipIds
        .map((id) => state.clips.findIndex((c) => c.id === id))
        .filter((i) => i !== -1)
    )

    const newClips = state.clips.filter((c) => !clipIds.includes(c.id))
    newClips.splice(firstIndex, 0, ...merged)

    set({
      clips: clipProcessor.reorderClipNumbers(newClips),
    })

    // 시나리오 업데이트 트리거
    state.buildInitialScenario?.(newClips)
  },

  applyAutoLineBreak: (config) => {
    const state = get()
    const currentScenario = state.currentScenario

    // 현재 폰트 설정 가져오기
    const fontFamily =
      currentScenario?.tracks?.[0]?.defaultStyle?.fontFamily ?? 'Arial'
    const fontSizeRel =
      currentScenario?.tracks?.[0]?.defaultStyle?.fontSizeRel ?? 0.07

    const mergedConfig: ProcessorConfig = {
      fontFamily,
      fontSizeRel,
      videoWidth: 1920,
      videoHeight: 1080,
      safeMarginPercent: 10,
      minClipDuration: 0.5,
      maxClipDuration: 5,
      mergeSameSpeaker: true,
      ...config,
    }

    // 파이프라인 실행: 자동 줄바꿈 후 짧은 클립 병합
    const processedClips = clipProcessor.processPipeline(state.clips, [
      {
        type: 'split',
        mode: SplitMode.AUTO_LINE_BREAK,
        config: mergedConfig,
      },
      {
        type: 'merge',
        mode: MergeMode.AUTO_SHORT,
        config: mergedConfig,
      },
    ])

    set({ clips: processedClips })

    // 시나리오 재구성
    state.buildInitialScenario?.(processedClips)
  },

  // 레거시 호환 메서드
  splitClipLegacy: (clipId) => {
    get().splitClipUnified(clipId, SplitMode.MANUAL_HALF)
  },

  mergeClipsLegacy: (clipIds) => {
    get().mergeClipsUnified(clipIds, MergeMode.MANUAL)
  },
})
```

#### 4. UI 컴포넌트 업데이트

**파일**: `src/app/(route)/editor/components/Toolbars/EditToolbar.tsx`

```typescript
import { ProcessorConfig } from '@/utils/editor/UnifiedClipProcessor'

// 자동 줄바꿈 버튼 추가
const EditToolbar = () => {
  const { applyAutoLineBreak, currentScenario } = useEditorStore()

  const handleAutoLineBreak = () => {
    const config: ProcessorConfig = {
      fontFamily: currentScenario?.tracks?.[0]?.defaultStyle?.fontFamily,
      fontSizeRel: currentScenario?.tracks?.[0]?.defaultStyle?.fontSizeRel,
    }

    applyAutoLineBreak(config)
  }

  return (
    <Toolbar>
      {/* 기존 버튼들 */}

      <ToolbarButton
        icon={<LineBreakIcon />}
        label="자동 줄바꿈"
        onClick={handleAutoLineBreak}
        tooltip="폰트 크기에 맞춰 자막을 자동으로 나눕니다"
      />
    </Toolbar>
  )
}
```

### 마이그레이션 계획

#### Phase 1: 기반 구축 (즉시)

1. `UnifiedClipProcessor` 클래스 구현
2. `TextMeasurementService` 구현
3. 레거시 호환성 Wrapper 생성

#### Phase 2: Store 통합 (다음)

1. ClipSlice에 새 메서드 추가
2. 시나리오 동기화 로직 구현
3. 기존 UI 동작 테스트

#### Phase 3: UI 업데이트 (마지막)

1. 자동 줄바꿈 버튼 추가
2. 고급 설정 패널 구현
3. 사용자 피드백 수집

### 테스트 계획

```typescript
// 단위 테스트 예제
describe('UnifiedClipProcessor', () => {
  it('should maintain backward compatibility with manual split', () => {
    const clip = createMockClip()
    const oldResult = splitClip(clip) // 레거시
    const newResult = clipProcessor.split(clip, SplitMode.MANUAL_HALF)

    expect(newResult).toHaveLength(2)
    expect(newResult[0].words).toEqual(oldResult[0].words)
  })

  it('should split clips by line width correctly', () => {
    const longClip = createLongMockClip()
    const result = clipProcessor.split(longClip, SplitMode.AUTO_LINE_BREAK, {
      fontSizeRel: 0.07,
      videoWidth: 1920,
      videoHeight: 1080,
    })

    result.forEach((clip) => {
      const width = measureClipWidth(clip)
      expect(width).toBeLessThanOrEqual(MAX_SAFE_WIDTH)
    })
  })

  it('should merge short clips automatically', () => {
    const shortClips = createShortMockClips()
    const result = clipProcessor.merge(shortClips, MergeMode.AUTO_SHORT, {
      minClipDuration: 0.5,
    })

    result.forEach((clip) => {
      const duration = calculateClipDuration(clip)
      expect(duration).toBeGreaterThanOrEqual(0.5)
    })
  })
})
```

### 장점

1. **단일 진실 원천**: 모든 클립 처리 로직이 한 곳에
2. **확장성**: 새로운 분할/병합 모드 쉽게 추가 가능
3. **하위 호환성**: 기존 코드 변경 최소화
4. **테스트 용이성**: 각 모드별 독립적 테스트 가능
5. **성능 최적화**: 텍스트 측정 캐싱, 배치 처리
6. **시나리오 동기화**: 자동으로 렌더러 업데이트

### 주의사항

1. **메모리 관리**: Canvas 컨텍스트 적절한 해제
2. **성능**: 대량 클립 처리 시 배치 최적화
3. **에러 처리**: 유효성 검증 강화
4. **사용자 피드백**: 진행률 표시, 취소 기능
5. **설정 저장**: 사용자 선호 설정 로컬 저장
