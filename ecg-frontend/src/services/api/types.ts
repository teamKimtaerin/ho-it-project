/**
 * API Service Types
 * Shared TypeScript interfaces for API communication
 */

// Upload related types
export interface GenerateUploadUrlRequest {
  filename: string
  filetype: string
}

export interface GenerateUploadUrlResponse {
  url: string
  fileKey: string
}

export interface RequestProcessRequest {
  fileKey: string
}

export interface RequestProcessResponse {
  message: string
  jobId: string
}

// Processing status types
export interface ProcessingStatus {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  message?: string
  error?: string
}

// Transcription result types
export interface TranscriptionWord {
  word: string
  start: number
  end: number
  confidence: number
  volume_db?: number
  pitch_hz?: number
  harmonics_ratio?: number
  spectral_centroid?: number
}

export interface TranscriptionSegment {
  start_time: number
  end_time: number
  duration: number
  speaker: {
    speaker_id: string
    confidence: number
    gender?: string | null
    age_group?: string | null
  }
  emotion?: {
    emotion: string
    confidence: number
    probabilities?: Record<string, number>
  }
  text: string
  words: TranscriptionWord[]
}

export interface TranscriptionMetadata {
  filename: string
  duration: number
  sample_rate: number
  processed_at: string
  processing_time: number
  total_segments: number
  unique_speakers: number
  dominant_emotion?: string
  avg_confidence: number
  processing_mode: string
  config?: {
    enable_gpu: boolean
    segment_length: number
    language: string
    unified_model: string
    emotion_model?: string
  }
  subtitle_optimization?: boolean
}

export interface TranscriptionResult {
  jobId: string
  status: 'success' | 'failed'
  metadata?: TranscriptionMetadata
  segments: TranscriptionSegment[]
  speakers?: Record<
    string,
    {
      total_duration: number
      segment_count: number
      avg_confidence: number
      emotions?: string[]
    }
  >
}

// Video processing types
export interface VideoMetadata {
  duration: number
  width: number
  height: number
  frameRate: number
  videoCodec?: string
  audioCodec?: string
  filesize?: string
}

// Error types
export interface APIError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// Service response wrapper
export interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: APIError
}
