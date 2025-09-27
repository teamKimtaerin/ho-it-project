import {
  IoRefresh,
  IoDocument,
  IoChevronUp,
  IoFlash,
  IoArrowBack,
  IoEye,
  IoExpand,
  IoTrendingUp,
  IoHappy,
  IoColorPalette,
  IoVolumeHigh,
  IoVolumeLow,
  IoWater,
  IoApps,
  IoFlame,
  IoSyncCircle,
  IoSunny,
  IoHeart,
  IoSync,
} from 'react-icons/io5'
import type { IconType } from 'react-icons'

// Icon mapping registry
const ICON_REGISTRY: Record<string, IconType> = {
  IoRefresh,
  IoDocument,
  IoChevronUp,
  IoFlash,
  IoArrowBack,
  IoEye,
  IoExpand,
  IoTrendingUp,
  IoHappy,
  IoColorPalette,
  IoVolumeHigh,
  IoVolumeLow,
  IoWater,
  IoApps,
  IoFlame,
  IoSyncCircle,
  IoSunny,
  IoHeart,
  IoSync,
}

// Icon cache for performance
const iconCache = new Map<string, IconType | null>()

/**
 * Get an icon component by name
 * @param iconName - The icon name (e.g., "IoRefresh")
 * @returns The icon component or null if not found
 */
export function getIconByName(iconName: string): IconType | null {
  // Check cache first
  if (iconCache.has(iconName)) {
    return iconCache.get(iconName)!
  }

  // Get icon from registry
  const IconComponent = ICON_REGISTRY[iconName] || null

  // Cache the result
  iconCache.set(iconName, IconComponent)

  return IconComponent
}

/**
 * Get asset icon by asset ID
 * @param assetId - The asset ID
 * @param assetsDatabase - The assets database
 * @returns The icon component or null if not found
 */
export function getAssetIcon(
  assetId: string,
  assetsDatabase: Array<{ id: string; iconName?: string }>
): IconType | null {
  const asset = assetsDatabase.find((a) => a.id === assetId)
  if (!asset?.iconName) {
    return null
  }

  return getIconByName(asset.iconName)
}

/**
 * Get asset icon by asset title (for backward compatibility)
 * @param assetTitle - The asset title
 * @param assetsDatabase - The assets database
 * @returns The icon component or null if not found
 */
export function getAssetIconByTitle(
  assetTitle: string,
  assetsDatabase: Array<{ title: string; iconName?: string }>
): IconType | null {
  const asset = assetsDatabase.find((a) => a.title === assetTitle)
  if (!asset?.iconName) {
    return null
  }

  return getIconByName(asset.iconName)
}

/**
 * Get plugin icon from manifest (future use)
 * @param manifest - Plugin manifest
 * @returns Icon path or null if not found
 */
export function getPluginIconPath(manifest: { icon?: string }): string | null {
  return manifest.icon || null
}

/**
 * Preload commonly used icons for better performance
 */
export function preloadCommonIcons(): void {
  const commonIcons = [
    'IoRefresh',
    'IoDocument',
    'IoChevronUp',
    'IoFlash',
    'IoArrowBack',
    'IoEye',
    'IoExpand',
    'IoTrendingUp',
  ]

  commonIcons.forEach((iconName) => {
    getIconByName(iconName)
  })
}

/**
 * Clear the icon cache (useful for development/testing)
 */
export function clearIconCache(): void {
  iconCache.clear()
}
