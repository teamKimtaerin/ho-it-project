/**
 * IndexedDB 기반 미디어 저장 시스템
 */

import { getTimestamp } from '@/utils/logger'
import { databaseManager, STORES } from './databaseManager'

// Store names from DatabaseManager
const MEDIA_STORE = STORES.MEDIA
const PROJECT_MEDIA_STORE = STORES.PROJECT_MEDIA

export interface MediaFile {
  id: string
  projectId: string
  fileName: string
  fileType: string
  fileSize: number
  blob: Blob
  duration?: number
  videoCodec?: string
  audioCodec?: string
  videoSize?: string
  frameRate?: number
  createdAt: Date
  lastAccessed: Date
}

export interface ProjectMediaInfo {
  projectId: string
  mediaId: string
  mediaUrl?: string // Blob URL for current session
  fileName: string
  fileType: string
  fileSize: number
  duration?: number
  metadata?: {
    videoCodec?: string
    audioCodec?: string
    videoSize?: string
    frameRate?: number
  }
}

class MediaStorage {
  private blobUrls: Map<string, string> = new Map()

  /**
   * IndexedDB 초기화 (DatabaseManager 사용)
   */
  async initialize(): Promise<void> {
    try {
      await databaseManager.initialize()
      console.log(
        `[${getTimestamp()}] mediaStorage.ts Database initialized successfully`
      )
    } catch (error) {
      console.error(
        `[${getTimestamp()}] mediaStorage.ts Failed to initialize database:`,
        error
      )
      throw error
    }
  }

