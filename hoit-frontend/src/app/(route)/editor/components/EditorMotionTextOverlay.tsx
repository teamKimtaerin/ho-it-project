'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMotionTextRenderer } from '@/app/shared/motiontext'
import { useEditorStore } from '../store'
import {
  type RendererConfigV2,
  type RendererConfig,
} from '@/app/shared/motiontext'
import { buildScenarioFromReal, type RealJson } from '../utils/realToScenario'

interface EditorMotionTextOverlayProps {
  videoContainerRef: React.RefObject<HTMLDivElement | null>
  onScenarioUpdate?: (scenario: RendererConfigV2) => void
  scenarioOverride?: RendererConfigV2
}

/**
 * EditorMotionTextOverlay
 * - Mounts a MotionText renderer over the editor VideoPlayer
 * - Skeleton only: initializes renderer and attaches to the existing <video>
 * - Scenario loading is added in later milestones
 */
export default function EditorMotionTextOverlay({
  videoContainerRef,
  onScenarioUpdate,
  scenarioOverride,
}: EditorMotionTextOverlayProps) {
  const {
    containerRef,
    videoRef,
    renderer,
    initializeRenderer,
    loadScenario,
    seek,
    status,
    error,
  } = useMotionTextRenderer({ autoPlay: false, loop: false })

  // Editor store state
  const {
    clips,
    deletedClipIds,
    showSubtitles,
    subtitleSize,
    subtitlePosition,
    wordAnimationTracks,
    timeline,
    getSequentialClips,
    initializeTimeline: _initializeTimeline,
    currentScenario,
    scenarioVersion,
    buildInitialScenario,
  } = useEditorStore()

  // Internal state
  const isInitRef = useRef(false)
  const manifestRef = useRef<{ key: string } | null>(null)
  const [usingExternalScenario, setUsingExternalScenario] = useState(false)
  const [isLoadingScenario, setIsLoadingScenario] = useState(false)

  // MotionTextController for automatic video-renderer synchronization
  const controllerRef = useRef<{ destroy: () => void } | null>(null)
  const attachedVideoRef = useRef<HTMLVideoElement | null>(null)

  // Obtain the existing video element from the global video controller
  // Add retry mechanism for video element detection
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)

  useEffect(() => {
    const getVideoElement = () => {
      // Try to find video element from the container
      if (videoContainerRef?.current) {
        const video = videoContainerRef.current.querySelector('video')
        if (video) {
          return video
        }
      }

      // Fallback to global video player if available
      const vp = (
        window as unknown as {
          videoPlayer?: {
            getElement?: () => HTMLVideoElement | null
          }
        }
      ).videoPlayer
      return vp?.getElement ? vp.getElement() : null
    }

    // Initial attempt
    let el = getVideoElement()
    if (el) {
      setVideoEl(el)
      return
    }

    // Retry mechanism with polling
    const interval = setInterval(() => {
      el = getVideoElement()
      if (el) {
        setVideoEl(el)
        clearInterval(interval)
      }
    }, 100)

    // Cleanup after 5 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval)
    }, 5000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [videoContainerRef])

  // Observe DOM changes to detect when the <video> element is replaced
  useEffect(() => {
    if (!videoContainerRef?.current) return

    const container = videoContainerRef.current
    const updateVideoEl = () => {
      const latest = container.querySelector('video')
      if (latest && latest !== videoEl) {
        setVideoEl(latest as HTMLVideoElement)
      }
    }

    // Initial sync
    updateVideoEl()

    const observer = new MutationObserver(() => {
      updateVideoEl()
    })
    observer.observe(container, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [videoContainerRef, videoEl])

  useEffect(() => {
    if (!videoRef || !containerRef) return
    if (videoEl) {
      // Attach existing video element to the hook before initialization
      ;(videoRef as React.MutableRefObject<HTMLVideoElement | null>).current =
        videoEl
      if (!isInitRef.current) {
        isInitRef.current = true
        void initializeRenderer()
      }
    }
  }, [initializeRenderer, videoEl, videoRef, containerRef])

  // Ensure renderer stays attached to the current <video> when it changes
  useEffect(() => {
    if (!videoEl || !renderer) return
    try {
      // Some versions expose attachMedia for swapping media element
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(renderer as any)?.attachMedia?.(videoEl)
    } catch {
      // no-op: best-effort reattach
    }
  }, [videoEl, renderer])

  // No manifest preload required for initial, animation-less scenario
  // Scenario building is now handled by Store's buildInitialScenario

  // External scenario (from JSON editor) - Build scenario with animations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const buildScenarioFromAnimatedClips = useMemo(() => {
    // Define variables needed for this scenario generation
    const fontSizeRel =
      subtitleSize === 'small' ? 0.05 : subtitleSize === 'large' ? 0.09 : 0.07
    const centerX = 0.5
    const centerY = subtitlePosition === 'top' ? 0.15 : 0.925
    const pluginName = manifestRef.current?.key || 'cwi-bouncing'
    const params = {} // Default empty params

    const toSec = (s: string) => {
      const parts = s.split(':').map(Number)
      if (parts.length === 3) {
        const [h, m, sec] = parts
        return (h || 0) * 3600 + (m || 0) * 60 + (sec || 0)
      }
      const [m, sec] = parts
      return (m || 0) * 60 + (sec || 0)
    }

    const cues = [] as RendererConfig['cues']

    // Build cues from timeline clips if in sequential mode, otherwise use original clip timing
    if (timeline.isSequentialMode) {
      // Sequential mode: use timeline clips with proper timing
      const timelineClips = getSequentialClips()

      // Safety check: if no timeline clips available, return early with diagnostic info
      if (timelineClips.length === 0) {
      }

      for (const timelineClip of timelineClips) {
        if (deletedClipIds.has(timelineClip.id)) continue

        const adjStart = timelineClip.startTime
        const adjEnd = timelineClip.startTime + timelineClip.duration

        // Ensure valid timing (absEnd must be greater than absStart)
        if (adjEnd <= adjStart) {
          continue
        }

        // Find corresponding original clip to get text
        const originalClip = clips.find(
          (c) => c.id === timelineClip.sourceClipId
        )
        if (!originalClip) continue

        const text = originalClip.subtitle || originalClip.fullText || ''
        if (!text.trim()) continue

        // Process valid timeline clip
        cues.push({
          id: `cue-${timelineClip.id}`,
          track: 'editor',
          hintTime: { start: adjStart, end: adjEnd },
          root: {
            e_type: 'group',
            layout: {
              anchor: 'bc',
              position: { x: centerX, y: centerY },
              safeAreaClamp: true,
            },
            children: [
              {
                e_type: 'text',
                text,
                absStart: adjStart,
                absEnd: adjEnd,
                layout: {
                  anchor: 'bc',
                },
                pluginChain: [
                  {
                    name: pluginName, // Use the validated pluginName instead of potentially null manifestRef
                    params: params,
                  },
                ],
                textProps: {
                  fontSize: Math.round(360 * fontSizeRel), // 360 = stage height
                  fill: 'white',
                  fontFamily: 'sans-serif',
                  fontWeight: 'bold',
                  strokeColor: 'black',
                  strokeWidth: 2,
                  textAlign: 'center',
                  maxWidth: Math.round(640 * 0.88), // 88% of stage width
                },
              },
            ],
          },
        })
      }
    } else {
      // Regular mode: use original clip timing logic
      for (const clip of clips) {
        if (deletedClipIds.has(clip.id)) continue

        const [startStr, endStr] = (clip.timeline || '').split(' → ')
        const s0 = toSec(startStr || '0:00')
        const s1 = toSec(endStr || '0:00')
        const adjStart = s0 // Direct time mapping since videoSegmentManager is not available
        const adjEnd = s1
        if (isNaN(adjStart) || isNaN(adjEnd)) continue

        // Ensure valid timing (absEnd must be greater than absStart)
        if (adjEnd <= adjStart) {
          continue
        }

        const text = clip.subtitle || clip.fullText || ''
        if (!text.trim()) continue

        // Process valid clip
        cues.push({
          id: `cue-${clip.id}`,
          track: 'editor',
          hintTime: { start: adjStart, end: adjEnd },
          root: {
            e_type: 'group',
            layout: {
              anchor: 'bc',
              position: { x: centerX, y: centerY },
              safeAreaClamp: true,
            },
            children: [
              {
                e_type: 'text',
                text,
                absStart: adjStart,
                absEnd: adjEnd,
                layout: {
                  anchor: 'bc',
                },
                pluginChain: [
                  {
                    name: pluginName, // Use the validated pluginName instead of potentially null manifestRef
                    params: params,
                  },
                ],
                textProps: {
                  fontSize: Math.round(360 * fontSizeRel), // 360 = stage height
                  fill: 'white',
                  fontFamily: 'sans-serif',
                  fontWeight: 'bold',
                  strokeColor: 'black',
                  strokeWidth: 2,
                  textAlign: 'center',
                  maxWidth: Math.round(640 * 0.88), // 88% of stage width
                },
              },
            ],
          },
        })
      }
    }

    const config: RendererConfig = {
      version: '1.3',
      timebase: { unit: 'seconds' },
      stage: { baseAspect: '16:9' },
      tracks: [
        {
          id: 'editor',
          type: 'subtitle',
          layer: 1,
          defaultStyle: {
            fontSizeRel,
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
          },
        },
      ],
      cues,
    }

    // Safety check: ensure all cues have valid plugin chains
    const validCues = cues.filter((cue, index) => {
      const children = cue.root?.children as
        | Array<Record<string, unknown>>
        | undefined
      const pluginChain = children?.[0]?.pluginChain as
        | Array<Record<string, unknown>>
        | undefined
      const firstPlugin = pluginChain?.[0] as Record<string, unknown>

      // Enhanced validation
      if (!firstPlugin) {
        return false
      }

      if (
        !firstPlugin.name ||
        (typeof firstPlugin.name === 'string' && firstPlugin.name.trim() === '')
      ) {
        return false
      }

      // Validate timing
      if (!cue.hintTime || !cue.hintTime.start || !cue.hintTime.end) {
        return false
      }

      return true
    })

    if (validCues.length === 0) {
      return {
        ...config,
        cues: [],
      }
    }

    return {
      ...config,
      cues: validCues,
    }
  }, [
    subtitlePosition,
    subtitleSize,
    clips,
    deletedClipIds,
    timeline,
    getSequentialClips,
  ])

  // Option A: Load external scenario.json when requested (disabled for sequential timeline)
  useEffect(() => {
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    )
    const useScenario =
      params.get('scenario') === '1' ||
      process.env.NEXT_PUBLIC_EDITOR_USE_SCENARIO === '1' ||
      process.env.NEXT_PUBLIC_EDITOR_USE_SCENARIO === 'true'

    // Disable external scenario loading when using sequential timeline
    if (!useScenario || timeline.isSequentialMode) return

    let cancelled = false
    const path =
      process.env.NEXT_PUBLIC_EDITOR_SCENARIO_PATH || '/scenario.json'

    const load = async () => {
      try {
        const res = await fetch(path)
        if (!res.ok) return
        const json = (await res.json()) as RendererConfigV2
        if (cancelled) return
        setUsingExternalScenario(true)
        await loadScenario(json)
        // Send scenario to parent for JSON editor
        if (onScenarioUpdate) {
          onScenarioUpdate(json)
        }
        // Controller will handle synchronization automatically
      } catch {
        // Ignore scenario loading errors
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [loadScenario, onScenarioUpdate, timeline.isSequentialMode]) // Added timeline dependency for sequential mode check

  // Handle scenario override from JSON editor
  // Do not gate on `renderer` being truthy — loader will initialize as needed
  useEffect(() => {
    if (scenarioOverride) {
      void loadScenario(scenarioOverride)
    }
  }, [scenarioOverride, loadScenario])

  // Option B: Convert real.json to scenario on the fly when requested
  useEffect(() => {
    if (usingExternalScenario || isLoadingScenario || scenarioOverride) return
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    )
    const useReal = params.get('scenario') === 'real'

    if (!useReal) return

    // Wait for video element to be available
    if (!videoEl) {
      return
    }

    setIsLoadingScenario(true)

    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/real.json')
        if (!res.ok) {
          throw new Error(
            `Failed to fetch real.json: ${res.status} ${res.statusText}`
          )
        }
        const real = (await res.json()) as RealJson
        if (cancelled) return

        const cfg = buildScenarioFromReal(real)

        await loadScenario(cfg)

        // Send scenario to parent for JSON editor
        if (onScenarioUpdate) {
          onScenarioUpdate(cfg)
        }

        // Controller will handle synchronization automatically
        setUsingExternalScenario(true)
      } catch {
        // Ignore real.json loading errors
      } finally {
        setIsLoadingScenario(false)
      }
    }
    void load()
    return () => {
      cancelled = true
      setIsLoadingScenario(false)
    }
  }, [
    usingExternalScenario,
    isLoadingScenario,
    scenarioOverride,
    videoEl,
    loadScenario,
    seek,
    onScenarioUpdate,
  ])

  // Load initial scenario only when Store doesn't have one
  // All scenario updates are handled by Store subscription below
  useEffect(() => {
    if (usingExternalScenario || isLoadingScenario || scenarioOverride) return
    if (!showSubtitles) return

    // Skip if Store already has a scenario (let Store subscription handle updates)
    if (currentScenario && scenarioVersion > 0) return

    // Need clips to build scenario
    const activeClips = clips.filter((c) => !deletedClipIds.has(c.id))
    if (activeClips.length === 0) return

    // Build scenario using Store's buildInitialScenario to ensure consistency
    const config = buildInitialScenario(activeClips, {
      position: { x: 0.5, y: subtitlePosition === 'top' ? 0.15 : 0.925 },
      anchor: 'bc',
      fontSizeRel:
        subtitleSize === 'small'
          ? 0.035
          : subtitleSize === 'large'
            ? 0.07
            : 0.05,
      baseAspect: '16:9',
    })

    // Send current scenario to parent for JSON editor
    if (onScenarioUpdate) {
      onScenarioUpdate(config)
    }

    // Load scenario with plugins
    const t = setTimeout(() => {
      void loadScenario(config).catch(() => {})
    }, 120)
    return () => clearTimeout(t)
  }, [
    buildInitialScenario,
    showSubtitles,
    loadScenario,
    usingExternalScenario,
    isLoadingScenario,
    onScenarioUpdate,
    scenarioOverride,
    clips,
    deletedClipIds,
    subtitlePosition,
    subtitleSize,
    currentScenario,
    scenarioVersion,
  ])

  // Store scenario is managed centrally - no additional updates needed here

  // When scenario slice version changes, reload scenario (debounced)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let prevVersion: number | undefined

    const unsub = useEditorStore.subscribe((state) => {
      const version = (state as any).scenarioVersion as number // eslint-disable-line @typescript-eslint/no-explicit-any
      if (version === prevVersion) return
      prevVersion = version

      if (!version) return
      const cfg = (useEditorStore.getState() as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .currentScenario as RendererConfigV2 | null
      if (!cfg) return

      // Send scenario to parent for JSON editor
      if (onScenarioUpdate) {
        onScenarioUpdate(cfg)
      }

      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        void loadScenario(cfg, { silent: true }).catch(() => {})
      }, 100)
    })
    return () => {
      if (timer) clearTimeout(timer)
      try {
        unsub()
      } catch {}
    }
  }, [loadScenario, onScenarioUpdate])

  // Initialize MotionTextController when renderer and video are ready
  useEffect(() => {
    if (!videoEl || !renderer || !containerRef?.current) return

    let cancelled = false

    const mountOrRemount = async () => {
      try {
        const { MotionTextController } = await import('motiontext-renderer')
        if (cancelled) return

        // If controller exists but video element changed, remount
        const needsRemount =
          !!controllerRef.current && attachedVideoRef.current !== videoEl

        if (needsRemount && controllerRef.current) {
          try {
            controllerRef.current.destroy()
          } catch {}
          controllerRef.current = null
        }

        if (!controllerRef.current) {
          const controller = new MotionTextController(
            videoEl,
            renderer,
            videoContainerRef.current ||
              containerRef.current!.parentElement ||
              containerRef.current!,
            { captionsVisible: true }
          )
          controller.mount()
          controllerRef.current = controller
          attachedVideoRef.current = videoEl
        }
      } catch {
        // Ignore controller initialization errors
      }
    }

    void mountOrRemount()

    return () => {
      cancelled = true
    }
  }, [videoEl, renderer, containerRef, videoContainerRef])

  if (!showSubtitles) {
    return null
  }

  return (
    <div className="absolute inset-0" aria-label="motiontext-overlay">
      <div ref={containerRef} className="w-full h-full" />
      {/* Lightweight debug status (non-interactive) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-1 right-2 text-[10px] text-white/70 bg-black/50 px-1 rounded">
          {status}
          {error ? ` · ${error}` : ''}
          {usingExternalScenario && ' · EXT'}
          {isLoadingScenario && ' · LOADING'}
          {!videoEl && ' · NO_VIDEO'}
        </div>
      )}
    </div>
  )
}
