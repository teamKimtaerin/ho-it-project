# ECG Frontend - Backend API 통신 완전 가이드

## 📋 목차

1. [시스템 아키텍처 개요](#시스템-아키텍처-개요)
2. [API 서비스 구조](#api-서비스-구조)
3. [인증 시스템](#인증-시스템)
4. [업로드 및 ML 처리 API](#업로드-및-ml-처리-api)
5. [GPU 렌더링 API](#gpu-렌더링-api)
6. [비디오 및 전사 API](#비디오-및-전사-api)
7. [환경 설정 및 구성](#환경-설정-및-구성)
8. [에러 처리 시스템](#에러-처리-시스템)
9. [파일 구조 및 위치](#파일-구조-및-위치)

---

## 🏗️ 시스템 아키텍처 개요

### 전체 시스템 구성도

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ECG Frontend  │    │   FastAPI Server │    │  External APIs  │
│   (Next.js)     │◄──►│   (Backend)      │◄──►│  - ML Server    │
│                 │    │                  │    │  - GPU Server   │
│                 │    │  ho-it.site      │    │  - S3 Storage   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 핵심 처리 플로우

#### 1️⃣ Upload Phase (음성 분석)

```
1. 사용자가 비디오 파일 선택
2. Frontend → API Server: Presigned URL 요청
3. Frontend → S3: 직접 업로드
4. Frontend → API Server: ML 처리 요청
5. API Server → ML Server: 음성 분석 작업 전달
6. ML Server: WhisperX로 화자 분리, 음성 인식, 감정 분석
7. ML Server → API Server: 콜백으로 결과 전송
8. Frontend: 폴링으로 상태 확인 및 결과 수신
```

#### 2️⃣ Export Phase (GPU 렌더링)

```
1. 사용자가 편집 완료 후 GPU 렌더링 요청
2. Frontend → API Server: 렌더링 작업 생성
3. API Server → GPU Server: Playwright + FFmpeg 렌더링
4. GPU Server: 20-40배 빠른 처리 (1분 영상 → 15-20초)
5. GPU Server → S3: 완성된 비디오 업로드
6. GPU Server → API Server: 콜백으로 완료 알림
7. Frontend: File System Access API로 자동 저장
```

---

## 🔧 API 서비스 구조

### 서비스 클래스별 역할

| 서비스                 | 파일 위치                                  | 역할                                     |
| ---------------------- | ------------------------------------------ | ---------------------------------------- |
| `UploadService`        | `src/services/api/uploadService.ts`        | S3 업로드, ML 처리 요청/상태 관리        |
| `RenderService`        | `src/services/api/renderService.ts`        | GPU 렌더링 작업 생성/관리                |
| `VideoService`         | `src/services/api/videoService.ts`         | 비디오 메타데이터, 처리 상태 (Mock 포함) |
| `TranscriptionService` | `src/services/api/transcriptionService.ts` | 전사 결과 처리, Mock 데이터 관리         |
| `AuthAPI`              | `src/lib/api/auth.ts`                      | 인증, 회원가입, 로그인, 사용자 정보      |

### Base URL 설정

```typescript
// src/config/api.config.ts
export const API_CONFIG = {
  FASTAPI_BASE_URL: process.env.NEXT_PUBLIC_API_URL!, // https://ho-it.site

  // 개발 환경에서는 프록시 사용 (CORS 해결)
  // next.config.ts의 rewrites 설정으로 /api/* → ${FASTAPI_BASE_URL}/api/*
}
```

---

## 🔐 인증 시스템

### 파일 위치

- **API 클래스**: `src/lib/api/auth.ts`
- **Store**: `src/lib/store/authStore.ts`
- **타입 정의**: `src/lib/api/auth.ts` (인라인)

### 인증 플로우

#### 회원가입 API

**요청 구조**

```typescript
// POST /api/auth/signup
interface SignupRequest {
  username: string
  email: string
  password: string
}
```

**응답 구조**

```typescript
interface AuthResponse {
  access_token: string
  token_type: string // "bearer"
  user: User
}

interface User {
  id: number
  name: string
  email: string
  auth_provider: string
  is_active: boolean
  is_verified: boolean
  created_at: string
}
```

**에러 처리**

```typescript
// 422: 유효성 검사 오류
{
  detail: [
    {
      msg: '이메일 형식이 올바르지 않습니다',
      message: 'Invalid email format',
    },
  ]
}

// 409: 중복 사용자
{
  detail: '이미 존재하는 이메일입니다'
}
```

#### 로그인 API

**요청 구조**

```typescript
// POST /api/auth/login
interface LoginRequest {
  email: string
  password: string
}
```

**응답**: 회원가입과 동일한 `AuthResponse` 구조

#### 사용자 정보 조회

**요청 구조**

```typescript
// GET /api/auth/me
// Headers: Authorization: Bearer {token}
```

**응답**: `User` 객체

#### Google OAuth

**엔드포인트**

```typescript
// GET /api/auth/google/login - 구글 로그인 시작
// GET /api/auth/google/callback - 구글 콜백 처리
```

### 인증 상태 관리 (Zustand)

```typescript
// src/lib/store/authStore.ts
interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
}

// 로컬 스토리지에 토큰 자동 저장 (Persist 미들웨어)
// 키: 'ecg-auth-storage'
```

---

## 📤 업로드 및 ML 처리 API

### 파일 위치

- **서비스**: `src/services/api/uploadService.ts`
- **타입 정의**: `src/services/api/types/upload.types.ts`

### 1. Presigned URL 생성

**엔드포인트**: `POST /api/upload-video/generate-url`

**요청 구조**

```typescript
interface PresignedUrlRequest {
  filename: string
  content_type: string // 예: "video/mp4"
}
```

**응답 구조**

```typescript
interface PresignedUrlResponse {
  presigned_url: string // S3 업로드 URL
  file_key: string // S3에서의 파일 키
  expires_in: number // 만료 시간(초)
}
```

**백엔드 응답 매핑**

```typescript
// 백엔드는 다양한 필드명을 사용할 수 있음
interface BackendPresignedResponse {
  url?: string
  upload_url?: string // API 문서 명시
  presigned_url?: string
  fileKey?: string
  file_key?: string
  expires_in?: number
  expires_at?: string
}

// 프론트엔드에서 통일된 형태로 매핑
const mappedResponse: PresignedUrlResponse = {
  presigned_url:
    response.data.upload_url ||
    response.data.url ||
    response.data.presigned_url ||
    '',
  file_key: response.data.fileKey || response.data.file_key || '',
  expires_in: response.data.expires_in || 3600,
}
```

### 2. S3 파일 업로드

**메서드**: `uploadToS3(file: File, presignedUrl: string, onProgress?: Function)`

**특징**

- XMLHttpRequest 사용 (진행률 추적 가능)
- 실시간 업로드 진행률 콜백
- S3 직접 업로드 (API 서버 경유 없음)

**응답**

```typescript
ServiceResponse<string> // S3 공개 URL 반환
```

### 3. ML 처리 요청

**엔드포인트**: `POST /api/upload-video/request-process`

**요청 구조**

```typescript
interface MLProcessingRequest {
  fileKey: string
  language?: string // 'auto', 'ko', 'en', 'ja', 'zh'
}
```

**응답 구조**

```typescript
interface MLProcessingResponse {
  job_id: string
  status: string // 'pending', 'processing', 'completed', 'failed'
  estimated_time: number // 예상 처리 시간(초)
  message?: string
}
```

### 4. 처리 상태 확인

**엔드포인트**: `GET /api/upload-video/status/{jobId}`

**응답 구조**

```typescript
interface ProcessingStatus {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number // 0-100
  current_stage?: string // "음성 추출 중", "화자 분리 중" 등
  estimated_time_remaining?: number // 남은 시간(초)
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
```

### 5. 상태 폴링 시스템

**자동 폴링 설정**

```typescript
// 2초 간격으로 자동 폴링
uploadService.startPolling(
  jobId,
  onStatusUpdate, // 상태 업데이트 콜백
  onComplete, // 완료 콜백
  onError, // 에러 콜백
  2000 // 폴링 간격(ms)
)
```

**처리 완료 시 데이터 구조**

```typescript
interface SegmentData {
  id?: number
  start: number
  end: number
  text: string
  speaker: string | { speaker_id: string } // ML 서버 응답 형태 유연하게 처리
  confidence: number
  words?: WordData[]
}

interface WordData {
  word: string
  start: number
  end: number
  confidence: number
}
```

### 6. 작업 취소

**엔드포인트**: `POST /api/upload-video/cancel/{jobId}`

- 클라이언트 측 폴링 중단
- 서버 측 작업 취소 요청

---

## 🎬 GPU 렌더링 API

### 파일 위치

- **서비스**: `src/services/api/renderService.ts`
- **타입 정의**: `src/services/api/types/render.types.ts`

### 1. 렌더링 작업 생성

**엔드포인트**: `POST /api/render/create`

**요청 구조**

```typescript
interface RenderRequest {
  videoUrl: string // S3 업로드된 비디오 URL
  scenario: RendererScenario // MotionText 시나리오
  options?: RenderOptions
}

interface RenderOptions {
  width?: number // 기본값: 1920
  height?: number // 기본값: 1080
  fps?: number // 기본값: 30
  quality?: number // 기본값: 90
  format?: 'mp4' | 'mov' | 'webm'
}

interface RendererScenario {
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
    root: Record<string, unknown> // 플러그인 데이터
  }>
}
```

**응답 구조**

```typescript
// 백엔드 직접 응답
interface BackendCreateRenderResponse {
  jobId: string
  estimatedTime: number // 예상 처리 시간(초)
  createdAt: string
}

// 프론트엔드 매핑
interface CreateRenderResponse {
  success: boolean
  data?: RenderJob
  error?: RenderError
}

interface RenderJob {
  jobId: string
  estimatedTime: number
  createdAt: string
}
```

### 2. 렌더링 상태 확인

**엔드포인트**: `GET /api/render/{jobId}/status`

**응답 구조**

```typescript
// 백엔드 직접 응답
interface BackendStatusResponse {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number // 0-100
  estimatedTimeRemaining?: number // 남은 시간(초)
  startedAt?: string
  completedAt?: string
  downloadUrl?: string // 완료 시 다운로드 URL
  error?: string
}

// 프론트엔드 매핑
interface StatusResponse {
  success: boolean
  data?: RenderStatus
  error?: RenderError
}
```

### 3. 렌더링 작업 취소

**엔드포인트**: `POST /api/render/{jobId}/cancel`

**응답 구조**

```typescript
interface BackendCancelResponse {
  success: boolean
  message: string
}
```

### 4. 폴링 시스템

**자동 폴링 설정**

```typescript
// 5초 간격, 최대 25분
await renderService.pollJobStatus(
  jobId,
  onProgress, // 진행률 콜백
  5000, // 폴링 간격(ms)
  300 // 최대 시도 횟수
)
```

### 5. 파일 다운로드 (File System Access API)

**특징**

- Chrome 86+, Edge 86+, Opera 72+ 지원
- 사용자가 저장 위치를 미리 선택
- 렌더링 완료 시 자동 저장

**구현**

```typescript
// 저장 위치 선택
const handle = await window.showSaveFilePicker({
  suggestedName: `ecg-rendered-${timestamp}.mp4`,
  types: [
    {
      description: 'MP4 Video File',
      accept: { 'video/mp4': ['.mp4'] },
    },
  ],
})

// 자동 저장
const response = await fetch(downloadUrl)
const blob = await response.blob()
const writable = await handle.createWritable()
await writable.write(blob)
await writable.close()
```

### 6. 에러 코드 체계

```typescript
enum RenderErrorCode {
  CREATE_JOB_ERROR = 'CREATE_JOB_ERROR',
  STATUS_CHECK_ERROR = 'STATUS_CHECK_ERROR',
  GPU_SERVER_ERROR = 'GPU_SERVER_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RENDER_QUOTA_DAILY_EXCEEDED = 'RENDER_QUOTA_DAILY_EXCEEDED',
  RENDER_RATE_LIMIT_EXCEEDED = 'RENDER_RATE_LIMIT_EXCEEDED',
  RENDER_INVALID_INPUT = 'RENDER_INVALID_INPUT',
  RENDER_AUTH_ERROR = 'RENDER_AUTH_ERROR',
}
```

**세분화된 에러 메시지**

```typescript
// 할당량 초과
if (error.message.includes('quota:')) {
  errorCode = RenderErrorCode.RENDER_QUOTA_DAILY_EXCEEDED
  errorMessage = '일일 렌더링 할당량을 초과했습니다. 내일 다시 시도해주세요.'
}

// 속도 제한
if (error.message.includes('rate:')) {
  errorCode = RenderErrorCode.RENDER_RATE_LIMIT_EXCEEDED
  errorMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
}
```

---

## 📹 비디오 및 전사 API

### 파일 위치

- **비디오 서비스**: `src/services/api/videoService.ts`
- **전사 서비스**: `src/services/api/transcriptionService.ts`
- **공통 타입**: `src/services/api/types.ts`

### VideoService (Mock 구현)

**특징**

- 실제 API 구현 대기 중
- Mock 데이터로 개발 환경 지원
- 실제 구현 준비된 인터페이스

**주요 메서드**

```typescript
// 비디오 메타데이터 조회
async getVideoMetadata(videoUrl: string): Promise<ServiceResponse<VideoMetadata>>

interface VideoMetadata {
  duration: number      // 영상 길이(초)
  width: number        // 해상도 너비
  height: number       // 해상도 높이
  frameRate: number    // 프레임 레이트
  videoCodec?: string  // 비디오 코덱
  audioCodec?: string  // 오디오 코덱
  filesize?: string    // 파일 크기
}
```

### TranscriptionService

**역할**

- ML 처리 결과를 Editor 형식으로 변환
- Mock 데이터 관리 (`/real.json`, `/friends_result.json`)
- 세그먼트 → 클립 변환

**주요 메서드**

```typescript
// 전사 결과 조회
async getTranscriptionResults(jobId: string): Promise<ServiceResponse<TranscriptionResult>>

// 전사 클립 직접 로딩 (초기화용)
async loadTranscriptionClips(): Promise<ClipItem[]>

// 세그먼트를 클립으로 변환
async convertToClips(segments: TranscriptionSegment[]): Promise<ClipItem[]>
```

**전사 결과 구조**

```typescript
interface TranscriptionResult {
  jobId: string
  status: 'success' | 'failed'
  metadata?: TranscriptionMetadata
  segments: TranscriptionSegment[]
  speakers?: Record<string, SpeakerInfo>
}

interface TranscriptionSegment {
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

interface TranscriptionWord {
  word: string
  start: number
  end: number
  confidence: number
  volume_db?: number // 음성 분석
  pitch_hz?: number // 피치 분석
  harmonics_ratio?: number // 하모닉스 비율
  spectral_centroid?: number // 스펙트럼 중심
}
```

**Mock 데이터 설정**

```typescript
// DEBUG_MODE=true일 때 /friends_result.json 사용
// 그 외에는 /real.json 사용
MOCK_TRANSCRIPTION_PATH: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true'
  ? '/friends_result.json'
  : '/real.json'
```

---

## ⚙️ 환경 설정 및 구성

### 환경 변수

#### `.env` (프로덕션 기본값)

```bash
# API 서버
NEXT_PUBLIC_API_URL=https://ho-it.site

# 기능 플래그
NEXT_PUBLIC_DEBUG_MODE=false
```

#### `.env.local` (로컬 개발)

```bash
# 로컬 개발 서버 (CORS 프록시 사용)
NEXT_PUBLIC_API_URL=https://ho-it.site

# Google OAuth
GOOGLE_CLIENT_ID=1076942061297-flpl289j4gi2a96ed8do37j16b9hcu97.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# 디버그 모드 (필요시 활성화)
# NEXT_PUBLIC_DEBUG_MODE=true
```

### CORS 프록시 설정 (next.config.ts)

```typescript
// 개발 환경에서만 API 프록시 활성화
...(process.env.NODE_ENV === 'development' && {
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL

    return [
      {
        source: '/api/:path*',           // 프론트엔드 /api/* 요청
        destination: `${backendUrl}/api/:path*`  // → 백엔드 서버로 프록시
      }
    ]
  }
})
```

### 백엔드 URL 결정 로직

```typescript
// src/lib/api/auth.ts
const BASE_URL =
  process.env.NODE_ENV === 'development'
    ? '' // 개발 환경: 프록시 사용 (CORS 문제 해결)
    : API_CONFIG.FASTAPI_BASE_URL // 프로덕션: 직접 호출
```

### 기능 플래그

```typescript
// src/config/api.config.ts
export const API_CONFIG = {
  // 전역 디버그 모드: true일 때 Mock 업로드 + 전사 사용
  DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',

  // 레거시 호환용 플래그
  USE_MOCK_DATA: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
}
```

---

## ❌ 에러 처리 시스템

### 공통 에러 응답 구조

```typescript
// 모든 서비스에서 사용하는 공통 구조
interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: ErrorResponse
}

interface ErrorResponse {
  error: string // 에러 코드
  message: string // 사용자 메시지
  details?: string | Record<string, unknown>
}
```

### HTTP 상태 코드별 처리

#### 인증 API 에러

```typescript
// 422: 유효성 검사 오류
if (response.status === 422) {
  const errorData = await response.json()

  if (Array.isArray(errorData.detail)) {
    message = errorData.detail
      .map((err) => err.msg || err.message || '유효성 검사 실패')
      .join('\n')
  }
}

// 401/403: 인증 오류
if (response.status === 401 || response.status === 403) {
  throw new Error(`인증 오류: ${errorMessage}`)
}

// 429: 속도 제한
if (response.status === 429) {
  throw new Error(`rate:${errorMessage}`)
}
```

#### 업로드 API 에러

```typescript
enum UploadErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  S3_UPLOAD_ERROR = 'S3_UPLOAD_ERROR',
  ML_PROCESSING_FAILED = 'ML_PROCESSING_FAILED',
  POLLING_ERROR = 'POLLING_ERROR',
}
```

#### 렌더링 API 에러

```typescript
enum RenderErrorCode {
  CREATE_JOB_ERROR = 'CREATE_JOB_ERROR',
  GPU_SERVER_ERROR = 'GPU_SERVER_ERROR',
  QUOTA_EXCEEDED = 'RENDER_QUOTA_DAILY_EXCEEDED',
  RATE_LIMIT = 'RENDER_RATE_LIMIT_EXCEEDED',
  INVALID_INPUT = 'RENDER_INVALID_INPUT',
}

// 세분화된 에러 메시지 매핑
const errorHandling = {
  'quota:': {
    code: RenderErrorCode.QUOTA_EXCEEDED,
    message: '일일 렌더링 할당량을 초과했습니다. 내일 다시 시도해주세요.',
  },
  'rate:': {
    code: RenderErrorCode.RATE_LIMIT,
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  },
  'invalid:': {
    code: RenderErrorCode.INVALID_INPUT,
    message: '입력 데이터가 올바르지 않습니다. 비디오와 자막을 확인해주세요.',
  },
}
```

### 네트워크 에러 처리

```typescript
// CORS 에러 감지
if (error instanceof TypeError && error.message.includes('fetch')) {
  throw new Error(
    '서버에 연결할 수 없습니다. 네트워크 상태를 확인하거나 개발 서버를 다시 시작해주세요.'
  )
}

// Abort 에러 (사용자 취소)
if (error instanceof Error && error.name === 'AbortError') {
  return {
    success: false,
    error: {
      code: 'ABORTED',
      message: '작업이 취소되었습니다',
    },
  }
}
```

---

## 📁 파일 구조 및 위치

### API 서비스 파일

```
src/
├── services/api/
│   ├── uploadService.ts           # S3 업로드, ML 처리
│   ├── renderService.ts           # GPU 렌더링
│   ├── videoService.ts            # 비디오 메타데이터 (Mock)
│   ├── transcriptionService.ts    # 전사 결과 처리
│   └── types/
│       ├── upload.types.ts        # 업로드 관련 타입
│       ├── render.types.ts        # 렌더링 관련 타입
│       └── upload.types.ts        # 비디오/전사 공통 타입
├── lib/
│   ├── api/
│   │   └── auth.ts                # 인증 API
│   └── store/
│       └── authStore.ts           # 인증 상태 관리
├── config/
│   └── api.config.ts              # API 설정 및 엔드포인트
└── utils/
    └── transcription/
        └── segmentConverter.ts    # 세그먼트 → 클립 변환
```

### 타입 정의 파일

#### 업로드 관련 (`src/services/api/types/upload.types.ts`)

- `PresignedUrlRequest/Response`
- `MLProcessingRequest/Response`
- `ProcessingStatus`
- `SegmentData`, `WordData`
- `UploadErrorResponse`, `ServiceResponse`

#### 렌더링 관련 (`src/services/api/types/render.types.ts`)

- `RenderRequest`, `RenderOptions`
- `RenderJob`, `RenderStatus`
- `RendererScenario`
- `BackendCreateRenderResponse`, `BackendStatusResponse`
- `RenderErrorCode` enum

#### 인증 관련 (`src/lib/api/auth.ts`)

- `SignupRequest`, `LoginRequest`
- `User`, `AuthResponse`

### 설정 파일

#### API 설정 (`src/config/api.config.ts`)

```typescript
export const API_CONFIG = {
  // 기능 플래그
  DEBUG_MODE: boolean,
  USE_MOCK_DATA: boolean,

  // API URL
  FASTAPI_BASE_URL: string,

  // 엔드포인트 매핑
  endpoints: {
    auth: { signup, login, me, googleLogin, googleCallback },
    uploadVideo: { generateUrl, requestProcess, status },
    render: { create, status, cancel, history },
  },

  // 타임아웃 설정
  UPLOAD_TIMEOUT: 300000, // 5분
  PROCESSING_TIMEOUT: 600000, // 10분
  STATUS_POLL_INTERVAL: 2000, // 2초
}
```

#### Next.js 설정 (`next.config.ts`)

- CORS 프록시 설정 (개발 환경)
- 이미지 최적화 비활성화
- CloudFront 도메인 허용
- ES Module transpile 설정

---

## 🚀 사용 예시

### 1. 비디오 업로드 및 ML 처리

```typescript
import { uploadService } from '@/services/api/uploadService'

// 1. Presigned URL 요청
const urlResponse = await uploadService.getPresignedUrl(file.name, file.type)

// 2. S3 업로드
const uploadResponse = await uploadService.uploadToS3(
  file,
  urlResponse.data.presigned_url,
  (progress) => setUploadProgress(progress)
)

// 3. ML 처리 요청
const processResponse = await uploadService.requestMLProcessing(
  urlResponse.data.file_key,
  'ko'
)

// 4. 상태 폴링 시작
const stopPolling = uploadService.startPolling(
  processResponse.data.job_id,
  (status) => setProcessingStatus(status),
  (result) => setTranscriptionResult(result),
  (error) => setError(error)
)
```

### 2. GPU 렌더링

```typescript
import { renderService } from '@/services/api/renderService'

// 1. 렌더링 작업 생성
const renderResponse = await renderService.createRenderJob({
  videoUrl: 's3://bucket/video.mp4',
  scenario: motionTextScenario,
  options: { width: 1920, height: 1080, fps: 30 },
})

// 2. 진행 상황 폴링
const finalStatus = await renderService.pollJobStatus(
  renderResponse.data.jobId,
  (status) => updateProgress(status.progress),
  5000 // 5초 간격
)

// 3. 파일 다운로드
await renderService.downloadFile(finalStatus.downloadUrl, 'my-video.mp4')
```

### 3. 인증

```typescript
import { useAuthStore } from '@/lib/store/authStore'

const authStore = useAuthStore()

// 회원가입
await authStore.signup({
  username: 'user123',
  email: 'user@example.com',
  password: 'password123',
})

// 로그인
await authStore.login({
  email: 'user@example.com',
  password: 'password123',
})

// 현재 사용자 정보
await authStore.getCurrentUser()
```

---

## 📊 성능 및 모니터링

### 측정 지표

#### 업로드 성능

- **파일 크기별 업로드 시간**: S3 직접 업로드로 API 서버 부하 없음
- **ML 처리 시간**: 1분 영상 기준 2-5분 (WhisperX 모델 성능)
- **폴링 효율성**: 2초 간격, 실패 시 백오프 적용

#### 렌더링 성능

- **GPU 가속 처리**: 1분 영상 → 15-20초 (20-40배 속도 개선)
- **대기열 관리**: 동시 처리 제한으로 안정성 확보
- **자동 저장**: File System Access API로 UX 개선

#### 에러율 모니터링

- **네트워크 에러**: CORS, 타임아웃, 연결 실패
- **서버 에러**: 할당량 초과, 인증 실패, 유효성 검사
- **클라이언트 에러**: 파일 형식, 브라우저 호환성

---

## 🔮 향후 계획

### API 개선 사항

1. **실시간 알림**: WebSocket으로 폴링 대체
2. **배치 처리**: 여러 파일 동시 업로드/처리
3. **캐싱 전략**: Redis로 결과 캐싱
4. **프로젝트 관리**: 사용자별 프로젝트 저장/불러오기

### 성능 최적화

1. **청크 업로드**: 대용량 파일 분할 업로드
2. **Progressive Web App**: 오프라인 편집 지원
3. **CDN 활용**: 정적 리소스 최적화

### 보안 강화

1. **토큰 갱신**: JWT 자동 갱신 메커니즘
2. **RBAC**: 역할 기반 접근 제어
3. **감사 로그**: API 호출 추적

---

이 문서는 ECG Frontend의 모든 Backend API 통신을 망라하는 완전한 가이드입니다. 각 API의 요청/응답 구조, 에러 처리, 파일 위치를 상세히 기술하여 개발자가 쉽게 이해하고 확장할 수 있도록 구성했습니다.
