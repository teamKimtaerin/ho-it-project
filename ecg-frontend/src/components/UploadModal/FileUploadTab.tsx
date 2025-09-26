'use client'

import React from 'react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface FileUploadTabProps {
  dragActive: boolean
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  acceptedTypes: string[]
  maxFileSize: number
  multiple: boolean
  files: FileList | null
}

const FileUploadTab: React.FC<FileUploadTabProps> = ({
  dragActive,
  onDrop,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onFileSelect,
  acceptedTypes,
  maxFileSize,
  multiple,
  files,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${
            dragActive
              ? 'border-primary bg-primary/5 scale-105'
              : 'border-gray-slate/50 hover:border-primary/50 hover:bg-primary/5'
          }
        `}
        onDrop={onDrop}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
      >
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <div>
            <p className="text-lg font-medium text-text-primary mb-2">
              Drop your files here
            </p>
            <p className="text-text-secondary mb-4">
              or click to browse from your computer
            </p>

            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept={acceptedTypes.join(',')}
              multiple={multiple}
              onChange={onFileSelect}
            />
            <Button
              variant="primary"
              style="fill"
              size="medium"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Choose Files
            </Button>
          </div>

          <div className="text-sm text-text-secondary">
            <p>
              Supported formats:{' '}
              {acceptedTypes.map((type) => type.replace('/*', '')).join(', ')}
            </p>
            <p>Maximum file size: {formatFileSize(maxFileSize)}</p>
            {multiple && <p>You can select multiple files</p>}
          </div>
        </div>
      </div>

      {files && files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-text-primary">Selected Files:</h4>
          <div className="space-y-2">
            {Array.from(files).map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg border border-border"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {file.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatFileSize(file.size)} •{' '}
                      {file.type || 'Unknown type'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {file.size > maxFileSize ? (
                    <Badge variant="negative" label="Too large" size="small" />
                  ) : (
                    <Badge variant="positive" label="Ready" size="small" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUploadTab
