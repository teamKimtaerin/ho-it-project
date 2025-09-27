// Schema 속성 타입 정의
export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'select' | 'color'
  default: string | number | boolean
  label?: string
  min?: number
  max?: number
  step?: number
  enum?: string[]
  ui?: {
    control: 'slider' | 'checkbox' | 'radio' | 'dropdown'
  }
}

// Asset schema 타입
export interface AssetSchema {
  [key: string]: SchemaProperty
}

// Asset metadata 타입
export interface AssetMetadata {
  name: string
  version: string
  entry: string
  description?: string
  schema: AssetSchema
  i18n?: {
    [locale: string]: {
      description?: string
      [key: string]: string | undefined
    }
  }
}

// Asset 타입 정의
export interface AssetItem {
  id: string
  title: string
  category: string
  description: string
  thumbnail: string
  // MotionText plugin integration (optional)
  pluginKey?: string
  thumbnailPath?: string
  manifestFile?: string
  iconName?: string
  authorId: string
  authorName: string
  isPro: boolean
  price: number
  rating: number
  downloads: number
  likes: number
  usageCount: number
  tags: string[]
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}
