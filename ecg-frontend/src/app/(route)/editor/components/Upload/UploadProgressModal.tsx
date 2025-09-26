'use client'

import ProgressModal from '@/components/ui/ProgressModal'
import React from 'react'

export interface UploadProgressModalProps {
  isOpen: boolean
  onClose: () => void
  onCancel?: () => void
  status: 'uploading' | 'processing' | 'completed' | 'failed' | 'select'
  progress: number
  currentStage?: string
  estimatedTimeRemaining?: number
  fileName?: string
  canCancel?: boolean
  backdrop?: boolean
}

export default function UploadProgressModal({
  isOpen,
  onClose,
  onCancel,
  status,
  progress,
  currentStage,
  estimatedTimeRemaining,
  fileName,
  canCancel = true,
  backdrop = true,
}: UploadProgressModalProps) {
  return (
    <ProgressModal
      isOpen={isOpen}
      onClose={onClose}
      onCancel={onCancel}
      type="upload"
      status={status}
      progress={progress}
      currentStage={currentStage}
      estimatedTimeRemaining={estimatedTimeRemaining}
      fileName={fileName}
      canCancel={canCancel}
      closeOnBackdropClick={false}
      aria-label="업로드 진행 상황"
    />
  )
}
