export interface RealJson {
  segments: Array<{
    start_time: number | string
    end_time: number | string
    text: string
    speaker?: { speaker_id?: string }
  }>
}

export type RendererConfigV2 = {
  version: '2.0'
  pluginApiVersion: '3.0'
  timebase: { unit: 'seconds' }
  stage: { baseAspect: '16:9' }
  tracks: Array<{
    id: string
    type: 'free' | 'subtitle'
    layer: number
    defaultStyle?: Record<string, unknown>
  }>
  cues: Array<{
    id: string
    track: string
    domLifetime?: [number, number]
    root: {
      id: string
      eType: 'group'
      displayTime: [number, number]
      layout?: Record<string, unknown>
      children: Array<{
        id: string
        eType: 'text'
        text: string
        displayTime: [number, number]
        layout?: Record<string, unknown>
        style?: Record<string, unknown>
        pluginChain: Array<{
          name: string
          baseTime: [number, number]
          timeOffset: [string, string]
          params?: Record<string, unknown>
        }>
      }>
    }
  }>
}

function toSeconds(v: number | string): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.includes(':')) {
    const parts = v.split(':').map(Number)
    if (parts.length === 3)
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)
    if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  }
  return Number(v) || 0
}

export function buildScenarioFromReal(
  real: RealJson,
  opts?: { fontSizeRel?: number; bottomMargin?: number }
): RendererConfigV2 {
  console.log('[buildScenarioFromReal] Starting conversion with data:', {
    segmentsCount: real.segments?.length || 0,
    opts,
  })

  const stageW = 640
  const stageH = 360
  const marginY = opts?.bottomMargin ?? 32
  const boxW = Math.round(stageW * 0.88)
  const boxH = 64
  const centerX = Math.round(stageW / 2)
  const centerY = Math.max(0, Math.min(stageH, stageH - marginY - boxH / 2))
  const fontSizeRel = opts?.fontSizeRel ?? 0.05
  const pluginName = 'elastic'

  const cues = (real.segments || [])
    .map((seg, i) => {
      const start = toSeconds(seg.start_time)
      const end = toSeconds(seg.end_time)
      const text = seg.text || ''

      console.log(`[buildScenarioFromReal] Processing segment ${i}:`, {
        start_time: seg.start_time,
        end_time: seg.end_time,
        text: seg.text,
        convertedStart: start,
        convertedEnd: end,
        finalText: text,
        isValid: end > start,
      })

      // Skip segments with invalid timing or empty text
      if (end <= start) {
        console.warn(
          `[buildScenarioFromReal] Skipping segment ${i} - invalid timing: start=${start}, end=${end}`
        )
        return null
      }

      if (!text.trim()) {
        console.warn(
          `[buildScenarioFromReal] Skipping segment ${i} - empty text`
        )
        return null
      }

      const display: [number, number] = [start, Math.max(end, start + 0.1)]
      return {
        id: `cue-${i}`,
        track: 'editor',
        domLifetime: display,
        root: {
          id: `group-${i}`,
          eType: 'group' as const,
          displayTime: display,
          layout: {
            position: { x: centerX / stageW, y: centerY / stageH },
            anchor: 'cc',
            size: { width: boxW / stageW, height: boxH / stageH },
          },
          children: [
            {
              id: `text-${i}`,
              eType: 'text' as const,
              text,
              displayTime: display,
              layout: {
                position: { x: 0.5, y: 0.5 },
                anchor: 'cc',
                size: { width: 'auto', height: 'auto' },
                overflow: 'visible',
              },
              style: {
                fontSizeRel,
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                align: 'center',
                whiteSpace: 'nowrap',
              },
              pluginChain: [
                {
                  name: pluginName,
                  params: {},
                  baseTime: display,
                  timeOffset: ['0%', '100%'] as [string, string],
                },
              ],
            },
          ],
        },
      }
    })
    .filter((cue): cue is NonNullable<typeof cue> => cue !== null)

  const config: RendererConfigV2 = {
    version: '2.0',
    pluginApiVersion: '3.0',
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

  return config
}
