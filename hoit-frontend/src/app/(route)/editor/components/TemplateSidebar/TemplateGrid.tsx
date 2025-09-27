'use client'

import React, { useState, useEffect } from 'react'
import TemplateCard, { TemplateItem } from './TemplateCard'

interface TemplateGridProps {
  onTemplateSelect?: (template: TemplateItem) => void
  onExpandTemplate?: (templateId: string, templateName: string) => void
  expandedTemplateId?: string | null
}

const TemplateGrid: React.FC<TemplateGridProps> = ({
  onTemplateSelect,
  onExpandTemplate,
  expandedTemplateId,
}) => {
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)

  // Load templates from database
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch('/asset-store/templates-database.json')
        const data = await response.json()

        const templateItems: TemplateItem[] = data.templates.map(
          (template: unknown) => {
            const t = template as Record<string, unknown>
            return {
              id: t.id as string,
              name: t.title as string,
              category: t.category as string,
              type: t.isPro ? 'premium' : 'free',
              preview: t.preview as string,
              description: t.description as string,
              manifestFile: t.manifestFile as string,
              thumbnail: t.thumbnail as string,
            }
          }
        )

        setTemplates(templateItems)
        setLoading(false)
      } catch (error) {
        console.error('Failed to load templates:', error)
        setLoading(false)
      }
    }

    loadTemplates()
  }, [])

  const handleTemplateClick = (template: TemplateItem) => {
    onTemplateSelect?.(template)
    onExpandTemplate?.(template.id, template.name)
  }

  if (loading) {
    return (
      <div className="px-4">
        <div className="grid grid-cols-2 gap-3">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="aspect-video bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4">
      <div className="grid grid-cols-2 gap-3">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={{
              ...template,
              isUsed: expandedTemplateId === template.id,
            }}
            onClick={handleTemplateClick}
          />
        ))}
      </div>
    </div>
  )
}

export default TemplateGrid
