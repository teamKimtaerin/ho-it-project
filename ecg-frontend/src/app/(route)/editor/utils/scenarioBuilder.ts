import { RendererScenario } from '@/services/api/types/render.types'
import { Word } from '@/app/(route)/editor/types'

// 확장된 ClipItem 타입 (실제 사용되는 속성 포함)
interface ExtendedClipItem {
  id: string
  text?: string
  subtitle?: string
  fullText?: string
  startTime?: number
  endTime?: number
  timeline?: string
  duration?: string
  speaker?: string
  isDeleted?: boolean
  words?: Word[]
  style?: {
    bold?: boolean
    italic?: boolean
    underline?: boolean
  }
  animation?: {
    name: string
    params?: Record<string, unknown>
  }
}

/**
 * 클립 배열을 GPU 렌더링용 시나리오로 변환
 */
export function buildScenarioFromClips(
  clips: ExtendedClipItem[],
  options?: {
    fontSizeRel?: number
    bottomMargin?: number
    pluginName?: string
    fontFamily?: string
  }
): RendererScenario {
  const stageW = 640
  const stageH = 360
  const marginY = options?.bottomMargin ?? 32
  const boxW = Math.round(stageW * 0.88)
  const boxH = 64
  const centerX = Math.round(stageW / 2)
  const centerY = Math.max(0, Math.min(stageH, stageH - marginY - boxH / 2))
  const fontSizeRel = options?.fontSizeRel ?? 0.05
  const pluginName = options?.pluginName ?? ''
  const fontFamily = options?.fontFamily ?? 'Arial, sans-serif'

  // 유효한 클립만 필터링 (삭제되지 않고, 텍스트가 있는 클립)
  const validClips = clips.filter((clip) => {
    const text = clip.text || clip.subtitle || clip.fullText || ''

    // 클립이 삭제되었거나 텍스트가 없으면 제외
    if (clip.isDeleted || !text || text.trim().length === 0) {
      return false
    }

    // words 배열이 없거나 비어있으면 제외 (단, 텍스트는 있어야 함)
    if (!clip.words || clip.words.length === 0) {
      return false
    }

    return true
  })

  // 각 클립을 큐로 변환
  const cues = validClips.map((clip, index) => {
    // words 배열에서 시작/종료 시간 추출
    let startTime = clip.words?.[0]?.start ?? 0
    let endTime = clip.words?.[clip.words.length - 1]?.end ?? 0

    // 타이밍 데이터 검증 및 정규화
    if (!isFinite(startTime) || startTime < 0) startTime = 0
    if (!isFinite(endTime) || endTime < 0) endTime = 0

    // endTime이 startTime보다 작거나 같으면 최소 지속 시간 보장
    if (endTime <= startTime) {
      endTime = startTime + 0.001 // 최소 0.001초 차이 (MotionText 검증 통과용)
    }

    const text = (clip.text || clip.subtitle || clip.fullText || '').trim()

    // 화자별 색상 결정 (옵션)
    const speakerColor = getSpeakerColor(clip.speaker)

    return {
      id: `cue-${clip.id || index}`,
      track: 'editor',
      hintTime: {
        start: startTime,
        end: endTime,
      },
      root: {
        e_type: 'group',
        layout: {
          position: {
            x: centerX / stageW,
            y: centerY / stageH,
          },
          anchor: 'cc',
          size: {
            width: boxW / stageW,
            height: boxH / stageH,
          },
        },
        children: [
          {
            e_type: 'text',
            text,
            absStart: Math.max(0, startTime),
            absEnd: Math.max(startTime + 0.001, endTime), // 최소 0.001초 차이 보장
            layout: {
              position: { x: 0.5, y: 0.5 },
              anchor: 'cc',
              size: { width: 'auto', height: 'auto' },
              overflow: 'visible',
            },
            style: {
              fontSizeRel,
              fontFamily,
              color: speakerColor || '#ffffff',
              align: 'center',
              whiteSpace: 'nowrap',
              // 클립별 스타일 적용 (있을 경우)
              ...(clip.style && {
                fontWeight: clip.style.bold ? 'bold' : 'normal',
                fontStyle: clip.style.italic ? 'italic' : 'normal',
                textDecoration: clip.style.underline ? 'underline' : 'none',
              }),
            },
            // 애니메이션 플러그인 적용
            pluginChain: getPluginChain(clip, pluginName),
          },
        ],
      },
    }
  })

  return {
    version: '1.3',
    timebase: { unit: 'seconds' },
    stage: { baseAspect: '16:9' },
    tracks: [
      {
        id: 'editor',
        type: 'free',
        layer: 1,
      },
    ],
    cues,
  }
}

