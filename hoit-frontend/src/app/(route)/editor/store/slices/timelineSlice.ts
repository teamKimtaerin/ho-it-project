/**
 * 비파괴 영상 편집을 위한 타임라인 상태 관리 슬라이스
 */

import { StateCreator } from 'zustand'
import { log } from '@/utils/logger'
import { ClipItem } from '@/app/(route)/editor/components/ClipComponent/types'

export type TrackType = 'video' | 'audio' | 'subtitle'

export interface Effect {
  id: string
  type: string
  parameters: Record<string, unknown>
  startTime: number
  endTime: number
}

export interface Transition {
  id: string
  type: string
  duration: number
  parameters: Record<string, unknown>
}

export interface TimelineClip {
  id: string
  sourceClipId: string // 원본 ClipItem ID 참조
  inPoint: number // 원본 클립에서의 시작점 (초)
  outPoint: number // 원본 클립에서의 끝점 (초)
  startTime: number // 타임라인상 시작 시간 (초)
  duration: number // 클립 길이 (초) - (outPoint - inPoint)
  track: TrackType // 트랙 타입
  trackIndex: number // 같은 타입 내에서의 트랙 번호 (0, 1, 2...)
  enabled: boolean // 클립 활성화 여부
  locked: boolean // 편집 잠금 여부
  effects?: Effect[] // 적용된 효과들
  transitions?: Transition[] // 전환 효과들
  volume?: number // 오디오 볼륨 (0-1)
  opacity?: number // 비디오 투명도 (0-1)
}

export interface Timeline {
  clips: TimelineClip[]
  totalDuration: number // 전체 타임라인 길이
  playbackPosition: number // 현재 재생 위치
  viewportStart: number // 뷰포트 시작 시간
  viewportEnd: number // 뷰포트 끝 시간
  zoom: number // 줌 레벨 (픽셀 per 초)
  snapToGrid: boolean // 그리드에 스냅 여부
  gridSize: number // 그리드 크기 (초)
  isSequentialMode: boolean // 연속 재생 모드 (클립들을 순서대로 이어붙임)
  clipOrder: string[] // 클립 재생 순서 (클립 ID 배열)
  lastUpdated?: number // 마지막 업데이트 타임스탬프 (자막 시스템 동기화용)
}

export interface TimelineState {
  timeline: Timeline
  selectedClipIds: Set<string>
  draggedClipId: string | null
  isPlaying: boolean
  previewMode: boolean // 미리보기 모드
  editMode: 'ripple' | 'insert' | 'overwrite' // 편집 모드
  trackHeight: number // 트랙 높이
}

export interface TimelineActions {
  // 타임라인 관리
  initializeTimeline: (originalClips: ClipItem[]) => void
  updateTimeline: (updates: Partial<Timeline>) => void
  resetTimeline: () => void

  // 연속 재생 모드 관리
  enableSequentialMode: () => void
  disableSequentialMode: () => void
  reorderTimelineClips: (newOrder: string[]) => void
  getSequentialClips: () => TimelineClip[]
  calculateSequentialDuration: () => number
  recalculateSequentialTimeline: () => void

  // 클립 관리
  addTimelineClip: (clip: TimelineClip) => void
  removeTimelineClip: (clipId: string) => void
  updateTimelineClip: (clipId: string, updates: Partial<TimelineClip>) => void
  moveTimelineClip: (
    clipId: string,
    newStartTime: number,
    newTrackIndex?: number
  ) => void
  splitTimelineClip: (clipId: string, splitTime: number) => string[] // 분할된 클립 ID 반환
  trimTimelineClip: (
    clipId: string,
    newInPoint?: number,
    newOutPoint?: number
  ) => void
  duplicateTimelineClip: (clipId: string) => string // 복제된 클립 ID 반환

  // 선택 관리
  selectTimelineClip: (clipId: string, multiSelect?: boolean) => void
  clearTimelineSelection: () => void
  selectAllTimelineClips: () => void

  // 재생 제어
  setPlaybackPosition: (position: number) => void
  play: () => void
  pause: () => void
  stop: () => void
  seekTo: (time: number) => void

