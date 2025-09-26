/**
 * Text insertion feature types
 */

import type { ClipItem } from './index'

export interface TextPosition {
  x: number // Percentage (0-100)
  y: number // Percentage (0-100)
}

export interface TextStyle {
  fontSize: number // In pixels
  fontFamily: string
  color: string
  backgroundColor?: string
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  textShadow?: string
  borderRadius?: number
  padding?: number
  opacity?: number
}

export interface TextAnimation {
  plugin: string // Plugin name (e.g., 'fadein@2.0.0', 'elastic@2.0.0', or empty string for no animation)
  parameters: Record<string, unknown> // Plugin-specific parameters
}

export interface InsertedText {
  id: string
  content: string
  startTime: number // In seconds
  endTime: number // In seconds
  position: TextPosition
  style: TextStyle
  animation?: TextAnimation
  isSelected?: boolean
  isEditing?: boolean
  createdAt: number
  updatedAt: number
}

export interface TextInsertionState {
  insertedTexts: InsertedText[]
  selectedTextId: string | null
  defaultStyle: TextStyle
  clipboard: InsertedText[]
  // Scenario management
  currentScenario: import('@/app/shared/motiontext').RendererConfigV2 | null
  isScenarioMode: boolean // true: unified scenario rendering, false: individual rendering
}

export interface TextInsertionActions {
  // Text CRUD operations
  addText: (text: Omit<InsertedText, 'id' | 'createdAt' | 'updatedAt'>) => void
  addTextAtCenter: (currentTime: number) => void
  updateText: (id: string, updates: Partial<InsertedText>) => void
  deleteText: (id: string) => void
  duplicateText: (id: string) => void

  // Selection management
  selectText: (id: string | null) => void
  clearSelection: () => void

  // Style management
  updateDefaultStyle: (style: Partial<TextStyle>) => void
  applyStyleToSelected: (style: Partial<TextStyle>) => void

  // Clipboard operations
  copyText: (id: string) => void
  cutText: (id: string) => void
  pasteText: (position: TextPosition, currentTime: number) => void

  // Batch operations
  deleteSelectedTexts: () => void
  moveTexts: (ids: string[], deltaPosition: TextPosition) => void

  // Time management
  getActiveTexts: (currentTime: number) => InsertedText[]
  updateTextTiming: (id: string, startTime: number, endTime: number) => void

  // Animation management
  toggleRotationAnimation: (id: string) => void
  setAnimationPreset: (id: string, preset: RotationPreset) => void
  updateTextAnimation: (id: string, animation: TextAnimation) => void

  // Scenario management
  initializeScenario: (clips?: ClipItem[]) => void
  toggleScenarioMode: () => void
  updateScenario: (
    scenario: import('@/app/shared/motiontext').RendererConfigV2
  ) => void
  addScenarioUpdateListener: (
    listener: (
      scenario: import('@/app/shared/motiontext').RendererConfigV2
    ) => void
  ) => () => void
}

export type TextInsertionSlice = TextInsertionState & TextInsertionActions

// Default values
export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontSize: 24,
  fontFamily: 'Arial, sans-serif',
  color: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  fontWeight: 'bold',
  fontStyle: 'normal',
  textAlign: 'center',
  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
  borderRadius: 4,
  padding: 8,
  opacity: 1,
}

// 스핀 애니메이션 프리셋
export const ROTATION_PRESETS = {
  NONE: {
    plugin: '',
    parameters: {},
  },
  SUBTLE: {
    plugin: 'spin@2.0.0',
    parameters: {
      fullTurns: 0.25, // 1/4 회전 (90도)
    },
  },
  DYNAMIC: {
    plugin: 'spin@2.0.0',
    parameters: {
      fullTurns: 1.0, // 1번 완전 회전 (360도)
    },
  },
  FLIP_3D: {
    plugin: 'spin@2.0.0',
    parameters: {
      fullTurns: 0.5, // 1/2 회전 (180도)
    },
  },
} as const

export type RotationPreset = keyof typeof ROTATION_PRESETS

export const DEFAULT_TEXT_ANIMATION: TextAnimation = {
  plugin: '', // No default animation - empty pluginChain [] works
  parameters: {},
}

// Helper functions
export const createInsertedText = (
  content: string,
  position: TextPosition,
  startTime: number,
  endTime: number,
  style: Partial<TextStyle> = {},
  animation?: TextAnimation
): Omit<InsertedText, 'id' | 'createdAt' | 'updatedAt'> => {
  return {
    content,
    position,
    startTime,
    endTime,
    style: { ...DEFAULT_TEXT_STYLE, ...style },
    animation: animation || DEFAULT_TEXT_ANIMATION,
    isSelected: false,
    isEditing: false,
  }
}

export const isTextActiveAtTime = (
  text: InsertedText,
  currentTime: number
): boolean => {
  return currentTime >= text.startTime && currentTime <= text.endTime
}

export const getTextDuration = (text: InsertedText): number => {
  return text.endTime - text.startTime
}

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
