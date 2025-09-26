'use client'

import React, { useState, useEffect } from 'react'
import {
  AiOutlineExport,
  AiOutlineFolderAdd,
  AiOutlineSave,
} from 'react-icons/ai'
import { type ToolbarVariant } from '../../../constants/colors'
import ExportModal from '../../Export/ExportModal'
import YouTubeUploadModal from '../../Export/YouTubeUploadModal'
import ServerVideoExportModal from '../../Export/ServerVideoExportModal'
import {
  ExportFormat,
  SocialPlatform,
  YouTubeUploadData,
} from '../../Export/ExportTypes'
import ToolbarBase from './ToolbarBase'
import ToolbarButton from './ToolbarButton'

interface ToolbarWrapperProps {
  variant?: ToolbarVariant
  children: React.ReactNode
  onExport?: () => void
  onSave?: () => void
  onSaveAs?: () => void
  className?: string
  forceOpenExportModal?: boolean
  onExportModalStateChange?: (isOpen: boolean) => void
}

/**
 * 모든 툴바를 감싸는 wrapper 컴포넌트
 * 내보내기 버튼을 항상 오른쪽에 고정 배치
 */
export default function ToolbarWrapper({
  variant = 'base',
  children,
  onExport,
  onSave,
  onSaveAs,
  className = '',
  forceOpenExportModal = false,
  onExportModalStateChange,
}: ToolbarWrapperProps) {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false)
  const [isGpuExportModalOpen, setIsGpuExportModalOpen] = useState(false)

  // 강제 모달 오픈 처리
  useEffect(() => {
    if (forceOpenExportModal && !isExportModalOpen) {
      setIsExportModalOpen(true)
      onExportModalStateChange?.(true)
    }
  }, [forceOpenExportModal, isExportModalOpen, onExportModalStateChange])

  const handleExportClick = () => {
    setIsExportModalOpen(true)
    onExportModalStateChange?.(true)
  }

  const handleExportConfirm = (format: ExportFormat) => {
    if (format === 'gpu-render') {
      // GPU 렌더링 모달 열기
      setIsExportModalOpen(false)
      setIsGpuExportModalOpen(true)
    } else {
      // TODO: Implement actual export functionality based on format
      console.log('Exporting in format:', format)
      onExport?.()
    }
  }

  const handleCloseModal = () => {
    setIsExportModalOpen(false)
    onExportModalStateChange?.(false)
  }

  const handleSocialShare = (platform: SocialPlatform) => {
    if (platform === 'youtube') {
      setIsExportModalOpen(false)
      onExportModalStateChange?.(false) // 내보내기 모달 닫기
      setIsYouTubeModalOpen(true) // YouTube 설정 모달 열기
    }
  }

  const handleYouTubeUpload = (data: YouTubeUploadData) => {
    // TODO: Implement actual YouTube upload functionality
    console.log('Uploading to YouTube with data:', data)
  }

  const handleYouTubeModalClose = () => {
    setIsYouTubeModalOpen(false)
  }

  const handleCloseGpuModal = () => {
    setIsGpuExportModalOpen(false)
  }

  const handleSave = () => {
    onSave?.()
  }

  const handleSaveAs = () => {
    onSaveAs?.()
  }

  return (
    <ToolbarBase variant={variant} className={className}>
      <div className="flex items-center w-full">
        {/* 툴바별 컨텐츠 */}
        <div className="flex items-center space-x-3 flex-1">
          {React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(
                  child as React.ReactElement<{ variant?: ToolbarVariant }>,
                  { variant }
                )
              : child
          )}
        </div>

        {/* 프로젝트 저장 버튼들과 내보내기 버튼 - 항상 오른쪽 끝에 고정 */}
        <div className="ml-4 flex items-center space-x-3">
          {/* 프로젝트 저장 */}
          <ToolbarButton
            icon={<AiOutlineSave className="w-5 h-5" />}
            label="프로젝트 저장"
            onClick={handleSave}
            shortcut="Ctrl+S"
            variant={variant}
          />

          {/* 다른 프로젝트로 저장 */}
          <ToolbarButton
            icon={<AiOutlineFolderAdd className="w-5 h-5" />}
            label="다른 프로젝트로 저장"
            disabled={true}
            variant={variant}
          />

          {/* 내보내기 - variant에 따라 다른 스타일 적용 */}
          <button
            className="px-5 py-3 bg-brand-sub text-white rounded-lg hover:bg-brand-dark hover:scale-105 hover:shadow-lg transition-all duration-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            onClick={handleExportClick}
          >
            <AiOutlineExport className="w-4 h-4" />
            내보내기
          </button>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={handleCloseModal}
        onExport={handleExportConfirm}
        onSocialShare={handleSocialShare}
      />

      {/* YouTube Upload Modal */}
      <YouTubeUploadModal
        isOpen={isYouTubeModalOpen}
        onClose={handleYouTubeModalClose}
        onUpload={handleYouTubeUpload}
        defaultTitle="202509142147"
      />

      {/* GPU Export Modal */}
      <ServerVideoExportModal
        isOpen={isGpuExportModalOpen}
        onClose={handleCloseGpuModal}
      />
    </ToolbarBase>
  )
}
