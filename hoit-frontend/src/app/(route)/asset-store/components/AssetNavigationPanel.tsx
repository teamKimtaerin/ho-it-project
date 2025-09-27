'use client'

import { clsx } from 'clsx'
import { type BaseComponentProps } from '@/lib/utils'
import { AssetItem } from '@/types/asset-store'
import React, { useCallback, useEffect } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'
import { AssetNavigationCard } from './AssetNavigationCard'

interface AssetNavigationPanelProps extends BaseComponentProps {
  assets: AssetItem[]
  currentAssetId: string
  onAssetChange: (asset: AssetItem) => void
}

export const AssetNavigationPanel: React.FC<AssetNavigationPanelProps> = ({
  assets,
  currentAssetId,
  onAssetChange,
  className,
}) => {
  const ASSETS_PER_PAGE = 5

  // 현재 에셋 인덱스 찾기
  const currentIndex = assets.findIndex((asset) => asset.id === currentAssetId)

  // 현재 선택된 에셋 기준으로 앞뒤 2개씩 보여주기 (총 5개)
  const getVisibleAssets = () => {
    if (assets.length <= ASSETS_PER_PAGE) {
      return assets
    }

    const startIndex = Math.max(0, currentIndex - 2)
    const endIndex = Math.min(assets.length, startIndex + ASSETS_PER_PAGE)
    const adjustedStartIndex = Math.max(0, endIndex - ASSETS_PER_PAGE)

    return assets.slice(adjustedStartIndex, endIndex)
  }

  const visibleAssets = getVisibleAssets()

  // 이전/다음 에셋으로 이동 (전체 리스트 기준)
  const navigateAsset = useCallback(
    (direction: 'prev' | 'next') => {
      if (assets.length === 0) return

      const newIndex =
        direction === 'next'
          ? (currentIndex + 1) % assets.length
          : (currentIndex - 1 + assets.length) % assets.length

      onAssetChange(assets[newIndex])
    },
    [assets, currentIndex, onAssetChange]
  )

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        navigateAsset('prev')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        navigateAsset('next')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigateAsset])

  if (assets.length <= 1) {
    return null // 에셋이 1개 이하면 네비게이션 패널 숨김
  }

  const panelClasses = clsx(
    'bg-white',
    'border-t',
    'border-gray-200',
    'px-6',
    'py-4',
    'h-full',
    'flex',
    'flex-col',
    className
  )

  return (
    <div className={panelClasses}>
      {/* 헤더 - Navigation Area 상단 */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center space-x-3">
          <h4 className="text-base font-semibold text-gray-800">
            다른 애니메이션 둘러보기
          </h4>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {currentIndex + 1}/{assets.length}
          </span>
        </div>
      </div>

      {/* 에셋 카드 컨테이너 */}
      <div className="relative flex-1 flex items-center min-h-0">
        {/* 좌측 이전 에셋 버튼 */}
        <button
          onClick={() => navigateAsset('prev')}
          disabled={assets.length === 0}
          className={clsx(
            'absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2 z-10',
            'w-10 h-10 bg-white border border-gray-300 rounded-full shadow-md',
            'flex items-center justify-center transition-all',
            assets.length === 0
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-gray-50 hover:shadow-lg cursor-pointer'
          )}
          title="이전 애니메이션"
        >
          <LuChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        {/* 에셋 카드들 (최대 5개) */}
        <div className="flex justify-center space-x-5 w-full h-full items-center">
          {visibleAssets.map((asset) => (
            <AssetNavigationCard
              key={asset.id}
              asset={asset}
              isActive={asset.id === currentAssetId}
              onClick={onAssetChange}
            />
          ))}
        </div>

        {/* 우측 다음 에셋 버튼 */}
        <button
          onClick={() => navigateAsset('next')}
          disabled={assets.length === 0}
          className={clsx(
            'absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 z-10',
            'w-10 h-10 bg-white border border-gray-300 rounded-full shadow-md',
            'flex items-center justify-center transition-all',
            assets.length === 0
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-gray-50 hover:shadow-lg cursor-pointer'
          )}
          title="다음 애니메이션"
        >
          <LuChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  )
}
