'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  IoClose,
  IoRefresh,
  IoChevronUp,
  IoExpand,
  IoDocument,
  IoEye,
  IoTrendingUp,
  IoFlash,
  IoArrowBack,
} from 'react-icons/io5'
import { useEditorStore } from '../../store'
import { AssetItem } from './AssetCard'
import {
  determineTargetWordIds,
  isMultipleWordsSelected,
  getCommonAnimations,
} from '../../utils/animationHelpers'

interface AssetDatabaseItem {
  id: string
  title: string
  category: string
  description: string
  thumbnail?: string
  pluginKey?: string
  thumbnailPath?: string
  isPro: boolean
}

interface AssetDatabase {
  assets: AssetDatabaseItem[]
}

interface UsedAssetsStripProps {
  onExpandedAssetChange?: (
    assetId: string | null,
    assetName: string | null
  ) => void
}

const UsedAssetsStrip: React.FC<UsedAssetsStripProps> = ({
  onExpandedAssetChange,
}) => {
  const {
    currentWordAssets,
    setCurrentWordAssets,
    selectedWordId,
    applyAssetsToWord,
    expandedAssetId,
    setExpandedAssetId,
    focusedWordId,
    removeAnimationTrack,
    removeAnimationFromMultipleWords,
    wordAnimationTracks,
  } = useEditorStore()

  const [allAssets, setAllAssets] = useState<AssetItem[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch assets from JSON file
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true)
        // console.log('Fetching assets from /asset-store/assets-database.json')

        const response = await fetch('/asset-store/assets-database.json', {
          cache: 'no-cache',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        // console.log('Response status:', response.status, response.statusText)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: AssetDatabase = await response.json()
        const origin = (
          process.env.NEXT_PUBLIC_MOTIONTEXT_PLUGIN_ORIGIN ||
          'http://localhost:3300'
        ).replace(/\/$/, '')
        // console.log('Assets loaded successfully:', data.assets.length, 'assets')

        // Transform JSON data to AssetItem format
        const transformedAssets: AssetItem[] = data.assets.map((asset) => {
          let thumb = asset.thumbnail || '/placeholder-thumb.jpg'
          if (asset.pluginKey) {
            const base = `${origin}/plugins/${asset.pluginKey}`
            thumb = `${base}/${asset.thumbnailPath || 'assets/thumbnail.svg'}`
          }
          return {
            id: asset.id,
            name: asset.title,
            category: asset.category,
            type: 'free' as const,
            pluginKey: asset.pluginKey,
            preview: {
              type: 'image' as const,
              value: thumb,
            },
            description: asset.description,
          }
        })

        setAllAssets(transformedAssets)
      } catch (err) {
        console.error('Failed to fetch assets:', err)
        // Set empty array on error to prevent infinite loading
        setAllAssets([])
      } finally {
        setLoading(false)
      }
    }

    fetchAssets()
  }, [])

  // Check if multi-selection is active
  const store = useEditorStore.getState()
  const isMultiSelection = isMultipleWordsSelected(store)
  const targetWordIds = determineTargetWordIds(store)

  // Get used assets: for multi-selection, show only common animations
  const usedAssets = (() => {
    if (isMultiSelection && targetWordIds.length > 1) {
      // Show only animations that are common to all selected words
      const commonAssetIds = getCommonAnimations(store, targetWordIds)
      return commonAssetIds
        .map((id) => allAssets.find((asset) => asset.id === id))
        .filter((asset) => asset !== undefined) as AssetItem[]
    } else {
      // Show all assets for the current word (single selection)
      return currentWordAssets
        .map((id) => allAssets.find((asset) => asset.id === id))
        .filter((asset) => asset !== undefined) as AssetItem[]
    }
  })()

  // Get animations applied to the currently focused word
  const targetWordId =
    focusedWordId ||
    selectedWordId ||
    (useEditorStore.getState().multiSelectedWordIds?.size === 1
      ? Array.from(useEditorStore.getState().multiSelectedWordIds)[0]
      : null)
  const focusedWordAnimations = targetWordId
    ? wordAnimationTracks.get(targetWordId) || []
    : []

  // Get asset selection order based on array index
  const getAssetOrder = (index: number) => {
    return index + 1
  }

  // Get characteristic icon for each asset type
  const getAssetIcon = (assetName: string) => {
    const iconMap = {
      'Rotation Text': IoRefresh,
      'TypeWriter Effect': IoDocument,
      'Elastic Bounce': IoChevronUp,
      'Glitch Effect': IoFlash,
      'Magnetic Pull': IoArrowBack,
      'Fade In Stagger': IoEye,
      'Scale Pop': IoExpand,
      'Slide Up': IoTrendingUp,
    }
    return iconMap[assetName as keyof typeof iconMap] || null
  }

  const handleRemoveAsset = (assetId: string) => {
    // Close control panel if removing the expanded asset
    if (expandedAssetId === assetId) {
      setExpandedAssetId(null)
      onExpandedAssetChange?.(null, null)
    }

    if (isMultiSelection && targetWordIds.length > 1) {
      // Remove animation from all selected words
      removeAnimationFromMultipleWords(targetWordIds, assetId)
      // console.log(
      //   `Removed animation ${assetId} from ${targetWordIds.length} selected words`
      // )
    } else {
      // Single word removal (existing behavior)
      const newAssets = currentWordAssets.filter((id) => id !== assetId)
      setCurrentWordAssets(newAssets)

      // Remove animation track from focused word
      if (targetWordId) {
        removeAnimationTrack(targetWordId, assetId)
        // Note: removeAnimationTrack handles refreshWordPluginChain internally
      }

      // If a word is selected, apply the changes to the word
      if (selectedWordId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const store = useEditorStore.getState() as any
          const clipId = store.getClipIdByWordId?.(selectedWordId)
          if (clipId) {
            applyAssetsToWord(clipId, selectedWordId, newAssets)
          }
        } catch {}
      }
    }
  }

  const handleAssetClick = (asset: AssetItem) => {
    // Only toggle control panel expansion - no add/remove logic
    const newExpandedId = expandedAssetId === asset.id ? null : asset.id
    setExpandedAssetId(newExpandedId)
    onExpandedAssetChange?.(newExpandedId, newExpandedId ? asset.name : null)

    // console.log('Opening parameter panel for:', asset.name)
  }

  if (loading) {
    return (
      <div className="px-4 pb-3">
        <h3 className="text-sm font-medium text-white mb-2">사용중 에셋</h3>
        <div className="text-xs text-slate-400">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="px-4 pb-3">
      <h3 className="text-sm font-medium text-white mb-2 flex items-center justify-between">
        <span>
          {isMultiSelection ? '공통 애니메이션' : '사용중 에셋'} (
          {usedAssets.length}개)
        </span>
        {isMultiSelection ? (
          <span className="text-xs text-slate-400">
            {targetWordIds.length}개 단어 선택됨
          </span>
        ) : focusedWordId ? (
          <span className="text-xs text-slate-400">
            선택한 단어: {focusedWordAnimations.length}/3 애니메이션
          </span>
        ) : null}
      </h3>

      {usedAssets.length === 0 ? (
        <div className="text-xs text-slate-400 py-2">
          {isMultiSelection
            ? '선택한 단어들의 공통 애니메이션이 없습니다.'
            : '사용중인 에셋이 없습니다.'}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-6 overflow-x-auto pb-2 pt-6 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            {usedAssets.map((asset, index) => {
              const isAppliedToFocusedWord = focusedWordAnimations.some(
                (track) => track.assetId === asset.id
              )
              const trackForFocusedWord = focusedWordAnimations.find(
                (track) => track.assetId === asset.id
              )

              return (
                <div key={asset.id} className="flex-shrink-0">
                  <div
                    className={`relative group bg-slate-700/50 rounded-lg overflow-visible cursor-pointer transition-all duration-200 ${
                      expandedAssetId === asset.id
                        ? 'ring-2 ring-blue-500/50 bg-slate-600/50'
                        : isAppliedToFocusedWord
                          ? `ring-2 ring-${trackForFocusedWord?.color || 'blue'}-500 bg-slate-600/70`
                          : 'hover:bg-slate-600/50'
                    }`}
                    style={{ width: '80px' }}
                    onClick={() => handleAssetClick(asset)}
                  >
                    {/* Characteristic Icon */}
                    {(() => {
                      const IconComponent = getAssetIcon(asset.name)
                      return IconComponent ? (
                        <div
                          className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-slate-800/90 rounded-full w-6 h-6 flex items-center justify-center shadow-sm"
                          style={{ zIndex: 10 }}
                        >
                          <IconComponent size={14} className="text-slate-300" />
                        </div>
                      ) : null
                    })()}

                    {/* Thumbnail */}
                    <div className="aspect-[4/3] bg-slate-800/50 flex items-center justify-center overflow-hidden relative">
                      <Image
                        src={asset.preview.value}
                        alt={asset.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>

                    {/* Order Badge */}
                    <div
                      className="absolute -top-1 -left-1 w-5 h-5 bg-blue-500 rounded-md flex items-center justify-center text-white text-xs font-bold shadow-lg flex-shrink-0"
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        minWidth: '20px',
                        minHeight: '20px',
                        fontSize: '10px',
                        boxSizing: 'border-box',
                      }}
                      aria-label={`선택 순서 ${getAssetOrder(index)}번`}
                    >
                      {getAssetOrder(index)}
                    </div>

                    {/* Asset Name */}
                    <div className="px-1 py-1">
                      <p className="text-xs text-white truncate leading-tight">
                        {asset.name}
                      </p>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveAsset(asset.id)
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg flex-shrink-0 cursor-pointer"
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        minWidth: '24px',
                        minHeight: '24px',
                        boxSizing: 'border-box',
                      }}
                      aria-label={`${asset.name} 제거`}
                    >
                      <IoClose size={14} className="text-white" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default UsedAssetsStrip
