export type ExportFormat =
  | 'gpu-render'
  | 'mp4'
  | 'srt'
  | 'txt'
  | 'mp3'
  | 'wav'
  | 'png'
  | 'gif'
  | 'mov'
  | 'premiere'
  | 'finalcut'
  | 'davinci'
  | 'hoit'

export type SocialPlatform = 'youtube'

export interface ExportOption {
  id: ExportFormat
  label: string
  description: string
  icon: string
  category: 'video' | 'subtitle' | 'audio' | 'image' | 'project'
  isRecentlyUsed?: boolean
}

export interface SocialMediaOption {
  id: SocialPlatform
  label: string
  description: string
  icon: string
}

export type YouTubeUploadStatus =
  | 'settings'
  | 'details'
  | 'uploading'
  | 'completed'
export type YouTubePrivacy = 'private' | 'unlisted' | 'public'

export interface YouTubeUploadData {
  title: string
  description: string
  privacy: YouTubePrivacy
  channel?: string
}

export interface YouTubeUploadSettings {
  title: string
  resolution: '720p' | '1080p' | '4K'
  quality: '추천 품질' | '고품질' | '최고 품질'
  frameRate: '30fps' | '60fps'
  format: 'MP4' | 'MOV'
}

export interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: (format: ExportFormat) => void
  onSocialShare?: (platform: SocialPlatform) => void
}

export interface YouTubeUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (data: YouTubeUploadData) => void
  videoThumbnail?: string
  defaultTitle?: string
}

export interface UploadProgress {
  status:
    | 'initializing'
    | 'navigating'
    | 'uploading'
    | 'processing'
    | 'publishing'
    | 'completed'
    | 'error'
  progress: number
  message: string
  error?: string
}

export interface YouTubeUploadRequest {
  videoPath: string
  title: string
  description: string
  privacy: YouTubePrivacy
  settings: YouTubeUploadSettings
}

export interface YouTubeUploadResponse {
  success: boolean
  videoUrl?: string
  videoId?: string
  error?: string
  progress?: UploadProgress
}
