export interface Word {
  id: string
  text: string
  start: number
  end: number
  isEditable: boolean
  confidence?: number
  appliedAssets?: string[]
  // Optional snapshot of animation tracks for UI
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
  stickers: Array<{
    id: string
    text: string
    start: number
    end: number
    originalInsertedTextId: string
    attachedWordId?: string
    appliedAssets?: string[]
    animationTracks?: Array<{
      assetId: string
      assetName: string
      pluginKey?: string
      params?: Record<string, unknown>
      timing: { start: number; end: number }
      intensity: { min: number; max: number }
      color?: 'blue' | 'green' | 'purple'
    }>
  }>
}

export interface ClipComponentProps {
  clip: ClipItem
  index: number
  isSelected: boolean
  isChecked?: boolean
  isMultiSelected?: boolean
  enableDragAndDrop?: boolean
  isGroupSelecting?: boolean
  speakers?: string[]
  onSelect: (clipId: string) => void
  onCheck?: (clipId: string, checked: boolean) => void
  onWordEdit: (clipId: string, wordId: string, newText: string) => void
  onFullTextEdit?: (clipId: string, newText: string) => void
  onFullTextEditAdvanced?: (clipId: string, newText: string) => void
  onSpeakerChange?: (clipId: string, newSpeaker: string) => void
  onBatchSpeakerChange?: (clipIds: string[], newSpeaker: string) => void
  onOpenSpeakerManagement?: () => void
  onAddSpeaker?: (name: string) => void
  onRenameSpeaker?: (oldName: string, newName: string) => void
  speakerColors?: Record<string, string> // 화자별 색상 매핑
  onMouseDown?: () => void
  onMouseEnter?: () => void
  onStickerDeleteRequest?: (stickerId: string, stickerText: string) => void
}

export interface ClipStyleState {
  isSelected: boolean
  isChecked?: boolean
  isMultiSelected?: boolean
  isHovered: boolean
  isDragging?: boolean
}

export interface ClipToolBarProps {
  selectedClipIds: Set<string>
  canUndo: boolean
  canRedo: boolean
  onNewClick: () => void
  onMergeClips: () => void
  onUndo: () => void
  onRedo: () => void
  onCut?: () => void
  onCopy?: () => void
  onPaste?: () => void
  onSplitClip?: () => void
}
