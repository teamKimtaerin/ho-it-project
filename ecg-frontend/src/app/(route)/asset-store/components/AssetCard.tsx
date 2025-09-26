'use client'

import { clsx } from 'clsx'
import {
  logComponentWarning,
  TRANSITIONS,
  type BaseComponentProps,
} from '@/lib/utils'
import { AssetItem } from '@/types/asset-store'
import React from 'react'
import { LuHeart, LuDownload, LuImage } from 'react-icons/lu'

// Asset 카드 Props 타입
interface AssetCardProps extends BaseComponentProps {
  asset: AssetItem
  onCardClick: (asset: AssetItem) => void
  onLikeClick?: (assetId: string) => void
  onFavoriteToggle?: (assetId: string) => void
}

// Asset 카드 컴포넌트
export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  onCardClick,
  onLikeClick,
  onFavoriteToggle,
  className,
}) => {
  // 검증
  if (!asset.id) {
    logComponentWarning('AssetCard', 'Asset ID is required')
  }

  // 카드 컨테이너 클래스
  const cardClasses = clsx(
    'group',
    'cursor-pointer',
    'bg-white', // 화이트 배경
    'rounded-xl', // 더 둥근 반지름
    'p-4', // 패딩 추가
    'shadow-sm', // 미세한 그림자
    'border',
    'border-gray-100',
    'hover:shadow-md', // 호버 시 그림자 증가
    'hover:border-gray-200',
    TRANSITIONS.normal,
    className
  )

  // 썸네일 컨테이너 클래스
  const thumbnailClasses = clsx(
    'aspect-[4/3]', // 정사각형에서 4:3 비율로 변경
    'rounded-lg',
    'bg-gray-50', // 더 밝은 배경
    'relative',
    'overflow-hidden',
    'mb-3', // 마진 추가
    TRANSITIONS.normal
  )

  // 플레이스홀더 클래스
  const placeholderClasses = clsx(
    'h-full',
    'flex',
    'items-center',
    'justify-center',
    'text-gray-300' // 더 밝은 회색
  )

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation() // 카드 클릭 이벤트 방지
    onFavoriteToggle?.(asset.id)
  }

  return (
    <div className={cardClasses} onClick={() => onCardClick(asset)}>
      <div className="relative">
        {/* 즐겨찾기 별 아이콘 */}
        <button
          onClick={handleFavoriteClick}
          className={clsx(
            'absolute',
            'top-2',
            'right-2',
            'z-10',
            'w-8',
            'h-8',
            'flex',
            'items-center',
            'justify-center',
            'rounded-full',
            'bg-white/80',
            'backdrop-blur-sm',
            'hover:bg-white',
            'hover:scale-110',
            'transition-all',
            'duration-200',
            'shadow-sm'
          )}
          aria-label="즐겨찾기"
        >
          <span
            className={clsx(
              'text-base',
              'leading-none',
              'transition-colors',
              'duration-200',
              asset.isFavorite ? 'text-yellow-500' : 'text-gray-400',
              'hover:text-yellow-500'
            )}
            style={{ lineHeight: 1 }}
          >
            {asset.isFavorite ? '★' : '☆'}
          </span>
        </button>

        <div className={thumbnailClasses}>
          {asset.thumbnail !== '/placeholder-thumb.jpg' ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.thumbnail}
                alt={asset.title}
                className="w-full h-full object-cover"
              />
            </>
          ) : (
            <div className={placeholderClasses}>
              <div className="text-center">
                <LuImage className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <div className="text-xs text-gray-400">Sample Asset</div>
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-black font-semibold mb-2 truncate text-sm">
            {asset.title}
          </h3>
          <div className="flex items-center space-x-2">
            <span
              className={clsx(
                'px-2',
                'py-1',
                'rounded-md',
                'text-xs',
                'font-medium',
                'bg-gray-100', // 미니멀한 회색 배경
                'text-gray-600' // 어두운 회색 텍스트
              )}
            >
              {asset.category}
            </span>
            {asset.isPro && (
              <span
                className={clsx(
                  'px-2',
                  'py-1',
                  'rounded-md',
                  'text-xs',
                  'font-medium',
                  'bg-black', // 블랙 배경
                  'text-white' // 화이트 텍스트
                )}
              >
                PRO
              </span>
            )}
          </div>

          {/* 좋아요 수와 다운로드 수 */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onLikeClick?.(asset.id)
              }}
              className="flex items-center space-x-1.5 text-gray-500 hover:text-red-500 transition-colors duration-200 cursor-pointer"
            >
              <LuHeart className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{asset.likes || 0}</span>
            </button>
            <div className="flex items-center space-x-1.5 text-gray-500">
              <LuDownload className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{asset.downloads}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
