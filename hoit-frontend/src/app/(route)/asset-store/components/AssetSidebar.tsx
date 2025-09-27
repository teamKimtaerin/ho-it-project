'use client'

import { clsx } from 'clsx'
import { TRANSITIONS, type BaseComponentProps } from '@/lib/utils'
import React from 'react'

// Category 타입 정의
interface CategoryItem {
  id: string
  label: string
  count: number
}

// Asset 사이드바 Props 타입
interface AssetSidebarProps extends BaseComponentProps {
  selectedCategory?: string
  onCategoryChange?: (category: string) => void
  categories?: CategoryItem[]
  favoriteCount?: number
  onFavoriteClick?: () => void
  onUploadClick?: () => void
  contentType?: 'effects' | 'templates'
}

// Asset 사이드바 컴포넌트
export const AssetSidebar: React.FC<AssetSidebarProps> = ({
  selectedCategory = 'All',
  onCategoryChange,
  categories = [],
  className,
  contentType = 'effects',
}) => {
  // 사이드바 클래스
  const sidebarClasses = clsx(
    'w-48', // 폭 축소 (256px -> 192px)
    'bg-white', // 화이트 배경
    'border-r',
    'border-gray-100', // 미세한 보더
    'min-h-screen',
    'p-5',
    'flex',
    'flex-col',
    className
  )

  // 카테고리 버튼 클래스
  const getCategoryButtonClasses = (isActive: boolean) =>
    clsx(
      'w-full',
      'text-left',
      'px-4',
      'py-2.5',
      'rounded-md',
      'font-medium',
      'text-sm',
      'flex',
      'items-center',
      'justify-between',
      'mb-2',
      'cursor-pointer',
      TRANSITIONS.colors,
      isActive
        ? ['bg-black', 'text-white']
        : [
            'bg-gray-50',
            'text-gray-700',
            'hover:bg-gray-100',
            'hover:text-black',
          ]
    )

  return (
    <aside className={sidebarClasses}>
      {/* 에셋 스토어 제목 */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-black">에셋 스토어</h1>
      </div>

      {/* Categories 섹션 */}
      <div className="mb-6">
        <h3 className="text-black text-base font-semibold mb-5 tracking-wide">
          {contentType === 'effects' ? '이펙트 카테고리' : '템플릿 카테고리'}
        </h3>
        <div className="space-y-1">
          {categories.map((category, index) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange?.(category.id)}
              className={getCategoryButtonClasses(
                selectedCategory === category.id
              )}
              style={{
                animationDelay: `${index * 100}ms`,
                opacity: 0,
                animation: `slideInLeft 0.4s ease-out ${index * 100}ms forwards`,
              }}
            >
              <span>{category.label}</span>
              <span className="text-xs opacity-70 bg-white/20 px-2 py-0.5 rounded-full">
                {category.count}
              </span>
            </button>
          ))}
        </div>

        <style jsx>{`
          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}</style>
      </div>
    </aside>
  )
}
