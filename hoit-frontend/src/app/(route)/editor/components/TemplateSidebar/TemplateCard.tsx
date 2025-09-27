'use client'

import React from 'react'
import Image from 'next/image'
import { IoStar } from 'react-icons/io5'

export interface TemplateItem {
  id: string
  name: string
  category: string
  type: 'free' | 'premium' | 'my'
  preview: {
    type: 'color' | 'gradient' | 'image'
    value: string
    secondary?: string
  }
  isUsed?: boolean
  isFavorite?: boolean
  description?: string
  manifestFile?: string
  thumbnail?: string
}

interface TemplateCardProps {
  template: TemplateItem
  onClick?: (template: TemplateItem) => void
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onClick }) => {
  const handleClick = () => {
    onClick?.(template)
  }

  const getPreviewContent = () => {
    switch (template.preview.type) {
      case 'color':
        return (
          <div
            className="w-full h-full rounded"
            style={{ backgroundColor: template.preview.value }}
          />
        )
      case 'gradient':
        return (
          <div
            className="w-full h-full rounded"
            style={{
              background: `linear-gradient(135deg, ${template.preview.value} 0%, ${template.preview.secondary} 100%)`,
            }}
          />
        )
      case 'image':
        return (
          <Image
            src={template.preview.value}
            alt={template.name}
            fill
            className="object-cover rounded"
          />
        )
      default:
        return (
          <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
            <span className="text-gray-400 text-xs">Template</span>
          </div>
        )
    }
  }

  return (
    <div
      className={`group relative bg-white border rounded-lg p-2 hover:shadow-md transition-all cursor-pointer ${
        template.isUsed ? 'ring-2 ring-blue-500' : 'border-gray-200'
      }`}
      onClick={handleClick}
    >
      {/* Preview */}
      <div className="relative aspect-video mb-2 overflow-hidden">
        {getPreviewContent()}

        {/* Premium badge */}
        {template.type === 'premium' && (
          <div className="absolute top-1 right-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <IoStar size={10} />
            <span>PRO</span>
          </div>
        )}

        {/* Favorite indicator */}
        {template.isFavorite && (
          <div className="absolute top-1 left-1 text-yellow-500">
            <IoStar size={14} />
          </div>
        )}

        {/* Used indicator */}
        {template.isUsed && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 flex items-center justify-center">
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
              Applied
            </span>
          </div>
        )}
      </div>

      {/* Template Name */}
      <div className="text-xs font-medium text-gray-900 truncate">
        {template.name}
      </div>

      {/* Category */}
      <div className="text-xs text-gray-500 truncate mt-0.5">
        {template.category}
      </div>
    </div>
  )
}

export default TemplateCard
