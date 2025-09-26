/**
 * 프로젝트 정보 관리자
 * Vrew 스타일의 프로젝트 메타데이터 관리
 */

import { log } from '@/utils/logger'

export interface MediaInfo {
  type: 'VIDEO_AUDIO' | 'VIDEO' | 'AUDIO' | 'IMAGE' | 'ASSET_VIDEO'
  fileName: string
  videoCodec?: string
  audioCodec?: string
  videoSize?: string
  frameRate?: number
  audioSampleRate?: number
  size: string // formatted string (e.g., "4.27 MB")
  duration: string // formatted string (e.g., "2분 23초")
  bitrate?: number
}

export interface ProjectInfo {
  id: string
  name: string
  version: string
  createdAt: Date
  updatedAt: Date
  stage: 'draft' | 'release'
  loadCount: number
  saveCount: number
  size: string // formatted string
  media: MediaInfo[]
  totalMediaCount: number
}

export type ProjectOpenType = 'newProject' | 'existingProject' | 'recovery'

class ProjectInfoManager {
  private static instance: ProjectInfoManager | null = null
  private currentProject: ProjectInfo | null = null
  private mediaList: MediaInfo[] = []

  private constructor() {
    log('ProjectInfoManager.ts', 'ProjectInfoManager initialized')
  }

  static getInstance(): ProjectInfoManager {
    if (!ProjectInfoManager.instance) {
      ProjectInfoManager.instance = new ProjectInfoManager()
    }
    return ProjectInfoManager.instance
  }

  /**
   * 프로젝트 열기 알림
   */
  notifyFileOpen(
    type: 'browser' | 'device' | 'cloud',
    openType: ProjectOpenType,
    projectInfo?: Partial<ProjectInfo>
  ): void {
    const openTypeStr =
      openType === 'newProject'
        ? 'newProject: true'
        : openType === 'recovery'
          ? 'recovery: true'
          : 'existingProject: true'

    log(
      'ProjectInfoManager.ts',
      `ProjectInfoMgr.notifyFileOpen(type: ${type}, ${openTypeStr})`
    )

    if (projectInfo) {
      this.updateProjectInfo(projectInfo)
    }

    // 미디어 정보 로깅
    if (this.mediaList.length > 0) {
      log('ProjectInfoManager.ts', `total media len : ${this.mediaList.length}`)
    }
  }

  /**
   * 프로젝트 정보 업데이트
   */
  updateProjectInfo(info: Partial<ProjectInfo>): void {
    if (!this.currentProject) {
      this.currentProject = {
        id: info.id || '',
        name: info.name || '새 프로젝트',
        version: info.version || '1.0.0',
        createdAt: info.createdAt || new Date(),
        updatedAt: info.updatedAt || new Date(),
        stage: info.stage || 'draft',
        loadCount: info.loadCount || 0,
        saveCount: info.saveCount || 0,
        size: info.size || '0 MB',
        media: info.media || [],
        totalMediaCount: info.totalMediaCount || 0,
      }
    } else {
      Object.assign(this.currentProject, info)
    }

    this.currentProject.updatedAt = new Date()

    if (info.media) {
      this.mediaList = info.media
    }
  }

  /**
   * 미디어 추가
   */
  addMedia(media: MediaInfo): void {
    this.mediaList.push(media)

    // 미디어 정보 로깅 (Vrew 스타일)
    const mediaLog: Record<string, unknown> = {
      type: media.type,
      fileName: media.fileName,
    }

    if (media.videoCodec) {
      mediaLog.videoCodec = media.videoCodec
      mediaLog.videoSize = media.videoSize
      mediaLog.frameRate = media.frameRate
    }

    if (media.audioCodec) {
      mediaLog.audioCodec = media.audioCodec
      mediaLog.audioSampleRate = media.audioSampleRate
    }

    mediaLog.size = media.size
    mediaLog.duration = media.duration

    console.log(JSON.stringify(mediaLog))

    if (this.currentProject) {
      this.currentProject.media = this.mediaList
      this.currentProject.totalMediaCount = this.mediaList.length
    }

    log(
      'ProjectInfoManager.ts',
      `Media added: ${media.fileName} (${media.type})`
    )
  }

