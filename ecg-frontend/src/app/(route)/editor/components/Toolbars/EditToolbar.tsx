'use client'

import { type ToolbarVariant } from '../../constants/colors'
import { ClipItem } from '../../types'
import ClipSelectionDropdown from './shared/ClipSelectionDropdown'
import ToolbarButton from './shared/ToolbarButton'
import ToolbarDivider from './shared/ToolbarDivider'

interface EditToolbarProps {
  clips: ClipItem[]
  selectedClipIds: Set<string>
  activeClipId: string | null
  canUndo: boolean
  canRedo: boolean
  onSelectionChange: (selectedIds: Set<string>) => void
  onUndo: () => void
  onRedo: () => void
  onCut?: () => void
  onCopy?: () => void
  onPaste?: () => void
  onMergeClips: () => void
  onSplitClip?: () => void
  onRestore?: () => void
  onAutoLineBreak?: () => void
  variant?: ToolbarVariant
}

/**
 * 편집 툴바 컴포넌트
 * 검은색 배경의 편집 전용 툴바
 */
export default function EditToolbar({
  clips,
  selectedClipIds,
  activeClipId,
  canUndo,
  canRedo,
  onSelectionChange,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onMergeClips,
  onSplitClip,
  onRestore,
  onAutoLineBreak,
  variant = 'base',
}: EditToolbarProps) {
  return (
    <>
      {/* 클립 선택 드롭다운 */}
      <ClipSelectionDropdown
        clips={clips}
        selectedClipIds={selectedClipIds}
        activeClipId={activeClipId}
        onSelectionChange={onSelectionChange}
      />

      <ToolbarDivider />

      {/* 되돌리기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        }
        label="되돌리기"
        onClick={onUndo}
        disabled={!canUndo}
        shortcut="Ctrl+Z"
        variant={variant}
      />

      {/* 다시실행 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 10H11a8 8 0 00-8 8v2m18-10l-6-6m6 6l-6 6"
            />
          </svg>
        }
        label="다시실행"
        onClick={onRedo}
        disabled={!canRedo}
        shortcut="Ctrl+Y"
        variant={variant}
      />

      <ToolbarDivider />

      {/* 잘라내기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
            />
          </svg>
        }
        label="잘라내기"
        onClick={onCut}
        shortcut="Ctrl+X"
        // disabled={selectedClipIds.size === 0}
        disabled={true}
        variant={variant}
      />

      {/* 복사하기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        }
        label="복사하기"
        onClick={onCopy}
        shortcut="Ctrl+C"
        disabled={selectedClipIds.size === 0}
        variant={variant}
      />

      {/* 붙여넣기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
        }
        label="붙여넣기"
        onClick={onPaste}
        shortcut="Ctrl+V"
        variant={variant}
      />

      <ToolbarDivider />

      {/* 클립 합치기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        }
        label="클립 합치기"
        onClick={onMergeClips}
        shortcut="Ctrl+E"
        disabled={selectedClipIds.size < 2}
        variant={variant}
      />

      {/* 클립 나누기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect
              x="3"
              y="6"
              width="18"
              height="12"
              rx="2"
              ry="2"
              strokeWidth="2"
            />
            <line x1="12" y1="6" x2="12" y2="18" strokeWidth="2" />
          </svg>
        }
        label="클립 나누기"
        onClick={onSplitClip}
        shortcut="Enter"
        disabled={!activeClipId}
        variant={variant}
      />

      {/* 자동 줄바꿈 */}
      {onAutoLineBreak && (
        <ToolbarButton
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h8m-8 6h16"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 12l4 4m0-4l-4 4"
              />
            </svg>
          }
          label="자동 줄바꿈"
          onClick={onAutoLineBreak}
          disabled={clips.length === 0}
          variant={variant}
        />
      )}

      <ToolbarDivider />

      {/* 원본 복원 버튼 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        }
        label="원본 복원"
        onClick={onRestore}
        variant={variant}
      />
    </>
  )
}
