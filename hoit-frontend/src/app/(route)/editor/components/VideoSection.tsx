'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import type { RendererConfigV2 as RendererConfig } from '@/app/shared/motiontext'
import VideoPlayer from './VideoPlayer'
import { useEditorStore } from '../store'
import EditorMotionTextOverlay from './EditorMotionTextOverlay'
import TextInsertionOverlay from './TextInsertion/TextInsertionOverlay'
import TextEditInput from './TextInsertion/TextEditInput'
import ScenarioJsonEditor from './ScenarioJsonEditor'
import VirtualTimelineController from './VirtualTimelineController'
import ChatBotFloatingButton from './ChatBot/ChatBotFloatingButton'
import ChatBotModal from './ChatBot/ChatBotModal'
import { ChatMessage } from '../types/chatBot'
// DISABLED: Conflicting with VirtualPlayerController
// import { playbackEngine } from '@/utils/timeline/playbackEngine'
// import { timelineEngine } from '@/utils/timeline/timelineEngine'
import {
  VirtualPlayerController,
  type MotionTextSeekCallback,
} from '@/utils/virtual-timeline/VirtualPlayerController'
import { ECGTimelineMapper } from '@/utils/virtual-timeline/ECGTimelineMapper'
import { VirtualTimelineManager } from '@/utils/virtual-timeline/VirtualTimeline'

interface VideoSectionProps {
  width?: number
}

