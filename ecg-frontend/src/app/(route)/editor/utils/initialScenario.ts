import type { ClipItem } from '@/app/(route)/editor/types'
import type { InsertedText } from '@/app/(route)/editor/types/textInsertion'
import type { RendererConfigV2 } from '@/app/shared/motiontext'
import { videoSegmentManager } from '@/utils/video/segmentManager'

export interface InitialScenarioOptions {
  position?: { x: number; y: number }
  anchor?: string
  fontSizeRel?: number
  baseAspect?: '16:9' | '9:16' | 'auto'
  wordAnimationTracks?: Map<string, any[]> // eslint-disable-line @typescript-eslint/no-explicit-any
  insertedTexts?: InsertedText[] // Add support for inserted texts
  speakerColors?: Record<string, string> // Speaker color palette for cwi-color plugin
}

export interface NodeIndexEntry {
  cueIndex: number
  // path from cues[cueIndex].root to the node; children indexes
  path: number[]
}

export interface InitialScenarioResult {
  config: RendererConfigV2
  index: Record<string, NodeIndexEntry>
}

// Memoization cache for scenario generation
const scenarioCache = new Map<string, InitialScenarioResult>()

// Generate cache key for scenario memoization
function generateScenarioKey(
  clips: ClipItem[],
  opts: InitialScenarioOptions
): string {
  const clipsHash = JSON.stringify(
    clips.map((clip) => ({
      id: clip.id,
      words: clip.words.map((w) => ({
        id: w.id,
        text: w.text,
        start: w.start,
        end: w.end,
      })),
    }))
  )

  const insertedTextsHash = JSON.stringify(
    (opts.insertedTexts || []).map((text) => ({
      id: text.id,
      content: text.content,
      startTime: text.startTime,
      endTime: text.endTime,
      animation: text.animation,
    }))
  )

  const optsHash = JSON.stringify({
    position: opts.position,
    anchor: opts.anchor,
    fontSizeRel: opts.fontSizeRel,
    baseAspect: opts.baseAspect,
  })

  return `${clipsHash}|${insertedTextsHash}|${optsHash}`
}

function toAdjustedOrOriginalTime(sec: number): number {
  const mapped = videoSegmentManager.mapToAdjustedTime(sec)
  return mapped == null || Number.isNaN(mapped) ? sec : mapped
}

/**
 * Calculate adjusted domLifetime based on word baseTime and animation timeOffsets
 */
function calculateAdjustedDomLifetime(
  clip: ClipItem,
  wordAnimationTracks?: Map<string, any[]>, // eslint-disable-line @typescript-eslint/no-explicit-any
  insertedTexts?: InsertedText[]
): [number, number] {
  const words = Array.isArray(clip.words) ? clip.words : []

  if (words.length === 0) return [0, 0]

  // Start with word-based timing (clips are for subtitles only)
  let domStart = Math.min(...words.map((w) => w.start))
  let domEnd = Math.max(...words.map((w) => w.end))

  // Adjust for word animations if present
  if (wordAnimationTracks) {
    for (const word of words) {
      const tracks = wordAnimationTracks.get(word.id) || []

      for (const track of tracks) {
        if (track.timing) {
          // Use timing field which has converted absolute values (not percentage strings)
          domStart = Math.min(domStart, track.timing.start)
          domEnd = Math.max(domEnd, track.timing.end)
        }
      }
    }
  }

  // Include insertedTexts timing that overlap with this clip timeframe
  if (insertedTexts && insertedTexts.length > 0) {
    const clipStart = Math.min(...words.map((w) => w.start))
    const clipEnd = Math.max(...words.map((w) => w.end))

    const overlappingTexts = insertedTexts.filter(
      (text) => text.startTime < clipEnd && text.endTime > clipStart
    )

    for (const text of overlappingTexts) {
      domStart = Math.min(domStart, text.startTime)
      domEnd = Math.max(domEnd, text.endTime)
    }
  }

  // Apply segment time mapping
  const adjDomStart = toAdjustedOrOriginalTime(domStart)
  const adjDomEnd = toAdjustedOrOriginalTime(domEnd)

  return [adjDomStart, adjDomEnd]
}

