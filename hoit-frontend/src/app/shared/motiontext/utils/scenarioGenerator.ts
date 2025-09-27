/**
 * Motion Text Renderer 시나리오 생성 유틸리티 (shared)
 */

export interface RendererConfig {
  version: '1.3'
  timebase: { unit: 'seconds' | 'tc'; fps?: number }
  stage: {
    baseAspect: '16:9' | '9:16' | 'auto'
    backgroundColor?: string
    safeArea?: { top?: number; bottom?: number; left?: number; right?: number }
  }
  behavior?: {
    preloadMs?: number
    resizeThrottleMs?: number
    snapToFrame?: boolean
  }
  tracks: Array<{
    id: string
    type: 'subtitle' | 'free'
    layer: number
    defaultStyle?: Record<string, unknown>
    safeArea?: { top?: number; bottom?: number; left?: number; right?: number }
  }>
  cues: Array<{
    id: string
    track: string
    hintTime?: { start?: number; end?: number }
    root: Record<string, unknown>
  }>
}

// V2 Scenario Types (minimal, local to frontend)
export interface RendererConfigV2 {
  version: '2.0'
  pluginApiVersion: '3.0'
  timebase: { unit: 'seconds'; fps?: number }
  stage: { baseAspect: '16:9' | '9:16' | 'auto' }
  define?: Record<string, unknown>
  tracks: Array<{
    id: string
    type: 'subtitle' | 'free'
    layer: number
    defaultStyle?: Record<string, unknown>
    defaultBoxStyle?: Record<string, unknown>
    defaultConstraints?: Record<string, unknown>
  }>
  cues: Array<{
    id: string
    track: string
    domLifetime?: [number, number]
    root: V2NodeGroup
  }>
}

type V2NodeBase = {
  id: string
  eType: 'group' | 'text' | 'image' | 'video'
  displayTime?: [number, number]
  // Node-level baseTime per v2 spec. When pluginChain entries omit baseTime,
  // this window can be used as the reference for timeOffset.
  baseTime?: [number, number]
  layout?: Record<string, unknown> | string
  style?: Record<string, unknown> | string
  pluginChain?: Array<{
    name: string
    baseTime?: [number, number]
    timeOffset?: [number | string, number | string]
    params?: Record<string, unknown>
    compose?: 'replace' | 'add' | 'multiply'
  }>
}

type V2NodeText = V2NodeBase & {
  eType: 'text'
  text: string
}

type V2NodeGroup = V2NodeBase & {
  eType: 'group'
  children?: Array<V2NodeText>
}

export interface PluginManifest {
  name: string
  version: string
  pluginApi: string
  targets: string[]
  capabilities?: string[]
  schema: Record<string, SchemaProperty>
}

export interface SchemaProperty {
  type: 'number' | 'string' | 'boolean' | 'object' | 'select'
  default: unknown

  // 레거시 지원 (기존 플러그인용)
  label?: string
  description?: string

  // 새로운 i18n 구조
  i18n?: {
    label: { ko: string; en?: string }
    description: { ko: string; en?: string }
  }

  // UI 컨트롤 정의
  ui?: {
    control: 'slider' | 'color' | 'text' | 'checkbox' | 'select' | 'object'
    allowDefine?: boolean
    unit?: string // px, s, °, Hz 등
    step?: number // UI에서 사용할 step (schema.step과 별개)
    autofill?: {
      source: string // 데이터 소스 식별자 (예: "clip.speaker", "editor.speakerColors")
      type: 'current' | 'global' // 현재 컨텍스트 또는 전역 데이터
    }
  }

  // 제약사항
  min?: number
  max?: number
  step?: number
  pattern?: string
  enum?: string[]

  // 중첩 객체용
  properties?: Record<string, SchemaProperty>
}

export interface PreviewSettings {
  text: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  pluginParams: Record<string, unknown>
  rotationDeg?: number
  fontSizeRel?: number
}

export type ManifestLoadMode = 'server' | 'local' | 'auto'

export interface ManifestLoadOptions {
  mode?: ManifestLoadMode
  serverBase?: string
  localBase?: string
  fetchImpl?: typeof fetch
}

