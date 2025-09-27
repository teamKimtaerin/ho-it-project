import type { SchemaProperty } from '../../../shared/motiontext/utils/scenarioGenerator'

export interface PluginManifest {
  name: string
  version: string
  type?: string
  pluginApi: string
  minRenderer: string
  entry: string
  targets: string[]
  capabilities?: string[]
  peer?: Record<string, string>
  preload?: string[]
  timeOffset?: [number, number] | [string, string] // [preOffset, postOffset] - can be seconds or percentages like "50%"
  schema?: Record<string, SchemaProperty>
  icon?: string // Optional icon path relative to plugin directory
}

// Cache for loaded manifests
const manifestCache = new Map<string, PluginManifest>()

/**
 * Load and cache a plugin manifest from the plugin server
 * @param pluginKey - Plugin identifier like "elastic@2.0.0"
 * @returns Promise resolving to the manifest or null if not found
 */
export async function loadPluginManifest(
  pluginKey?: string
): Promise<PluginManifest | null> {
  if (!pluginKey) return null

  // Check cache first
  if (manifestCache.has(pluginKey)) {
    return manifestCache.get(pluginKey)!
  }

  try {
    // Construct URL to plugin manifest
    const baseUrl =
      process.env.NEXT_PUBLIC_MOTIONTEXT_PLUGIN_ORIGIN ||
      'http://localhost:3300'
    const manifestUrl = `${baseUrl}/plugins/${pluginKey}/manifest.json`

    const response = await fetch(manifestUrl)
    if (!response.ok) {
      console.warn(
        `Failed to load plugin manifest for ${pluginKey}: ${response.status}`
      )
      return null
    }

    const manifest: PluginManifest = await response.json()

    // Cache the manifest
    manifestCache.set(pluginKey, manifest)

    return manifest
  } catch (error) {
    return null
  }
}

/**
 * Get the timeOffset for a specific plugin
 * @param pluginKey - Plugin identifier
 * @returns timeOffset tuple [preOffset, postOffset] or [0, 0] if not found
 * @note Returns the raw timeOffset from manifest - may be numbers or percentage strings
 */
export async function getPluginTimeOffset(
  pluginKey?: string
): Promise<[number, number] | [string, string]> {
  const manifest = await loadPluginManifest(pluginKey)
  return manifest?.timeOffset || [0, 0]
}

/**
 * Extract default parameters from a plugin's manifest schema.
 */
export async function getPluginDefaultParams(
  pluginKey?: string
): Promise<Record<string, unknown>> {
  if (!pluginKey) return {}
  const manifest = await loadPluginManifest(pluginKey)
  const schema = manifest?.schema
  if (!schema) return {}
  const params: Record<string, unknown> = {}
  for (const [key, prop] of Object.entries(schema)) {
    // Use defined default if present; otherwise leave undefined out
    // to let renderer/plugin handle missing values.
    if (Object.prototype.hasOwnProperty.call(prop, 'default')) {
      params[key] = (prop as SchemaProperty).default
    }
  }
  return params
}

/**
 * Get the icon URL for a specific plugin
 * @param pluginKey - Plugin identifier
 * @returns Icon URL or null if not found
 */
export async function getPluginIconUrl(
  pluginKey?: string
): Promise<string | null> {
  if (!pluginKey) return null

  const manifest = await loadPluginManifest(pluginKey)
  if (!manifest?.icon) return null

  const baseUrl =
    process.env.NEXT_PUBLIC_MOTIONTEXT_PLUGIN_ORIGIN || 'http://localhost:3300'
  return `${baseUrl}/plugins/${pluginKey}/${manifest.icon}`
}

/**
 * Clear the manifest cache (useful for development/testing)
 */
export function clearManifestCache(): void {
  manifestCache.clear()
}
