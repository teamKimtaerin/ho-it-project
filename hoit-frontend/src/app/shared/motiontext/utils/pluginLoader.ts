/**
 * Local plugin loader for MotionText (shared)
 */
import type { RendererConfig, RendererConfigV2 } from './scenarioGenerator'
import {
  configurePluginSource,
  registerExternalPlugin,
} from 'motiontext-renderer'

export interface TLHandle {
  pause?: () => TLHandle
  progress?: (p: number) => TLHandle
  repeat?: (n: number) => TLHandle
  kill?: () => void
}
export type ProgressFn = (p: number) => void

export interface GsapLike {
  timeline?: (opts?: unknown) => TLHandle
  utils?: { random: (min: number, max: number) => number }
}

export interface PluginContext {
  gsap?: GsapLike
  assets?: { getUrl: (p: string) => string }
}

export interface PluginRuntime {
  name?: string
  version?: string
  init?: (
    el: HTMLElement,
    opts: Record<string, unknown>,
    ctx: PluginContext
  ) => void
  animate?: (
    el: HTMLElement,
    opts: Record<string, unknown>,
    ctx: PluginContext,
    duration: number
  ) => TLHandle | ProgressFn | void
  cleanup?: (el: HTMLElement) => void
}

export interface PluginRuntimeModule {
  default?: PluginRuntime
  evalChannels?: (
    spec: unknown,
    p: number,
    ctx: PluginContext
  ) => Record<string, unknown>
}

const cache = new Map<string, PluginRuntimeModule>()
const registeredPlugins = new Set<string>()

function getPluginOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_MOTIONTEXT_PLUGIN_ORIGIN
  const fallback = 'http://localhost:3300'
  return (fromEnv && fromEnv.replace(/\/$/, '')) || fallback
}

export function configurePluginLoader() {
  const origin = getPluginOrigin()
  try {
    // Prefer server mode with explicit origin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    configurePluginSource({ mode: 'server', serverBase: origin } as any)
  } catch {
    // Silently ignore if the host library does not support this signature
  }
}

function resolveKey(name: string): string {
  return name.includes('@') ? name : `${name}@2.0.0`
}

export async function loadLocalPlugin(
  name: string
): Promise<PluginRuntimeModule> {
  if (!name) throw new Error('Plugin name is required')
  const key = resolveKey(name)
  if (cache.has(key)) return cache.get(key) as PluginRuntimeModule

  const origin = getPluginOrigin()
  const base = `${origin}/plugins/${key}`

  if (!registeredPlugins.has(key)) {
    try {
      // manifest.json 요청
      const manifestResponse = await fetch(`${base}/manifest.json`)
      if (!manifestResponse.ok) {
        throw new Error(
          `Failed to load manifest for plugin ${key}: ${manifestResponse.status}`
        )
      }
      const manifest = await manifestResponse.json()

      // index.mjs 요청 (302 리다이렉트될 것)
      const entryResponse = await fetch(`${base}/index.mjs`)
      if (!entryResponse.ok) {
        throw new Error(
          `Failed to load entry for plugin ${key}: ${entryResponse.status}`
        )
      }

      // 리다이렉트된 실제 S3 URL에서 모듈 import
      const moduleCode = await entryResponse.text()
      const blob = new Blob([moduleCode], { type: 'text/javascript' })
      const blobUrl = URL.createObjectURL(blob)

      const mod: PluginRuntimeModule = await import(
        /* webpackIgnore: true */ /* @vite-ignore */ blobUrl
      )
      cache.set(key, mod)

      const pluginNameWithoutVersion = key.split('@')[0]
      registerExternalPlugin({
        name: pluginNameWithoutVersion,
        version: manifest.version,
        module: mod,
        baseUrl: `${base}/`,
        manifest: manifest,
      })
      registeredPlugins.add(key)

      // Blob URL 정리
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error(`Failed to register plugin ${key}:`, error)
      throw error
    }
  }

  return cache.get(key) as PluginRuntimeModule
}

function extractPluginNames(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scenario: RendererConfig | RendererConfigV2 | any
): Set<string> {
  const pluginNames = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scenario.cues?.forEach((cue: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const traverse = (node: any): void => {
      if (node?.plugin?.name) pluginNames.add(node.plugin.name)
      if (Array.isArray(node?.pluginChain)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        node.pluginChain.forEach((p: any) => {
          if (p.name) pluginNames.add(p.name)
        })
      }
      if (Array.isArray(node?.children)) node.children.forEach(traverse)
    }
    traverse(cue.root)
  })
  return pluginNames
}

export async function preloadPluginsForScenario(
  scenario: RendererConfig | RendererConfigV2
) {
  const requiredPlugins = extractPluginNames(scenario)
  for (const pluginName of requiredPlugins) {
    try {
      await loadLocalPlugin(pluginName)
    } catch (error) {
      console.error(`Failed to load plugin ${pluginName}:`, error)
      throw error
    }
  }
}

let gsapCache: GsapLike | undefined

export function getGsap(): GsapLike | undefined {
  try {
    if (typeof window !== 'undefined') {
      const w = window as unknown as { gsap?: GsapLike }
      if (w.gsap) return w.gsap
    }
  } catch {}
  return undefined
}

export async function ensureGsap(): Promise<GsapLike | undefined> {
  if (gsapCache) return gsapCache
  const g = getGsap()
  if (g) {
    gsapCache = g
    return g
  }
  try {
    const mod = (await import('gsap')) as unknown as { default?: GsapLike }
    const gs = mod && mod.default ? mod.default : undefined
    if (gs && typeof window !== 'undefined') {
      ;(window as unknown as { gsap?: GsapLike }).gsap = gs
    }
    gsapCache = gs
    return gs
  } catch {
    return undefined
  }
}
