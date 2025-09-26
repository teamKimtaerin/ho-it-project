'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'

import { cn, SIZE_CLASSES } from '@/utils'

import Button from '@/components/ui/Button'
import ButtonGroup from '@/components/ui/ButtonGroup'
import Modal, { type ModalProps } from '@/components/ui/Modal'
import ProgressCircle from '@/components/ui/ProgressCircle'
import FileUploadTab from './FileUploadTab'
import TranscriptionSettings from './TranscriptionSettings'
import UrlImportTab from './UrlImportTab'

export interface UploadModalProps
  extends Omit<ModalProps, 'children' | 'title' | 'size'> {
  onFileSelect: (files: FileList) => void
  onStartTranscription: (data: {
    files?: FileList
    url?: string
    language: string
    useDictionary: boolean
    autoSubmit: boolean
    method: 'file' | 'link'
  }) => void
  acceptedTypes?: string[]
  maxFileSize?: number
  multiple?: boolean
  isLoading?: boolean
}

const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onFileSelect,
  onStartTranscription,
  acceptedTypes = ['audio/*', 'video/*'],
  maxFileSize = 100 * 1024 * 1024, // 100MB
  multiple = true,
  isLoading = false,
  ...modalProps
}) => {
  // Tab state
  const [inputMethod, setInputMethod] = useState<'file' | 'link'>('file')

  // File upload state
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<FileList | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // URL import state
  const [videoUrl, setVideoUrl] = useState('')

  // Transcription settings state
  const [selectedLanguage, setSelectedLanguage] = useState(
    'Korean (South Korea)'
  )
  const [useTranscriptionDictionary, setUseTranscriptionDictionary] =
    useState(false)
  const [submitAutomatically, setSubmitAutomatically] = useState(true)

  // File validation utility
  const validateFiles = useCallback(
    (files: File[]) => {
      return files.filter((file) => {
        const isValidType = acceptedTypes.some((type) => {
          if (type.endsWith('/*')) {
            const baseType = type.replace('/*', '')
            return file.type.startsWith(baseType)
          }
          return file.type === type
        })
        const isValidSize = file.size <= maxFileSize

        if (!isValidType && process.env.NODE_ENV === 'development') {
          console.warn(`File ${file.name} has invalid type: ${file.type}`)
        }
        if (!isValidSize && process.env.NODE_ENV === 'development') {
          console.warn(
            `File ${file.name} exceeds size limit: ${(file.size / 1024 / 1024).toFixed(2)}MB`
          )
        }

        return isValidType && isValidSize
      })
    },
    [acceptedTypes, maxFileSize]
  )

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      const validFiles = validateFiles(files)

      if (validFiles.length > 0) {
        const dt = new DataTransfer()
        validFiles.forEach((file) => dt.items.add(file))
        setUploadedFiles(dt.files)
        onFileSelect(dt.files)
      }
    },
    [validateFiles, onFileSelect]
  )

  // File input change handler
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        setUploadedFiles(files)
        onFileSelect(files)
      }
    },
    [onFileSelect]
  )

  // URL validation
  const isValidUrl = useMemo(() => {
    if (!videoUrl) return true
    try {
      const urlObj = new URL(videoUrl)
      return ['http:', 'https:'].includes(urlObj.protocol)
    } catch {
      return false
    }
  }, [videoUrl])

  // Tab change handler
  const handleTabChange = useCallback((method: 'file' | 'link') => {
    setInputMethod(method)
    // Reset state when switching tabs
    if (method === 'file') {
      setVideoUrl('')
    } else {
      setUploadedFiles(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [])

  // Submit handler
  const handleSubmit = useCallback(() => {
    const transcriptionData = {
      language: selectedLanguage,
      useDictionary: useTranscriptionDictionary,
      autoSubmit: submitAutomatically,
      method: inputMethod,
      ...(inputMethod === 'file' && uploadedFiles && { files: uploadedFiles }),
      ...(inputMethod === 'link' && { url: videoUrl }),
    }

    // Validate inputs
    if (inputMethod === 'file' && !uploadedFiles) {
      alert('Please select files first')
      return
    }
    if (inputMethod === 'link' && !videoUrl.trim()) {
      alert('Please enter a video URL')
      return
    }
    if (inputMethod === 'link' && !isValidUrl) {
      alert('Please enter a valid URL')
      return
    }

    onStartTranscription(transcriptionData)
  }, [
    selectedLanguage,
    useTranscriptionDictionary,
    submitAutomatically,
    inputMethod,
    videoUrl,
    uploadedFiles,
    isValidUrl,
    onStartTranscription,
  ])

  // Check if form is ready for submission
  const isFormReady = useMemo(() => {
    if (inputMethod === 'file') {
      return uploadedFiles && uploadedFiles.length > 0
    } else {
      return videoUrl.trim() && isValidUrl
    }
  }, [inputMethod, uploadedFiles, videoUrl, isValidUrl])

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={acceptedTypes.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />

      <Modal
        {...modalProps}
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        title="Fast Transcription"
        className="max-w-4xl min-w-[600px] w-[700px]"
      >
        <div className={cn('flex flex-col', SIZE_CLASSES.gap['extra-large'])}>
          {/* Input Method Selection */}
          <div className={cn('flex flex-col', SIZE_CLASSES.gap.medium)}>
            <h3 className="text-h3 font-semibold text-text-primary">
              1. Choose input method
            </h3>

            <ButtonGroup
              orientation="horizontal"
              spacing="none"
              className="bg-surface-secondary rounded-small p-1"
            >
              <Button
                variant={'primary'}
                style={inputMethod === 'file' ? 'fill' : 'outline'}
                size="medium"
                onClick={() => handleTabChange('file')}
                className="flex-1 min-w-0 border-0 hover:shadow-none focus:shadow-none text-center"
              >
                Upload Files
              </Button>
              <Button
                variant={'primary'}
                style={inputMethod === 'link' ? 'fill' : 'outline'}
                size="medium"
                onClick={() => handleTabChange('link')}
                className="flex-1 min-w-0 border-0 hover:shadow-none focus:shadow-none text-center"
              >
                Import Link
              </Button>
            </ButtonGroup>
          </div>

          {/* Tab Content */}
          <div className={cn('flex flex-col', SIZE_CLASSES.gap.medium)}>
            {inputMethod === 'file' && (
              <FileUploadTab
                dragActive={isDragOver}
                onDrop={handleDrop}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onFileSelect={handleFileChange}
                acceptedTypes={acceptedTypes}
                maxFileSize={maxFileSize}
                multiple={multiple}
                files={uploadedFiles}
              />
            )}

            {inputMethod === 'link' && (
              <UrlImportTab
                url={videoUrl}
                setUrl={setVideoUrl}
                isValidUrl={isValidUrl}
              />
            )}
          </div>

          {/* Transcription Settings */}
          <div className={cn('flex flex-col', SIZE_CLASSES.gap.medium)}>
            <h3 className="text-h3 font-semibold text-text-primary">
              2. Configure transcription settings
            </h3>

            <TranscriptionSettings
              language={selectedLanguage}
              setLanguage={setSelectedLanguage}
              useDictionary={useTranscriptionDictionary}
              setUseDictionary={setUseTranscriptionDictionary}
              autoSubmit={submitAutomatically}
              setAutoSubmit={setSubmitAutomatically}
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div
          className={cn('flex justify-end border-t border-border', 'mt-6 pt-6')}
        >
          <ButtonGroup orientation="horizontal" spacing="small">
            <Button
              variant="accent"
              style="outline"
              size="medium"
              onClick={onClose}
              isDisabled={isLoading}
              className="text-primary hover:text-primary-dark"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              style="fill"
              size="medium"
              onClick={handleSubmit}
              isDisabled={isLoading || !isFormReady}
              isPending={isLoading}
              className="w-full justify-center hover:bg-primary-dark"
            >
              {isLoading ? (
                <ProgressCircle size="small" isIndeterminate />
              ) : (
                'Start'
              )}
            </Button>
          </ButtonGroup>
        </div>
      </Modal>
    </>
  )
}

export default UploadModal
