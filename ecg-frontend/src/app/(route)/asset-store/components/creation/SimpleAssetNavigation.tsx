'use client'

import { clsx } from 'clsx'
import { type BaseComponentProps } from '@/lib/utils'
import { AssetItem } from '@/types/asset-store'
import React from 'react'
import { LuChevronLeft, LuChevronRight, LuImage } from 'react-icons/lu'

interface SimpleAssetNavigationProps extends BaseComponentProps {
  assets: AssetItem[]
  currentAssetId: string
  onAssetChange: (asset: AssetItem) => void
}

export const SimpleAssetNavigation: React.FC<SimpleAssetNavigationProps> = ({
  assets,
  currentAssetId,
  onAssetChange,
  className,
}) => {
  // 현재 에셋 인덱스 찾기
  const currentIndex = assets.findIndex((asset) => asset.id === currentAssetId)
  const currentAsset = assets[currentIndex]

  // 이전/다음 에셋으로 이동
  const navigateAsset = (direction: 'prev' | 'next') => {
    if (assets.length === 0) return

    const newIndex =
      direction === 'next'
        ? (currentIndex + 1) % assets.length
        : (currentIndex - 1 + assets.length) % assets.length

    onAssetChange(assets[newIndex])
  }

  // 에셋이 1개 이하면 네비게이션 숨기기
  if (assets.length <= 1) return null

  const containerClasses = clsx(
    'flex items-center justify-center',
    'px-4 py-2',
    'bg-white/90 backdrop-blur-sm border border-gray-300 rounded-full shadow-lg',
    'transition-all duration-200',
    className
  )

  const buttonClasses = clsx(
    'flex items-center justify-center',
    'w-8 h-8 rounded-full',
    'bg-gray-100 hover:bg-gray-200',
    'text-gray-600 hover:text-gray-800',
    'transition-all duration-200',
    'cursor-pointer'
  )

  return (
    <div className={containerClasses}>
      {/* 이전 버튼 */}
      <button
        onClick={() => navigateAsset('prev')}
        className={buttonClasses}
        title="이전 애니메이션"
      >
        <LuChevronLeft size={14} />
      </button>

      {/* 현재 에셋 정보 - 컴팩트 */}
      <div className="flex items-center space-x-2 mx-3">
        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full">
          <LuImage size={12} className="text-blue-600" />
        </div>
        <div className="text-center">
          <p className="text-xs font-medium text-gray-900 max-w-[120px] truncate">
            {currentAsset?.title || '애니메이션'}
          </p>
          <p className="text-xs text-gray-500">
            {currentIndex + 1} / {assets.length}
          </p>
        </div>
      </div>

      {/* 다음 버튼 */}
      <button
        onClick={() => navigateAsset('next')}
        className={buttonClasses}
        title="다음 애니메이션"
      >
        <LuChevronRight size={14} />
      </button>
    </div>
  )
}