  // 뷰포트 제어
  zoomTimeline: (zoom: number) => void
  setViewport: (start: number, end: number) => void
  fitTimelineToView: () => void

  // 편집 모드
  setEditMode: (mode: 'ripple' | 'insert' | 'overwrite') => void
  toggleSnapToGrid: () => void
  setGridSize: (size: number) => void

  // 드래그 앤 드롭
  startDragTimelineClip: (clipId: string) => void
  endDragTimelineClip: () => void

  // 유틸리티
  getClipAtTime: (time: number, track?: TrackType) => TimelineClip | null
  getActiveClips: (time: number) => TimelineClip[]
  calculateTimelineDuration: () => number
  exportTimelineData: () => Timeline
}

export type TimelineSlice = TimelineState & TimelineActions

const initialState: TimelineState = {
  timeline: {
    clips: [],
    totalDuration: 0,
    playbackPosition: 0,
    viewportStart: 0,
    viewportEnd: 60, // 초기 1분 뷰포트
    zoom: 10, // 10 픽셀 per 초
    snapToGrid: true,
    gridSize: 1, // 1초 그리드
    isSequentialMode: true, // 기본적으로 연속 재생 모드
    clipOrder: [], // 빈 순서 배열
  },
  selectedClipIds: new Set(),
  draggedClipId: null,
  isPlaying: false,
  previewMode: false,
  editMode: 'ripple',
  trackHeight: 60,
}

