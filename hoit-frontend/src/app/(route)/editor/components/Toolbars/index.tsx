'use client'

import { ClipItem, EditorTab } from '../../types'
import EditToolbar from './EditToolbar'
import FormatToolbar from './FormatToolbar'
import HomeToolbar from './HomeToolbar'
import InsertToolbar from './InsertToolbar'
import TemplateToolbar from './TemplateToolbar'

import ToolbarWrapper from './shared/ToolbarWrapper'

interface ToolbarsProps {
  activeTab: EditorTab
  clips: ClipItem[]
  selectedClipIds: Set<string>
  activeClipId: string | null
  canUndo: boolean
  canRedo: boolean
  onSelectionChange: (selectedIds: Set<string>) => void
  onNewClick: () => void
  onMergeClips: () => void
  onUndo: () => void
  onRedo: () => void
  onCut?: () => void
  onCopy?: () => void
  onPaste?: () => void
  onSplitClip?: () => void
  onRestore?: () => void
  onAutoLineBreak?: () => void
  onToggleAnimationSidebar?: () => void
  onToggleTemplateSidebar?: () => void
  onSave?: () => void
  onSaveAs?: () => void
  forceOpenExportModal?: boolean
  onExportModalStateChange?: (isOpen: boolean) => void
}

/**
 * 툴바 라우터 컴포넌트
 * activeTab에 따라 적절한 툴바를 렌더링
 */
export default function Toolbars({
  activeTab,
  clips,
  selectedClipIds,
  activeClipId,
  canUndo,
  canRedo,
  onSelectionChange,
  onNewClick,
  onMergeClips,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onSplitClip,
  onRestore,
  onAutoLineBreak,
  // onToggleAnimationSidebar,
  onToggleTemplateSidebar,
  onSave,
  onSaveAs,
  forceOpenExportModal,
  onExportModalStateChange,
}: ToolbarsProps) {
  // 공통 props
  const commonProps = {
    selectedClipIds,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onCut,
    onCopy,
    onPaste,
    onMergeClips,
    onSplitClip,
    onAutoLineBreak,
  }

  // Export 버튼 핸들러
  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export project')
  }

  // 탭에 따른 툴바 렌더링
  switch (activeTab) {
    case 'home':
      return (
        <ToolbarWrapper
          variant="base"
          onExport={handleExport}
          onSave={onSave}
          onSaveAs={onSaveAs}
          forceOpenExportModal={forceOpenExportModal}
          onExportModalStateChange={onExportModalStateChange}
        >
          <HomeToolbar {...commonProps} onNewClick={onNewClick} />
        </ToolbarWrapper>
      )

    case 'edit':
      return (
        <ToolbarWrapper
          variant="base"
          onExport={handleExport}
          onSave={onSave}
          onSaveAs={onSaveAs}
          forceOpenExportModal={forceOpenExportModal}
          onExportModalStateChange={onExportModalStateChange}
        >
          <EditToolbar
            {...commonProps}
            clips={clips}
            activeClipId={activeClipId}
            onSelectionChange={onSelectionChange}
            onRestore={onRestore}
          />
        </ToolbarWrapper>
      )

    case 'format':
      return (
        <ToolbarWrapper
          variant="base"
          onExport={handleExport}
          onSave={onSave}
          onSaveAs={onSaveAs}
          forceOpenExportModal={forceOpenExportModal}
          onExportModalStateChange={onExportModalStateChange}
        >
          <FormatToolbar {...commonProps} clips={clips} />
        </ToolbarWrapper>
      )

    case 'insert':
      return (
        <ToolbarWrapper
          variant="base"
          onExport={handleExport}
          onSave={onSave}
          onSaveAs={onSaveAs}
          forceOpenExportModal={forceOpenExportModal}
          onExportModalStateChange={onExportModalStateChange}
        >
          <InsertToolbar {...commonProps} onNewClick={onNewClick} />
        </ToolbarWrapper>
      )

    case 'template':
      return (
        <ToolbarWrapper
          variant="base"
          onExport={handleExport}
          onSave={onSave}
          onSaveAs={onSaveAs}
          forceOpenExportModal={forceOpenExportModal}
          onExportModalStateChange={onExportModalStateChange}
        >
          <TemplateToolbar onToggleTemplateSidebar={onToggleTemplateSidebar} />
        </ToolbarWrapper>
      )

    default:
      return (
        <ToolbarWrapper
          variant="base"
          onExport={handleExport}
          onSave={onSave}
          onSaveAs={onSaveAs}
          forceOpenExportModal={forceOpenExportModal}
          onExportModalStateChange={onExportModalStateChange}
        >
          <HomeToolbar {...commonProps} onNewClick={onNewClick} />
        </ToolbarWrapper>
      )
  }
}

// 기존 ClipToolBar 호환성을 위한 export
export { HomeToolbar as ClipToolBar }
