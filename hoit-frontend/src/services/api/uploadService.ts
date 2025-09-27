/**
 * 비디오 업로드 및 ML 처리 API 서비스
 */

import {
  PresignedUrlResponse,
  MLProcessingResponse,
  ProcessingStatus,
  ProcessingResult,
  ServiceResponse,
  UploadErrorResponse,
} from './types/upload.types'
import { useAuthStore } from '@/lib/store/authStore'
import { API_CONFIG } from '@/config/api.config'

// 개발 환경에서 프록시 사용하여 CORS 문제 해결
const API_BASE_URL =
  process.env.NODE_ENV === 'development'
    ? '' // 프록시 사용 (next.config.ts의 rewrites: /api/* → https://ho-it.site/api/*)
    : API_CONFIG.FASTAPI_BASE_URL // 직접 호출

class UploadService {
  private abortControllers = new Map<string, AbortController>()
  private completedJobs = new Set<string>()

  /**
   * API 요청 헬퍼 함수
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ServiceResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`

      // Get authentication token
      const token = useAuthStore.getState().token
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }

      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Merge with any additional headers from options
      const finalHeaders = {
        ...headers,
        ...((options.headers as Record<string, string>) || {}),
      }

      const response = await fetch(url, {
        ...options,
        headers: finalHeaders,
      })

      if (!response.ok) {
        let errorData: UploadErrorResponse
        try {
          errorData = await response.json()
        } catch {
          errorData = {
            error: 'HTTP_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
          }
        }

        return {
          success: false,
          error: errorData,
        }
      }

      const data: T = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error) {
      console.error('API request failed:', error)
      return {
        success: false,
        error: {
          error: 'NETWORK_ERROR',
          message:
            error instanceof Error ? error.message : 'Unknown network error',
        },
      }
    }
  }

  /**
   * S3 업로드용 Presigned URL 요청
   */
  async getPresignedUrl(
    filename: string,
    contentType: string
  ): Promise<ServiceResponse<PresignedUrlResponse>> {
    // 백엔드 API 스펙에 맞게 필드명 조정
    const request = {
      filename: filename, // 백엔드는 'filename' 기대 (언더스코어 없음)
      content_type: contentType, // 백엔드는 'content_type' 기대
    }

    // Backend response might have different field names
    interface BackendPresignedResponse {
      url?: string
      upload_url?: string // API doc specifies this field
      presigned_url?: string
      fileKey?: string
      file_key?: string
      expires_in?: number
      expires_at?: string // API doc specifies this field
    }

    const response = await this.makeRequest<BackendPresignedResponse>(
      '/api/upload-video/generate-url',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    )

    // 응답 매핑: 백엔드 응답을 프론트엔드 형식으로 변환
    if (response.success && response.data) {
      const mappedResponse: PresignedUrlResponse = {
        presigned_url:
          response.data.upload_url ||
          response.data.url ||
          response.data.presigned_url ||
          '',
        file_key: response.data.fileKey || response.data.file_key || '',
        expires_in: response.data.expires_in || 3600,
      }
      return {
        success: true,
        data: mappedResponse,
      }
    }

    return response as ServiceResponse<PresignedUrlResponse>
  }

