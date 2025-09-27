/**
 * Motion Text Renderer 통합 훅 (shared)
 * - 렌더러 인스턴스 관리, 시나리오 로딩, seek 동기화 등
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import type { MotionTextRenderer as MTRuntime } from 'motiontext-renderer'
import type {
  RendererConfig,
  RendererConfigV2,
} from '../utils/scenarioGenerator'
import {
  preloadPluginsForScenario,
  configurePluginLoader,
} from '../utils/pluginLoader'

interface MotionTextRendererHookOptions {
  autoPlay?: boolean
  loop?: boolean
  onError?: (error: Error) => void
  onStatusChange?: (status: string) => void
}

interface MotionTextRendererState {
  isLoading: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  error: string | null
  status: string
}

export function useMotionTextRenderer(
  options: MotionTextRendererHookOptions = {}
) {
  const { autoPlay = true, loop = true, onError, onStatusChange } = options

  // Refs
  const rendererRef = useRef<MTRuntime | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentConfigRef = useRef<RendererConfig | RendererConfigV2 | null>(
    null
  )
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  // Stable refs for options to avoid dependency issues
  const autoPlayRef = useRef(autoPlay)
  const loopRef = useRef(loop)
  const isPlayingRef = useRef(false)
  const onStatusChangeRef = useRef(onStatusChange)
  const onErrorRef = useRef(onError)

  // State
  const [state, setState] = useState<MotionTextRendererState>({
    isLoading: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    error: null,
    status: 'idle',
  })

  // Update refs when options change
  useEffect(() => {
    autoPlayRef.current = autoPlay
    loopRef.current = loop
    onStatusChangeRef.current = onStatusChange
    onErrorRef.current = onError
  }, [autoPlay, loop, onStatusChange, onError])

  // Update isPlayingRef when state changes
  useEffect(() => {
    isPlayingRef.current = state.isPlaying
  }, [state.isPlaying])

  const updateState = useCallback(
    (updates: Partial<MotionTextRendererState>) => {
      setState((prev) => {
        const newState = { ...prev, ...updates }
        return newState
      })
      // Call onStatusChange after state update using ref to avoid dependency issues
      if (updates.status && onStatusChangeRef.current) {
        onStatusChangeRef.current(updates.status)
      }
    },
    []
  )

  const handleError = useCallback(
    (error: Error) => {
      console.error('MotionTextRenderer Error:', error)
      updateState({ error: error.message, isLoading: false, status: 'error' })
      if (onErrorRef.current) onErrorRef.current(error)
    },
    [updateState]
  )

  const initializeRenderer = useCallback(async () => {
    if (!containerRef.current) return
    try {
      updateState({ isLoading: true, status: 'initializing' })
      const gsap = await import('gsap')
      if (typeof window !== 'undefined' && gsap) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).gsap = (gsap as any).default || gsap
      }
      configurePluginLoader()
      const { MotionTextRenderer } = await import('motiontext-renderer')
      rendererRef.current = new MotionTextRenderer(containerRef.current)
      if (videoRef.current) {
        rendererRef.current.attachMedia(videoRef.current)
      }
      updateState({ isLoading: false, status: 'ready', error: null })
    } catch (error) {
      handleError(error as Error)
    }
  }, [updateState, handleError])

  const loadScenario = useCallback(
    async (
      config: RendererConfig | RendererConfigV2,
      opts?: { silent?: boolean }
    ) => {
      if (!rendererRef.current) await initializeRenderer()
      if (!rendererRef.current) throw new Error('Failed to initialize renderer')
      try {
        if (!opts?.silent) {
          updateState({
            isLoading: true,
            status: 'loading scenario',
            error: null,
          })
        }
        // Clean up existing timeout
        if (loopTimeoutRef.current) {
          clearTimeout(loopTimeoutRef.current)
          loopTimeoutRef.current = null
        }

        // Validate config structure
        if (!config || typeof config !== 'object') {
          throw new Error('Invalid config: config must be an object')
        }

        // Preload plugins with error handling
        try {
          await preloadPluginsForScenario(config)
        } catch (pluginError) {
          // Continue execution - plugin errors shouldn't be fatal
        }

        // Load config with renderer validation
        if (!rendererRef.current) {
          throw new Error('Renderer is not available')
        }

        // 새 시나리오 로드 - loadConfigAsync 우선 사용 (내부에서 clearAsync 포함)
        if (typeof rendererRef.current.loadConfigAsync === 'function') {
          // v1.5.0: 내부에서 clearAsync() 후 로드 (한 번에 처리)
          await rendererRef.current.loadConfigAsync(
            config as unknown as Record<string, unknown>
          )
        } else if (typeof rendererRef.current.loadConfig === 'function') {
          // 하위 호환성 유지 (이전 버전)
          await rendererRef.current.loadConfig(
            config as unknown as Record<string, unknown>
          )
        } else {
          throw new Error('Renderer loadConfig method is not available')
        }
        currentConfigRef.current = config
        if (autoPlayRef.current) {
          try {
            void play()
          } catch {}
        }
        const duration = getScenarioDuration(config)
        updateState({ isLoading: false, status: 'loaded', duration })
      } catch (error) {
        handleError(error as Error)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initializeRenderer, updateState, handleError]
  )

  const play = useCallback(async () => {
    if (!rendererRef.current) return
    try {
      rendererRef.current.play()
      startTimeRef.current = performance.now()
      const duration = getScenarioDuration(currentConfigRef.current) || 3
      isPlayingRef.current = true
      updateState({ isPlaying: true, status: 'playing', currentTime: 0 })
      const updateFrame = () => {
        if (!isPlayingRef.current || !rendererRef.current) return
        const elapsed = (performance.now() - startTimeRef.current) / 1000
        const loopedTime = elapsed % Number(duration || 3)
        try {
          rendererRef.current.seek(loopedTime)
          updateState({ currentTime: loopedTime })
        } catch (seekError) {
          console.warn('[useMotionTextRenderer] Seek error:', seekError)
        }
        animationFrameRef.current = requestAnimationFrame(updateFrame)
      }
      animationFrameRef.current = requestAnimationFrame(updateFrame)
    } catch (error) {
      console.error('[useMotionTextRenderer] Play error:', error)
      handleError(error as Error)
    }
  }, [updateState, handleError])

  const pause = useCallback(() => {
    if (!rendererRef.current) return
    try {
      rendererRef.current.pause()
      isPlayingRef.current = false
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      updateState({ isPlaying: false, status: 'paused' })
    } catch (error) {
      handleError(error as Error)
    }
  }, [updateState, handleError])

  const restart = useCallback(() => {
    if (!rendererRef.current || !isPlayingRef.current) return
    try {
      startTimeRef.current = performance.now()
      rendererRef.current.seek(0)
      updateState({ currentTime: 0 })
    } catch (error) {
      handleError(error as Error)
    }
  }, [updateState, handleError])

  const seek = useCallback((timeSec: number) => {
    if (!rendererRef.current) return
    try {
      rendererRef.current.seek(Math.max(0, Number(timeSec) || 0))
    } catch (error) {
      console.warn('[useMotionTextRenderer] Seek error:', error)
    }
  }, [])

  const dispose = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.dispose()
      rendererRef.current = null
    }
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    currentConfigRef.current = null
    updateState({ isPlaying: false, status: 'disposed' })
  }, [updateState])

  useEffect(() => () => dispose(), [dispose])

  return {
    containerRef,
    videoRef,
    renderer: rendererRef.current,
    ...state,
    initializeRenderer,
    loadScenario,
    play,
    pause,
    restart,
    seek,
    dispose,
  }
}

// Helpers
function getScenarioDuration(cfg: unknown): number {
  if (!cfg || typeof cfg !== 'object') return 3
  const anyCfg = cfg as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const cues = Array.isArray(anyCfg.cues) ? anyCfg.cues : []
  const cue0 = cues[0]
  if (anyCfg.version === '2.0') {
    if (cue0?.domLifetime && Array.isArray(cue0.domLifetime)) {
      const [s, e] = cue0.domLifetime
      const d = Number(e || 0) - Number(s || 0)
      return Number.isFinite(d) && d > 0 ? d : 3
    }
    const dt = cue0?.root?.displayTime
    if (Array.isArray(dt)) {
      const d = Number(dt[1] || 0) - Number(dt[0] || 0)
      return Number.isFinite(d) && d > 0 ? d : 3
    }
    return 3
  }
  // v1.3 fallback
  const root = cue0?.root
  const end = Number(root?.absEnd)
  const start = Number(root?.absStart || 0)
  if (Number.isFinite(end)) {
    const d = end - start
    return Number.isFinite(d) && d > 0 ? d : 3
  }
  const ht = cue0?.hintTime
  if (ht && ht.start != null && ht.end != null) {
    const d = Number(ht.end) - Number(ht.start)
    return Number.isFinite(d) && d > 0 ? d : 3
  }
  return 3
}
