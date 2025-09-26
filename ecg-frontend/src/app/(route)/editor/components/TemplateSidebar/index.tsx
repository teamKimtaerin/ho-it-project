'use client'

import React, { useState } from 'react'
import { useEditorStore } from '../../store'
import { showToast } from '@/utils/ui/toast'

// Components
import SidebarHeader from './SidebarHeader'
import UsedTemplatesStrip from './UsedTemplatesStrip'
import TabNavigation from './TabNavigation'
import TemplateGrid from './TemplateGrid'
import TemplateControlPanel from './TemplateControlPanel'
import AssetStoreLinkBanner from '../AssetStoreLinkBanner'
import { TemplateItem } from './TemplateCard'

interface TemplateSidebarProps {
  className?: string
  onTemplateSelect?: (template: TemplateItem) => void
  onClose?: () => void
}

const TemplateSidebar: React.FC<TemplateSidebarProps> = ({
  className,
  onTemplateSelect,
  onClose,
}) => {
  const { rightSidebarType, assetSidebarWidth } = useEditorStore()

  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(
    null
  )
  const [expandedTemplateName, setExpandedTemplateName] = useState<
    string | null
  >(null)

  // Template sidebar is disabled
  return null

  const handleTemplateSelect = (template: TemplateItem) => {
    // Show paid template notification for all templates
    showToast('유료 템플릿입니다. 사용이 불가능합니다', 'error')

    // Log for debugging but don't apply template
    console.log('Template click blocked:', template)
  }

  const handleExpandTemplate = (templateId: string, templateName: string) => {
    // Disabled: Don't expand template detail panel
    // Keep toast notification only without showing detail options
  }

  return (
    <div
      className={`flex flex-col h-full bg-white border-l border-gray-200 ${
        className || ''
      }`}
      style={{ width: `${assetSidebarWidth}px` }}
    >
      {/* Header */}
      <SidebarHeader title="애니메이션 템플릿" onClose={onClose} />

      {/* Asset Store Link */}
      <AssetStoreLinkBanner type="templates" />

      {/* Search
      <SearchBar placeholder="Search templates..." /> */}

      {/* Used Templates Strip */}
      <UsedTemplatesStrip />

      {/* Tab Navigation */}
      <TabNavigation />

      {/* Template Grid */}
      <div className="flex-1 overflow-y-auto">
        <TemplateGrid
          onTemplateSelect={handleTemplateSelect}
          onExpandTemplate={handleExpandTemplate}
          expandedTemplateId={expandedTemplateId}
        />
      </div>

      {/* Control Panel - Disabled to prevent template detail options */}
      {false && expandedTemplateId && (
        <TemplateControlPanel
          templateId={expandedTemplateId || ''}
          templateName={expandedTemplateName || ''}
          onClose={() => {
            setExpandedTemplateId(null)
            setExpandedTemplateName(null)
          }}
        />
      )}
    </div>
  )
}

export default TemplateSidebar
