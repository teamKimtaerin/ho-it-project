'use client'

import ToolbarButton from './shared/ToolbarButton'

interface TemplateToolbarProps {
  onToggleTemplateSidebar?: () => void
}

export default function TemplateToolbar({
  onToggleTemplateSidebar,
}: TemplateToolbarProps) {
  // 템플릿 핸들러들
  const handleTemplates = () => {
    if (onToggleTemplateSidebar) {
      onToggleTemplateSidebar()
    }
  }

  const handleCreateTemplate = () => {
    console.log('템플릿 만들기')
    // TODO: 템플릿 만들기 모달 열기
  }

  return (
    <>
      {/* 템플릿 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        }
        label="템플릿"
        onClick={handleTemplates}
      />

      {/* 템플릿 만들기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        }
        label="템플릿 만들기"
        disabled={true}
        onClick={handleCreateTemplate}
      />
    </>
  )
}
