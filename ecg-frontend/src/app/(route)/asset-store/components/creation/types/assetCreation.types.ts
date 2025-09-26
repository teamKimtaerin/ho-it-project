/**
 * Asset Creation Modal Types
 */

import { AssetItem } from '@/types/asset-store'
import { ChatMessage } from '@/app/(route)/editor/types/chatBot'

export interface AssetCreationModalProps {
  isOpen: boolean
  onClose: () => void
  selectedAsset?: AssetItem | null
  onAssetSave?: (asset: AssetItem) => void
  availableAssets?: AssetItem[]
  onAssetChange?: (asset: AssetItem) => void
}

export interface AIAssistantSidebarProps {
  isOpen: boolean
  onToggle: () => void
  onSendMessage: (message: string) => void
  messages: ChatMessage[]
  isTyping?: boolean
}

export interface ParameterGroup {
  id: string
  label: string
  icon?: string
  parameters: string[]
}

export interface TabbedParameterControlsProps {
  manifest: any
  parameters: Record<string, unknown>
  onParameterChange: (key: string, value: unknown) => void
  onParametersReset?: () => void
  className?: string
}

export interface AssetCreationState {
  aiSidebarOpen: boolean
  parameterSidebarExpanded: boolean
  expandedSidebarOpen: boolean
  activeTab: string
  parameters: Record<string, unknown>
  previewText: string
  messages: ChatMessage[]
  isTyping: boolean
}

// Parameter grouping configuration
export const PARAMETER_GROUPS: ParameterGroup[] = [
  {
    id: 'basic',
    label: '기본',
    icon: 'Settings',
    parameters: ['width', 'height', 'x', 'y', 'rotation', 'scale', 'opacity'],
  },
  {
    id: 'animation',
    label: '애니메이션',
    icon: 'Play',
    parameters: ['duration', 'delay', 'ease', 'repeat', 'yoyo', 'stagger'],
  },
  {
    id: 'colors',
    label: '색상',
    icon: 'Palette',
    parameters: [
      'color',
      'backgroundColor',
      'borderColor',
      'shadowColor',
      'gradientColors',
    ],
  },
  {
    id: 'effects',
    label: '효과',
    icon: 'Sparkles',
    parameters: ['shadow', 'glow', 'blur', 'brightness', 'contrast', 'filter'],
  },
  {
    id: 'timing',
    label: '타이밍',
    icon: 'Clock',
    parameters: ['startTime', 'endTime', 'timeline', 'sequence', 'sync'],
  },
  {
    id: 'advanced',
    label: '고급',
    icon: 'Settings2',
    parameters: ['custom', 'transform', 'matrix', 'physics', 'expressions'],
  },
]
