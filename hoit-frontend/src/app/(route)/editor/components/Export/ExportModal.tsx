'use client'

import React, { useEffect, useState } from 'react'
import { exportOptions, getIconComponent } from './exportOptions'
import { ExportFormat, ExportModalProps, SocialPlatform } from './ExportTypes'
import Portal from './Portal'

export default function ExportModal({
  isOpen,
  onClose,
  onExport,
  onSocialShare,
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] =
    useState<ExportFormat>('gpu-render')

  // 비활성화할 옵션들
  const disabledOptions = ['srt', 'txt', 'mp3']

  // 모달이 열릴 때 기본 선택값 설정
  useEffect(() => {
    if (isOpen) {
      setSelectedFormat('gpu-render')
    }
  }, [isOpen])

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const handleExport = (format?: ExportFormat) => {
    const exportFormat = format || selectedFormat
    onExport(exportFormat)
    onClose()
  }

  const handleSocialShare = (platform: SocialPlatform) => {
    if (onSocialShare) {
      onSocialShare(platform)
    }
    onClose()
  }

  if (!isOpen) return null

  // 기본 선택 옵션 (GPU 고속 렌더링)
  const defaultOption = exportOptions.find(
    (option) => option.id === 'gpu-render'
  )!
  const DefaultIcon = getIconComponent(defaultOption.icon)

  // 나머지 옵션들
  const otherOptions = exportOptions.filter(
    (option) => option.id !== 'gpu-render'
  )

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/20"
        style={{ zIndex: 9999999 }}
        onClick={handleBackdropClick}
      >
        <div
          className="absolute top-16 right-4 bg-white rounded-lg shadow-2xl w-[400px] max-h-[80vh] overflow-y-auto border border-gray-200 ring-1 ring-black/10"
          style={{ zIndex: 9999999 }}
        >
          {/* 헤더 */}
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-medium text-black">내보내기</h2>
          </div>

          {/* 콘텐츠 */}
          <div className="p-4">
            {/* 기본 선택 옵션 - 영상 파일 */}
            <div
              className="flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 mb-4 bg-brand-light border border-brand-sub"
              onClick={() => handleExport('gpu-render')}
            >
              <div className="flex items-center flex-1">
                <div className="w-6 h-6 mr-3 text-white flex items-center justify-center bg-brand-sub rounded p-1">
                  <DefaultIcon className="w-full h-full" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-black text-sm">
                    {defaultOption.label}({defaultOption.description})
                  </span>
                </div>
              </div>
            </div>

            {/* 다른 형식으로 내보내기 */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-600 mb-3">
                다른 형식으로 내보내기
              </h3>

              <div className="space-y-1">
                {otherOptions.map((option) => {
                  const IconComponent = getIconComponent(option.icon)
                  const isDisabled = disabledOptions.includes(option.id)

                  return (
                    <div
                      key={option.id}
                      className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                        isDisabled
                          ? 'cursor-default opacity-50'
                          : 'cursor-pointer hover:bg-gray-50'
                      }`}
                      onClick={
                        isDisabled ? undefined : () => handleExport(option.id)
                      }
                    >
                      <div className="flex items-center flex-1">
                        <div
                          className={`w-5 h-5 mr-3 flex items-center justify-center rounded p-1 ${
                            isDisabled
                              ? 'text-gray-400 bg-gray-100'
                              : 'text-gray-600 bg-gray-200'
                          }`}
                        >
                          <IconComponent className="w-full h-full" />
                        </div>
                        <div>
                          <span
                            className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-black'}`}
                          >
                            {option.label}
                          </span>
                          <span
                            className={`text-sm ml-1 ${isDisabled ? 'text-gray-300' : 'text-gray-500'}`}
                          >
                            ({option.description})
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