  /**
   * S3에 파일 업로드
   */
  async uploadToS3(
    file: File,
    presignedUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<ServiceResponse<string>> {
    try {
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest()

        // 진행률 추적
        if (onProgress) {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100)
              onProgress(progress)
            }
          })
        }

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            // S3 업로드 완료 후 파일의 공개 URL 반환
            const s3Url = presignedUrl.split('?')[0]

            resolve({
              success: true,
              data: s3Url,
            })
          } else {
            resolve({
              success: false,
              error: {
                error: 'S3_UPLOAD_ERROR',
                message: `S3 upload failed: ${xhr.statusText}`,
              },
            })
          }
        })

        xhr.addEventListener('error', () => {
          resolve({
            success: false,
            error: {
              error: 'S3_UPLOAD_ERROR',
              message: 'S3 upload network error',
            },
          })
        })

        xhr.open('PUT', presignedUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })
    } catch (error) {
      console.error('S3 upload error:', error)
      return {
        success: false,
        error: {
          error: 'S3_UPLOAD_ERROR',
          message:
            error instanceof Error ? error.message : 'Unknown S3 upload error',
        },
      }
    }
  }

  /**
   * ML 처리 요청
   */
  async requestMLProcessing(
    fileKey: string,
    language?: string
  ): Promise<ServiceResponse<MLProcessingResponse>> {
    const request = {
      fileKey: fileKey,
      ...(language && { language }),
    }

    return this.makeRequest<MLProcessingResponse>(
      '/api/upload-video/request-process',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    )
  }

  /**
   * 처리 상태 확인
   */
  async checkProcessingStatus(
    jobId: string
  ): Promise<ServiceResponse<ProcessingStatus>> {
    return this.makeRequest<ProcessingStatus>(
      `/api/upload-video/status/${jobId}`,
      {
        method: 'GET',
      }
    )
  }

  /**
   * 처리 중단
   */
  async cancelProcessing(jobId: string): Promise<ServiceResponse<void>> {
    if (this.abortControllers.has(jobId)) {
      this.abortControllers.get(jobId)?.abort()
      this.abortControllers.delete(jobId)
    }

    return this.makeRequest<void>(`/api/upload-video/cancel/${jobId}`, {
      method: 'POST',
    })
  }

  /**
   * 상태 폴링 시작
   */
  startPolling(
    jobId: string,
    onStatusUpdate: (status: ProcessingStatus) => void,
    onComplete: (result: ProcessingResult) => void,
    onError: (error: UploadErrorResponse) => void,
    pollingInterval: number = 2000
  ): () => void {
    console.log(`[UploadService] Starting polling for job: ${jobId}`)
    const controller = new AbortController()
    this.abortControllers.set(jobId, controller)

    const poll = async () => {
      if (controller.signal.aborted) {
        console.log(`[UploadService] Polling aborted for job: ${jobId}`)
        return
      }

      console.log(`[UploadService] Polling status for job: ${jobId}`)
      const statusResponse = await this.checkProcessingStatus(jobId)
      console.log(`[UploadService] Status response:`, statusResponse)

      if (!statusResponse.success || !statusResponse.data) {
        onError(
          statusResponse.error || {
            error: 'UNKNOWN',
            message: 'Status check failed',
          }
        )
        return
      }

      const status = statusResponse.data
      onStatusUpdate(status)

      if (status.status === 'completed') {
        // 이미 처리된 작업인지 확인
        if (this.completedJobs.has(jobId)) {
          return
        }

        this.completedJobs.add(jobId)
        this.abortControllers.delete(jobId)

        // status 응답에서 직접 result 추출
        try {
          if (status.result) {
            // status 응답에 result가 포함된 경우
            onComplete({
              job_id: status.job_id,
              status: status.status,
              result: status.result,
            } as ProcessingResult)
          } else {
            console.warn(
              '⚠️ No result data in status response - proceeding with empty result'
            )
            // 빈 결과로 완료 처리
            onComplete({
              job_id: status.job_id,
              status: status.status,
              result: {
                segments: [],
                metadata: {
                  duration: 0,
                  language: 'ko',
                  model: 'whisper',
                  processing_time: 0,
                },
              },
            } as ProcessingResult)
          }
        } catch (error) {
          console.warn(
            '⚠️ Exception during result processing - completing with empty result',
            error
          )
          // 에러 무시하고 빈 결과로 완료 처리
          onComplete({
            job_id: status.job_id,
            status: status.status,
            result: {
              segments: [],
              metadata: {
                duration: 0,
                language: 'ko',
                model: 'whisper',
                processing_time: 0,
              },
            },
          } as ProcessingResult)
        }
      } else if (status.status === 'failed') {
        this.abortControllers.delete(jobId)
        onError({
          error: 'ML_PROCESSING_FAILED',
          message: 'ML processing failed',
        })
      } else {
        // 계속 폴링
        setTimeout(poll, pollingInterval)
      }
    }

    // 첫 번째 폴링 시작
    console.log(`[UploadService] Starting first poll...`)
    poll().catch((error) => {
      console.error(`[UploadService] Poll error:`, error)
      onError({
        error: 'POLLING_ERROR',
        message: error instanceof Error ? error.message : 'Polling failed',
      })
    })

    // 폴링 중단 함수 반환
    return () => {
      controller.abort()
      this.abortControllers.delete(jobId)
    }
  }

  /**
   * 모든 진행 중인 작업 중단
   */
  cancelAllProcessing(): void {
    this.abortControllers.forEach((controller) => {
      controller.abort()
    })

    this.abortControllers.clear()
    this.completedJobs.clear()
  }
}

// 싱글톤 인스턴스 생성
export const uploadService = new UploadService()
export { UploadService }