  /**
   * 프로젝트 로드 완료 로깅
   */
  logProjectLoaded(elapsed: number, size: number): void {
    const elapsedStr = elapsed.toFixed(3)
    const sizeMB = (size / 1024 / 1024).toFixed(2)

    const projectId = this.currentProject?.id || 'unknown'
    // projectName is not used - removed to fix lint warning

    log(
      'vrewfile.ts',
      `vrewfile ${projectId} loaded, elapsed : ${elapsedStr}s, size: ${sizeMB} MB`
    )

    // 프로젝트 정보 상세 로깅 (Vrew 스타일)
    if (this.currentProject) {
      const projectLog = {
        updated: {
          version: this.currentProject.version,
          date: this.formatDate(this.currentProject.updatedAt),
          stage: this.currentProject.stage,
        },
        loadCount: this.currentProject.loadCount + 1,
        saveCount: this.currentProject.saveCount,
        size: `${sizeMB} MB`,
      }

      console.log(JSON.stringify(projectLog))

      // 미디어 정보 로깅
      this.mediaList.forEach((media) => {
        const mediaLog: Record<string, unknown> = {
          type: media.type,
          fileName: media.fileName,
        }

        if (media.videoSize) mediaLog.videoSize = media.videoSize
        if (media.frameRate) mediaLog.frameRate = media.frameRate
        if (media.videoCodec) mediaLog.codec = media.videoCodec

        mediaLog.size = media.size
        mediaLog.duration = media.duration

        console.log(JSON.stringify(mediaLog))
      })

      // 로드 카운트 증가
      this.currentProject.loadCount++
    }
  }

  /**
   * 프로젝트 저장 카운트 증가
   */
  incrementSaveCount(): void {
    if (this.currentProject) {
      this.currentProject.saveCount++
      log(
        'ProjectInfoManager.ts',
        `Save count: ${this.currentProject.saveCount}`
      )
    }
  }

  /**
   * 바이트를 포맷된 문자열로 변환
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 초를 포맷된 문자열로 변환
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}시간 ${minutes}분 ${secs}초`
    } else if (minutes > 0) {
      return `${minutes}분 ${secs}초`
    } else {
      return `${secs}초`
    }
  }

  /**
   * 날짜 포맷
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    const offset = -date.getTimezoneOffset()
    const offsetHours = Math.floor(Math.abs(offset) / 60)
    const offsetMinutes = Math.abs(offset) % 60
    const offsetSign = offset >= 0 ? '+' : '-'
    const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`
  }

  /**
   * 현재 프로젝트 정보 가져오기
   */
  getCurrentProject(): ProjectInfo | null {
    return this.currentProject
  }

  /**
   * 미디어 리스트 가져오기
   */
  getMediaList(): MediaInfo[] {
    return this.mediaList
  }

  /**
   * 프로젝트 정보 초기화
   */
  reset(): void {
    this.currentProject = null
    this.mediaList = []
    log('ProjectInfoManager.ts', 'Project info reset')
  }

  /**
   * 비디오 메타데이터 추출 (Helper)
   */
  async extractVideoMetadata(file: File): Promise<Partial<MediaInfo>> {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'

      video.onloadedmetadata = () => {
        const info: Partial<MediaInfo> = {
          type: 'VIDEO_AUDIO',
          fileName: file.name,
          videoSize: `${video.videoWidth}x${video.videoHeight}`,
          duration: this.formatDuration(video.duration),
          size: this.formatBytes(file.size),
        }

        // Clean up
        URL.revokeObjectURL(video.src)
        video.remove()

        resolve(info)
      }

      video.onerror = () => {
        // Fallback if metadata extraction fails
        resolve({
          type: 'VIDEO_AUDIO',
          fileName: file.name,
          size: this.formatBytes(file.size),
          duration: '알 수 없음',
        })
      }

      video.src = URL.createObjectURL(file)
    })
  }
}

// Singleton instance
export const projectInfoManager = ProjectInfoManager.getInstance()
