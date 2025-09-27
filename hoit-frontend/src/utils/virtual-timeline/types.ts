/**
 * Virtual Timeline 핵심 타입 정의
 * RVFC 기반 비파괴 편집을 위한 인터페이스
 */

/**
 * Virtual Timeline의 세그먼트 정의
 * Cut edit 결과를 반영한 virtual time 기준 세그먼트
 */
export interface VirtualSegment {
  id: string
  virtualStartTime: number // Virtual timeline 상의 시작 시간
  virtualEndTime: number // Virtual timeline 상의 끝 시간
  realStartTime: number // 실제 비디오의 시작 시간
  realEndTime: number // 실제 비디오의 끝 시간
  sourceClipId: string // 원본 ClipItem ID
  isEnabled: boolean // 세그먼트 활성화 여부
  type: 'normal' | 'split' | 'moved' // 세그먼트 타입
}

/**
 * Virtual Timeline 상태 정의
 */
export interface VirtualTimeline {
  currentTime: number // 현재 virtual time
  duration: number // 전체 virtual timeline 길이
  isPlaying: boolean // 재생 상태
  segments: VirtualSegment[] // Virtual 세그먼트 목록
  clipOrder: string[] // 클립 재생 순서
  lastUpdated: number // 마지막 업데이트 타임스탬프
}

/**
 * Virtual Player 제어 인터페이스
 */
export interface VirtualPlayerControl {
  play(): Promise<void>
  pause(): void
  stop(): void
  seek(virtualTime: number): Promise<{ realTime: number; virtualTime: number }>
  getCurrentTime(): number
  getDuration(): number
  setPlaybackRate(rate: number): void
  getPlaybackRate(): number
}

/**
 * RVFC 프레임 정보
 */
export interface VirtualFrameData {
  virtualTime: number // Virtual timeline 시간
  mediaTime: number // 실제 비디오 시간
  displayTime: DOMHighResTimeStamp // 브라우저 표시 예정 시각
  frameNumber?: number // 프레임 번호 (선택적)
  activeSegments: VirtualSegment[] // 현재 활성 세그먼트들
}

/**
 * Virtual Player 이벤트 콜백 타입
 */
export type FrameCallback = (frameData: VirtualFrameData) => void
export type PlayStateCallback = () => void
export type SeekCallback = (virtualTime: number) => void
export type SeekedCallback = (data: {
  realTime: number
  virtualTime: number
}) => void
export type TimeUpdateCallback = (virtualTime: number) => void

/**
 * Virtual Player 이벤트 인터페이스
 */
export interface VirtualPlayerEvents {
  /**
   * RVFC 기반 프레임 단위 콜백 등록
   */
  onFrame(callback: FrameCallback): () => void

  /**
   * 재생 상태 변경 이벤트
   */
  onPlay(callback: PlayStateCallback): () => void
  onPause(callback: PlayStateCallback): () => void
  onStop(callback: PlayStateCallback): () => void

  /**
   * 시간 변경 이벤트
   */
  onSeek(callback: SeekCallback): () => void
  onSeeked(callback: SeekedCallback): () => void
  onTimeUpdate(callback: TimeUpdateCallback): () => void

  /**
   * Timeline 구조 변경 이벤트
   */
  onTimelineChange(callback: (timeline: VirtualTimeline) => void): () => void
}

/**
 * Cut Edit 작업 타입 정의
 */
export interface CutEditOperation {
  id: string
  type: 'split' | 'delete' | 'move' | 'restore'
  targetClipId: string
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface SplitOperation extends CutEditOperation {
  type: 'split'
  splitPoint: number // Virtual time에서의 분할 지점
  resultClipIds: [string, string] // 분할 결과 생성된 클립 ID들
}

export interface DeleteOperation extends CutEditOperation {
  type: 'delete'
  originalSegment: VirtualSegment // 삭제된 원본 세그먼트
}

export interface MoveOperation extends CutEditOperation {
  type: 'move'
  fromPosition: number
  toPosition: number
  targetWordId?: string // Word-level move의 경우
}

export interface RestoreOperation extends CutEditOperation {
  type: 'restore'
  restoredSegment: VirtualSegment
}

/**
 * Timeline Mapping 결과
 */
export interface TimelineMapping {
  isValid: boolean
  virtualTime: number
  realTime: number
  activeSegment: VirtualSegment | null
  error?: string
}

/**
 * Virtual Timeline 설정
 */
export interface VirtualTimelineConfig {
  enableFramePrecision: boolean // 프레임 단위 정밀도 활성화
  frameRate: number // 타겟 프레임레이트
  bufferSize: number // 프레임 버퍼 크기
  syncThreshold: number // 동기화 임계값 (ms)
  debugMode: boolean // 디버그 모드
}

/**
 * Export용 Timeline JSON 구조
 */
export interface TimelineJSON {
  version: '1.0'
  metadata: {
    created: string
    duration: number
    frameRate: number
    totalSegments: number
  }
  source: {
    videoPath: string
    originalDuration: number
  }
  segments: Array<{
    id: string
    virtualStart: number
    virtualEnd: number
    realStart: number
    realEnd: number
    sourceClipId: string
    type: string
  }>
  cutEdits: {
    splits: SplitOperation[]
    deletions: DeleteOperation[]
    moves: MoveOperation[]
  }
  effects?: Array<{
    segmentId: string
    pluginName: string
    parameters: Record<string, unknown>
  }>
}
