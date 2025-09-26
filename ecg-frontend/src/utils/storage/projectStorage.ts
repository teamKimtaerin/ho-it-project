import {
  ProjectData,
  SavedProject,
  ProjectStorage,
  ProjectSettings,
} from '@/app/(route)/editor/types/project'
import { ClipItem } from '@/app/(route)/editor/types'
import { indexedDBProjectStorage } from './indexedDBProjectStorage'
import { migrationManager } from './migrationManager'

const STORAGE_KEY = 'ecg-projects'
const CURRENT_PROJECT_KEY = 'ecg-current-project'

/**
 * @deprecated LocalProjectStorage는 IndexedDB로 마이그레이션되었습니다.
 * 호환성을 위해 유지되지만 새로운 코드에서는 사용하지 마세요.
 */
class LocalProjectStorage implements ProjectStorage {
  async saveProject(project: ProjectData): Promise<void> {
    try {
      // Get existing projects
      const projects = await this.getStoredProjects()

      // Update or add project
      const existingIndex = projects.findIndex((p) => p.id === project.id)
      if (existingIndex >= 0) {
        projects[existingIndex] = project
      } else {
        projects.push(project)
      }

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))

      // console.log(`Project "${project.name}" saved successfully`)
    } catch (error) {
      console.error('Failed to save project:', error)
      throw new Error('프로젝트 저장에 실패했습니다.')
    }
  }

  async loadProject(id: string): Promise<ProjectData | null> {
    try {
      const projects = await this.getStoredProjects()
      const project = projects.find((p) => p.id === id)

      if (project) {
        // Convert date strings back to Date objects
        project.createdAt = new Date(project.createdAt)
        project.updatedAt = new Date(project.updatedAt)
      }

      return project || null
    } catch (error) {
      console.error('Failed to load project:', error)
      throw new Error('프로젝트 불러오기에 실패했습니다.')
    }
  }

  async listProjects(): Promise<SavedProject[]> {
    try {
      const projects = await this.getStoredProjects()

      return projects
        .map((project) => ({
          id: project.id,
          name: project.name,
          lastModified: new Date(project.updatedAt),
          size: JSON.stringify(project).length, // Approximate size in bytes
        }))
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
    } catch (error) {
      console.error('Failed to list projects:', error)
      return []
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      const projects = await this.getStoredProjects()
      const filteredProjects = projects.filter((p) => p.id !== id)

      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredProjects))
      console.log(`Project ${id} deleted successfully`)
    } catch (error) {
      console.error('Failed to delete project:', error)
      throw new Error('프로젝트 삭제에 실패했습니다.')
    }
  }

  async exportProject(
    id: string,
    format: 'srt' | 'vtt' | 'ass'
  ): Promise<string> {
    try {
      const project = await this.loadProject(id)
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.')
      }

      return this.convertToSubtitleFormat(project, format)
    } catch (error) {
      console.error('Failed to export project:', error)
      throw new Error('프로젝트 내보내기에 실패했습니다.')
    }
  }

  // Helper methods
  private async getStoredProjects(): Promise<ProjectData[]> {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  }

  private convertToSubtitleFormat(
    project: ProjectData,
    format: 'srt' | 'vtt' | 'ass'
  ): string {
    switch (format) {
      case 'srt':
        return this.convertToSRT(project)
      case 'vtt':
        return this.convertToVTT(project)
      case 'ass':
        return this.convertToASS(project)
      default:
        throw new Error('지원하지 않는 형식입니다.')
    }
  }

  private convertToSRT(project: ProjectData): string {
    let srt = ''
    project.clips.forEach((clip, index) => {
      const startTime = this.formatSRTTime(clip.words[0]?.start || 0)
      const endTime = this.formatSRTTime(
        clip.words[clip.words.length - 1]?.end || 0
      )

      srt += `${index + 1}\n`
      srt += `${startTime} --> ${endTime}\n`
      srt += `${clip.fullText}\n\n`
    })
    return srt
  }

  private convertToVTT(project: ProjectData): string {
    let vtt = 'WEBVTT\n\n'
    project.clips.forEach((clip) => {
      const startTime = this.formatVTTTime(clip.words[0]?.start || 0)
      const endTime = this.formatVTTTime(
        clip.words[clip.words.length - 1]?.end || 0
      )

      vtt += `${startTime} --> ${endTime}\n`
      vtt += `${clip.fullText}\n\n`
    })
    return vtt
  }

  private convertToASS(project: ProjectData): string {
    let ass = '[Script Info]\nTitle: ECG Project\nScriptType: v4.00+\n\n'
    ass +=
      '[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n'
    ass +=
      'Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1\n\n'
    ass +=
      '[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'

    project.clips.forEach((clip) => {
      const startTime = this.formatASSTime(clip.words[0]?.start || 0)
      const endTime = this.formatASSTime(
        clip.words[clip.words.length - 1]?.end || 0
      )

      ass += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${clip.fullText}\n`
    })
    return ass
  }

  private formatSRTTime(seconds: number): string {
    const date = new Date(seconds * 1000)
    const hours = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    const secs = date.getUTCSeconds().toString().padStart(2, '0')
    const ms = date.getUTCMilliseconds().toString().padStart(3, '0')
    return `${hours}:${minutes}:${secs},${ms}`
  }

  private formatVTTTime(seconds: number): string {
    const date = new Date(seconds * 1000)
    const hours = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    const secs = date.getUTCSeconds().toString().padStart(2, '0')
    const ms = date.getUTCMilliseconds().toString().padStart(3, '0')
    return `${hours}:${minutes}:${secs}.${ms}`
  }

  private formatASSTime(seconds: number): string {
    const date = new Date(seconds * 1000)
    const hours = Math.floor(seconds / 3600)
      .toString()
      .padStart(1, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    const secs = date.getUTCSeconds().toString().padStart(2, '0')
    const centiseconds = Math.floor(date.getUTCMilliseconds() / 10)
      .toString()
      .padStart(2, '0')
    return `${hours}:${minutes}:${secs}.${centiseconds}`
  }

  // Auto-save current project state
  saveCurrentProject(project: ProjectData): void {
    try {
      localStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify(project))
    } catch (error) {
      console.error('Failed to save current project state:', error)
    }
  }

  loadCurrentProject(): ProjectData | null {
    try {
      const stored = localStorage.getItem(CURRENT_PROJECT_KEY)
      if (stored) {
        const project = JSON.parse(stored)
        project.createdAt = new Date(project.createdAt)
        project.updatedAt = new Date(project.updatedAt)
        return project
      }
      return null
    } catch (error) {
      console.error('Failed to load current project state:', error)
      return null
    }
  }

  clearCurrentProject(): void {
    localStorage.removeItem(CURRENT_PROJECT_KEY)
  }
}

/**
 * IndexedDB 기반 프로젝트 저장소 (마이그레이션 지원)
 */
class MigratedProjectStorage implements ProjectStorage {
  private initialized = false

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return

    // 마이그레이션 실행
    if (migrationManager.needsMigration()) {
      console.log('Starting localStorage to IndexedDB migration...')
      const result = await migrationManager.migrate()

      if (!result.success) {
        console.warn('Migration failed, some errors occurred:', result.errors)
        // 마이그레이션이 실패해도 IndexedDB는 사용 가능
      } else {
        console.log(
          `Migration completed: ${result.migratedCount} projects migrated`
        )
      }
    }

    // IndexedDB 초기화
    await indexedDBProjectStorage.initialize()
    this.initialized = true
  }

  async saveProject(project: ProjectData): Promise<void> {
    await this.ensureInitialized()
    return indexedDBProjectStorage.saveProject(project)
  }

  async loadProject(id: string): Promise<ProjectData | null> {
    await this.ensureInitialized()
    return indexedDBProjectStorage.loadProject(id)
  }

  async listProjects(): Promise<SavedProject[]> {
    await this.ensureInitialized()
    return indexedDBProjectStorage.listProjects()
  }

  async deleteProject(id: string): Promise<void> {
    await this.ensureInitialized()
    return indexedDBProjectStorage.deleteProject(id)
  }

  async exportProject(
    id: string,
    format: 'srt' | 'vtt' | 'ass'
  ): Promise<string> {
    await this.ensureInitialized()
    return indexedDBProjectStorage.exportProject(id, format)
  }

  // 원본 클립 데이터 관리
  async saveOriginalClips(
    projectId: string,
    originalClips: ClipItem[]
  ): Promise<void> {
    await this.ensureInitialized()
    return indexedDBProjectStorage.saveOriginalClips(projectId, originalClips)
  }

  async loadOriginalClips(projectId: string): Promise<ClipItem[] | null> {
    await this.ensureInitialized()
    return indexedDBProjectStorage.loadOriginalClips(projectId)
  }

  // 마이그레이션 유틸리티
  getMigrationStatus() {
    return migrationManager.getMigrationStatus()
  }

  async rollbackMigration(): Promise<boolean> {
    return migrationManager.rollback()
  }

  // Legacy compatibility methods
  loadCurrentProject(): ProjectData | null {
    // 임시로 레거시 localStorage에서 읽기 (마이그레이션 전까지)
    return legacyProjectStorage.loadCurrentProject()
  }

  saveCurrentProject(project: ProjectData): void {
    // 임시로 레거시 localStorage에 저장 (호환성)
    legacyProjectStorage.saveCurrentProject(project)
  }

  clearCurrentProject(): void {
    legacyProjectStorage.clearCurrentProject()
  }
}

// Export project storage instance (IndexedDB 기반)
export const projectStorage = new MigratedProjectStorage()

// 레거시 지원용 (기존 localStorage 저장소)
export const legacyProjectStorage = new LocalProjectStorage()

// Default project settings
export const defaultProjectSettings: ProjectSettings = {
  autoSaveEnabled: true,
  autoSaveInterval: 3, // 3 seconds
  defaultSpeaker: 'Speaker 1',
  exportFormat: 'srt',
}

// Utility functions
export function generateProjectId(): string {
  return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function createNewProject(name: string = '새 프로젝트'): ProjectData {
  return {
    id: generateProjectId(),
    name,
    clips: [],
    settings: defaultProjectSettings,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
