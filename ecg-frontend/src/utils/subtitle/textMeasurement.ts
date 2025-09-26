import type { Word } from '@/app/(route)/editor/types'

export interface TextMeasureConfig {
  fontFamily: string
  fontSizeRel: number // 화면 높이 비율 (0.07 = 100%)
  videoWidth: number // 비디오 픽셀 너비
  videoHeight: number // 비디오 픽셀 높이
}

export class TextMeasurementService {
  private canvas: HTMLCanvasElement
  private context: CanvasRenderingContext2D
  private cache: Map<string, number>

  constructor() {
    // 브라우저 환경에서만 Canvas 생성
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas')
      const ctx = this.canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Canvas 2D context not supported')
      }
      this.context = ctx
    } else {
      // SSR 환경에서는 더미 객체
      this.canvas = {} as HTMLCanvasElement
      this.context = {} as CanvasRenderingContext2D
    }
    this.cache = new Map()
  }

  /**
   * fontSizeRel을 실제 픽셀로 변환
   */
  private calculatePixelFontSize(
    fontSizeRel: number,
    videoHeight: number
  ): number {
    return Math.round(videoHeight * fontSizeRel)
  }

  /**
   * 텍스트 너비 측정 (픽셀 단위)
   */
  measureTextWidth(text: string, config: TextMeasureConfig): number {
    // SSR 환경에서는 대략적인 값 반환
    if (typeof window === 'undefined') {
      const pixelFontSize = this.calculatePixelFontSize(
        config.fontSizeRel,
        config.videoHeight
      )
      // 대략적인 문자 너비 계산 (한글은 더 넓게)
      const koreanChars = text.match(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g)?.length || 0
      const otherChars = text.length - koreanChars
      return (
        koreanChars * pixelFontSize * 0.9 + otherChars * pixelFontSize * 0.6
      )
    }

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

  /**
   * 단어 배열의 총 너비 계산
   */
  measureWordsWidth(words: Word[], config: TextMeasureConfig): number {
    const texts = words.map((w) => w.text)
    const fullText = texts.join(' ')
    return this.measureTextWidth(fullText, config)
  }

  /**
   * 캐시 정리
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 캐시 크기 확인
   */
  getCacheSize(): number {
    return this.cache.size
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.clearCache()
    // Canvas는 GC가 처리하므로 별도 정리 불필요
  }
}

// 싱글톤 인스턴스
export const textMeasurementService = new TextMeasurementService()
