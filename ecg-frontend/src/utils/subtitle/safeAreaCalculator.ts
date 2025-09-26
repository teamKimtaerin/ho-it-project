import type { RendererConfigV2 } from '@/app/shared/motiontext'

export interface SafeAreaConfig {
  videoWidth: number
  videoHeight: number
  scenario?: RendererConfigV2 // 시나리오에서 safe area 설정 가져오기
}

/**
 * 시나리오의 safeAreaClamp 설정을 기반으로 최대 너비 계산
 * - safeAreaClamp: true이면 렌더러가 자동으로 safe area 적용
 * - maxWidth: '100%'는 safe area 내에서 100%를 의미
 */
export function calculateMaxSubtitleWidth(config: SafeAreaConfig): number {
  const { videoWidth, scenario } = config

  // 시나리오에서 safeAreaClamp 설정 확인
  const captionDefine = scenario?.define?.caption as
    | Record<string, unknown>
    | undefined
  const layoutSettings = captionDefine?.layout as
    | Record<string, unknown>
    | undefined
  const safeAreaClamp = layoutSettings?.safeAreaClamp ?? true

  if (!safeAreaClamp) {
    // Safe area가 비활성화된 경우 전체 너비 사용
    return videoWidth
  }

  // 시나리오에서 safe area 정보 추출
  const safeAreaInfo = extractSafeAreaFromScenario(scenario)

  // Safe area를 기반으로 사용 가능한 width 계산
  const leftMargin = safeAreaInfo.left
  const rightMargin = safeAreaInfo.right
  const availableWidthRatio = 1 - leftMargin - rightMargin

  return Math.floor(videoWidth * availableWidthRatio)
}

/**
 * fontSizeRel과 시나리오 설정을 기반으로 최대 너비 계산 (자동 줄바꿈용)
 */
export function calculateMaxWidthForFontSize(
  fontSizeRel: number,
  videoWidth: number,
  videoHeight: number,
  scenario?: RendererConfigV2
): number {
  // 시나리오 기반 safe area 계산
  const maxWidth = calculateMaxSubtitleWidth({
    videoWidth,
    videoHeight,
    scenario,
  })

  // 자동 줄바꿈 시 wrap이 동작하지 않도록 보수적인 너비 적용
  // safeArea 계산 결과보다 50% 더 좁게 사용 (매우 엄격한 줄바꿈)
  const conservativeRatio = 0.5

  // 폰트 크기에 따른 추가 조정
  // 큰 폰트일수록 더 많은 여백 필요
  const fontSizeAdjustment = fontSizeRel > 0.06 ? 0.95 : 1.0

  return Math.floor(maxWidth * conservativeRatio * fontSizeAdjustment)
}

/**
 * 시나리오에서 현재 폰트 설정 추출
 */
export function extractFontSettingsFromScenario(scenario: RendererConfigV2): {
  fontFamily: string
  fontSizeRel: number
} {
  // caption 트랙에서 기본 스타일 가져오기
  const captionTrack = scenario.tracks?.find(
    (track) => track.id === 'caption' || track.type === 'subtitle'
  )

  const defaultStyle = captionTrack?.defaultStyle as
    | Record<string, unknown>
    | undefined

  return {
    fontFamily: (defaultStyle?.fontFamily as string) ?? 'Arial, sans-serif',
    fontSizeRel: (defaultStyle?.fontSizeRel as number) ?? 0.05,
  }
}

/**
 * 시나리오에서 safeArea 정보 추출 (우선순위: track > stage > defaultConstraints)
 */
export function extractSafeAreaFromScenario(scenario?: RendererConfigV2): {
  top: number
  bottom: number
  left: number
  right: number
} {
  // 기본값
  const defaultSafeArea = {
    top: 0.025,
    bottom: 0.075,
    left: 0.05,
    right: 0.05,
  }

  if (!scenario) return defaultSafeArea

  // 1순위: caption track의 safeArea
  const captionTrack = scenario.tracks?.find(
    (track) => track.id === 'caption' || track.type === 'subtitle'
  )

  const trackSafeArea = (captionTrack as Record<string, unknown>)?.safeArea as
    | { top?: number; bottom?: number; left?: number; right?: number }
    | undefined
  if (trackSafeArea) {
    return {
      top: trackSafeArea.top ?? defaultSafeArea.top,
      bottom: trackSafeArea.bottom ?? defaultSafeArea.bottom,
      left: trackSafeArea.left ?? defaultSafeArea.left,
      right: trackSafeArea.right ?? defaultSafeArea.right,
    }
  }

  // 2순위: stage의 safeArea
  const stageSafeArea = (scenario.stage as Record<string, unknown>)
    ?.safeArea as
    | { top?: number; bottom?: number; left?: number; right?: number }
    | undefined
  if (stageSafeArea) {
    return {
      top: stageSafeArea.top ?? defaultSafeArea.top,
      bottom: stageSafeArea.bottom ?? defaultSafeArea.bottom,
      left: stageSafeArea.left ?? defaultSafeArea.left,
      right: stageSafeArea.right ?? defaultSafeArea.right,
    }
  }

  // 3순위: defaultConstraints의 safeArea
  const defaultConstraints = captionTrack?.defaultConstraints as
    | Record<string, unknown>
    | undefined
  const constraintsSafeArea = defaultConstraints?.safeArea as
    | { top?: number; bottom?: number; left?: number; right?: number }
    | undefined
  if (constraintsSafeArea) {
    return {
      top: constraintsSafeArea.top ?? defaultSafeArea.top,
      bottom: constraintsSafeArea.bottom ?? defaultSafeArea.bottom,
      left: constraintsSafeArea.left ?? defaultSafeArea.left,
      right: constraintsSafeArea.right ?? defaultSafeArea.right,
    }
  }

  // 모든 곳에서 찾을 수 없으면 기본값 사용
  return defaultSafeArea
}

/**
 * 시나리오에서 비디오 해상도 추정
 */
export function estimateVideoResolutionFromScenario(
  scenario: RendererConfigV2
): {
  videoWidth: number
  videoHeight: number
} {
  const baseAspect = scenario.stage?.baseAspect ?? '16:9'

  switch (baseAspect) {
    case '16:9':
      return { videoWidth: 1920, videoHeight: 1080 }
    case '9:16':
      return { videoWidth: 1080, videoHeight: 1920 }
    default:
      return { videoWidth: 1920, videoHeight: 1080 }
  }
}
