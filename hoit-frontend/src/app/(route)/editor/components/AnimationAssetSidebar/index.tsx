'use client'

import React, { useState } from 'react'
import { useEditorStore } from '../../store'
import {
  determineTargetWordId,
  determineTargetWordIds,
  isMultipleWordsSelected,
  getMultipleWordsDisplayText,
} from '../../utils/animationHelpers'

// Components
import SidebarHeader from './SidebarHeader'
import SearchBar from './SearchBar'
import UsedAssetsStrip from './UsedAssetsStrip'
import TabNavigation from './TabNavigation'
import AssetGrid from './AssetGrid'
import AssetControlPanel from './AssetControlPanel'
import AssetStoreLinkBanner from '../AssetStoreLinkBanner'
import { AssetItem } from './AssetCard'

interface AnimationAssetSidebarProps {
  className?: string
  onAssetSelect?: (asset: AssetItem) => void
  onClose?: () => void
}

const AnimationAssetSidebar: React.FC<AnimationAssetSidebarProps> = ({
  className,
  onAssetSelect,
  onClose,
}) => {
  const {
    assetSidebarWidth,
    selectedWordId,
    multiSelectedWordIds,
    selectedStickerId,
    // Get insertedTexts and selectedTextId from TextInsertionSlice
    insertedTexts,
    selectedTextId,
  } = useEditorStore()

  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null)
  const [expandedAssetName, setExpandedAssetName] = useState<string | null>(
    null
  )

  // Find selected word info
  const selectedWordInfo = React.useMemo(() => {
    if (!selectedWordId) return null
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = useEditorStore.getState() as any
      const entry = store.getWordEntryById?.(selectedWordId)
      if (entry?.word) {
        return { word: entry.word, clipId: entry.clipId }
      }
    } catch {}
    return null
  }, [selectedWordId])

  // Multi-selection info
  const multiSelectionInfo = React.useMemo(() => {
    if (multiSelectedWordIds.size <= 1) return null

    const store = useEditorStore.getState()
    const targetWordIds = determineTargetWordIds(store)
    const displayText = getMultipleWordsDisplayText(store, targetWordIds)

    return {
      count: multiSelectedWordIds.size,
      displayText,
    }
  }, [multiSelectedWordIds])

  // InsertedText corresponding to selected sticker
  const insertedTextFromSticker = React.useMemo(() => {
    if (!selectedStickerId) return null
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = useEditorStore.getState() as any
      const clips = store.clips || []

      // Find the sticker in clips
      for (const clip of clips) {
        const sticker = clip.stickers?.find(
          (s: any) => s.id === selectedStickerId
        )
        if (sticker) {
          // Find corresponding InsertedText by matching text content and time
          const matchingInsertedText = insertedTexts?.find(
            (text: any) =>
              text.content === sticker.text &&
              Math.abs(text.startTime - sticker.start) < 0.1 && // Allow small time difference
              Math.abs(text.endTime - sticker.end) < 0.1
          )

          if (matchingInsertedText) {
            return {
              insertedText: matchingInsertedText,
              sticker,
              clipId: clip.id,
            }
          }
        }
      }
    } catch {}
    return null
  }, [selectedStickerId, insertedTexts])

  // Selected InsertedText info (either directly selected or via sticker)
  const selectedInsertedTextInfo = React.useMemo(() => {
    // Priority 1: Direct InsertedText selection
    if (selectedTextId && insertedTexts) {
      const insertedText = insertedTexts.find(
        (text: any) => text.id === selectedTextId
      )
      if (insertedText) {
        return { insertedText, source: 'direct' }
      }
    }

    // Priority 2: InsertedText via sticker selection
    if (insertedTextFromSticker) {
      return {
        insertedText: insertedTextFromSticker.insertedText,
        source: 'sticker',
        sticker: insertedTextFromSticker.sticker,
        clipId: insertedTextFromSticker.clipId,
      }
    }

    return null
  }, [selectedTextId, insertedTexts, insertedTextFromSticker])

  const handleAssetSelect = (asset: AssetItem) => {
    // console.log('Selected asset:', asset)

    const store = useEditorStore.getState()

    // Handle InsertedText asset selection (either direct or via sticker)
    if (selectedInsertedTextInfo) {
      const { insertedText, source } = selectedInsertedTextInfo
      const currentAnimation = insertedText.animation
      const isAlreadyApplied = currentAnimation?.plugin === asset.pluginKey

      if (isAlreadyApplied) {
        // Asset is already applied, open parameter panel
        setExpandedAssetId(asset.id)
        setExpandedAssetName(asset.name)
        console.log(
          'Opening parameter panel for InsertedText asset:',
          asset.name
        )
        return
      }

      // Apply animation to InsertedText
      const storeActions = store as any
      if (storeActions.updateTextAnimation) {
        const newAnimation = {
          plugin: asset.pluginKey || asset.name,
          parameters: {}, // Start with empty parameters
        }
        storeActions.updateTextAnimation(insertedText.id, newAnimation)
        console.log(`Applied asset to InsertedText (${source}):`, asset.name)
      }
      return
    }

    // Handle word asset selection (existing logic)
    const targetWordId = determineTargetWordId(store)
    if (targetWordId) {
      const currentTracks = store.wordAnimationTracks.get(targetWordId) || []
      const isAlreadyApplied = currentTracks.find((t) => t.assetId === asset.id)

      if (isAlreadyApplied) {
        // Asset is already applied, open parameter panel
        setExpandedAssetId(asset.id)
        setExpandedAssetName(asset.name)
        // console.log('Opening parameter panel for applied asset:', asset.name)
        return
      }
    }

    // Asset is not applied, normal selection callback
    onAssetSelect?.(asset)
  }

  const handleExpandedAssetChange = (
    assetId: string | null,
    assetName: string | null
  ) => {
    setExpandedAssetId(assetId)
    setExpandedAssetName(assetName)
  }

  const handleControlPanelClose = () => {
    setExpandedAssetId(null)
    setExpandedAssetName(null)
  }

  const handleSettingsChange = async (settings: Record<string, unknown>) => {
    // console.log('Settings changed:', settings)

    const store = useEditorStore.getState()
    const isMultiSelection = isMultipleWordsSelected(store)
    const assetId = expandedAssetId

    if (!assetId) {
      throw new Error('애니메이션을 선택해주세요.')
    }

    // Apply settings to the animation track(s)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storeActions = store as any

      // Handle InsertedText animation parameter updates
      if (selectedInsertedTextInfo) {
        const { insertedText } = selectedInsertedTextInfo

        if (storeActions.updateTextAnimation) {
          const currentAnimation = insertedText.animation || {
            plugin: '',
            parameters: {},
          }
          const updatedAnimation = {
            ...currentAnimation,
            parameters: { ...currentAnimation.parameters, ...settings },
          }

          storeActions.updateTextAnimation(insertedText.id, updatedAnimation)
          console.log(
            `Applied settings to InsertedText: "${insertedText.content}"`
          )
        }
        return
      }

      if (isMultiSelection) {
        // Apply to all selected words
        const wordIds = determineTargetWordIds(store)
        if (wordIds.length === 0) {
          throw new Error('애니메이션을 적용할 단어를 선택해주세요.')
        }

        storeActions.updateMultipleWordsAnimationParams?.(
          wordIds,
          assetId,
          settings
        )
        // console.log(
        //   `Applied settings to ${wordIds.length} words: "${getMultipleWordsDisplayText(store, wordIds)}"`
        // )
      } else {
        // Apply to single word
        const wordId = determineTargetWordId(store)
        if (!wordId) {
          throw new Error('애니메이션을 적용할 단어를 선택해주세요.')
        }

        await storeActions.updateAnimationTrackParams?.(
          wordId,
          assetId,
          settings
        )
        // console.log(
        //   `Applied settings to word "${getTargetWordDisplayName(store)}"`
        // )
      }

      // Note: refreshWordPluginChain is called automatically in update methods
    } catch (error) {
      console.error('Failed to apply animation settings:', error)
      throw error // Re-throw for UI error handling
    }
  }

  return (
    <div
      className={`relative flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full ${className || ''}`}
      style={{ width: assetSidebarWidth }}
    >
      {/* Fixed Header */}
      <div className="flex-shrink-0">
        <SidebarHeader onClose={onClose} />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {/* Selection Indicator */}
        {selectedInsertedTextInfo ? (
          <div className="px-4 py-2 bg-purple-50 border-b border-purple-200">
            <div className="text-xs text-purple-600">
              {selectedInsertedTextInfo.source === 'sticker'
                ? '스티커 연결 텍스트'
                : '선택된 삽입 텍스트'}
              :{' '}
              <span className="font-medium text-purple-800">
                📝 &ldquo;{selectedInsertedTextInfo.insertedText.content}&rdquo;
              </span>
            </div>
            <div className="text-xs text-purple-500 mt-1">
              삽입 텍스트 (
              {selectedInsertedTextInfo.insertedText.startTime.toFixed(1)}s -{' '}
              {selectedInsertedTextInfo.insertedText.endTime.toFixed(1)}s)
              {selectedInsertedTextInfo.source === 'sticker' && (
                <span className="ml-2 text-purple-400">
                  (클립 스티커 통해 선택됨)
                </span>
              )}
            </div>
          </div>
        ) : multiSelectionInfo ? (
          <div className="px-4 py-2 bg-purple-50 border-b border-purple-200">
            <div className="text-xs text-purple-600">
              다중 선택:{' '}
              <span className="font-medium text-purple-800">
                {multiSelectionInfo.count}개 단어
              </span>
            </div>
            <div className="text-xs text-purple-500 mt-1">
              {multiSelectionInfo.displayText}
            </div>
          </div>
        ) : selectedWordInfo ? (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
            <div className="text-xs text-blue-600">
              선택된 단어:{' '}
              <span className="font-medium text-blue-800">
                &ldquo;{selectedWordInfo.word.text}&rdquo;
              </span>
            </div>
          </div>
        ) : null}

        {/* Filter Controls */}
        <div className="pt-4">
          <AssetStoreLinkBanner type="assets" />
          <SearchBar />

          {/* Used Assets Strip */}
          <UsedAssetsStrip onExpandedAssetChange={handleExpandedAssetChange} />

          {/* AssetControlPanel - Inline between UsedAssetsStrip and TabNavigation */}
          {expandedAssetId && expandedAssetName && (
            <div className="px-4 pb-2">
              <AssetControlPanel
                assetName={expandedAssetName}
                assetId={expandedAssetId}
                onClose={handleControlPanelClose}
                onSettingsChange={handleSettingsChange}
              />
            </div>
          )}

          <TabNavigation />
        </div>

        {/* Asset Grid - Remove individual scroll */}
        <div className="px-4 pb-4">
          <AssetGrid onAssetSelect={handleAssetSelect} />
        </div>
      </div>
    </div>
  )
}

export default AnimationAssetSidebar
