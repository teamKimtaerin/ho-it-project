'use client'

import Image from 'next/image'
import React from 'react'
import { IoStar } from 'react-icons/io5'

export interface AssetItem {
  id: string
  name: string
  category: string
  type: 'free' | 'premium' | 'my'
  preview: {
    type: 'color' | 'gradient' | 'image'
    value: string
    secondary?: string
  }
  pluginKey?: string
  iconName?: string
  isUsed?: boolean
  isFavorite?: boolean
  description?: string
  disabled?: boolean
}

interface AssetCardProps {
  asset: AssetItem
  onClick?: (asset: AssetItem) => void
  disabled?: boolean
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onClick, disabled }) => {
  const handleClick = () => {
    if (disabled) return
    onClick?.(asset)
  }

  const getPreviewContent = () => {
    switch (asset.preview.type) {
      case 'color':
        return (
          <div
            className="w-full h-full rounded"
            style={{ backgroundColor: asset.preview.value }}
          />
        )
      case 'gradient':
        return (
          <div
            className="w-full h-full rounded"
            style={{
              background: `linear-gradient(135deg, ${asset.preview.value} 0%, ${asset.preview.secondary} 100%)`,
            }}
          />
        )
      case 'image':
        return (
          <Image
            src={asset.preview.value}
            alt={asset.name}
            fill
            className="object-cover rounded"
          />
        )
      default:
        return (
          <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
            <span className="text-gray-400 text-xs">Asset</span>
          </div>
        )
    }
  }

  return (
    <div
      className={`group relative bg-white border rounded-lg p-2 transition-all ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:shadow-md cursor-pointer border-gray-200'
      } ${asset.isUsed ? 'ring-2 ring-blue-500' : 'border-gray-200'}`}
      onClick={handleClick}
    >
      {/* Preview */}
      <div className="relative aspect-video mb-2 overflow-hidden">
        {getPreviewContent()}

        {/* Premium badge */}
        {asset.type === 'premium' && (
          <div className="absolute top-1 right-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <IoStar size={10} />
            <span>회원 전용</span>
          </div>
        )}

        {/* Favorite indicator */}
        {asset.isFavorite && (
          <div className="absolute top-1 left-1 text-yellow-500">
            <IoStar size={14} />
          </div>
        )}

        {/* Used indicator */}
        {asset.isUsed && (
          <div
            className={`absolute top-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded ${
              asset.type === 'premium' ? 'right-1 mt-6' : 'right-1'
            }`}
          >
            적용중
          </div>
        )}
      </div>

      {/* Asset Name */}
      <div className="text-xs font-medium text-gray-900 truncate">
        {asset.name}
      </div>

      {/* Category */}
      <div className="text-xs text-gray-500 truncate mt-0.5">
        {asset.category}
      </div>
    </div>
  )
}

export default AssetCard
