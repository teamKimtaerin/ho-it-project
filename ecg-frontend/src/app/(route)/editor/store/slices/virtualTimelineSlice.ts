/**
 * Virtual Timeline Slice
 * 기존 timelineSlice와 mediaSlice를 Virtual Timeline 기반으로 대체
 * RVFC와 Virtual Timeline 시스템을 Zustand store와 연결
 */

import { StateCreator } from 'zustand'
import { log } from '@/utils/logger'
import { ClipItem } from '@/app/(route)/editor/types'
import { VirtualTimelineManager } from '@/utils/virtual-timeline/VirtualTimeline'
import { ECGTimelineMapper } from '@/utils/virtual-timeline/ECGTimelineMapper'
import { VirtualPlayerController } from '@/utils/virtual-timeline/VirtualPlayerController'
import {
  VirtualTimeline,
  VirtualSegment,
  VirtualFrameData,
  VirtualTimelineConfig,
  CutEditOperation,
} from '@/utils/virtual-timeline/types'

/**
 * Virtual Timeline 상태 인터페이스
 * 기존 TimelineState + MediaState 통합
 */
export interface VirtualTimelineState {
  // Core Virtual Timeline
  timeline: VirtualTimeline
  timelineManager: VirtualTimelineManager
  timelineMapper: ECGTimelineMapper
  virtualPlayer: VirtualPlayerController | null

  // Media 상태 (기존 MediaSlice와 호환)
  mediaId: string | null
  videoUrl: string | null
  videoName: string | null
  videoDuration: number | null
  videoElement: HTMLVideoElement | null

  // Playback 상태 (Virtual Timeline 기반)
  currentVirtualTime: number
  isPlaying: boolean
  playbackRate: number

  // UI 상태
  isInitialized: boolean
  isRVFCActive: boolean
  lastFrameData: VirtualFrameData | null

  // 설정
  config: VirtualTimelineConfig

  // 에러 상태
  error: string | null
}

/**
 * Virtual Timeline 액션 인터페이스
 */
export interface VirtualTimelineActions {
  // 초기화 및 설정
  initializeVirtualTimeline: (clips: ClipItem[]) => void
  attachVideoElement: (video: HTMLVideoElement) => void
  detachVideoElement: () => void
  updateConfig: (config: Partial<VirtualTimelineConfig>) => void

  // Media 관리 (기존 MediaSlice 호환)
  setMediaInfo: (info: {
    mediaId?: string
    videoUrl?: string
    videoName?: string
    videoDuration?: number
  }) => void
  clearMedia: () => void

  // 재생 제어 (Virtual Timeline 기반)
  play: () => Promise<void>
  pause: () => void
  stop: () => void
  seek: (virtualTime: number) => void
  setPlaybackRate: (rate: number) => void

  // Cut Edit 작업 (기존 시스템 통합)
  splitClip: (clipId: string, splitVirtualTime: number) => [string, string]
  deleteClip: (clipId: string) => void
  restoreClip: (clipId: string) => void
  reorderClips: (newOrder: string[]) => void
  moveWordBetweenClips: (
    wordId: string,
    sourceClipId: string,
    targetClipId: string,
    targetPosition: number
  ) => void

  // Timeline 조회
  getActiveSegments: (virtualTime?: number) => VirtualSegment[]
  getEditHistory: () => CutEditOperation[]
  getCurrentClipOrder: () => string[]

  // Virtual/Real time 변환
  virtualToReal: (virtualTime: number) => { isValid: boolean; realTime: number }
  realToVirtual: (realTime: number) => { isValid: boolean; virtualTime: number }

  // Export 지원
  generateExportSegments: () => import('@/utils/virtual-timeline/ECGTimelineMapper').ECGPlaybackSegment[]

  // 디버깅
  getDebugInfo: () => object

  // 리소스 정리
  cleanup: () => void
}

export type VirtualTimelineSlice = VirtualTimelineState & VirtualTimelineActions

const defaultConfig: VirtualTimelineConfig = {
  enableFramePrecision: true,
  frameRate: 30,
  bufferSize: 10,
  syncThreshold: 16.67,
  debugMode: false,
}

const initialState: VirtualTimelineState = {
  timeline: {
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    segments: [],
    clipOrder: [],
    lastUpdated: 0,
  },
  timelineManager: new VirtualTimelineManager(defaultConfig),
  timelineMapper: new ECGTimelineMapper(
    new VirtualTimelineManager(defaultConfig)
  ),
  virtualPlayer: null,

  // Media 상태
  mediaId: null,
  videoUrl: null,
  videoName: null,
  videoDuration: null,
  videoElement: null,

  // Playback 상태
  currentVirtualTime: 0,
  isPlaying: false,
  playbackRate: 1.0,

  // UI 상태
  isInitialized: false,
  isRVFCActive: false,
  lastFrameData: null,

  config: defaultConfig,
  error: null,
}

