'use client'

import React, { useState, useCallback, useRef } from 'react'
import Button from './ui/Button'
import { uploadService } from '@/services/api/uploadService'

interface UploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error'
  progress: number
  message: string
  s3Url?: string
}

const S3UploadDemo = () => {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0,
    message: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setSelectedFile(file)
        setUploadStatus({
          status: 'idle',
          progress: 0,
          message: `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
        })
      }
    },
    []
  )

  const uploadToS3 = useCallback(async () => {
    if (!selectedFile) {
      alert('Please select a file first')
      return
    }

    try {
      setUploadStatus({
        status: 'uploading',
        progress: 0,
        message: 'Getting presigned URL...',
      })

      // 1단계: 백엔드에서 presigned URL 요청
      const urlResponse = await uploadService.getPresignedUrl(
        selectedFile.name,
        selectedFile.type
      )

      if (!urlResponse.success) {
        throw new Error(
          `Failed to get presigned URL: ${urlResponse.error?.message}`
        )
      }

      const { presigned_url: url, file_key: fileKey } = urlResponse.data!
      setFileKey(fileKey)

      setUploadStatus({
        status: 'uploading',
        progress: 25,
        message: 'Uploading to S3...',
      })

      // 2단계: S3에 실제 파일 업로드
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type,
        },
        body: selectedFile,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to S3: ${uploadResponse.statusText}`)
      }

      setUploadStatus({
        status: 'success',
        progress: 100,
        message: 'Upload successful! Getting download URL...',
      })

      // Upload completed successfully
      setUploadStatus({
        status: 'success',
        progress: 100,
        message: 'Upload successful! File is now accessible.',
        s3Url: url.split('?')[0], // Clean S3 URL without query params
      })

      console.log('[S3 UPLOAD SUCCESS]')
      console.log('File Key:', fileKey)
    } catch (error) {
      console.error('[S3 UPLOAD ERROR]:', error)
      setUploadStatus({
        status: 'error',
        progress: 0,
        message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }, [selectedFile])

  const testS3Access = useCallback(async () => {
    if (!uploadStatus.s3Url) return

    try {
      setUploadStatus((prev) => ({
        ...prev,
        message: 'Testing S3 file access...',
      }))

      // S3 파일 접근 테스트
      const response = await fetch(uploadStatus.s3Url, {
        method: 'HEAD', // HEAD 요청으로 파일 존재 확인
      })

      if (response.ok) {
        setUploadStatus((prev) => ({
          ...prev,
          message: `✅ File is accessible! Size: ${response.headers.get('content-length')} bytes`,
        }))
      } else {
        setUploadStatus((prev) => ({
          ...prev,
          message: `❌ File not accessible: ${response.status} ${response.statusText}`,
        }))
      }
    } catch (error) {
      setUploadStatus((prev) => ({
        ...prev,
        message: `❌ Access test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }))
    }
  }, [uploadStatus.s3Url])

  const reset = useCallback(() => {
    setSelectedFile(null)
    setFileKey('')
    setUploadStatus({
      status: 'idle',
      progress: 0,
      message: '',
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">S3 Upload Test</h2>

      {/* File Selection */}
      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="video/*,audio/*"
          className="hidden"
        />
        <Button
          variant="primary"
          style="outline"
          onClick={() => fileInputRef.current?.click()}
          isDisabled={uploadStatus.status === 'uploading'}
        >
          Select Video/Audio File
        </Button>
      </div>

      {/* Selected File Info */}
      {selectedFile && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm">
            <strong>File:</strong> {selectedFile.name}
          </p>
          <p className="text-sm">
            <strong>Size:</strong>{' '}
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <p className="text-sm">
            <strong>Type:</strong> {selectedFile.type}
          </p>
        </div>
      )}

      {/* Upload Progress */}
      {uploadStatus.status !== 'idle' && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{uploadStatus.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                uploadStatus.status === 'success'
                  ? 'bg-green-600'
                  : uploadStatus.status === 'error'
                    ? 'bg-red-600'
                    : 'bg-brand-main'
              }`}
              style={{ width: `${uploadStatus.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Message */}
      {uploadStatus.message && (
        <div
          className={`mb-4 p-3 rounded ${
            uploadStatus.status === 'success'
              ? 'bg-green-50 text-green-800'
              : uploadStatus.status === 'error'
                ? 'bg-red-50 text-red-800'
                : 'bg-purple-50 text-purple-800'
          }`}
        >
          <p className="text-sm">{uploadStatus.message}</p>
        </div>
      )}

      {/* File Info */}
      {fileKey && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm break-all">
            <strong>File Key:</strong> {fileKey}
          </p>
          {uploadStatus.s3Url && (
            <p className="text-sm break-all">
              <strong>S3 URL:</strong>
              <a
                href={uploadStatus.s3Url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-main hover:underline ml-1"
              >
                {uploadStatus.s3Url}
              </a>
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={uploadToS3}
          isDisabled={!selectedFile || uploadStatus.status === 'uploading'}
          variant={uploadStatus.status === 'success' ? 'secondary' : 'primary'}
          style={uploadStatus.status === 'success' ? 'outline' : 'fill'}
        >
          {uploadStatus.status === 'uploading'
            ? 'Uploading...'
            : 'Upload to S3'}
        </Button>

        {uploadStatus.status === 'success' && uploadStatus.s3Url && (
          <Button onClick={testS3Access} variant="secondary" style="outline">
            Test Access
          </Button>
        )}

        <Button onClick={reset} variant="secondary" style="outline">
          Reset
        </Button>
      </div>
    </div>
  )
}

export default S3UploadDemo
