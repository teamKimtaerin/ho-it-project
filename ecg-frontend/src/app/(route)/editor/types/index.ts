// Clip related types
export interface Word {
  id: string
  text: string
  start: number
  end: number
  isEditable: boolean
  confidence?: number
  appliedAssets?: string[]
  // Optional: in-word snapshot of animation tracks for UI sync
  animationTracks?: Array<{
    assetId: string
    assetName: string
    pluginKey?: string
    params?: Record<string, unknown>
    timing: { start: number; end: number }
    intensity: { min: number; max: number }
    color?: 'blue' | 'green' | 'purple'
  }>
}

export interface Sticker {
  id: string
  text: string // Original text content for reference
  start: number
  end: number
  originalInsertedTextId: string // Reference to original inserted text
  attachedWordId?: string // Reference to the word this sticker is attached to
  appliedAssets?: string[]
  // Animation tracks for stickers (same as words)
  animationTracks?: Array<{
    assetId: string
    assetName: string
    pluginKey?: string
    params?: Record<string, unknown>
    timing: { start: number; end: number }
    intensity: { min: number; max: number }
    color?: 'blue' | 'green' | 'purple'
  }>
}

export interface ClipItem {
  id: string
  timeline: string
  speaker: string
  subtitle: string
  fullText: string
  duration: string
  thumbnail: string
  words: Word[]
  stickers: Sticker[] // Clip stickers for inserted texts (not included in subtitles)
  // 실제 비디오 타임라인 정보 (virtual timeline 지원용)
  startTime?: number
  endTime?: number
}

// UI related types
export type EditorTab =
  | 'home'
  | 'edit'
  | 'subtitle'
  | 'format'
  | 'insert'
  | 'template'
  | 'effect'

export interface SelectionBox {
  startX: number
  startY: number
  endX: number
  endY: number
}

// Component Props types
export interface ClipStyleState {
  isSelected: boolean
  isChecked: boolean
  isMultiSelected: boolean
  isHovered?: boolean // Optional for now, will be used for hover effects
  isDragging?: boolean
}

export interface EditorHeaderTabsProps {
  activeTab: EditorTab
  onTabChange: (tabId: EditorTab) => void
}

export interface ToolbarProps {
  activeTab: EditorTab
}

export interface ClipTableProps {
  clips: ClipItem[]
  selectedClipIds: Set<string>
  onClipSelect: (clipId: string, multiSelect: boolean) => void
  onWordEdit: (clipId: string, wordId: string, newText: string) => void
  onClipsReorder: (newClips: ClipItem[]) => void
}

// Initial data
export const INITIAL_CLIPS: ClipItem[] = []

// Constants
export const DRAG_ACTIVATION_DISTANCE = 15

export const EDITOR_TABS: EditorTab[] = [
  'home',
  'edit',
  'format',
  'insert',
  'template',
]