  /**
   * 비디오 파일 저장
   */
  async saveMedia(
    projectId: string,
    file: File,
    metadata?: Partial<MediaFile>
  ): Promise<string> {
    await this.initialize()

    const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    const mediaFile: MediaFile = {
      id: mediaId,
      projectId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      blob: file,
      createdAt: new Date(),
      lastAccessed: new Date(),
      ...metadata,
    }

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE], 'readwrite')
      const store = transaction.objectStore(MEDIA_STORE)
      const request = store.add(mediaFile)

      request.onsuccess = () => {
        console.log(
          `[${getTimestamp()}] mediaStorage.ts Media saved: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
        )
        resolve(mediaId)
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] mediaStorage.ts Failed to save media`
        )
        reject(new Error('Failed to save media'))
      }
    })
  }

  /**
   * 비디오 파일 로드
   */
  async loadMedia(mediaId: string): Promise<MediaFile | null> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE], 'readonly')
      const store = transaction.objectStore(MEDIA_STORE)
      const request = store.get(mediaId)

      request.onsuccess = () => {
        const media = request.result as MediaFile | undefined
        if (media) {
          console.log(
            `[${getTimestamp()}] mediaStorage.ts Media loaded: ${media.fileName}`
          )
          // 접근 시간 업데이트
          this.updateMediaAccess(media.id)
        }
        resolve(media || null)
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] mediaStorage.ts Failed to load media`
        )
        reject(new Error('Failed to load media'))
      }
    })
  }

  /**
   * 프로젝트의 미디어 정보 저장
   */
  async saveProjectMedia(projectMediaInfo: ProjectMediaInfo): Promise<void> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECT_MEDIA_STORE], 'readwrite')
      const store = transaction.objectStore(PROJECT_MEDIA_STORE)
      const request = store.put(projectMediaInfo)

      request.onsuccess = () => {
        console.log(
          `[${getTimestamp()}] mediaStorage.ts Project media info saved for project: ${projectMediaInfo.projectId}`
        )
        resolve()
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] mediaStorage.ts Failed to save project media info`
        )
        reject(new Error('Failed to save project media info'))
      }
    })
  }

  /**
   * 프로젝트의 미디어 정보 로드
   */
  async loadProjectMedia(projectId: string): Promise<ProjectMediaInfo | null> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECT_MEDIA_STORE], 'readonly')
      const store = transaction.objectStore(PROJECT_MEDIA_STORE)
      const request = store.get(projectId)

      request.onsuccess = () => {
        const info = request.result as ProjectMediaInfo | undefined
        if (info) {
          console.log(
            `[${getTimestamp()}] mediaStorage.ts Project media info loaded for project: ${projectId}`
          )
        }
        resolve(info || null)
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] mediaStorage.ts Failed to load project media info`
        )
        reject(new Error('Failed to load project media info'))
      }
    })
  }

  /**
   * 비디오 파일을 Blob URL로 변환
   */
  async getMediaUrl(mediaId: string): Promise<string | null> {
    // 이미 생성된 URL이 있으면 반환
    if (this.blobUrls.has(mediaId)) {
      return this.blobUrls.get(mediaId)!
    }

    const media = await this.loadMedia(mediaId)
    if (!media) return null

    const url = URL.createObjectURL(media.blob)
    this.blobUrls.set(mediaId, url)

    console.log(
      `[${getTimestamp()}] mediaStorage.ts Blob URL created for: ${media.fileName}`
    )

    return url
  }

  /**
   * Blob URL 해제
   */
  releaseBlobUrl(mediaId: string): void {
    const url = this.blobUrls.get(mediaId)
    if (url) {
      URL.revokeObjectURL(url)
      this.blobUrls.delete(mediaId)
      console.log(
        `[${getTimestamp()}] mediaStorage.ts Blob URL released for media: ${mediaId}`
      )
    }
  }

  /**
   * 모든 Blob URL 해제
   */
  releaseAllBlobUrls(): void {
    this.blobUrls.forEach((url) => {
      URL.revokeObjectURL(url)
    })
    this.blobUrls.clear()
    console.log(`[${getTimestamp()}] mediaStorage.ts All Blob URLs released`)
  }

  /**
   * 미디어 접근 시간 업데이트
   */
  async updateMediaAccess(mediaId: string): Promise<void> {
    try {
      const db = await databaseManager.getDatabase()
      const transaction = db.transaction([MEDIA_STORE], 'readwrite')
      const store = transaction.objectStore(MEDIA_STORE)

      const getRequest = store.get(mediaId)
      getRequest.onsuccess = () => {
        const media = getRequest.result as MediaFile
        if (media) {
          media.lastAccessed = new Date()
          store.put(media)
        }
      }
    } catch (error) {
      console.error(
        `[${getTimestamp()}] mediaStorage.ts Failed to update media access time`,
        error
      )
    }
  }

  /**
   * 모든 미디어 파일 목록 조회
   */
  async getAllMedia(): Promise<MediaFile[]> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE], 'readonly')
      const store = transaction.objectStore(MEDIA_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const files = request.result as MediaFile[]
        console.log(
          `[${getTimestamp()}] mediaStorage.ts Retrieved ${files.length} media files`
        )
        resolve(files)
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] mediaStorage.ts Failed to get all media`
        )
        reject(new Error('Failed to get all media'))
      }
    })
  }

  /**
   * 프로젝트별 미디어 파일 조회
   */
  async getProjectMedia(projectId: string): Promise<MediaFile[]> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE], 'readonly')
      const store = transaction.objectStore(MEDIA_STORE)
      const index = store.index('projectId')
      const request = index.getAll(projectId)

      request.onsuccess = () => {
        const files = request.result as MediaFile[]
        console.log(
          `[${getTimestamp()}] mediaStorage.ts Retrieved ${files.length} media files for project: ${projectId}`
        )
        resolve(files)
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] mediaStorage.ts Failed to get project media`
        )
        reject(new Error('Failed to get project media'))
      }
    })
  }

  /**
   * 미디어 파일 삭제
   */
  async deleteMedia(mediaId: string): Promise<void> {
    await this.initialize()

    // 먼저 Blob URL 해제
    this.releaseBlobUrl(mediaId)

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE], 'readwrite')
      const store = transaction.objectStore(MEDIA_STORE)
      const request = store.delete(mediaId)

      request.onsuccess = () => {
        console.log(
          `[${getTimestamp()}] mediaStorage.ts Media deleted: ${mediaId}`
        )
        resolve()
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] mediaStorage.ts Failed to delete media`
        )
        reject(new Error('Failed to delete media'))
      }
    })
  }

  /**
   * 프로젝트의 모든 미디어 삭제
   */
  async deleteProjectMedia(projectId: string): Promise<void> {
    const files = await this.getProjectMedia(projectId)

    for (const file of files) {
      await this.deleteMedia(file.id)
    }

    console.log(
      `[${getTimestamp()}] mediaStorage.ts All media deleted for project: ${projectId}`
    )
  }

  /**
   * 스토리지 용량 정보
   */
  async getStorageInfo(): Promise<{
    used: number
    available: number
    total: number
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      const used = estimate.usage || 0
      const total = estimate.quota || 0
      const available = total - used

      console.log(
        `[${getTimestamp()}] mediaStorage.ts Storage: ${(used / 1024 / 1024).toFixed(2)}MB used of ${(total / 1024 / 1024).toFixed(2)}MB`
      )

      return { used, available, total }
    }

    return { used: 0, available: 0, total: 0 }
  }
}

export const mediaStorage = new MediaStorage()
