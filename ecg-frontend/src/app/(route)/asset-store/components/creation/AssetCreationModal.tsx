'use client'

import { TRANSITIONS, type BaseComponentProps } from '@/lib/utils'
import { clsx } from 'clsx'
import React, { useCallback, useEffect, useState } from 'react'
import { LuX, LuChevronLeft, LuChevronRight } from 'react-icons/lu'
import { MessageCircleIcon } from '@/components/icons'
import { MotionTextPreview } from '../MotionTextPreview'
import { AIAssistantSidebar } from './AIAssistantSidebar'
import { TabbedParameterControls } from './TabbedParameterControls'
import { SimpleAssetNavigation } from './SimpleAssetNavigation'
import { PluginSelectionPanel } from './PluginSelectionPanel'
import {
  AssetCreationModalProps,
  AssetCreationState,
  PARAMETER_GROUPS,
} from './types/assetCreation.types'
import { ChatMessage } from '@/app/(route)/editor/types/chatBot'
import type { PluginManifest } from '../../utils/scenarioGenerator'

export const AssetCreationModal: React.FC<AssetCreationModalProps> = ({
  isOpen,
  onClose,
  selectedAsset,
  onAssetSave,
  availableAssets = [],
  onAssetChange,
}) => {
  // State management
  const [state, setState] = useState<AssetCreationState>({
    aiSidebarOpen: true,
    parameterSidebarExpanded: true,
    expandedSidebarOpen: false,
    activeTab: 'basic',
    parameters: {},
    previewText: '텍스트를 입력해보세요',
    messages: [],
    isTyping: false,
  })

  const [manifest, setManifest] = useState<PluginManifest | null>(null)
  const [currentSelectedAsset, setCurrentSelectedAsset] = useState<any>(null)
  const previewRef = React.useRef<{
    updateParameters: (params: Record<string, unknown>) => void
  }>(null)

  // Body scroll lock + ESC close
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  // Handle AI sidebar toggle
  const handleAISidebarToggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      aiSidebarOpen: !prev.aiSidebarOpen,
    }))
  }, [])

  // Handle parameter sidebar toggle
  const handleParameterSidebarToggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      parameterSidebarExpanded: !prev.parameterSidebarExpanded,
    }))
  }, [])

  // Handle expanded sidebar toggle
  const handleExpandedSidebarToggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      expandedSidebarOpen: !prev.expandedSidebarOpen,
    }))
  }, [])

  // Handle plugin selection
  const handlePluginSelect = useCallback((asset: any) => {
    setCurrentSelectedAsset(asset)
  }, [])

  // Handle AI message sending
  const handleAISendMessage = useCallback((message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
    }

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      isTyping: true,
    }))

    // Simulate AI response (replace with actual AI integration)
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `AI 응답: "${message}"에 대한 도움을 드리겠습니다.`,
        sender: 'bot',
        timestamp: new Date(),
      }

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, aiResponse],
        isTyping: false,
      }))
    }, 1500)
  }, [])

  // Handle parameter changes
  const handleParameterChange = useCallback((key: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      parameters: { ...prev.parameters, [key]: value },
    }))
  }, [])

  // Handle parameter reset
  const handleParametersReset = useCallback(() => {
    if (previewRef.current && manifest?.schema) {
      const defaultParameters: Record<string, unknown> = {}
      Object.entries(manifest.schema).forEach(([key, property]) => {
        defaultParameters[key] = property.default
      })
      previewRef.current.updateParameters(defaultParameters)
      setState((prev) => ({
        ...prev,
        parameters: defaultParameters,
      }))
    }
  }, [manifest])

  // Handle manifest load
  const handlePreviewManifestLoad = useCallback(
    (loadedManifest: PluginManifest) => {
      setManifest(loadedManifest)
    },
    []
  )

  // Handle parameters init
  const handleParametersInit = useCallback(
    (params: Record<string, unknown>) => {
      setState((prev) => ({
        ...prev,
        parameters: params,
      }))
    },
    []
  )

  // Handle preview error
  const handlePreviewError = useCallback((error: string) => {
    console.error('Preview Error:', error)
  }, [])

  // Handle preview text change
  const handlePreviewTextChange = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      previewText: text,
    }))
  }, [])

  // Update preview when parameters change
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.updateParameters(state.parameters)
    }
  }, [state.parameters])

  // Early return if not open
  if (!isOpen) return null

  // CSS Classes
  const overlayClasses = clsx(
    'fixed',
    'inset-0',
    'z-50',
    'flex',
    'items-center',
    'justify-center'
  )

  const backdropClasses = clsx(
    'absolute',
    'inset-0',
    'bg-black/60',
    'backdrop-blur-sm',
    'cursor-pointer'
  )

  const modalClasses = clsx(
    'relative',
    'bg-white',
    'rounded-lg',
    'mx-4',
    'overflow-hidden',
    'border',
    'border-gray-200',
    'shadow-xl',
    'max-w-[95vw]',
    'w-full',
    'max-h-[95vh]'
  )

  const headerClasses = clsx(
    'flex',
    'items-center',
    'justify-between',
    'p-6',
    'border-b',
    'border-gray-300',
    'bg-black'
  )

  return (
    <div className={overlayClasses}>
      <div className={backdropClasses} onClick={onClose} />
      <div className={modalClasses} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={headerClasses}>
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-semibold text-white">
              애니메이션 에셋 제작
            </h2>
            {selectedAsset && (
              <p className="text-gray-400 text-sm">
                기반: {selectedAsset.title}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {/* Create button */}
            <button
              onClick={() => {
                // TODO: 생성하기 로직 구현
                console.log('Asset creation triggered')
              }}
              className={clsx(
                'px-4 py-2 bg-purple-600 hover:bg-purple-700',
                'text-white font-medium text-sm rounded-lg',
                'transition-all duration-200 cursor-pointer',
                'hover:scale-105 hover:shadow-lg',
                'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
              )}
              title="에셋 생성하기"
            >
              생성하기
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className={clsx(
                'text-gray-400',
                'hover:text-white',
                'text-2xl',
                'font-bold',
                'w-8',
                'h-8',
                'flex',
                'items-center',
                'justify-center',
                'rounded',
                'hover:bg-gray-700',
                'cursor-pointer',
                TRANSITIONS.colors
              )}
              aria-label="닫기"
            >
              <LuX size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(95vh-140px)] min-h-0 relative">
          {/* AI Assistant Sidebar */}
          <AIAssistantSidebar
            isOpen={state.aiSidebarOpen}
            onToggle={handleAISidebarToggle}
            onSendMessage={handleAISendMessage}
            messages={state.messages}
            isTyping={state.isTyping}
          />

          {/* Preview Area */}
          <div className="flex-1 min-w-0 p-6 transition-all duration-300">
            <div className="bg-gray-100 rounded-lg p-4 border border-gray-300 h-full flex items-center justify-center">
              {currentSelectedAsset ? (
                <MotionTextPreview
                  ref={previewRef}
                  manifestFile={currentSelectedAsset.manifestFile || ''}
                  pluginKey={currentSelectedAsset.pluginKey || ''}
                  text={state.previewText}
                  onParameterChange={handleParametersInit}
                  onManifestLoad={handlePreviewManifestLoad}
                  onError={handlePreviewError}
                  className="h-full max-h-[50vh] max-w-full"
                />
              ) : (
                <PluginSelectionPanel
                  availableAssets={availableAssets}
                  onPluginSelect={handlePluginSelect}
                  className="h-full w-full"
                />
              )}
            </div>
          </div>

          {/* Parameter Controls Area */}
          <div className="flex flex-shrink-0">
            {/* Expanded Sidebar */}
            <div
              className={clsx(
                'bg-gray-200 overflow-y-auto transition-all duration-300 relative',
                state.expandedSidebarOpen
                  ? 'w-64 p-4 border-l border-gray-300'
                  : 'w-0 p-0'
              )}
            >
              {state.expandedSidebarOpen && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-800">
                      추가 설정
                    </h3>
                    <button
                      onClick={handleExpandedSidebarToggle}
                      className={clsx(
                        'w-6 h-6 flex items-center justify-center',
                        'bg-gray-100 hover:bg-gray-300',
                        'text-gray-600 hover:text-gray-800',
                        'rounded border border-gray-300',
                        'transition-all duration-200'
                      )}
                      title="추가 설정 닫기"
                    >
                      <LuChevronRight size={14} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded border border-gray-300">
                      <p className="text-xs text-gray-600">고급 파라미터</p>
                    </div>
                    <div className="p-3 bg-white rounded border border-gray-300">
                      <p className="text-xs text-gray-600">렌더링 옵션</p>
                    </div>
                    <div className="p-3 bg-white rounded border border-gray-300">
                      <p className="text-xs text-gray-600">내보내기 설정</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Toggle Button for Expanded Sidebar - Only show button */}
            {!state.expandedSidebarOpen && (
              <div className="flex flex-col justify-center">
                <button
                  onClick={handleExpandedSidebarToggle}
                  className={clsx(
                    'w-8 h-12 flex items-center justify-center',
                    'bg-gray-100 hover:bg-gray-200',
                    'text-gray-600 hover:text-gray-800',
                    'rounded-l-xl shadow-sm hover:shadow-md',
                    'transition-all duration-200 border border-gray-300 cursor-pointer'
                  )}
                  title="추가 설정"
                >
                  <LuChevronLeft size={16} />
                </button>
              </div>
            )}

            {/* Main Parameter Controls Sidebar */}
            <div
              className={clsx(
                'bg-gray-100 overflow-y-auto transition-all duration-300',
                state.parameterSidebarExpanded
                  ? 'w-80 p-6 border-l border-gray-300'
                  : 'w-0 p-0'
              )}
            >
              {state.parameterSidebarExpanded && (
                <>
                  {/* Preview Text Input */}
                  <div className="mb-6">
                    <label className="block text-black text-sm font-medium mb-2">
                      미리보기 텍스트
                    </label>
                    <input
                      type="text"
                      value={state.previewText}
                      onChange={(e) => handlePreviewTextChange(e.target.value)}
                      className={clsx(
                        'w-full px-3 py-2 bg-white border border-gray-300 rounded',
                        'text-black placeholder-gray-500',
                        'focus:outline-none focus:border-blue-500',
                        TRANSITIONS.colors
                      )}
                      placeholder="미리보기에 표시될 텍스트를 입력하세요"
                    />
                  </div>

                  {/* Tabbed Parameter Controls */}
                  <TabbedParameterControls
                    manifest={manifest}
                    parameters={state.parameters}
                    onParameterChange={handleParameterChange}
                    onParametersReset={handleParametersReset}
                  />
                </>
              )}
            </div>
          </div>

          {/* Floating AI Toggle Button - Left Side (only when sidebar is closed) */}
          {!state.aiSidebarOpen && (
            <button
              onClick={handleAISidebarToggle}
              className={clsx(
                'absolute left-4 top-1/2 transform -translate-y-1/2 z-20',
                'w-12 h-12 rounded-full flex items-center justify-center',
                'transition-all duration-200 shadow-lg',
                'bg-white text-purple-600 hover:bg-purple-50 border border-purple-200'
              )}
              title="AI 어시스턴트"
            >
              <MessageCircleIcon size={20} />
            </button>
          )}

          {/* Fixed Bottom Center Navigation */}
          {availableAssets.length > 1 &&
            currentSelectedAsset &&
            onAssetChange && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <SimpleAssetNavigation
                  assets={availableAssets}
                  currentAssetId={currentSelectedAsset.id}
                  onAssetChange={(asset) => {
                    setCurrentSelectedAsset(asset)
                    onAssetChange?.(asset)
                  }}
                />
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
