/**
 * 비디오 업로드 및 ML 처리 관련 타입 정의
 */

// Presigned URL 요청/응답
export interface PresignedUrlRequest {
  filename: string
  content_type: string
}

export interface PresignedUrlResponse {
  presigned_url: string
  file_key: string
  expires_in: number
}

// ML 처리 요청/응답
export interface MLProcessingRequest {
  fileKey: string
  language: string
  whisper_model?: string
}

export interface MLProcessingResponse {
  job_id: string
  status: string
  estimated_time: number
  message?: string // Backend may include this field
}

// 처리 상태
export interface ProcessingStatus {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  current_stage?: string
  estimated_time_remaining?: number
  result?: {
    segments: SegmentData[]
    metadata: {
      duration: number
      language: string
      model: string
      processing_time: number
    }
  }
}

// 처리 결과
export interface ProcessingResult {
  job_id: string
  status: string
  result: {
    segments: SegmentData[]
    metadata: {
      duration: number
      language: string
      model: string
      processing_time: number
    }
    // 화자 정보 (선택적)
    speakers?: string[]
    speakerMapping?: Record<string, string>
  }
}

// 세그먼트 데이터 (ML 결과)
export interface SegmentData {
  id?: number // ML 서버가 id를 안 보낼 수 있음
  start: number
  end: number
  text: string
  speaker: string | { speaker_id: string } // ML 서버가 객체로 보낼 수 있음
  confidence: number
  words?: WordData[]
}

// 단어 데이터
export interface WordData {
  word: string
  start: number
  end: number
  confidence: number
}

// 업로드 폼 데이터
export interface UploadFormData {
  file: File
  language: 'auto' | 'ko' | 'en' | 'ja' | 'zh'
}

// 업로드 진행 상태
export type UploadStep =
  | 'select'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed'

// 에러 응답
export interface UploadErrorResponse {
  error: string
  message: string
  details?: string
}

// 서비스 응답 래퍼
export interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: UploadErrorResponse
}

// 업로드 설정
export interface UploadConfig {
  maxFileSize: number
  allowedExtensions: string[]
  pollingInterval: number
  timeoutDuration: number
}