export async function loadPluginManifest(
  pluginName: string,
  opts: ManifestLoadOptions = {}
): Promise<PluginManifest> {
  if (!pluginName) {
    throw new Error('Plugin name is required')
  }

  try {
    const key = pluginName?.includes('@')
      ? pluginName
      : pluginName
        ? `${pluginName}@2.0.0`
        : ''
    const mode: ManifestLoadMode = opts.mode ?? 'auto'
    const serverBase = (opts.serverBase ?? '').replace(/\/$/, '')
    const localBase = opts.localBase ?? ''
    const f =
      opts.fetchImpl ??
      (typeof fetch !== 'undefined' ? fetch.bind(window) : undefined)
    if (!f)
      throw new Error('No fetch implementation available in this environment')

    const tryUrls: string[] = []
    if (mode === 'server' || mode === 'auto') {
      if (serverBase) tryUrls.push(`${serverBase}/plugins/${key}/manifest.json`)
      // Fallback: encoded variant only if needed (rare servers expect encoding)
      if (serverBase)
        tryUrls.push(
          `${serverBase}/plugins/${encodeURIComponent(key)}/manifest.json`
        )
    }
    if (mode === 'local' || mode === 'auto') {
      if (localBase) {
        const base = localBase.endsWith('/') ? localBase : localBase + '/'
        tryUrls.push(`${base}${encodeURIComponent(key)}/manifest.json`)
        tryUrls.push(`${base}${key}/manifest.json`)
      }
      tryUrls.push(`/plugin/${encodeURIComponent(key)}/manifest.json`)
      tryUrls.push(`/plugin/${key}/manifest.json`)
    }

    let lastErr: unknown = null
    for (const url of tryUrls) {
      try {
        const res = await f(url)
        if (!res || !res.ok) continue
        const ct = res.headers.get('content-type') || ''
        if (/json/i.test(ct)) return await res.json()
        try {
          return await res.json()
        } catch {
          continue
        }
      } catch (e) {
        lastErr = e
      }
    }
    throw new Error(
      `Failed to load manifest for ${pluginName}. Tried ${tryUrls.join(', ')}. Last error: ${String(lastErr)}`
    )
  } catch (error) {
    console.error(`Error loading manifest for ${pluginName}:`, error)
    throw error
  }
}

export function getDefaultParameters(
  manifest: PluginManifest
): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  Object.entries(manifest.schema).forEach(([key, property]) => {
    params[key] = property.default
  })
  return params
}

// --- V2 Helpers ---

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function pctStr(p: number): string {
  const v = Math.round(clamp01(p) * 10000) / 100 // keep 2 decimals
  return `${v}%`
}

export function computeBaseTimeAndOffset(
  displayTime: [number, number],
  relStartPct?: number,
  relEndPct?: number
): { baseTime: [number, number]; timeOffset: [string, string] } {
  const baseTime: [number, number] = [
    Number(displayTime[0] || 0),
    Number(displayTime[1] || 0),
  ]
  const startP = relStartPct == null ? 0 : clamp01(relStartPct)
  const endP = relEndPct == null ? 1 : clamp01(relEndPct)
  return { baseTime, timeOffset: [pctStr(startP), pctStr(endP)] }
}

/**
 * Compute timeOffset as absolute seconds relative to baseTime[0].
 * Useful when UI produces absolute second timings within a known base window.
 */
export function computeTimeOffsetSeconds(
  baseTime: [number, number],
  absStartSec?: number,
  absEndSec?: number
): { baseTime: [number, number]; timeOffset: [number, number] } {
  const b0 = Number(baseTime[0] || 0)
  const b1 = Number(baseTime[1] || 0)
  // Allow negative offsets: timing - baseTime
  const s = Number(absStartSec ?? b0) - b0 // timing.start - baseTime.start
  const e = Number(absEndSec ?? b1) - b1 // timing.end - baseTime.end
  return { baseTime: [b0, b1], timeOffset: [s, e] }
}

// --- V2 Generators ---

