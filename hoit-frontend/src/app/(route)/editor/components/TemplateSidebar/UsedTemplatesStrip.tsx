'use client'

import React from 'react'
import Image from 'next/image'
import { IoClose } from 'react-icons/io5'
import { TemplateItem } from './TemplateCard'

interface UsedTemplatesStripProps {
  usedTemplates?: TemplateItem[]
  onRemoveTemplate?: (templateId: string) => void
}

const UsedTemplatesStrip: React.FC<UsedTemplatesStripProps> = ({
  usedTemplates = [],
  onRemoveTemplate,
}) => {
  const handleRemoveTemplate = (templateId: string) => {
    onRemoveTemplate?.(templateId)
  }

  return (
    <div className="px-4 pb-3 border-b border-gray-100">
      <h3 className="text-sm font-medium text-gray-900 mb-2">
        사용중 템플릿{' '}
        {usedTemplates.length > 0 &&
          `- ${usedTemplates.map((t) => t.name).join(', ')}`}
      </h3>

      {usedTemplates.length === 0 ? (
        <div className="text-xs text-gray-400 py-2">
          사용중인 템플릿이 없습니다.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {usedTemplates.map((template, index) => (
            <div key={template.id} className="flex-shrink-0">
              <div className="relative group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-all duration-200 w-20">
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden relative">
                  {template.preview.type === 'image' ? (
                    <Image
                      src={template.preview.value}
                      alt={template.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ backgroundColor: template.preview.value }}
                    />
                  )}
                </div>

                {/* Order Badge */}
                <div className="absolute -top-1 -left-1 w-5 h-5 bg-blue-500 rounded-md flex items-center justify-center text-white text-xs font-bold shadow-lg">
                  {index + 1}
                </div>

                {/* Template Name */}
                <div className="px-1 py-1">
                  <p className="text-xs text-gray-900 truncate leading-tight">
                    {template.name}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveTemplate(template.id)
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg cursor-pointer"
                  aria-label={`${template.name} 제거`}
                >
                  <IoClose size={14} className="text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default UsedTemplatesStrip
