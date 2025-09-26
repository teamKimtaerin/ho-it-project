'use client'

import React, { useState, useCallback, useRef } from 'react'
import Button from './ui/Button'
import { uploadService } from '@/services/api/uploadService'

interface Segment {
  start_time: number
  end_time: number
  text: string
  speaker?: {
    speaker_id: string
  }
  emotion?: {
    emotion: string
    confidence: number
  }
}

interface TranscriptionResult {
  segments: Segment[]
  speakers?: Record<string, unknown>
  metadata?: {
    duration: number
    config:
      | {
          language?: string
        }
      | string
    total_segments: number
  }
}

interface ProcessingStatus {
  stage: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
  jobId?: string
  result?: TranscriptionResult
}

const VideoProcessingDemo: React.FC = () => {
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    progress: 0,
    message: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [transcriptionResult, setTranscriptionResult] =
    useState<TranscriptionResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollInterval = useRef<NodeJS.Timeout | null>(null)

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setSelectedFile(file)
        setProcessingStatus({
          stage: 'idle',
          progress: 0,
          message: `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
        })
        setTranscriptionResult(null)
      }
    },
    []
  )

  const startPolling = useCallback((jobId: string) => {
    // 기존 폴링 중단
    if (pollInterval.current) {
      clearInterval(pollInterval.current)
    }

    // 1초마다 상태 확인
    pollInterval.current = setInterval(async () => {
      try {
        const statusResponse = await uploadService.checkProcessingStatus(jobId)

        if (!statusResponse.success) {
          throw new Error(
            `Status check failed: ${statusResponse.error?.message}`
          )
        }

        const jobStatus = statusResponse.data!

        setProcessingStatus({
          stage: jobStatus.status === 'completed' ? 'completed' : 'processing',
          progress: jobStatus.progress || 80,
          message: `Processing: ${jobStatus.status}`,
          jobId: jobStatus.job_id,
        })

        // 완료되면 결과 저장하고 폴링 중단
        if (jobStatus.status === 'completed') {
          if (pollInterval.current) {
            clearInterval(pollInterval.current)
            pollInterval.current = null
          }

          if (jobStatus.result) {
            setTranscriptionResult(
              jobStatus.result as unknown as TranscriptionResult
            )
          }
        }
      } catch (error) {
        console.error('[POLLING ERROR]:', error)
        if (pollInterval.current) {
          clearInterval(pollInterval.current)
          pollInterval.current = null
        }
        setProcessingStatus((prev) => ({
          ...prev,
          stage: 'error',
          message: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }))
      }
    }, 1000)
  }, [])

  const startProcessing = useCallback(async () => {
    if (!selectedFile) {
      alert('Please select a file first')
      return
    }

    try {
      // 1단계: 파일 업로드
      setProcessingStatus({
        stage: 'uploading',
        progress: 10,
        message: 'Getting upload URL...',
      })

      const urlResponse = await uploadService.getPresignedUrl(
        selectedFile.name,
        selectedFile.type
      )

      if (!urlResponse.success) {
        throw new Error(
          `Failed to get upload URL: ${urlResponse.error?.message}`
        )
      }

      const { presigned_url: url, file_key: fileKey } = urlResponse.data!

      setProcessingStatus((prev) => ({
        ...prev,
        progress: 30,
        message: 'Uploading file to S3...',
      }))

      // 2단계: S3에 파일 업로드
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': selectedFile.type },
        body: selectedFile,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`)
      }

      setProcessingStatus((prev) => ({
        ...prev,
        progress: 60,
        message: 'Starting video processing...',
      }))

      // 3단계: 처리 시작 요청
      const processResponse = await uploadService.requestMLProcessing(fileKey)

      if (!processResponse.success) {
        throw new Error(
          `Process request failed: ${processResponse.error?.message}`
        )
      }

      const { job_id: jobId } = processResponse.data!

      setProcessingStatus({
        stage: 'processing',
        progress: 70,
        message: 'Processing video... This may take a few moments.',
        jobId,
      })

      // 4단계: 상태 폴링 시작
      startPolling(jobId)
    } catch (error) {
      console.error('[PROCESSING ERROR]:', error)
      setProcessingStatus({
        stage: 'error',
        progress: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }, [selectedFile, startPolling])

  const reset = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current)
      pollInterval.current = null
    }

    setSelectedFile(null)
    setTranscriptionResult(null)
    setProcessingStatus({
      stage: 'idle',
      progress: 0,
      message: '',
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // 컴포넌트 언마운트 시 폴링 정리
  React.useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
      }
    }
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Video Processing Demo</h2>

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
          isDisabled={
            processingStatus.stage === 'uploading' ||
            processingStatus.stage === 'processing'
          }
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

      {/* Processing Progress */}
      {processingStatus.stage !== 'idle' && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{processingStatus.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                processingStatus.stage === 'completed'
                  ? 'bg-green-600'
                  : processingStatus.stage === 'error'
                    ? 'bg-red-600'
                    : 'bg-brand-main'
              }`}
              style={{ width: `${processingStatus.progress}%` }}
            />
          </div>
          <p className="text-sm mt-2 text-gray-600">
            {processingStatus.message}
          </p>
        </div>
      )}

      {/* Transcription Results */}
      {transcriptionResult && (
        <div className="mb-6 p-4 bg-green-50 rounded border border-green-200">
          <h3 className="text-lg font-semibold mb-3 text-green-800">
            🎉 Transcription Results
          </h3>

          {transcriptionResult.segments && (
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">Segments:</h4>
              <div className="max-h-60 overflow-y-auto">
                {transcriptionResult.segments
                  .slice(0, 5)
                  .map((segment: Segment, index: number) => (
                    <div
                      key={index}
                      className="p-2 bg-white rounded border text-sm"
                    >
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>
                          {segment.start_time?.toFixed(2)}s -{' '}
                          {segment.end_time?.toFixed(2)}s
                        </span>
                        <span>{segment.speaker?.speaker_id}</span>
                      </div>
                      <p className="font-medium">{segment.text}</p>
                      {segment.emotion && (
                        <p className="text-xs text-brand-main">
                          Emotion: {segment.emotion.emotion} (
                          {(segment.emotion.confidence * 100).toFixed(0)}%)
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {transcriptionResult.metadata && (
            <div className="mt-4 p-3 bg-white rounded border">
              <h4 className="font-medium text-green-700 mb-2">Summary:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>
                  <strong>Duration:</strong>{' '}
                  {transcriptionResult.metadata.duration}s
                </p>
                <p>
                  <strong>Speakers:</strong>{' '}
                  {transcriptionResult.speakers
                    ? Object.keys(transcriptionResult.speakers).length
                    : 'N/A'}
                </p>
                <p>
                  <strong>Language:</strong>{' '}
                  {typeof transcriptionResult.metadata.config === 'object'
                    ? transcriptionResult.metadata.config?.language || 'N/A'
                    : 'N/A'}
                </p>
                <p>
                  <strong>Segments:</strong>{' '}
                  {transcriptionResult.metadata.total_segments || 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={startProcessing}
          isDisabled={
            !selectedFile ||
            processingStatus.stage === 'uploading' ||
            processingStatus.stage === 'processing'
          }
          variant="primary"
          style="fill"
        >
          {processingStatus.stage === 'uploading'
            ? 'Uploading...'
            : processingStatus.stage === 'processing'
              ? 'Processing...'
              : 'Start Processing'}
        </Button>

        <Button onClick={reset} variant="secondary" style="outline">
          Reset
        </Button>
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-purple-50 rounded-lg">
        <h3 className="font-semibold text-purple-900 mb-2">
          How it works (Demo):
        </h3>
        <ol className="text-sm text-purple-800 space-y-1">
          <li>1. Select a video or audio file</li>
          <li>2. Click &quot;Start Processing&quot; to upload and process</li>
          <li>3. File gets uploaded to S3 with presigned URL</li>
          <li>4. Processing simulation runs for ~5 seconds</li>
          <li>5. Mock transcription results are returned</li>
          <li>6. Results show speaker diarization and emotion analysis</li>
        </ol>
      </div>
    </div>
  )
}

export default VideoProcessingDemo
