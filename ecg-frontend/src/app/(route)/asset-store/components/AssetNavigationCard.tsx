'use client'

import { clsx } from 'clsx'
import { TRANSITIONS, type BaseComponentProps } from '@/lib/utils'
import { AssetItem } from '@/types/asset-store'
import React from 'react'
import Image from 'next/image'
import { IoStar } from 'react-icons/io5'

interface AssetNavigationCardProps extends BaseComponentProps {
  asset: AssetItem
  isActive: boolean
  onClick: (asset: AssetItem) => void
}

export const AssetNavigationCard: React.FC<AssetNavigationCardProps> = ({
  asset,
  isActive,
  onClick,
  className,
}) => {
  const cardClasses = clsx(
    'group',
    'flex-shrink-0',
    'w-40 h-24', // 160x96px (5:3 비율로 높이를 더 늘림)
    'cursor-pointer',
    'bg-white',
    'rounded-lg',
    'border-2',
    'overflow-hidden',
    'shadow-sm',
    'relative',
    TRANSITIONS.normal,
    isActive
      ? 'border-purple-500 ring-2 ring-purple-200'
      : 'border-gray-200 hover:border-gray-300 hover:shadow-md',
    className
  )

  const thumbnailClasses = clsx(
    'w-full',
    'h-full',
    'object-cover',
    'bg-gray-100'
  )

  return (
    <div className={cardClasses} onClick={() => onClick(asset)}>
      {/* 썸네일 */}
      <div className="relative w-full h-full">
        <Image
          src={asset.thumbnail}
          alt={asset.title}
          className={thumbnailClasses}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={(e) => {
            // 이미지 로드 실패 시 기본 배경으로 대체
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />

        {/* 즐겨찾기 표시 */}
        {asset.isFavorite && (
          <div className="absolute top-1 right-1">
            <IoStar className="w-3 h-3 text-yellow-500" />
          </div>
        )}

        {/* 활성 상태 오버레이 */}
        {isActive && (
          <div className="absolute inset-0 bg-purple-500/20 border border-purple-500 rounded" />
        )}

        {/* 호버 오버레이 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>

      {/* 제목 툴팁 (호버 시 표시) */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {asset.title}
        </div>
      </div>
    </div>
  )
}
