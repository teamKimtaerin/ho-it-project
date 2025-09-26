/**
 * 애플리케이션 전반에서 사용되는 상수들
 */

// 파일 크기 제한
export const FILE_SIZE_LIMITS = {
  small: 1024 * 1024, // 1MB
  medium: 10 * 1024 * 1024, // 10MB
  large: 100 * 1024 * 1024, // 100MB
  xl: 500 * 1024 * 1024, // 500MB
} as const

// Z-Index 계층
export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  modal: 30,
  popover: 40,
  tooltip: 50,
  notification: 60,
} as const

// 스크롤 관련 상수
export const SCROLL_CONSTANTS = {
  THROTTLE_FPS: 16, // 60fps throttling
  HEADER_SHOW_THRESHOLD: 50, // 헤더 표시 스크롤 위치
  SCROLL_SENSITIVITY: 15, // 스크롤 민감도
  INTERSECTION_THRESHOLD: 0.2, // Intersection Observer
  INTERSECTION_ROOT_MARGIN: '0px 0px -100px 0px', // 루트 마진
} as const

// 비디오 플레이어 상수
export const VIDEO_PLAYER_CONSTANTS = {
  SKIP_TIME_SECONDS: 10,
  PLAYBACK_RATES: [0.5, 1, 1.25, 1.5, 2] as const,
  SECONDS_PER_MINUTE: 60,
} as const

// 애니메이션 지연 시간
export const ANIMATION_DELAYS = {
  NONE: 0,
  SHORT: 1000,
  MEDIUM: 2000,
  MEDIUM_PLUS: 2500,
  LONG: 3000,
  EXTRA_LONG: 4000,
  MAX: 5000,
} as const

// UI 패널 기본 크기
export const UI_PANEL_DEFAULTS = {
  VIDEO_PANEL_MIN_WIDTH: 300,
  SIDEBAR_DEFAULT_WIDTH: 250,
  TOOLBAR_HEIGHT: 48,
  HEADER_HEIGHT: 64,
} as const

// 타입 정의
export type FileSizeLimit = keyof typeof FILE_SIZE_LIMITS
export type ZIndexLevel = keyof typeof Z_INDEX
export type AnimationDelay = keyof typeof ANIMATION_DELAYS