export function generatePreviewScenarioV2(
  pluginName: string,
  settings: PreviewSettings,
  duration: number = 3
): RendererConfigV2 {
  const centerX = settings.position.x + settings.size.width / 2
  const centerY = settings.position.y + settings.size.height / 2
  const normalizedX = Math.max(0, Math.min(1, centerX / 512))
  const normalizedY = Math.max(0, Math.min(1, centerY / 384))
  const relW = Math.max(0, Math.min(1, settings.size.width / 512))
  const relH = Math.max(0, Math.min(1, settings.size.height / 384))

  const groupDisplay: [number, number] = [0, duration]
  const { baseTime, timeOffset } = computeBaseTimeAndOffset(groupDisplay)

  return {
    version: '2.0',
    pluginApiVersion: '3.0',
    timebase: { unit: 'seconds' },
    stage: { baseAspect: '16:9' },
    tracks: [{ id: 'preview-track', type: 'free', layer: 1, defaultStyle: {} }],
    cues: [
      {
        id: 'preview-cue',
        track: 'preview-track',
        domLifetime: [0, duration],
        root: {
          id: 'root_group',
          eType: 'group',
          displayTime: groupDisplay,
          layout: {
            position: { x: normalizedX, y: normalizedY },
            anchor: 'cc',
            size: { width: relW, height: relH },
          },
          children: [
            {
              id: 'text_1',
              eType: 'text',
              text: settings.text,
              displayTime: groupDisplay,
              layout: { position: { x: 0.5, y: 0.5 }, anchor: 'cc' },
              style: {
                fontSizeRel: settings.fontSizeRel || 0.06,
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                align: 'center',
                whiteSpace: 'nowrap',
              },
              pluginChain: [
                {
                  name: pluginName,
                  baseTime,
                  timeOffset,
                  params: settings.pluginParams,
                },
              ],
            },
          ],
        },
      },
    ],
  }
}

export function generateLoopedScenarioV2(
  pluginName: string,
  settings: PreviewSettings,
  duration: number = 3
): RendererConfigV2 {
  const centerX = settings.position.x + settings.size.width / 2
  const centerY = settings.position.y + settings.size.height / 2
  const normalizedX = Math.max(0, Math.min(1, centerX / 512))
  const normalizedY = Math.max(0, Math.min(1, centerY / 384))
  const relW = Math.max(0, Math.min(1, settings.size.width / 512))
  const relH = Math.max(0, Math.min(1, settings.size.height / 384))

  const groupDisplay: [number, number] = [0, duration]
  const { baseTime, timeOffset } = computeBaseTimeAndOffset(groupDisplay, 0, 1)

  return {
    version: '2.0',
    pluginApiVersion: '3.0',
    timebase: { unit: 'seconds' },
    stage: { baseAspect: '16:9' },
    tracks: [{ id: 'free', type: 'free', layer: 1 }],
    cues: [
      {
        id: 'preview-cue',
        track: 'free',
        domLifetime: [0, duration],
        root: {
          id: 'group_1',
          eType: 'group',
          displayTime: groupDisplay,
          layout: {
            position: { x: normalizedX, y: normalizedY },
            anchor: 'cc',
            size: { width: relW, height: relH },
            transform:
              settings.rotationDeg != null
                ? { rotate: { deg: settings.rotationDeg } }
                : undefined,
            transformOrigin: '50% 50%',
          },
          children: [
            {
              id: 'text_1',
              eType: 'text',
              text: settings.text,
              displayTime: groupDisplay,
              layout: {
                position: { x: 0.5, y: 0.5 },
                anchor: 'cc',
                size: { width: 'auto', height: 'auto' },
                overflow: 'visible',
              },
              style: {
                fontSizeRel: settings.fontSizeRel || 0.05,
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                align: 'center',
                whiteSpace: 'nowrap',
              },
              pluginChain: [
                {
                  name: pluginName,
                  params: settings.pluginParams,
                  baseTime,
                  timeOffset,
                },
              ],
            },
          ],
        },
      },
    ],
  }
}

export function generatePreviewScenario(
  pluginName: string,
  settings: PreviewSettings,
  duration: number = 3
): RendererConfig {
  const centerX = settings.position.x + settings.size.width / 2
  const centerY = settings.position.y + settings.size.height / 2
  const normalizedX = Math.max(0, Math.min(1, centerX / 512))
  const normalizedY = Math.max(0, Math.min(1, centerY / 384))
  const relW = Math.max(0, Math.min(1, settings.size.width / 512))
  const relH = Math.max(0, Math.min(1, settings.size.height / 384))

  return {
    version: '1.3',
    timebase: { unit: 'seconds' },
    stage: { baseAspect: '16:9', backgroundColor: 'transparent' },
    tracks: [{ id: 'preview-track', type: 'free', layer: 1 }],
    cues: [
      {
        id: 'preview-cue',
        track: 'preview-track',
        hintTime: { start: 0 },
        root: {
          e_type: 'group',
          layout: {
            position: { x: normalizedX, y: normalizedY },
            anchor: 'cc',
            size: { width: relW, height: relH },
          },
          children: [
            {
              e_type: 'text',
              text: settings.text,
              absStart: 0,
              absEnd: duration,
              layout: {
                position: { x: 0.5, y: 0.5 },
                anchor: 'cc',
                size: { width: 'auto', height: 'auto' },
                overflow: 'visible',
              },
              style: {
                fontSizeRel: settings.fontSizeRel || 0.06,
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                align: 'center',
                whiteSpace: 'nowrap',
              },
              pluginChain: [
                {
                  name: pluginName,
                  params: settings.pluginParams,
                },
              ],
            },
          ],
        },
      },
    ],
  } as RendererConfig
}

