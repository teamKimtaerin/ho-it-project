/**
 * Virtual Timeline System
 * ECG Editor의 RVFC 기반 비파괴 편집 시스템
 *
 * 사용 예시:
 * ```typescript
 * import { VirtualTimelineManager, VirtualPlayerController, createVirtualTimelineSystem } from '@/utils/virtual-timeline'
 *
 * // 수동 초기화
 * const timelineManager = new VirtualTimelineManager()
 * const timelineMapper = new ECGTimelineMapper(timelineManager)
 * const virtualPlayer = new VirtualPlayerController(timelineMapper)
 *
 * // 또는 팩토리 함수 사용
 * const system = createVirtualTimelineSystem()
 * system.initialize(clips)
 * system.attachVideo(videoElement)
 *
 * // Virtual Time 업데이트 리스너
 * system.virtualPlayer.onTimeUpdate((virtualTime) => {
 *   console.log('Virtual time:', virtualTime)
 * })
 * ```
 */

// Core classes
export { VirtualTimelineManager } from './VirtualTimeline'
export { ECGTimelineMapper } from './ECGTimelineMapper'
export { VirtualPlayerController } from './VirtualPlayerController'
export { VirtualSegmentController } from './VirtualSegmentController'

// Types
export type {
  VirtualTimeline,
  VirtualSegment,
  VirtualPlayerControl,
  VirtualPlayerEvents,
  VirtualFrameData,
  FrameCallback,
  PlayStateCallback,
  SeekCallback,
  TimeUpdateCallback,
  CutEditOperation,
  SplitOperation,
  DeleteOperation,
  MoveOperation,
  RestoreOperation,
  TimelineMapping,
  VirtualTimelineConfig,
  TimelineJSON,
} from './types'

// Import types for local use
import type { VirtualTimelineConfig } from './types'

// Import classes for factory function
import { VirtualTimelineManager } from './VirtualTimeline'
import { ECGTimelineMapper } from './ECGTimelineMapper'
import { VirtualPlayerController } from './VirtualPlayerController'

export type { ECGPlaybackSegment } from './ECGTimelineMapper'

export type {
  SegmentControllerConfig,
  SegmentTransition,
  SegmentTransitionCallback,
  PlaybackCompleteCallback,
} from './VirtualSegmentController'

// Store slice
export type {
  VirtualTimelineState,
  VirtualTimelineActions,
  VirtualTimelineSlice,
} from '../../app/(route)/editor/store/slices/virtualTimelineSlice'
export { createVirtualTimelineSlice } from '../../app/(route)/editor/store/slices/virtualTimelineSlice'

/**
 * Virtual Timeline System Factory
 * 전체 시스템을 한 번에 초기화하는 헬퍼 함수
 */
export function createVirtualTimelineSystem(
  config?: Partial<VirtualTimelineConfig>
) {
  // Direct imports - circular dependency resolved through proper module structure
  const timelineManager = new VirtualTimelineManager(config)
  const timelineMapper = new ECGTimelineMapper(timelineManager)
  const virtualPlayer = new VirtualPlayerController(timelineMapper, config)

  return {
    timelineManager,
    timelineMapper,
    virtualPlayer,

    /**
     * 전체 시스템 초기화
     */
    initialize: (
      clips: import('../../app/(route)/editor/types').ClipItem[]
    ) => {
      timelineMapper.initialize(clips)
      virtualPlayer.handleTimelineUpdate(timelineManager.getTimeline())
    },

    /**
     * Video element 연결
     */
    attachVideo: (video: HTMLVideoElement) => {
      virtualPlayer.attachVideo(video)
    },

    /**
     * 전체 시스템 정리
     */
    cleanup: () => {
      virtualPlayer.cleanup()
    },

    /**
     * 디버그 정보
     */
    getDebugInfo: () => ({
      timelineManager: timelineManager.getTimeline(),
      timelineMapper: timelineMapper.getDebugInfo(),
      virtualPlayer: virtualPlayer.getDebugInfo(),
    }),
  }
}

/**
 * React Hook 용 Virtual Timeline
 * React 컴포넌트에서 쉽게 사용할 수 있는 hook 형태
 */
export function useVirtualTimeline(
  clips: import('../../app/(route)/editor/types').ClipItem[],
  config?: Partial<import('./types').VirtualTimelineConfig>
) {
  const [system] = React.useState(() => createVirtualTimelineSystem(config))
  const [currentVirtualTime, setCurrentVirtualTime] = React.useState<number>(0)
  const [isInitialized, setIsInitialized] = React.useState(false)

  React.useEffect(() => {
    if (clips.length > 0) {
      system.initialize(clips)
      setIsInitialized(true)
    }
  }, [system, clips])

  React.useEffect(() => {
    const cleanup = system.virtualPlayer.onTimeUpdate(setCurrentVirtualTime)
    return cleanup
  }, [system])

  React.useEffect(() => {
    return () => {
      system.cleanup()
    }
  }, [system])

  return {
    ...system,
    currentVirtualTime,
    isInitialized,
  }
}

// Import React for hook
import React from 'react'