/**
 * 화자별 색상 반환
 */
function getSpeakerColor(speaker?: string): string | null {
  if (!speaker) return null

  // 화자별 기본 색상 팔레트
  const speakerColors: Record<string, string> = {
    'Speaker 1': '#ffffff',
    'Speaker 2': '#ffeb3b',
    'Speaker 3': '#4fc3f7',
    'Speaker 4': '#81c784',
    'Speaker 5': '#ff8a65',
  }

  return speakerColors[speaker] || '#ffffff'
}

/**
 * 클립에 적용할 애니메이션 플러그인 체인 생성
 */
function getPluginChain(
  clip: ExtendedClipItem,
  defaultPlugin: string
): Array<{
  name: string
  params: Record<string, unknown>
  relStartPct: number
  relEndPct: number
}> {
  // 클립에 설정된 애니메이션이 있으면 사용
  if (clip.animation && clip.animation.name) {
    return [
      {
        name: clip.animation.name,
        params: clip.animation.params || {},
        relStartPct: 0,
        relEndPct: 1,
      },
    ]
  }

  // 기본 플러그인이 있으면 적용, 없으면 빈 배열 반환
  if (defaultPlugin) {
    return [
      {
        name: defaultPlugin,
        params: {},
        relStartPct: 0,
        relEndPct: 1,
      },
    ]
  }

  // 플러그인 없이 빈 배열 반환 (애니메이션 없음)
  return []
}

/**
 * 고급 시나리오 생성 (여러 트랙, 레이어 지원)
 */
export function buildAdvancedScenario(
  clips: ExtendedClipItem[],
  options?: {
    enableMultiTrack?: boolean
    enableOverlay?: boolean
    backgroundImage?: string
    watermark?: string
  }
): RendererScenario {
  const baseScenario = buildScenarioFromClips(clips)

  if (!options) {
    return baseScenario
  }

  const tracks = [...baseScenario.tracks]
  const cues = [...baseScenario.cues]

  // 멀티 트랙 지원 (화자별 트랙 분리)
  if (options.enableMultiTrack) {
    const speakerTracks = new Map<string, string>()

    clips.forEach((clip) => {
      if (clip.speaker && !speakerTracks.has(clip.speaker)) {
        const trackId = `speaker-${speakerTracks.size + 1}`
        speakerTracks.set(clip.speaker, trackId)
        tracks.push({
          id: trackId,
          type: 'subtitle',
          layer: speakerTracks.size + 1,
        })
      }
    })

    // 큐를 해당 화자 트랙으로 재할당
    cues.forEach((cue, index) => {
      const clip = clips[index]
      if (clip.speaker) {
        const trackId = speakerTracks.get(clip.speaker)
        if (trackId) {
          cue.track = trackId
        }
      }
    })
  }

  // 오버레이 레이어 추가
  if (options.enableOverlay) {
    tracks.push({
      id: 'overlay',
      type: 'free',
      layer: 10,
    })
  }

  // 배경 이미지 큐 추가
  if (options.backgroundImage) {
    cues.unshift({
      id: 'background',
      track: 'overlay',
      hintTime: { start: 0, end: Number.MAX_SAFE_INTEGER },
      root: {
        e_type: 'image',
        src: options.backgroundImage,
        layout: {
          position: { x: 0.5, y: 0.5 },
          anchor: 'cc',
          size: { width: 1, height: 1 },
        },
      },
    })
  }

  // 워터마크 추가
  if (options.watermark) {
    cues.push({
      id: 'watermark',
      track: 'overlay',
      hintTime: { start: 0, end: Number.MAX_SAFE_INTEGER },
      root: {
        e_type: 'image',
        src: options.watermark,
        layout: {
          position: { x: 0.95, y: 0.05 },
          anchor: 'tr',
          size: { width: 0.1, height: 'auto' },
        },
        style: {
          opacity: 0.5,
        },
      },
    })
  }

  return {
    ...baseScenario,
    tracks,
    cues,
  }
}
