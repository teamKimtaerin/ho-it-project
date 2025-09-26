export interface ProjectData {
  id: string
  name: string
  clips: import('./index').ClipItem[]
  settings: ProjectSettings
  createdAt: Date
  updatedAt: Date
  // Video information
  mediaId?: string // IndexedDB media ID
  storedMediaId?: string // IndexedDB에 저장된 미디어 파일 ID (복원용)
  videoUrl?: string // External URL or Blob URL
  videoName?: string // Original file name
  videoType?: string // MIME type (e.g., video/mp4)
  videoDuration?: number // Duration in seconds
  videoMetadata?: {
    width?: number
    height?: number
    frameRate?: number
    videoCodec?: string
    audioCodec?: string
  }
  // Server sync information
  serverSyncedAt?: Date // Last server sync time
  changeCount?: number // Number of changes since last server save
  syncStatus?: 'pending' | 'synced' | 'error' // Sync status
}

export interface ProjectSettings {
  autoSaveEnabled: boolean
  autoSaveInterval: number // seconds
  defaultSpeaker: string
  exportFormat: 'srt' | 'vtt' | 'ass'
}

export interface SavedProject {
  id: string
  name: string
  lastModified: Date
  size: number // in bytes
}

export interface ProjectStorage {
  saveProject: (project: ProjectData) => Promise<void>
  loadProject: (id: string) => Promise<ProjectData | null>
  listProjects: () => Promise<SavedProject[]>
  deleteProject: (id: string) => Promise<void>
  exportProject: (id: string, format: 'srt' | 'vtt' | 'ass') => Promise<string>
}