export const createVirtualTimelineSlice: StateCreator<VirtualTimelineSlice> = (
  set,
  get
) => {
  // Timeline Manager와 Mapper 초기화
  const timelineManager = new VirtualTimelineManager(defaultConfig)
  const timelineMapper = new ECGTimelineMapper(timelineManager)
  const virtualPlayer = new VirtualPlayerController(
    timelineMapper,
    defaultConfig
  )

  // Virtual Player 이벤트 리스너 설정
  virtualPlayer.onFrame((frameData: VirtualFrameData) => {
    set((state) => ({
      ...state,
      currentVirtualTime: frameData.virtualTime,
      timeline: timelineMapper.timelineManager.getTimeline(),
      lastFrameData: frameData,
    }))
  })

  virtualPlayer.onPlay(() => {
    set((state) => ({ ...state, isPlaying: true }))
  })

  virtualPlayer.onPause(() => {
    set((state) => ({ ...state, isPlaying: false }))
  })

  virtualPlayer.onStop(() => {
    set((state) => ({
      ...state,
      isPlaying: false,
      currentVirtualTime: 0,
    }))
  })

  virtualPlayer.onSeek((virtualTime: number) => {
    set((state) => ({
      ...state,
      currentVirtualTime: virtualTime,
      timeline: timelineMapper.timelineManager.getTimeline(),
    }))
  })

  return {
    ...initialState,
    timelineManager,
    timelineMapper,
    virtualPlayer,

    // 초기화 및 설정
    initializeVirtualTimeline: (clips: ClipItem[]) => {
      log('VirtualTimelineSlice', `Initializing with ${clips.length} clips`)

      try {
        timelineMapper.initialize(clips)

        set((state) => ({
          ...state,
          timeline: timelineManager.getTimeline(),
          isInitialized: true,
          error: null,
        }))

        log('VirtualTimelineSlice', 'Virtual Timeline initialized successfully')
      } catch (error) {
        log('VirtualTimelineSlice', 'Initialization failed:', error)
        set((state) => ({
          ...state,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown initialization error',
        }))
      }
    },

    attachVideoElement: (video: HTMLVideoElement) => {
      log('VirtualTimelineSlice', 'Attaching video element')

      virtualPlayer.attachVideo(video)

      set((state) => ({
        ...state,
        videoElement: video,
        isRVFCActive: true,
      }))
    },

    detachVideoElement: () => {
      log('VirtualTimelineSlice', 'Detaching video element')

      virtualPlayer.detachVideo()

      set((state) => ({
        ...state,
        videoElement: null,
        isRVFCActive: false,
      }))
    },

    updateConfig: (newConfig: Partial<VirtualTimelineConfig>) => {
      const updatedConfig = { ...get().config, ...newConfig }

      timelineManager.updateConfig(updatedConfig)

      set((state) => ({
        ...state,
        config: updatedConfig,
      }))

      log('VirtualTimelineSlice', 'Config updated:', updatedConfig)
    },

    // Media 관리
    setMediaInfo: (info) => {
      set((state) => ({
        ...state,
        mediaId: info.mediaId ?? state.mediaId,
        videoUrl: info.videoUrl ?? state.videoUrl,
        videoName: info.videoName ?? state.videoName,
        videoDuration: info.videoDuration ?? state.videoDuration,
      }))

      log('VirtualTimelineSlice', 'Media info updated:', info)
    },

    clearMedia: () => {
      virtualPlayer.detachVideo()

      set((state) => ({
        ...state,
        mediaId: null,
        videoUrl: null,
        videoName: null,
        videoDuration: null,
        videoElement: null,
        currentVirtualTime: 0,
        isPlaying: false,
        isRVFCActive: false,
      }))

      log('VirtualTimelineSlice', 'Media cleared')
    },

    // 재생 제어
    play: async () => {
      try {
        await virtualPlayer.play()
        log('VirtualTimelineSlice', 'Playback started')
      } catch (error) {
        log('VirtualTimelineSlice', 'Play failed:', error)
        set((state) => ({
          ...state,
          error: error instanceof Error ? error.message : 'Play failed',
        }))
        throw error
      }
    },

    pause: () => {
      virtualPlayer.pause()
      log('VirtualTimelineSlice', 'Playback paused')
    },

    stop: () => {
      virtualPlayer.stop()
      log('VirtualTimelineSlice', 'Playback stopped')
    },

    seek: (virtualTime: number) => {
      virtualPlayer.seek(virtualTime)
      log('VirtualTimelineSlice', `Seeked to virtual time: ${virtualTime}`)
    },

    setPlaybackRate: (rate: number) => {
      virtualPlayer.setPlaybackRate(rate)

      set((state) => ({
        ...state,
        playbackRate: rate,
      }))

      log('VirtualTimelineSlice', `Playback rate set to: ${rate}`)
    },

    // Cut Edit 작업
    splitClip: (clipId: string, splitVirtualTime: number) => {
      log(
        'VirtualTimelineSlice',
        `Splitting clip ${clipId} at virtual time ${splitVirtualTime}`
      )

      try {
        const result = timelineMapper.splitClip(clipId, splitVirtualTime)

        set((state) => ({
          ...state,
          timeline: timelineManager.getTimeline(),
        }))

        return result
      } catch (error) {
        log('VirtualTimelineSlice', 'Split clip failed:', error)
        set((state) => ({
          ...state,
          error: error instanceof Error ? error.message : 'Split failed',
        }))
        throw error
      }
    },

    deleteClip: (clipId: string) => {
      log('VirtualTimelineSlice', `Deleting clip: ${clipId}`)

      timelineMapper.deleteClip(clipId)

      set((state) => ({
        ...state,
        timeline: timelineManager.getTimeline(),
      }))
    },

    restoreClip: (clipId: string) => {
      log('VirtualTimelineSlice', `Restoring clip: ${clipId}`)

      timelineMapper.restoreClip(clipId)

      set((state) => ({
        ...state,
        timeline: timelineManager.getTimeline(),
      }))
    },

    reorderClips: (newOrder: string[]) => {
      log('VirtualTimelineSlice', `Reordering clips:`, newOrder)

      timelineMapper.reorderClips(newOrder)

      set((state) => ({
        ...state,
        timeline: timelineManager.getTimeline(),
      }))
    },

    moveWordBetweenClips: (
      wordId,
      sourceClipId,
      targetClipId,
      targetPosition
    ) => {
      log(
        'VirtualTimelineSlice',
        `Moving word ${wordId} from ${sourceClipId} to ${targetClipId}`
      )

      timelineMapper.moveWordBetweenClips(
        wordId,
        sourceClipId,
        targetClipId,
        targetPosition
      )

      set((state) => ({
        ...state,
        timeline: timelineManager.getTimeline(),
      }))
    },

    // Timeline 조회
    getActiveSegments: (virtualTime?: number) => {
      const time = virtualTime ?? get().currentVirtualTime
      return timelineManager.getActiveSegments(time)
    },

    getEditHistory: () => {
      return timelineManager.getEditHistory()
    },

    getCurrentClipOrder: () => {
      return timelineMapper.getCurrentClipOrder()
    },

    // Time 변환
    virtualToReal: (virtualTime: number) => {
      const mapping = timelineMapper.toReal(virtualTime)
      return {
        isValid: mapping.isValid,
        realTime: mapping.realTime,
      }
    },

    realToVirtual: (realTime: number) => {
      const mapping = timelineMapper.toVirtual(realTime)
      return {
        isValid: mapping.isValid,
        virtualTime: mapping.virtualTime,
      }
    },

    // Export 지원
    generateExportSegments: () => {
      return timelineMapper.generateExportSegments()
    },

    // 디버깅
    getDebugInfo: () => {
      return {
        virtualTimeline: timelineManager.getTimeline(),
        timelineMapper: timelineMapper.getDebugInfo(),
        virtualPlayer: virtualPlayer.getDebugInfo(),
        state: {
          isInitialized: get().isInitialized,
          isRVFCActive: get().isRVFCActive,
          currentVirtualTime: get().currentVirtualTime,
          isPlaying: get().isPlaying,
        },
      }
    },

    // 리소스 정리
    cleanup: () => {
      log('VirtualTimelineSlice', 'Cleaning up resources')

      virtualPlayer.cleanup()

      set(() => ({
        ...initialState,
        timelineManager: new VirtualTimelineManager(defaultConfig),
        timelineMapper: new ECGTimelineMapper(
          new VirtualTimelineManager(defaultConfig)
        ),
        virtualPlayer: null,
      }))
    },
  }
}
