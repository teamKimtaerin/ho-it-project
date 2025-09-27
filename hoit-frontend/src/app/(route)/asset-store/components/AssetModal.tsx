'use client'

import {
  logComponentWarning,
  TRANSITIONS,
  type BaseComponentProps,
} from '@/lib/utils'
import { AssetItem } from '@/types/asset-store'
import { clsx } from 'clsx'
import React, { useCallback, useEffect, useState } from 'react'
import { IoStar, IoStarOutline } from 'react-icons/io5'
import { type PluginManifest } from '../utils/scenarioGenerator'
import { MotionTextPreview } from './MotionTextPreview'
import { TabbedParameterControls } from './creation/TabbedParameterControls'
import { AssetNavigationPanel } from './AssetNavigationPanel'

// Asset Modal Props 타입
interface AssetModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  asset: AssetItem | null
  onFavoriteToggle?: () => void
  availableAssets?: AssetItem[]
  onAssetChange?: (asset: AssetItem) => void
}

// Asset Modal 컴포넌트
export const AssetModal: React.FC<AssetModalProps> = ({
  isOpen,
  onClose,
  asset,
  onFavoriteToggle,
  availableAssets = [],
  onAssetChange,
  className,
}) => {
  const [text, setText] = useState('텍스트를 입력해보세요')
  const [manifest, setManifest] = useState<PluginManifest | null>(null)
  const [parameters, setParameters] = useState<Record<string, unknown>>({})
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

  /**
   * MotionTextPreview에서 manifest가 로드되면 상위로 전달
   */
  const handlePreviewManifestLoad = useCallback(
    (loadedManifest: PluginManifest) => {
      setManifest(loadedManifest)
    },
    []
  )

  /**
   * 파라미터 변경 핸들러
   */
  const handleParameterChange = useCallback((key: string, value: unknown) => {
    setParameters((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Child imperative update should happen after commit, not during render/event bubbling
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.updateParameters(parameters)
    }
  }, [parameters])

  /**
   * 전체 파라미터 업데이트 (초기 로드 시)
   */
  const handleParametersInit = useCallback(
    (params: Record<string, unknown>) => {
      setParameters(params)
    },
    []
  )

  /**
   * 파라미터 초기화 핸들러
   */
  const handleParametersReset = useCallback(() => {
    // 미리보기에도 초기화 알림
    if (previewRef.current && manifest?.schema) {
      const defaultParameters: Record<string, unknown> = {}
      Object.entries(manifest.schema).forEach(([key, property]) => {
        defaultParameters[key] = property.default
      })
      previewRef.current.updateParameters(defaultParameters)
    }
  }, [manifest])

  // 안정적인 에러 핸들러 (리렌더 시 함수 아이덴티티 고정)
  const handlePreviewError = useCallback((error: string) => {
    console.error('Preview Error:', error)
  }, [])

  // Early return은 모든 Hook 호출 이후에 배치
  if (!isOpen || !asset) return null

  // 검증
  if (!asset.title) {
    logComponentWarning(
      'AssetModal',
      'Asset title should be provided for accessibility'
    )
  }

  // 모달 오버레이 클래스
  const overlayClasses = clsx(
    'fixed',
    'inset-0',
    'z-50',
    'flex',
    'items-center',
    'justify-center'
  )

  // 배경 클래스
  const backdropClasses = clsx(
    'absolute',
    'inset-0',
    'bg-black/60',
    'backdrop-blur-sm',
    'cursor-pointer'
  )

  // 모달 컨테이너 클래스
  const modalClasses = clsx(
    'relative',
    'bg-white',
    'rounded-lg',
    'mx-4',
    'overflow-hidden',
    'border',
    'border-gray-200',
    'shadow-xl',
    'max-w-7xl',
    'w-full',
    'max-h-[95vh]',
    className
  )

  // 헤더 클래스
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
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-white">{asset.title}</h2>
            <p className="text-gray-400 text-sm mt-1">{asset.description}</p>

            {/* 에셋 정보 (헤더에 작게 표시) */}
            <div className="flex gap-6 mt-3 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">작성자:</span>
                <span>{asset.authorName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">카테고리:</span>
                <span>{asset.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">다운로드:</span>
                <span>{asset.downloads?.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">평점:</span>
                <span>
                  {'★'.repeat(asset.rating || 0)}
                  {'☆'.repeat(5 - (asset.rating || 0))}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onFavoriteToggle}
              className={clsx(
                'px-4 py-2 bg-gray-200 hover:bg-gray-300',
                'text-gray-700 rounded-lg font-medium cursor-pointer flex items-center gap-2',
                TRANSITIONS.colors
              )}
            >
              {asset?.isFavorite ? (
                <IoStar className="text-yellow-500" size={16} />
              ) : (
                <IoStarOutline size={16} />
              )}
              <span>{asset?.isFavorite ? '즐겨찾기' : '즐겨찾기'}</span>
            </button>
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
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(95vh-140px)] min-h-0">
          {/* 미리보기 영역 컬럼 */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {/* 미리보기 컨테이너 */}
            <div className="flex-[2] min-h-0 p-6">
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-300 h-full flex items-center justify-center">
                <MotionTextPreview
                  ref={previewRef}
                  manifestFile={asset.manifestFile || ''}
                  pluginKey={asset.pluginKey}
                  text={text}
                  onParameterChange={handleParametersInit}
                  onManifestLoad={handlePreviewManifestLoad}
                  onError={handlePreviewError}
                  className="w-3/4 max-w-md h-full max-h-[50vh] mx-auto"
                />
              </div>
            </div>

            {/* 네비게이션 패널 - 미리보기 영역 하단에서 상하 확장 */}
            {availableAssets.length > 1 && onAssetChange && (
              <div className="flex-1 min-h-[120px]">
                <AssetNavigationPanel
                  assets={availableAssets}
                  currentAssetId={asset.id}
                  onAssetChange={onAssetChange}
                />
              </div>
            )}
          </div>

          {/* 파라미터 컨트롤 영역 */}
          <div className="w-80 flex-shrink-0 bg-gray-100 border-l border-gray-300 p-6 overflow-y-auto">
            {/* 미리보기 텍스트 입력 - 사이드바 상단으로 이동 */}
            <div className="mb-6">
              <label className="block text-black text-sm font-medium mb-2">
                미리보기 텍스트
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={clsx(
                  'w-full px-3 py-2 bg-white border border-gray-300 rounded',
                  'text-black placeholder-gray-500',
                  'focus:outline-none focus:border-blue-500',
                  TRANSITIONS.colors
                )}
                placeholder="미리보기에 표시될 텍스트를 입력하세요"
              />
            </div>

            <TabbedParameterControls
              manifest={manifest}
              parameters={parameters}
              onParameterChange={handleParameterChange}
              onParametersReset={handleParametersReset}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// 기존 Modal 컴포넌트는 유지 (다른 곳에서 사용할 수 있음)
interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  variant?: 'default' | 'large' | 'fullscreen'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  variant = 'default',
  className,
}) => {
  if (!isOpen) return null

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
    variant === 'large' && 'max-w-7xl w-full max-h-[95vh]',
    variant === 'fullscreen' &&
      'w-full h-full max-w-none max-h-none m-0 rounded-none',
    variant === 'default' && 'max-w-2xl w-full max-h-[90vh]',
    className
  )

  const headerClasses = clsx(
    'flex',
    'items-center',
    'justify-between',
    'p-4',
    'border-b',
    'border-gray-300',
    'bg-black'
  )

  return (
    <div className={overlayClasses}>
      <div className={backdropClasses} onClick={onClose} />
      <div className={modalClasses}>
        <div className={headerClasses}>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
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
              'hover:bg-gray-800',
              'cursor-pointer',
              TRANSITIONS.colors
            )}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto max-h-[85vh]">{children}</div>
      </div>
    </div>
  )
}