export function generateLoopedScenario(
  pluginName: string,
  settings: PreviewSettings,
  duration: number = 3
): RendererConfig {
  // Convert top-left position to center position for group layout
  const centerX = settings.position.x + settings.size.width / 2
  const centerY = settings.position.y + settings.size.height / 2
  const normalizedX = Math.max(0, Math.min(1, centerX / 512))
  const normalizedY = Math.max(0, Math.min(1, centerY / 384))
  const relW = Math.max(0, Math.min(1, settings.size.width / 512))
  const relH = Math.max(0, Math.min(1, settings.size.height / 384))
  const pluginChain = [
    {
      name: pluginName,
      params: settings.pluginParams,
      relStartPct: 0.0,
      relEndPct: 1.0,
    },
  ]
  const scenario = {
    version: '1.3',
    timebase: { unit: 'seconds' },
    stage: { baseAspect: '16:9' },
    tracks: [{ id: 'free', type: 'free', layer: 1 }],
    cues: [
      {
        id: 'preview-cue',
        track: 'free',
        root: {
          e_type: 'group',
          layout: {
            position: { x: normalizedX, y: normalizedY },
            anchor: 'cc',
            size: { width: relW, height: relH },
            transform:
              settings.rotationDeg != null
                ? { rotate: { deg: settings.rotationDeg } }
                : undefined,
            transformOrigin: '50% 50%',
          },
          children: [
            {
              e_type: 'text',
              text: settings.text,
              absStart: 0,
              absEnd: duration,
              layout: {
                position: { x: 0.5, y: 0.5 },
                anchor: 'cc',
                size: { width: 'auto', height: 'auto' },
                overflow: 'visible',
              },
              style: {
                fontSizeRel: settings.fontSizeRel || 0.05,
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                align: 'center',
                whiteSpace: 'nowrap',
              },
              pluginChain: pluginChain,
            },
          ],
        },
      },
    ],
  } as RendererConfig
  return scenario
}

export function validateAndNormalizeParams(
  params: Record<string, unknown>,
  manifest: PluginManifest
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {}
  Object.entries(manifest.schema).forEach(([key, property]) => {
    const value = params[key] ?? property.default
    switch (property.type) {
      case 'number': {
        let numValue = Number(value as number)
        if (!Number.isFinite(numValue)) {
          const d =
            typeof property.default === 'number'
              ? property.default
              : Number(property.default as number)
          numValue = Number.isFinite(d) ? (d as number) : 0
        }
        if (property.min !== undefined)
          numValue = Math.max(property.min, numValue)
        if (property.max !== undefined)
          numValue = Math.min(property.max, numValue)
        normalized[key] = numValue
        break
      }
      case 'boolean':
        normalized[key] = Boolean(value)
        break
      case 'select': {
        const v = String(value)
        const ok = property.enum?.includes(v)
        normalized[key] = ok ? v : String(property.default ?? '')
        break
      }
      case 'object': {
        // Handle object type - parse JSON string or use object directly
        if (typeof value === 'string' && value.trim()) {
          try {
            normalized[key] = JSON.parse(value)
          } catch (error) {
            console.warn(`Failed to parse JSON for parameter ${key}:`, error)
            normalized[key] = property.default ?? {}
          }
        } else if (typeof value === 'object' && value !== null) {
          normalized[key] = value
        } else {
          normalized[key] = property.default ?? {}
        }
        break
      }
      case 'string':
      default:
        normalized[key] = String(value ?? property.default ?? '')
        break
    }
  })
  return normalized
}
