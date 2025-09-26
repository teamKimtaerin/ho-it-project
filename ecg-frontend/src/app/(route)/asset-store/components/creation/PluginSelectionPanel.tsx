'use client'

import { TRANSITIONS, type BaseComponentProps } from '@/lib/utils'
import { AssetItem } from '@/types/asset-store'
import { clsx } from 'clsx'
import React from 'react'
import {
  LuFlame,
  LuMove,
  LuRotateCw,
  LuSparkles,
  LuStar,
  LuTrendingUp,
  LuType,
  LuWaves,
  LuZap,
} from 'react-icons/lu'

interface PluginSelectionPanelProps extends BaseComponentProps {
  availableAssets: AssetItem[]
  onPluginSelect: (asset: AssetItem) => void
}

export const PluginSelectionPanel: React.FC<PluginSelectionPanelProps> = ({
  availableAssets,
  onPluginSelect,
  className,
}) => {
  // 기본 플러그인 목록 (availableAssets가 없는 경우 사용)
  const defaultPlugins = [
    {
      id: 'typewriter',
      title: 'Typewriter',
      description: '타이핑 효과',
      icon: LuType,
      color: 'from-green-500 to-emerald-600',
      pluginKey: 'typewriter@2.0.0',
    },
    {
      id: 'elastic',
      title: 'Elastic',
      description: '탄성 바운스',
      icon: LuSparkles,
      color: 'from-blue-500 to-cyan-600',
      pluginKey: 'elastic@2.0.0',
    },
    {
      id: 'rotation',
      title: 'Rotation',
      description: '회전 효과',
      icon: LuRotateCw,
      color: 'from-purple-500 to-indigo-600',
      pluginKey: 'rotation@2.0.0',
    },
    {
      id: 'fade',
      title: 'Fade In',
      description: '페이드 효과',
      icon: LuZap,
      color: 'from-orange-500 to-red-600',
      pluginKey: 'fade@2.0.0',
    },
    {
      id: 'slide',
      title: 'Slide Up',
      description: '슬라이드 효과',
      icon: LuMove,
      color: 'from-pink-500 to-rose-600',
      pluginKey: 'slide@2.0.0',
    },
    {
      id: 'scale',
      title: 'Scale Pop',
      description: '스케일 팝업',
      icon: LuTrendingUp,
      color: 'from-yellow-500 to-amber-600',
      pluginKey: 'scale@2.0.0',
    },
    {
      id: 'glow',
      title: 'Glow',
      description: '글로우 효과',
      icon: LuFlame,
      color: 'from-red-500 to-pink-600',
      pluginKey: 'glow@2.0.0',
    },
    {
      id: 'wave',
      title: 'Wave',
      description: '웨이브 효과',
      icon: LuWaves,
      color: 'from-teal-500 to-blue-600',
      pluginKey: 'wave@2.0.0',
    },
    {
      id: 'sparkle',
      title: 'Sparkle',
      description: '스파클 효과',
      icon: LuStar,
      color: 'from-violet-500 to-purple-600',
      pluginKey: 'sparkle@2.0.0',
    },
  ]

  const plugins =
    availableAssets.length > 0 ? availableAssets.slice(0, 9) : defaultPlugins

  const handlePluginClick = (plugin: any) => {
    if (availableAssets.length > 0) {
      onPluginSelect(plugin)
    } else {
      // 기본 플러그인의 경우 AssetItem 형태로 변환
      const assetItem: AssetItem = {
        id: plugin.id,
        title: plugin.title,
        description: plugin.description,
        category: 'animation',
        authorId: 'ecg-team',
        authorName: 'ECG Team',
        isPro: false,
        price: 0,
        downloads: 0,
        rating: 5,
        likes: 0,
        usageCount: 0,
        tags: ['animation'],
        thumbnail: '',
        manifestFile: `/plugin/legacy/${plugin.pluginKey}/manifest.json`,
        pluginKey: plugin.pluginKey,
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      onPluginSelect(assetItem)
    }
  }

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center h-full w-full p-4',
        className
      )}
    >
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-gray-800 mb-1">
          기반 플러그인 선택
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full max-w-md">
        {plugins.map((plugin) => {
          const IconComponent =
            availableAssets.length > 0
              ? LuSparkles
              : (plugin as any).icon || LuSparkles
          const gradientColor =
            availableAssets.length > 0
              ? 'from-gray-500 to-gray-600'
              : (plugin as any).color || 'from-gray-500 to-gray-600'

          return (
            <button
              key={plugin.id}
              onClick={() => handlePluginClick(plugin)}
              className={clsx(
                'p-2 rounded-md border border-gray-200',
                'bg-white hover:bg-gray-50',
                'text-center transition-all duration-200',
                'hover:border-purple-400 hover:shadow-sm transform hover:scale-102',
                'aspect-square flex flex-col items-center justify-center',
                'min-h-0 cursor-pointer', // 최소 높이 제한 해제, 커서 포인터 추가
                TRANSITIONS.colors
              )}
            >
              <div
                className={clsx(
                  'w-6 h-6 rounded-sm mb-1 flex items-center justify-center',
                  'bg-gradient-to-r',
                  gradientColor
                )}
              >
                <IconComponent size={12} className="text-white" />
              </div>
              <h3 className="font-medium text-gray-800 text-xs leading-tight">
                {plugin.title}
              </h3>
              <p className="text-xs text-gray-500 leading-none mt-0.5">
                {plugin.description}
              </p>
            </button>
          )
        })}
      </div>

      <div className="mt-3 text-center">
        <p className="text-xs text-gray-500">
          플러그인을 선택하면 해당 효과가 적용됩니다
        </p>
      </div>
    </div>
  )
}