export function buildInitialScenarioFromClips(
  clips: ClipItem[],
  opts: InitialScenarioOptions = {}
): InitialScenarioResult {
  // Check cache first
  const cacheKey = generateScenarioKey(clips, opts)
  const cached = scenarioCache.get(cacheKey)
  if (cached) {
    console.log(
      '📦 Using cached scenario for key:',
      cacheKey.substring(0, 50) + '...'
    )
    return cached
  }

  console.log(
    '🔨 Building new scenario for key:',
    cacheKey.substring(0, 50) + '...'
  )
  const position = opts.position ?? { x: 0.5, y: 0.925 } // 7.5% from bottom
  const anchor = opts.anchor ?? 'bc'
  const wordAnimationTracks = opts.wordAnimationTracks
  const insertedTexts = opts.insertedTexts ?? []
  const fontSizeRel = opts.fontSizeRel ?? 0.05 // Default font size
  const baseAspect = opts.baseAspect ?? '16:9'
  const speakerColors = opts.speakerColors ?? {}

  const cues: RendererConfigV2['cues'] = []
  const index: Record<string, NodeIndexEntry> = {}

  // Process clips for subtitle track (words only)
  clips.forEach((clip) => {
    // Compute clip start/end from words for robustness
    const words = Array.isArray(clip.words) ? clip.words : []
    if (words.length === 0) return

    const clipStart = Math.min(...words.map((w) => w.start))
    const clipEnd = Math.max(...words.map((w) => w.end))
    const adjClipStart = toAdjustedOrOriginalTime(clipStart)
    const adjClipEnd = toAdjustedOrOriginalTime(clipEnd)
    if (!Number.isFinite(adjClipStart) || !Number.isFinite(adjClipEnd)) return
    if (adjClipEnd <= adjClipStart) return

    const children: NonNullable<
      RendererConfigV2['cues'][number]['root']['children']
    > = []

    // Build word nodes (visible by default, ready for animations)
    words.forEach((w) => {
      const s = toAdjustedOrOriginalTime(w.start)
      const e = toAdjustedOrOriginalTime(w.end)
      if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return

      // Use word.id directly if it already has the word- prefix, otherwise add it
      const nodeId = w.id.startsWith('word-') ? w.id : `word-${w.id}`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const child: any = {
        id: nodeId,
        eType: 'text' as const,
        text: w.text,
        // Store utterance window at node-level baseTime per v2 spec
        baseTime: [s, e] as [number, number],
        // Remove layout and style from individual words - they inherit from parent
      }

      // Add plugin information from animation tracks
      const animationTracks = wordAnimationTracks?.get(w.id)
      if (animationTracks && animationTracks.length > 0) {
        child.pluginChain = animationTracks
          .filter((track) => track.pluginKey) // Only include tracks with valid pluginKey
          .map((track) => {
            // Calculate timeOffset if timing is provided
            let timeOffset: [number, number] | undefined
            if (track.timing) {
              const startOffset = track.timing.start - s // timing.start - baseTime start
              const endOffset = track.timing.end - e // timing.end - baseTime end
              timeOffset = [startOffset, endOffset]
            }

            // For cwi-color plugin, update palette reference to use define.speakerPalette
            const params = { ...track.params }
            if (
              track.pluginKey === 'cwi-color@2.0.0' &&
              params.palette === 'definitions.speakerPalette'
            ) {
              params.palette = 'define.speakerPalette'
            }

            return {
              name: track.pluginKey,
              params,
              ...(timeOffset && { timeOffset }),
            }
          })
      }
      // record index path; children will push later so we know path length
      const childIdx = children.length
      index[nodeId] = { cueIndex: cues.length, path: [childIdx] }
      children.push(child)
    })

    if (children.length === 0) return

    const cueId = `cue-${clip.id}`
    const groupId = `clip-${clip.id}`

    // Calculate adjusted domLifetime based on animation timeOffsets and insertedTexts
    const [adjDomStart, adjDomEnd] = calculateAdjustedDomLifetime(
      clip,
      wordAnimationTracks,
      insertedTexts
    )

    // displayTime은 이 클립의 첫 단어 시작과 마지막 단어 끝 시간
    const firstWordStart = children[0]?.baseTime?.[0] ?? adjClipStart
    const lastWordEnd =
      children[children.length - 1]?.baseTime?.[1] ?? adjClipEnd

    const cue = {
      id: cueId,
      track: 'caption',
      domLifetime: [adjDomStart, adjDomEnd] as [number, number],
      root: {
        id: groupId,
        eType: 'group' as const,
        displayTime: [firstWordStart, lastWordEnd] as [number, number],
        layout: {
          anchor: 'define.caption.layout.anchor',
          position: 'define.caption.position',
          safeAreaClamp: 'define.caption.layout.safeAreaClamp',
          childrenLayout: 'define.caption.childrenLayout', // Reference to define
        },
        // Remove style - will inherit from track defaultStyle
        children,
      },
    }
    cues.push(cue)
  })

  // Process insertedTexts for overlay track (separate from subtitles)
  insertedTexts.forEach((insertedText) => {
    const s = toAdjustedOrOriginalTime(insertedText.startTime)
    const e = toAdjustedOrOriginalTime(insertedText.endTime)
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return

    const nodeId = `insertedtext-${insertedText.id}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const child: any = {
      id: nodeId,
      eType: 'text' as const,
      text: insertedText.content,
      baseTime: [s, e] as [number, number],
      // Apply insertedText positioning and styling
      layout: {
        anchor: 'tl', // Top-left anchor for absolute positioning
        position: {
          x: insertedText.position.x / 100, // Convert percentage to decimal
          y: insertedText.position.y / 100,
        },
      },
      style: {
        fontSizeRel: (insertedText.style.fontSize || 24) / 100, // Convert to relative size
        fontFamily: insertedText.style.fontFamily || 'Arial, sans-serif',
        color: insertedText.style.color || '#ffffff',
        fontWeight: insertedText.style.fontWeight || 'normal',
        fontStyle: insertedText.style.fontStyle || 'normal',
      },
    }

    // Add animation plugin information from insertedText
    if (insertedText.animation && insertedText.animation.plugin) {
      child.pluginChain = [
        {
          name: insertedText.animation.plugin,
          params: insertedText.animation.parameters || {},
        },
      ]
    }

    // Create separate cue for each insertedText (overlay track)
    const cueId = `cue-insertedtext-${insertedText.id}`
    const cue = {
      id: cueId,
      track: 'overlay',
      domLifetime: [s, e] as [number, number],
      root: {
        id: nodeId,
        eType: 'group' as const,
        displayTime: [s, e] as [number, number],
        children: [child],
      },
    }

    // Record index path for insertedText
    index[nodeId] = { cueIndex: cues.length, path: [0] }
    cues.push(cue)
  })

  const config: RendererConfigV2 = {
    version: '2.0',
    pluginApiVersion: '3.0',
    timebase: { unit: 'seconds' },
    stage: { baseAspect },
    define: {
      caption: {
        position: position, // Use the calculated position (default: { x: 0.5, y: 0.925 })
        layout: {
          anchor: anchor,
          safeAreaClamp: true,
        },
        childrenLayout: {
          mode: 'flow',
          direction: 'horizontal',
          wrap: true, // 강제 줄바꿈 방지 - 자동 줄바꿈 로직이 미리 처리
          maxWidth: '90%',
          gap: 0.005, // Small gap between words
          align: 'center',
          justify: 'center',
        },
      },
      // Speaker color palette for cwi-color plugin
      speakerPalette:
        Object.keys(speakerColors).length > 0 ? speakerColors : undefined,
    },
    tracks: [
      {
        id: 'caption',
        type: 'subtitle',
        layer: 1,
        defaultStyle: {
          fontSizeRel: fontSizeRel,
          fontFamily: 'Arial, sans-serif',
          color: '#ffffff',
          align: 'center',
        },
        defaultBoxStyle: {
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          padding: '4px 8px',
          borderRadius: '4px',
          opacity: 1,
        },
        defaultConstraints: {
          safeArea: {
            top: 0.025,
            bottom: 0.075,
            left: 0.05,
            right: 0.05,
          },
        },
      },
      {
        id: 'overlay',
        type: 'free',
        layer: 2, // Higher layer than subtitles
        defaultStyle: {
          fontSizeRel: 0.06,
          fontFamily: 'Arial, sans-serif',
          color: '#ffffff',
        },
        // No defaultBoxStyle for overlay texts - they're positioned individually
      },
    ],
    cues,
  }

  const result = { config, index }

  // Cache the result
  scenarioCache.set(cacheKey, result)

  // Limit cache size to prevent memory leaks
  if (scenarioCache.size > 50) {
    const firstKey = scenarioCache.keys().next().value
    if (firstKey) {
      scenarioCache.delete(firstKey)
      console.log('🧹 Cache cleaned up, removed oldest entry')
    }
  }

  return result
}