export const createTimelineSlice: StateCreator<TimelineSlice> = (set, get) => ({
  ...initialState,

  // 타임라인 초기화 (기존 클립들로부터)
  initializeTimeline: (originalClips) => {
    set((state) => {
      const timelineClips: TimelineClip[] = originalClips.map((clip, index) => {
        // 클립의 시작/끝 시간 계산
        const startTime =
          clip.words.length > 0 ? clip.words[0].start : index * 5
        const endTime =
          clip.words.length > 0
            ? clip.words[clip.words.length - 1].end
            : startTime + 5
        const duration = endTime - startTime

        return {
          id: `timeline_${clip.id}`,
          sourceClipId: clip.id,
          inPoint: 0, // 처음에는 전체 클립 사용
          outPoint: duration,
          startTime: startTime,
          duration: duration,
          track: 'subtitle' as TrackType,
          trackIndex: 0,
          enabled: true,
          locked: false,
          effects: [],
          transitions: [],
          volume: 1.0,
          opacity: 1.0,
        }
      })

      // 클립 순서 초기화 (원본 순서대로)
      const clipOrder = timelineClips.map((clip) => clip.id)

      // 총 지속 시간 계산
      const totalDuration = Math.max(
        ...timelineClips.map((clip) => clip.startTime + clip.duration),
        60 // 최소 1분
      )

      log(
        'timelineSlice.ts',
        `Timeline initialized with ${timelineClips.length} clips, duration: ${totalDuration}s`
      )

      return {
        ...state,
        timeline: {
          ...state.timeline,
          clips: timelineClips,
          clipOrder,
          totalDuration,
          viewportEnd: Math.min(totalDuration, 60),
        },
      }
    })
  },

  // 타임라인 업데이트
  updateTimeline: (updates) => {
    set((state) => {
      log('timelineSlice.ts', 'Timeline updated', updates)
      return {
        ...state,
        timeline: {
          ...state.timeline,
          ...updates,
        },
      }
    })
  },

  // 타임라인 리셋
  resetTimeline: () => {
    set((state) => {
      log('timelineSlice.ts', 'Timeline reset')
      return {
        ...state,
        timeline: initialState.timeline,
        selectedClipIds: new Set(),
        draggedClipId: null,
      }
    })
  },

  // 타임라인 클립 추가
  addTimelineClip: (clip) => {
    set((state) => {
      const newClips = [...state.timeline.clips, clip]
      const totalDuration = Math.max(
        ...newClips.map((c) => c.startTime + c.duration),
        state.timeline.totalDuration
      )

      log('timelineSlice.ts', `Added timeline clip: ${clip.id}`)

      return {
        ...state,
        timeline: {
          ...state.timeline,
          clips: newClips,
          totalDuration,
        },
      }
    })
  },

  // 타임라인 클립 제거
  removeTimelineClip: (clipId) => {
    set((state) => {
      const newClips = state.timeline.clips.filter((c) => c.id !== clipId)
      const newSelectedIds = new Set(state.selectedClipIds)
      newSelectedIds.delete(clipId)

      log('timelineSlice.ts', `Removed timeline clip: ${clipId}`)

      return {
        ...state,
        timeline: {
          ...state.timeline,
          clips: newClips,
        },
        selectedClipIds: newSelectedIds,
        draggedClipId:
          state.draggedClipId === clipId ? null : state.draggedClipId,
      }
    })
  },

  // 타임라인 클립 업데이트
  updateTimelineClip: (clipId, updates) => {
    set((state) => {
      const newClips = state.timeline.clips.map((clip) =>
        clip.id === clipId ? { ...clip, ...updates } : clip
      )

      return {
        ...state,
        timeline: {
          ...state.timeline,
          clips: newClips,
        },
      }
    })
  },

  // 타임라인 클립 이동
  moveTimelineClip: (clipId, newStartTime, newTrackIndex) => {
    set((state) => {
      const newClips = state.timeline.clips.map((clip) => {
        if (clip.id === clipId) {
          return {
            ...clip,
            startTime: newStartTime,
            trackIndex:
              newTrackIndex !== undefined ? newTrackIndex : clip.trackIndex,
          }
        }
        return clip
      })

      const totalDuration = Math.max(
        ...newClips.map((c) => c.startTime + c.duration),
        state.timeline.totalDuration
      )

      log('timelineSlice.ts', `Moved clip ${clipId} to ${newStartTime}s`)

      return {
        ...state,
        timeline: {
          ...state.timeline,
          clips: newClips,
          totalDuration,
        },
      }
    })
  },

  // 타임라인 클립 분할
  splitTimelineClip: (clipId, splitTime) => {
    const state = get()
    const clip = state.timeline.clips.find((c) => c.id === clipId)

    if (
      !clip ||
      splitTime <= clip.startTime ||
      splitTime >= clip.startTime + clip.duration
    ) {
      return []
    }

    const relativeTime = splitTime - clip.startTime
    const firstClipId = `${clipId}_split1`
    const secondClipId = `${clipId}_split2`

    const firstClip: TimelineClip = {
      ...clip,
      id: firstClipId,
      outPoint: clip.inPoint + relativeTime,
      duration: relativeTime,
    }

    const secondClip: TimelineClip = {
      ...clip,
      id: secondClipId,
      inPoint: clip.inPoint + relativeTime,
      startTime: splitTime,
      duration: clip.duration - relativeTime,
    }

    set((state) => {
      const newClips = state.timeline.clips
        .filter((c) => c.id !== clipId)
        .concat([firstClip, secondClip])

      log('timelineSlice.ts', `Split clip ${clipId} at ${splitTime}s`)

      return {
        ...state,
        timeline: {
          ...state.timeline,
          clips: newClips,
        },
      }
    })

    return [firstClipId, secondClipId]
  },

  // 타임라인 클립 트림
  trimTimelineClip: (clipId, newInPoint, newOutPoint) => {
    set((state) => {
      const newClips = state.timeline.clips.map((clip) => {
        if (clip.id === clipId) {
          const inPoint = newInPoint !== undefined ? newInPoint : clip.inPoint
          const outPoint =
            newOutPoint !== undefined ? newOutPoint : clip.outPoint
          const duration = outPoint - inPoint

          return {
            ...clip,
            inPoint,
            outPoint,
            duration,
          }
        }
        return clip
      })

      log('timelineSlice.ts', `Trimmed clip ${clipId}`)

      return {
        ...state,
        timeline: {
          ...state.timeline,
          clips: newClips,
        },
      }
    })
  },

  // 타임라인 클립 복제
  duplicateTimelineClip: (clipId) => {
    const state = get()
    const clip = state.timeline.clips.find((c) => c.id === clipId)

    if (!clip) return ''

    const newClipId = `${clipId}_copy_${Date.now()}`
    const newClip: TimelineClip = {
      ...clip,
      id: newClipId,
      startTime: clip.startTime + clip.duration, // 원본 클립 바로 뒤에 배치
    }

    set((state) => {
      const newClips = [...state.timeline.clips, newClip]
      const totalDuration = Math.max(
        ...newClips.map((c) => c.startTime + c.duration),
        state.timeline.totalDuration
      )

      log('timelineSlice.ts', `Duplicated clip ${clipId} as ${newClipId}`)

      return {
        ...state,
        timeline: {
          ...state.timeline,
          clips: newClips,
          totalDuration,
        },
      }
    })

    return newClipId
  },

  // 클립 선택
  selectTimelineClip: (clipId, multiSelect = false) => {
    set((state) => {
      let newSelectedIds: Set<string>

      if (multiSelect) {
        newSelectedIds = new Set(state.selectedClipIds)
        if (newSelectedIds.has(clipId)) {
          newSelectedIds.delete(clipId)
        } else {
          newSelectedIds.add(clipId)
        }
      } else {
        newSelectedIds = new Set([clipId])
      }

      return {
        ...state,
        selectedClipIds: newSelectedIds,
      }
    })
  },

  // 선택 해제
  clearTimelineSelection: () => {
    set((state) => ({
      ...state,
      selectedClipIds: new Set(),
    }))
  },

  // 전체 선택
  selectAllTimelineClips: () => {
    set((state) => ({
      ...state,
      selectedClipIds: new Set(state.timeline.clips.map((clip) => clip.id)),
    }))
  },

  // 재생 위치 설정
  setPlaybackPosition: (position) => {
    set((state) => ({
      ...state,
      timeline: {
        ...state.timeline,
        playbackPosition: Math.max(
          0,
          Math.min(position, state.timeline.totalDuration)
        ),
      },
    }))
  },

  // 재생
  play: () => {
    set((state) => {
      log('timelineSlice.ts', 'Timeline playback started')
      return {
        ...state,
        isPlaying: true,
      }
    })
  },

  // 일시정지
  pause: () => {
    set((state) => {
      log('timelineSlice.ts', 'Timeline playback paused')
      return {
        ...state,
        isPlaying: false,
      }
    })
  },

  // 정지
  stop: () => {
    set((state) => {
      log('timelineSlice.ts', 'Timeline playback stopped')
      return {
        ...state,
        isPlaying: false,
        timeline: {
          ...state.timeline,
          playbackPosition: 0,
        },
      }
    })
  },

  // 시크
  seekTo: (time) => {
    set((state) => {
      const clampedTime = Math.max(
        0,
        Math.min(time, state.timeline.totalDuration)
      )
      return {
        ...state,
        timeline: {
          ...state.timeline,
          playbackPosition: clampedTime,
        },
      }
    })
  },

  // 줌 설정
  zoomTimeline: (zoom) => {
    set((state) => ({
      ...state,
      timeline: {
        ...state.timeline,
        zoom: Math.max(1, Math.min(zoom, 100)), // 1-100 픽셀 per 초
      },
    }))
  },

  // 뷰포트 설정
  setViewport: (start, end) => {
    set((state) => ({
      ...state,
      timeline: {
        ...state.timeline,
        viewportStart: Math.max(0, start),
        viewportEnd: Math.min(end, state.timeline.totalDuration),
      },
    }))
  },

  // 전체 타임라인을 뷰포트에 맞춤
  fitTimelineToView: () => {
    set((state) => ({
      ...state,
      timeline: {
        ...state.timeline,
        viewportStart: 0,
        viewportEnd: state.timeline.totalDuration,
      },
    }))
  },

  // 편집 모드 설정
  setEditMode: (mode) => {
    set((state) => {
      log('timelineSlice.ts', `Edit mode changed to: ${mode}`)
      return {
        ...state,
        editMode: mode,
      }
    })
  },

  // 그리드 스냅 토글
  toggleSnapToGrid: () => {
    set((state) => ({
      ...state,
      timeline: {
        ...state.timeline,
        snapToGrid: !state.timeline.snapToGrid,
      },
    }))
  },

  // 그리드 크기 설정
  setGridSize: (size) => {
    set((state) => ({
      ...state,
      timeline: {
        ...state.timeline,
        gridSize: Math.max(0.1, size),
      },
    }))
  },

  // 드래그 시작
  startDragTimelineClip: (clipId) => {
    set((state) => ({
      ...state,
      draggedClipId: clipId,
    }))
  },

  // 드래그 종료
  endDragTimelineClip: () => {
    set((state) => ({
      ...state,
      draggedClipId: null,
    }))
  },

  // 특정 시간에 있는 클립 찾기
  getClipAtTime: (time, track) => {
    const state = get()
    return (
      state.timeline.clips.find((clip) => {
        const inRange =
          time >= clip.startTime && time < clip.startTime + clip.duration
        const trackMatch = !track || clip.track === track
        return inRange && trackMatch && clip.enabled
      }) || null
    )
  },

  // 특정 시간에 활성화된 모든 클립 찾기
  getActiveClips: (time) => {
    const state = get()
    return state.timeline.clips.filter((clip) => {
      const inRange =
        time >= clip.startTime && time < clip.startTime + clip.duration
      return inRange && clip.enabled
    })
  },

  // 타임라인 총 길이 계산
  calculateTimelineDuration: () => {
    const state = get()
    const maxEndTime = Math.max(
      ...state.timeline.clips.map((clip) => clip.startTime + clip.duration),
      0
    )

    set((state) => ({
      ...state,
      timeline: {
        ...state.timeline,
        totalDuration: maxEndTime,
      },
    }))

    return maxEndTime
  },

  // 연속 재생 모드 활성화
  enableSequentialMode: () => {
    set((state) => {
      log('timelineSlice.ts', 'Sequential mode enabled')
      return {
        ...state,
        timeline: {
          ...state.timeline,
          isSequentialMode: true,
        },
      }
    })
  },

  // 연속 재생 모드 비활성화
  disableSequentialMode: () => {
    set((state) => {
      log('timelineSlice.ts', 'Sequential mode disabled')
      return {
        ...state,
        timeline: {
          ...state.timeline,
          isSequentialMode: false,
        },
      }
    })
  },

  // 클립 순서 재배열 (연속 타임라인 재구성)
  reorderTimelineClips: (newOrder) => {
    set((state) => {
      if (state.timeline.isSequentialMode) {
        // 연속 재생 모드: 클립들을 새로운 순서로 연속 배치
        let currentTime = 0
        const reorderedClips: TimelineClip[] = []

        // 새로운 순서대로 클립들을 재배치
        for (const clipId of newOrder) {
          const originalClip = state.timeline.clips.find(
            (clip) => clip.id === clipId
          )
          if (originalClip) {
            const reorderedClip = {
              ...originalClip,
              startTime: currentTime, // 연속으로 배치
            }
            reorderedClips.push(reorderedClip)
            currentTime += originalClip.duration
          }
        }

        // 순서에 없는 클립들은 끝에 추가 (비활성화)
        const remainingClips = state.timeline.clips
          .filter((clip) => !newOrder.includes(clip.id))
          .map((clip) => ({
            ...clip,
            startTime: currentTime,
            enabled: false, // 순서에서 제외된 클립은 비활성화
          }))

        const allClips = [...reorderedClips, ...remainingClips]
        const totalDuration = Math.max(
          currentTime,
          state.timeline.totalDuration
        )

        log(
          'timelineSlice.ts',
          `Sequential timeline reconstructed: ${reorderedClips.length} active clips, total duration: ${totalDuration}s`
        )

        const newState = {
          ...state,
          timeline: {
            ...state.timeline,
            clips: allClips,
            clipOrder: newOrder,
            totalDuration,
            // 재생 위치가 새로운 길이를 초과하면 조정
            playbackPosition: Math.min(
              state.timeline.playbackPosition,
              totalDuration
            ),
            // Add a timestamp to force subtitle system re-render
            lastUpdated: Date.now(),
          },
        }

        console.log('[timelineSlice] Timeline updated after reorder:', {
          clipOrderLength: newOrder.length,
          totalClips: allClips.length,
          totalDuration,
          timestamp: newState.timeline.lastUpdated,
        })

        return newState
      } else {
        // 일반 모드: 순서만 기록, 실제 배치는 변경하지 않음
        log(
          'timelineSlice.ts',
          `Clip order updated (non-sequential mode): ${newOrder.length} clips`
        )
        return {
          ...state,
          timeline: {
            ...state.timeline,
            clipOrder: newOrder,
          },
        }
      }
    })
  },

  // 연속 재생 순서로 클립들 가져오기
  getSequentialClips: () => {
    const state = get()
    if (!state.timeline.isSequentialMode) {
      return state.timeline.clips
    }

    // Safety check: ensure clipOrder is an array
    const clipOrder = Array.isArray(state.timeline.clipOrder)
      ? state.timeline.clipOrder
      : []

    // If clipOrder is empty, return clips in their original order
    if (clipOrder.length === 0) {
      console.log(
        '[timelineSlice] clipOrder is empty, returning clips in original order'
      )
      return state.timeline.clips
    }

    const sequentialClips = clipOrder
      .map((clipId) => state.timeline.clips.find((clip) => clip.id === clipId))
      .filter(Boolean) as TimelineClip[]

    console.log('[timelineSlice] getSequentialClips:', {
      clipOrder: clipOrder.length,
      timelineClips: state.timeline.clips.length,
      sequentialClips: sequentialClips.length,
      clipOrderIds: clipOrder,
      timelineClipIds: state.timeline.clips.map((c) => c.id),
    })

    return sequentialClips
  },

  // 연속 재생 모드 총 지속 시간 계산
  calculateSequentialDuration: () => {
    const state = get()
    if (!state.timeline.isSequentialMode) {
      return state.timeline.totalDuration
    }

    const sequentialClips = get().getSequentialClips()
    const totalDuration = sequentialClips.reduce(
      (sum, clip) => sum + clip.duration,
      0
    )

    set((state) => ({
      ...state,
      timeline: {
        ...state.timeline,
        totalDuration,
      },
    }))

    return totalDuration
  },

  // 시퀀셜 타임라인 재계산 - 클립 타이밍 변경 시 호출
  recalculateSequentialTimeline: () => {
    const state = get()
    if (!state.timeline.isSequentialMode) {
      return
    }

    console.log('[timelineSlice] Recalculating sequential timeline')

    set((currentState) => {
      let currentTime = 0
      const updatedClips = currentState.timeline.clips.map((clip) => {
        // clipOrder에 있는 순서로 클립들을 연속 배치
        const orderIndex = currentState.timeline.clipOrder.indexOf(clip.id)
        if (orderIndex >= 0) {
          const updatedClip = {
            ...clip,
            startTime: currentTime,
          }
          currentTime += clip.duration
          return updatedClip
        }
        // clipOrder에 없는 클립은 원래 위치 유지
        return clip
      })

      // clipOrder 순서대로 정렬
      const orderedClips = [...updatedClips].sort((a, b) => {
        const aIndex = currentState.timeline.clipOrder.indexOf(a.id)
        const bIndex = currentState.timeline.clipOrder.indexOf(b.id)

        // clipOrder에 없는 클립은 맨 뒤로
        if (aIndex === -1 && bIndex === -1) return 0
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1

        return aIndex - bIndex
      })

      return {
        ...currentState,
        timeline: {
          ...currentState.timeline,
          clips: orderedClips,
          totalDuration: currentTime,
        },
      }
    })

    console.log('[timelineSlice] Sequential timeline recalculated')
  },

  // 타임라인 데이터 내보내기
  exportTimelineData: () => {
    const state = get()
    return { ...state.timeline }
  },
})
