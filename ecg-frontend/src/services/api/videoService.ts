/**
 * Video Service
 * Handles video upload and processing operations
 * Mock implementation for development, ready for API integration
 */

import API_CONFIG from '@/config/api.config'
import {
  GenerateUploadUrlRequest,
  GenerateUploadUrlResponse,
  RequestProcessRequest,
  RequestProcessResponse,
  ProcessingStatus,
  ServiceResponse,
  VideoMetadata,
} from './types'
import { log } from '@/utils/logger'

class VideoService {
  private baseUrl: string
  private useMockData: boolean

  constructor() {
    // 개발 환경에서 프록시 사용하여 CORS 문제 해결
    this.baseUrl =
      process.env.NODE_ENV === 'development'
        ? '' // 프록시 사용 (next.config.ts의 rewrites: /api/* → https://ho-it.site/api/*)
        : API_CONFIG.FASTAPI_BASE_URL // 직접 호출
    this.useMockData = API_CONFIG.USE_MOCK_DATA
  }

  /**
   * Generate presigned URL for S3 upload
   */
  async generateUploadUrl(
    request: GenerateUploadUrlRequest
  ): Promise<ServiceResponse<GenerateUploadUrlResponse>> {
    log('VideoService', `Generating upload URL for: ${request.filename}`)

    if (this.useMockData) {
      // Mock implementation
      await this.simulateDelay(500)
      return {
        success: true,
        data: {
          url: 'https://mock-s3-url.amazonaws.com/upload',
          fileKey: `videos/user_mock/${Date.now()}_${request.filename}`,
        },
      }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.endpoints.uploadVideo.generateUrl}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error) {
      log('VideoService', `Error generating upload URL: ${error}`)
      return {
        success: false,
        error: {
          code: 'UPLOAD_URL_ERROR',
          message: 'Failed to generate upload URL',
          details:
            error instanceof Error ? { message: error.message } : undefined,
        },
      }
    }
  }

  /**
   * Upload video file to S3 (or mock)
   */
  async uploadVideo(
    file: File,
    uploadUrl?: string
  ): Promise<ServiceResponse<string>> {
    log('VideoService', `Uploading video: ${file.name}`)

    if (this.useMockData) {
      // Mock implementation - simulate upload progress
      await this.simulateUploadProgress(file.size)

      // Return mock file key
      return {
        success: true,
        data: `videos/user_mock/${Date.now()}_${file.name}`,
      }
    }

    if (!uploadUrl) {
      return {
        success: false,
        error: {
          code: 'NO_UPLOAD_URL',
          message: 'Upload URL is required for real upload',
        },
      }
    }

    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`)
      }

      // Extract file key from upload URL
      const urlParts = new URL(uploadUrl)
      const fileKey = urlParts.pathname.substring(1) // Remove leading slash

      return {
        success: true,
        data: fileKey,
      }
    } catch (error) {
      log('VideoService', `Error uploading video: ${error}`)
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Failed to upload video',
          details:
            error instanceof Error ? { message: error.message } : undefined,
        },
      }
    }
  }

  /**
   * Request video processing
   */
  async requestProcessing(
    request: RequestProcessRequest
  ): Promise<ServiceResponse<RequestProcessResponse>> {
    log('VideoService', `Requesting processing for: ${request.fileKey}`)

    if (this.useMockData) {
      // Mock implementation
      await this.simulateDelay(1000)
      return {
        success: true,
        data: {
          message: 'Video processing started (mock)',
          jobId: `job_mock_${Date.now()}`,
        },
      }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.endpoints.uploadVideo.requestProcess}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error) {
      log('VideoService', `Error requesting processing: ${error}`)
      return {
        success: false,
        error: {
          code: 'PROCESSING_REQUEST_ERROR',
          message: 'Failed to request video processing',
          details:
            error instanceof Error ? { message: error.message } : undefined,
        },
      }
    }
  }

  /**
   * Get processing status
   */
  async getProcessingStatus(
    jobId: string
  ): Promise<ServiceResponse<ProcessingStatus>> {
    log('VideoService', `Getting processing status for: ${jobId}`)

    if (this.useMockData) {
      // Mock implementation - simulate processing progress
      const mockProgress = this.getMockProcessingProgress(jobId)
      await this.simulateDelay(500)

      return {
        success: true,
        data: mockProgress,
      }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.endpoints.processingStatus}/${jobId}`,
        {
          method: 'GET',
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error) {
      log('VideoService', `Error getting processing status: ${error}`)
      return {
        success: false,
        error: {
          code: 'STATUS_ERROR',
          message: 'Failed to get processing status',
          details:
            error instanceof Error ? { message: error.message } : undefined,
        },
      }
    }
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(
    videoUrl: string
  ): Promise<ServiceResponse<VideoMetadata>> {
    log('VideoService', `Getting metadata for: ${videoUrl}`)

    if (this.useMockData) {
      // Mock metadata for friends.mp4
      await this.simulateDelay(300)
      return {
        success: true,
        data: {
          duration: 143.39,
          width: 1920,
          height: 1080,
          frameRate: 29.97,
          videoCodec: 'h264',
          audioCodec: 'aac',
          filesize: '4.5MB',
        },
      }
    }

    // Real implementation would extract metadata from video
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Video metadata extraction not implemented for real mode',
      },
    }
  }

  // Helper methods for mock implementation
  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async simulateUploadProgress(fileSize: number): Promise<void> {
    const chunks = 10
    const chunkDelay = 200 // ms per chunk
    const chunkSize = fileSize / chunks

    for (let i = 0; i <= chunks; i++) {
      const progress = (i / chunks) * 100
      const uploadedBytes = Math.min(i * chunkSize, fileSize)
      log(
        'VideoService',
        `Upload progress: ${progress.toFixed(0)}% (${uploadedBytes.toFixed(0)}/${fileSize} bytes)`
      )

      // You could emit progress events here if needed
      if (i < chunks) {
        await this.simulateDelay(chunkDelay)
      }
    }
  }

  private mockProcessingStates: Map<string, ProcessingStatus> = new Map()

  private getMockProcessingProgress(jobId: string): ProcessingStatus {
    // Simulate progressive status updates
    if (!this.mockProcessingStates.has(jobId)) {
      this.mockProcessingStates.set(jobId, {
        jobId,
        status: 'pending',
        progress: 0,
        message: 'Preparing to process video...',
      })
    }

    const current = this.mockProcessingStates.get(jobId)!

    // Simulate progress
    if (current.status === 'pending') {
      current.status = 'processing'
      current.progress = 30
      current.message = 'Extracting audio from video...'
    } else if (current.status === 'processing' && current.progress! < 100) {
      current.progress = Math.min(current.progress! + 20, 95)

      if (current.progress >= 50 && current.progress < 70) {
        current.message = 'Analyzing speech segments...'
      } else if (current.progress >= 70 && current.progress < 90) {
        current.message = 'Generating transcription...'
      } else if (current.progress >= 90) {
        current.message = 'Finalizing results...'
      }
    } else if (current.progress! >= 95) {
      current.status = 'completed'
      current.progress = 100
      current.message = 'Processing completed successfully!'
    }

    return current
  }
}

// Export singleton instance
export const videoService = new VideoService()
export default videoService
