import { apiDelete, apiGet, apiPost } from '@/lib/api/apiClient'
import { AssetItem } from '@/types/asset-store'

export interface AssetsResponse {
  assets: AssetItem[]
}

/**
 * 플러그인 에셋 목록을 가져옵니다.
 */
const ASSETS_BASE = '/api/v1/assets'

export async function getAssets(options?: {
  category?: string
  is_pro?: boolean
}): Promise<AssetItem[]> {
  try {
    const queryParams = new URLSearchParams()
    if (options?.category) {
      queryParams.append('category', options.category)
    }
    if (options?.is_pro !== undefined) {
      queryParams.append('is_pro', options.is_pro.toString())
    }

    const endpoint = `${ASSETS_BASE}${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`
    const response = await apiGet(endpoint)

    if (!response.ok) {
      throw new Error(`Failed to fetch assets: ${response.status}`)
    }

    const data: AssetsResponse = await response.json()

    // 플러그인 URL 해석
    const origin = (
      process.env.NEXT_PUBLIC_MOTIONTEXT_PLUGIN_ORIGIN || 'http://localhost:80'
    ).replace(/\/$/, '')

    const resolvedAssets = data.assets.map((asset) => {
      const base = asset.pluginKey
        ? `${origin}/plugins/${asset.pluginKey}`
        : null

      return {
        ...asset,
        id: String(asset.id),
        thumbnail: base
          ? `${base}/${asset.thumbnailPath || 'assets/thumbnail.svg'}`
          : asset.thumbnail,
        manifestFile: base ? `${base}/manifest.json` : asset.manifestFile,
      }
    })

    return resolvedAssets
  } catch (error) {
    console.error('Error fetching assets:', error)
    throw error
  }
}

export async function addFavorite(pluginKey: string): Promise<void> {
  const response = await apiPost(
    `${ASSETS_BASE}/${encodeURIComponent(pluginKey)}/favorite`
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || '즐겨찾기 추가에 실패했습니다.')
  }
}

export async function removeFavorite(pluginKey: string): Promise<void> {
  const response = await apiDelete(
    `${ASSETS_BASE}/${encodeURIComponent(pluginKey)}/favorite`
  )

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || '즐겨찾기 제거에 실패했습니다.')
  }
}

export async function getFavoriteAssets(): Promise<AssetItem[]> {
  const response = await apiGet(`${ASSETS_BASE}/favorites`)

  if (!response.ok) {
    throw new Error('즐겨찾기 목록을 불러오는데 실패했습니다.')
  }

  const data: AssetsResponse = await response.json()

  const origin = (
    process.env.NEXT_PUBLIC_MOTIONTEXT_PLUGIN_ORIGIN || 'http://localhost:80'
  ).replace(/\/$/, '')

  return data.assets.map((asset) => {
    const base = asset.pluginKey ? `${origin}/plugins/${asset.pluginKey}` : null

    return {
      ...asset,
      id: String(asset.id),
      thumbnail: base
        ? `${base}/${asset.thumbnailPath || 'assets/thumbnail.svg'}`
        : asset.thumbnail,
      manifestFile: base ? `${base}/manifest.json` : asset.manifestFile,
      isFavorite: true,
    }
  })
}