const VideoSection: React.FC<VideoSectionProps> = ({ width = 300 }) => {
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const videoPlayerRef = useRef<HTMLVideoElement>(null)

  const [currentScenario, setCurrentScenario] = useState<RendererConfig | null>(
    null
  )
  const [scenarioOverride, setScenarioOverride] =
    useState<RendererConfig | null>(null)

  // Text insertion state
  const [currentTime, setCurrentTime] = useState(0) // 가상 타임라인 시간
  const [realVideoTime, setRealVideoTime] = useState(0) // 실제 영상 시간 (텍스트 삽입용)

  // ChatBot state
  const [isChatBotOpen, setIsChatBotOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isChatBotTyping, setIsChatBotTyping] = useState(false)

  // Virtual Timeline 시스템
  const virtualTimelineManagerRef = useRef<VirtualTimelineManager | null>(null)
  const ecgTimelineMapperRef = useRef<ECGTimelineMapper | null>(null)
  const virtualPlayerControllerRef = useRef<VirtualPlayerController | null>(
    null
  )

  // Store hooks
  const {
    clips,
    timeline,
    initializeTimeline,
    setPlaybackPosition,
    videoUrl,
    videoDuration,
  } = useEditorStore()

  const handleScenarioUpdate = useCallback((scenario: RendererConfig) => {
    setCurrentScenario(scenario)
  }, [])

  const handleScenarioApply = useCallback((newScenario: RendererConfig) => {
    // Update store's scenario for ongoing sync
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = useEditorStore.getState() as any
    store.setScenarioFromJson?.(newScenario)
    // Also push as override for immediate apply
    setScenarioOverride(newScenario)
  }, [])

  // Virtual Timeline 시스템 초기화 (한 번만 실행)
  useEffect(() => {
    // Virtual Timeline Manager 초기화
    if (!virtualTimelineManagerRef.current) {
      virtualTimelineManagerRef.current = new VirtualTimelineManager({
        debugMode: true, // 개발 중에는 디버그 모드 활성화
      })
    }

    // ECG Timeline Mapper 초기화
    if (!ecgTimelineMapperRef.current) {
      ecgTimelineMapperRef.current = new ECGTimelineMapper(
        virtualTimelineManagerRef.current
      )
    }

    // Virtual Player Controller 초기화
    if (!virtualPlayerControllerRef.current) {
      virtualPlayerControllerRef.current = new VirtualPlayerController(
        ecgTimelineMapperRef.current,
        {
          debugMode: true,
          enableFramePrecision: true,
        }
      )

      // Expose globally for ClipSticker access
      ;(window as any).virtualPlayerController =
        virtualPlayerControllerRef.current
      console.log('🌍 [SYNC] VirtualPlayerController exposed globally')
    }

    // 기존 타임라인 초기화 (호환성 유지)
    if (timeline.clips.length === 0 && clips.length > 0) {
      initializeTimeline(clips)
      // DISABLED: playbackEngine conflicts with VirtualPlayerController
      // const timelineClips = timelineEngine.initializeFromClips(clips)
      // playbackEngine.initialize(timelineClips, clips)
    }
  }, [timeline.clips, clips, initializeTimeline]) // Dependencies needed for initialization logic

  // 클립 변경사항을 Virtual Timeline에 반영
  useEffect(() => {
    if (ecgTimelineMapperRef.current && clips.length >= 0) {
      console.log(
        '🔄 [VideoSection] Updating Virtual Timeline with clips:',
        clips.length
      )

      // 클립 생성 시 duration이 0이면 videoDuration 또는 비디오 실제 duration 사용
      const clipsWithDuration = clips.map((clip) => {
        // 모든 단어의 타이밍이 0이거나 duration이 없는 경우
        const hasValidTiming = clip.words.some((word) => word.end > 0)
        if (!hasValidTiming && videoDuration && videoDuration > 0) {
          // 균등하게 시간 분배
          const avgDurationPerClip = (videoDuration || 0) / clips.length
          const clipIndex = clips.indexOf(clip)
          const startTime = clipIndex * avgDurationPerClip

          return {
            ...clip,
            words: clip.words.map((word, idx) => ({
              ...word,
              start: startTime + idx * (avgDurationPerClip / clip.words.length),
              end:
                startTime +
                (idx + 1) * (avgDurationPerClip / clip.words.length),
            })),
          }
        }
        return clip
      })

      // Virtual Timeline 재초기화
      ecgTimelineMapperRef.current.initialize(clipsWithDuration)

      // Virtual Player Controller에 타임라인 변경 알림
      if (virtualPlayerControllerRef.current) {
        const timeline =
          ecgTimelineMapperRef.current.timelineManager.getTimeline()
        console.log('📊 [VideoSection] Timeline segments:', {
          total: timeline.segments.length,
          enabled: timeline.segments.filter((s) => s.isEnabled).length,
          duration: timeline.duration,
          videoDuration: videoDuration || 0,
          usingFallback:
            timeline.duration === 0 && videoDuration && videoDuration > 0,
        })

        // duration이 0이면 비디오의 실제 duration 사용
        if (timeline.duration === 0 && videoDuration && videoDuration > 0) {
          console.log(
            '⚠️ [VideoSection] Timeline duration is 0, using video duration:',
            videoDuration
          )
        }

        // 새로운 handleTimelineUpdate 메서드 사용
        virtualPlayerControllerRef.current.handleTimelineUpdate(timeline)
      }
    }
  }, [clips, videoDuration]) // 클립이나 비디오 duration이 변경될 때마다 실행

  // Global Subtitle Sync Manager for perfect synchronization
  useEffect(() => {
    class SubtitleSyncManager {
      private handleTimeUpdate: (event: Event) => void
      private handlePlaybackStateChange: (event: Event) => void

      constructor() {
        this.handleTimeUpdate = this.onTimeUpdate.bind(this)
        this.handlePlaybackStateChange = this.onPlaybackStateChange.bind(this)

        window.addEventListener('virtualTimeUpdate', this.handleTimeUpdate)
        window.addEventListener(
          'playbackStateChange',
          this.handlePlaybackStateChange
        )

        console.log(
          '🎯 [SubtitleSyncManager] Initialized global subtitle synchronization'
        )
      }

      onTimeUpdate(event: Event) {
        const customEvent = event as CustomEvent
        const { virtualTime, realTime, source } = customEvent.detail

        // Update all subtitle-related components
        if (Date.now() % 1000 < 50) {
          // Log every ~1 second
          console.log('🔄 [SubtitleSync] Time update:', {
            virtual: virtualTime?.toFixed(3),
            real: realTime?.toFixed(3),
            source,
          })
        }

        // Update clip stickers visual state
        const stickers = document.querySelectorAll('[data-sticker-start]')
        stickers.forEach((element) => {
          const start = parseFloat(
            element.getAttribute('data-sticker-start') || '0'
          )
          const end = parseFloat(
            element.getAttribute('data-sticker-end') || '0'
          )

          if (virtualTime >= start && virtualTime < end) {
            element.classList.add('sticker-active')
          } else {
            element.classList.remove('sticker-active')
          }
        })

        // Update subtitle overlays and other time-dependent components
        const subtitleElements = document.querySelectorAll(
          '[data-subtitle-timing]'
        )
        subtitleElements.forEach((element) => {
          const start = parseFloat(element.getAttribute('data-start') || '0')
          const end = parseFloat(element.getAttribute('data-end') || '0')

          if (virtualTime >= start && virtualTime < end) {
            element.classList.add('subtitle-active')
            element.setAttribute('data-current-time', virtualTime.toString())
          } else {
            element.classList.remove('subtitle-active')
          }
        })
      }

      onPlaybackStateChange(event: Event) {
        const customEvent = event as CustomEvent
        const { isPlaying, source } = customEvent.detail

        console.log('▶️ [SubtitleSync] Playback state changed:', {
          isPlaying,
          source,
        })

        // Update UI elements based on playback state
        const playButtons = document.querySelectorAll('[data-play-button]')
        playButtons.forEach((button) => {
          if (isPlaying) {
            button.classList.add('playing')
            button.setAttribute('aria-label', '일시정지')
          } else {
            button.classList.remove('playing')
            button.setAttribute('aria-label', '재생')
          }
        })
      }

      destroy() {
        window.removeEventListener('virtualTimeUpdate', this.handleTimeUpdate)
        window.removeEventListener(
          'playbackStateChange',
          this.handlePlaybackStateChange
        )
        console.log(
          '🧹 [SubtitleSyncManager] Destroyed global subtitle synchronization'
        )
      }
    }

    const syncManager = new SubtitleSyncManager()

    return () => {
      syncManager.destroy()
    }
  }, []) // Run once on mount

  // Gap skip event handling for seamless playback
  useEffect(() => {
    const handleGapSkipped = (event: Event) => {
      const customEvent = event as CustomEvent
      const { fromVirtualTime, toVirtualTime, realTime, segmentId } =
        customEvent.detail

      console.log(
        `⏭️ [GAP SKIP] Virtual time jumped: ${fromVirtualTime.toFixed(3)}s → ${toVirtualTime.toFixed(3)}s`,
        `(Real time: ${realTime.toFixed(3)}s, Segment: ${segmentId})`
      )

      // Update current time state to reflect the skip
      setCurrentTime(toVirtualTime)

      // Optional: Show gap indicator in UI
      // This could be used to display "Edited segment skipped" notification
      // or show visual indicators on timeline
    }

    window.addEventListener('gapSkipped', handleGapSkipped)

    return () => {
      window.removeEventListener('gapSkipped', handleGapSkipped)
    }
  }, [])

  // 비디오 플레이어 레퍼런스 설정
  useEffect(() => {
    if (videoPlayerRef.current) {
      // DISABLED: playbackEngine conflicts with VirtualPlayerController
      // playbackEngine.setVideoPlayer(videoPlayerRef.current)

      // Virtual Player Controller에 비디오 연결
      if (virtualPlayerControllerRef.current) {
        virtualPlayerControllerRef.current.attachVideo(videoPlayerRef.current)

        // Subscribe to seeked events for sync
        const seekedCleanup = virtualPlayerControllerRef.current.onSeeked(
          ({ realTime, virtualTime }) => {
            if (videoPlayerRef.current) {
              const currentVideoTime = videoPlayerRef.current.currentTime
              const delta = Math.abs(currentVideoTime - realTime)

              // Only update if delta is significant (>50ms)
              if (delta > 0.05) {
                videoPlayerRef.current.currentTime = realTime
                console.log(
                  '📹 [SYNC] Video synced after VirtualPlayerController seek:',
                  `virtual=${virtualTime.toFixed(3)}s`,
                  `real=${realTime.toFixed(3)}s`,
                  `delta=${(delta * 1000).toFixed(0)}ms`
                )
              } else {
                console.log(
                  '✅ [SYNC] Video already in sync:',
                  `virtual=${virtualTime.toFixed(3)}s`,
                  `real=${realTime.toFixed(3)}s`,
                  `delta=${(delta * 1000).toFixed(0)}ms`
                )
              }
            }
          }
        )

        return () => {
          seekedCleanup()
        }
      }
    }
  }, [videoUrl])

  // MotionText Renderer 연동을 위한 콜백 설정
  useEffect(() => {
    if (virtualPlayerControllerRef.current) {
      // MotionText Renderer의 seek 함수를 콜백으로 등록
      const motionTextSeekCallback: MotionTextSeekCallback = (
        virtualTime: number
      ) => {
        // EditorMotionTextOverlay의 MotionText Renderer에 Virtual Time 전달
        // 가상 타임라인 시간은 자막 렌더링용으로만 사용
        setCurrentTime(virtualTime)
        // 실제 영상 시간은 별도로 관리하여 텍스트 삽입에서 중복 렌더링 방지
      }

      const cleanup = virtualPlayerControllerRef.current.onMotionTextSeek(
        motionTextSeekCallback
      )

      return cleanup
    }
  }, []) // virtualPlayerControllerRef.current is stable

  // Handle time update from video player - Unified time management
  const handleTimeUpdate = useCallback(
    (time: number) => {
      // 실제 영상 시간 업데이트
      setRealVideoTime(time)

      // Virtual Player Controller가 있을 때
      if (virtualPlayerControllerRef.current) {
        // 가상 시간을 기준으로 모든 컴포넌트 동기화
        const virtualTime = virtualPlayerControllerRef.current.getCurrentTime()
        setCurrentTime(virtualTime) // 자막은 가상 시간 사용

        // 타임라인 위치 업데이트
        setPlaybackPosition(virtualTime)
        // DISABLED: playbackEngine conflicts with VirtualPlayerController
        // playbackEngine.setCurrentTime(virtualTime)

        // 디버그 로그 (주기적)
        if (Date.now() % 1000 < 50) {
          // 대략 1초마다
          console.log('[SYNC] Time Update:', {
            real: time.toFixed(3),
            virtual: virtualTime.toFixed(3),
            delta: (time - virtualTime).toFixed(3),
          })
        }
      } else {
        // Fallback: Virtual Controller가 없을 때
        setCurrentTime(time)
        setPlaybackPosition(time)
        // DISABLED: playbackEngine conflicts with VirtualPlayerController
        // playbackEngine.setCurrentTime(time)
      }
    },
    [setPlaybackPosition]
  )

  // Handle text click for selection
  const handleTextClick = useCallback((textId: string) => {
    console.log('📱 VideoSection handleTextClick:', textId)
    // Text selection is handled by the TextInsertionOverlay component
  }, [])

  // Handle text double-click (disabled)
  const handleTextDoubleClick = useCallback((textId: string) => {
    console.log('📱 VideoSection handleTextDoubleClick:', textId)
    // Double click functionality disabled
  }, [])

  // ChatBot handlers
  const handleChatBotOpen = useCallback(() => {
    setIsChatBotOpen(true)
  }, [])

  const handleChatBotClose = useCallback(() => {
    setIsChatBotOpen(false)
  }, [])

  const handleSendMessage = useCallback((message: string) => {
    try {
      // Add user message
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        content: message,
        sender: 'user',
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, userMessage])

      // Simulate bot typing
      setIsChatBotTyping(true)

      // Simulate bot response (replace with actual AI integration later)
      setTimeout(() => {
        try {
          const botMessage: ChatMessage = {
            id: `bot_${Date.now()}`,
            content:
              '안녕하세요! 현재 UI만 구현된 상태입니다. 실제 AI 응답 기능은 추후 추가될 예정입니다.',
            sender: 'bot',
            timestamp: new Date(),
          }
          setChatMessages((prev) => [...prev, botMessage])
          setIsChatBotTyping(false)
        } catch (error) {
          console.error('Error in bot response:', error)
          setIsChatBotTyping(false)
        }
      }, 1500)
    } catch (error) {
      console.error('Error in handleSendMessage:', error)
      setIsChatBotTyping(false)
    }
  }, [])

  return (
    <div
      className="bg-white flex-shrink-0 h-full flex flex-col border-r border-gray-200"
      style={{ width: `${width}px` }}
    >
      {/* Video Player Container */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Video Player with Subtitles */}
        <div
          ref={videoContainerRef}
          className="bg-black rounded-lg mb-4 relative flex-shrink-0 overflow-hidden"
          style={{ aspectRatio: '16/9' }}
        >
          <VideoPlayer
            ref={videoPlayerRef}
            className="w-full h-full rounded-lg overflow-hidden"
            onTimeUpdate={handleTimeUpdate}
          />
          {/* MotionText overlay (legacy HTML overlay removed) */}
          <EditorMotionTextOverlay
            videoContainerRef={videoContainerRef}
            onScenarioUpdate={handleScenarioUpdate}
            scenarioOverride={scenarioOverride || undefined}
          />

          {/* Text Insertion Overlay - 실제 영상 시간만 사용 */}
          <TextInsertionOverlay
            videoContainerRef={videoContainerRef}
            currentTime={realVideoTime}
            onTextClick={handleTextClick}
            onTextDoubleClick={handleTextDoubleClick}
          />
        </div>

        {/* Virtual Timeline Controller - Hidden */}
        {/* <div className="mb-4">
          <VirtualTimelineController
            virtualPlayerController={virtualPlayerControllerRef.current}
          />
        </div> */}

        {/* Text Edit Input Panel */}
        <TextEditInput />

        {/* Scenario JSON Editor - Show only when DEBUG_UI is enabled */}
        {process.env.NEXT_PUBLIC_DEBUG_UI === 'true' && currentScenario && (
          <ScenarioJsonEditor
            initialScenario={currentScenario}
            onApply={handleScenarioApply}
            className="mt-3"
          />
        )}
      </div>

      {/* ChatBot Floating Button */}
      <div className="absolute bottom-4 right-4 z-30">
        <ChatBotFloatingButton onClick={handleChatBotOpen} />
      </div>

      {/* ChatBot Modal */}
      <ChatBotModal
        isOpen={isChatBotOpen}
        onClose={handleChatBotClose}
        messages={chatMessages}
        isTyping={isChatBotTyping}
        onSendMessage={handleSendMessage}
      />
    </div>
  )
}

// Cleanup on unmount
VideoSection.displayName = 'VideoSection'

export default VideoSection
