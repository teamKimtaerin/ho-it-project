// GPU 서버 렌더링 관련 타입 정의

export interface RenderRequest {
  videoUrl: string
  scenario: RendererScenario
  options?: RenderOptions
}

export interface RenderOptions {
  width?: number
  height?: number
  fps?: number
  quality?: number
  format?: 'mp4' | 'mov' | 'webm'
}

export interface RenderJob {
  jobId: string
  estimatedTime: number // 예상 처리 시간(초)
  createdAt: string
}

export interface RenderStatus {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: number // 0-100
  downloadUrl?: string
  error?: string
  startedAt?: string
  completedAt?: string
  estimatedTimeRemaining?: number // 남은 시간(초)
}

export interface RendererScenario {
  version: string
  timebase: { unit: 'seconds' | 'milliseconds' }
  stage: { baseAspect: string }
  tracks: Array<{
    id: string
    type: 'free' | 'subtitle'
    layer: number
  }>
  cues: Array<{
    id: string
    track: string
    hintTime?: { start?: number; end?: number }
    root: Record<string, unknown>
  }>
}

export interface RenderError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// API 응답 타입
export interface CreateRenderResponse {
  success: boolean
  data?: RenderJob
  error?: RenderError
}

export interface StatusResponse {
  success: boolean
  data?: RenderStatus
  error?: RenderError
}

// 백엔드 직접 응답 타입들 (FastAPI 서버와 직접 통신용)
export interface BackendCreateRenderResponse {
  jobId: string
  estimatedTime: number
  createdAt: string
}

export interface BackendStatusResponse {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  estimatedTimeRemaining?: number
  startedAt?: string
  completedAt?: string
  downloadUrl?: string
  error?: string
}

export interface BackendCancelResponse {
  success: boolean
  message: string
}

export interface BackendErrorResponse {
  detail: {
    error: string
    message: string
    code: string
    details?: Record<string, unknown>
  }
}

// 에러 코드 enum
export enum RenderErrorCode {
  CREATE_JOB_ERROR = 'CREATE_JOB_ERROR',
  STATUS_CHECK_ERROR = 'STATUS_CHECK_ERROR',
  GPU_SERVER_ERROR = 'GPU_SERVER_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  ABORTED = 'ABORTED',
  RENDER_QUOTA_DAILY_EXCEEDED = 'RENDER_QUOTA_DAILY_EXCEEDED',
  RENDER_QUOTA_MONTHLY_EXCEEDED = 'RENDER_QUOTA_MONTHLY_EXCEEDED',
  RENDER_QUOTA_CONCURRENT_EXCEEDED = 'RENDER_QUOTA_CONCURRENT_EXCEEDED',
  RENDER_RATE_LIMIT_EXCEEDED = 'RENDER_RATE_LIMIT_EXCEEDED',
  RENDER_INVALID_INPUT = 'RENDER_INVALID_INPUT',
  RENDER_AUTH_ERROR = 'RENDER_AUTH_ERROR',
  RENDER_FORBIDDEN = 'RENDER_FORBIDDEN',
}

// 렌더링 작업 이력
export interface RenderHistory {
  jobId: string
  videoName: string
  status: RenderStatus['status']
  createdAt: string
  completedAt?: string
  downloadUrl?: string
  fileSize?: number
  duration?: number // 영상 길이(초)
}
