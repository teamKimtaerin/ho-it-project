/**
 * Transcription Service
 * Handles transcription processing and results
 * Mock implementation using real.json for development
 */

import API_CONFIG from '@/config/api.config'
import {
  TranscriptionResult,
  TranscriptionSegment,
  ServiceResponse,
} from './types'
import { log } from '@/utils/logger'
import { ClipItem } from '@/app/(route)/editor/types'
import { convertSegmentsToClips } from '@/utils/transcription/segmentConverter'

class TranscriptionService {
  private baseUrl: string
  private useMockData: boolean
  private mockDataCache: TranscriptionResult | null = null

  constructor() {
    // 개발 환경에서 프록시 사용하여 CORS 문제 해결
    this.baseUrl =
      process.env.NODE_ENV === 'development'
        ? '' // 프록시 사용 (next.config.ts의 rewrites: /api/* → https://ho-it.site/api/*)
        : API_CONFIG.FASTAPI_BASE_URL // 직접 호출
    this.useMockData = API_CONFIG.USE_MOCK_DATA
  }

  /**
   * Get transcription results
   */
  async getTranscriptionResults(
    jobId: string
  ): Promise<ServiceResponse<TranscriptionResult>> {
    log('TranscriptionService', `Getting transcription results for: ${jobId}`)

    if (this.useMockData) {
      // Load mock data from real.json
      const mockData = await this.loadMockTranscriptionData()
      if (mockData) {
        return {
          success: true,
          data: mockData,
        }
      }
      return {
        success: false,
        error: {
          code: 'MOCK_DATA_ERROR',
          message: 'Failed to load mock transcription data',
        },
      }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.endpoints.getResults}/${jobId}`,
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
      log(
        'TranscriptionService',
        `Error getting transcription results: ${error}`
      )
      return {
        success: false,
        error: {
          code: 'RESULTS_ERROR',
          message: 'Failed to get transcription results',
          details:
            error instanceof Error ? { message: error.message } : undefined,
        },
      }
    }
  }

  /**
   * Load transcription clips directly (for initialization)
   * This method is used when initializing the editor with mock or API data
   */
  async loadTranscriptionClips(): Promise<ClipItem[]> {
    log('TranscriptionService', 'Loading transcription clips')

    if (this.useMockData) {
      // Load from real.json
      const mockData = await this.loadMockTranscriptionData()
      if (mockData && mockData.segments) {
        return this.convertToClips(mockData.segments)
      }
      return []
    }

    // For real API, would need to get the latest job or stored data
    // This would be implemented when API is ready
    log(
      'TranscriptionService',
      'Real API mode not yet implemented for direct loading'
    )
    return []
  }

  /**
   * Convert transcription segments to clips for the editor
   */
  async convertToClips(
    segments: TranscriptionSegment[],
    jobId?: string
  ): Promise<ClipItem[]> {
    log(
      'TranscriptionService',
      `Converting ${segments.length} segments to clips`
    )

    try {
      // Use the existing converter with enhanced functionality
      const clips = convertSegmentsToClips(segments)

      // Add any additional processing if needed
      return clips.map((clip, index) => ({
        ...clip,
        // Ensure unique IDs if jobId is provided
        id: jobId ? `clip_${jobId}_${index}_${Date.now()}` : clip.id,
        // Add any additional properties needed
      }))
    } catch (error) {
      log(
        'TranscriptionService',
        `Error converting segments to clips: ${error}`
      )
      return []
    }
  }

  /**
   * Process video and get transcription (combined flow)
   */
  async processVideoAndGetTranscription(
    fileKey: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ServiceResponse<ClipItem[]>> {
    log(
      'TranscriptionService',
      `Processing video and getting transcription for: ${fileKey}`
    )

    if (this.useMockData) {
      // Simulate processing with progress updates
      await this.simulateProcessingWithProgress(onProgress)

      // Load mock transcription data
      const mockData = await this.loadMockTranscriptionData()
      if (mockData && mockData.segments) {
        const clips = await this.convertToClips(mockData.segments)
        return {
          success: true,
          data: clips,
        }
      }

      return {
        success: false,
        error: {
          code: 'MOCK_PROCESSING_ERROR',
          message: 'Failed to process mock data',
        },
      }
    }

    // Real API implementation would:
    // 1. Request processing
    // 2. Poll for status
    // 3. Get results when completed
    // 4. Convert to clips

    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Real API processing not implemented',
      },
    }
  }

  /**
   * Load mock transcription data from real.json
   */
  private async loadMockTranscriptionData(): Promise<TranscriptionResult | null> {
    // Return cached data if available
    if (this.mockDataCache) {
      return this.mockDataCache
    }

    try {
      const response = await fetch(API_CONFIG.MOCK_TRANSCRIPTION_PATH)
      if (!response.ok) {
        throw new Error(`Failed to load mock data: ${response.statusText}`)
      }

      const data = await response.json()

      // Transform to TranscriptionResult format
      const result: TranscriptionResult = {
        jobId: `job_mock_${Date.now()}`,
        status: 'success',
        metadata: data.metadata || {
          filename: 'friends.mp4',
          duration: 143.39,
          sample_rate: 16000,
          processed_at: new Date().toISOString(),
          processing_time: 210.45,
          total_segments: data.segments?.length || 0,
          unique_speakers: Object.keys(data.speakers || {}).length,
          avg_confidence: 0.9,
          processing_mode: 'mock',
        },
        segments: data.segments || [],
        speakers: data.speakers || {},
      }

      // Cache the result
      this.mockDataCache = result

      log(
        'TranscriptionService',
        `Loaded ${result.segments.length} segments from mock data`
      )
      return result
    } catch (error) {
      log(
        'TranscriptionService',
        `Error loading mock transcription data: ${error}`
      )
      return null
    }
  }

  /**
   * Simulate processing with progress updates
   */
  private async simulateProcessingWithProgress(
    onProgress?: (progress: number, message: string) => void
  ): Promise<void> {
    const steps = [
      { progress: 10, message: 'Initializing processing...', delay: 500 },
      { progress: 25, message: 'Extracting audio from video...', delay: 1000 },
      { progress: 40, message: 'Detecting speech segments...', delay: 1500 },
      { progress: 60, message: 'Identifying speakers...', delay: 1000 },
      { progress: 75, message: 'Generating transcription...', delay: 1500 },
      {
        progress: 90,
        message: 'Analyzing emotions and confidence...',
        delay: 1000,
      },
      { progress: 100, message: 'Processing completed!', delay: 500 },
    ]

    for (const step of steps) {
      if (onProgress) {
        onProgress(step.progress, step.message)
      }
      await this.simulateDelay(step.delay)
    }
  }

  /**
   * Helper method to simulate delay
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Clear cached mock data
   */
  clearCache(): void {
    this.mockDataCache = null
    log('TranscriptionService', 'Cleared mock data cache')
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService()
export default transcriptionService
