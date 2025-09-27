/**
 * IndexedDB 기반 프로젝트 저장 시스템
 * localStorage의 용량 제한을 해결하고 대용량 자막 데이터 지원
 */

import {
  ProjectData,
  SavedProject,
  ProjectStorage,
} from '@/app/(route)/editor/types/project'
import { ClipItem } from '@/app/(route)/editor/types'
import { getTimestamp } from '@/utils/logger'
import { databaseManager, DatabaseManager, STORES } from './databaseManager'

// Store names from DatabaseManager
const PROJECTS_STORE = STORES.PROJECTS
const PROJECT_HISTORY_STORE = STORES.PROJECT_HISTORY

export interface ProjectHistoryEntry {
  projectId: string
  timestamp: number
  action: string
  data: unknown
  changeCount: number
}

class IndexedDBProjectStorage implements ProjectStorage {
  private isInitialized = false

  /**
   * IndexedDB 초기화 (DatabaseManager 사용)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await databaseManager.initialize()
      this.isInitialized = true
      console.log(
        `[${getTimestamp()}] indexedDBProjectStorage.ts Database initialized successfully`
      )
    } catch (error) {
      console.error(
        `[${getTimestamp()}] indexedDBProjectStorage.ts Failed to initialize database:`,
        error
      )
      throw error
    }
  }

  /**
   * 프로젝트 저장
   */
  async saveProject(project: ProjectData): Promise<void> {
    await this.initialize()

    // 저장 시간 업데이트
    const updatedProject = {
      ...project,
      updatedAt: new Date(),
    }

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readwrite')
      const store = transaction.objectStore(PROJECTS_STORE)
      const request = store.put(updatedProject)

      request.onsuccess = () => {
        // console.log(
        //   `[${getTimestamp()}] indexedDBProjectStorage.ts Project "${project.name}" saved successfully`
        // )
        resolve()
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] indexedDBProjectStorage.ts Failed to save project`,
          request.error
        )
        reject(new Error('Failed to save project'))
      }
    })
  }

  /**
   * 프로젝트 로드
   */
  async loadProject(id: string): Promise<ProjectData | null> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readonly')
      const store = transaction.objectStore(PROJECTS_STORE)
      const request = store.get(id)

      request.onsuccess = () => {
        const project = request.result as ProjectData | undefined
        if (project) {
          console.log(
            `[${getTimestamp()}] indexedDBProjectStorage.ts Project "${project.name}" loaded successfully`
          )
        }
        resolve(project || null)
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] indexedDBProjectStorage.ts Failed to load project`,
          request.error
        )
        reject(new Error('Failed to load project'))
      }
    })
  }

  /**
   * 모든 프로젝트 목록 조회
   */
  async getProjects(): Promise<SavedProject[]> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readonly')
      const store = transaction.objectStore(PROJECTS_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const projects = request.result as ProjectData[]
        const savedProjects: SavedProject[] = projects.map((p) => ({
          id: p.id,
          name: p.name,
          lastModified: p.updatedAt,
          size: JSON.stringify(p).length, // Estimate size in bytes
        }))

        console.log(
          `[${getTimestamp()}] indexedDBProjectStorage.ts Retrieved ${savedProjects.length} projects`
        )
        resolve(savedProjects)
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] indexedDBProjectStorage.ts Failed to get projects`,
          request.error
        )
        reject(new Error('Failed to get projects'))
      }
    })
  }

  /**
   * 프로젝트 삭제
   */
  async deleteProject(id: string): Promise<void> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readwrite')
      const store = transaction.objectStore(PROJECTS_STORE)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log(
          `[${getTimestamp()}] indexedDBProjectStorage.ts Project deleted: ${id}`
        )
        resolve()
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] indexedDBProjectStorage.ts Failed to delete project`,
          request.error
        )
        reject(new Error('Failed to delete project'))
      }
    })
  }

  /**
   * 프로젝트 존재 여부 확인
   */
  async hasProject(id: string): Promise<boolean> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readonly')
      const store = transaction.objectStore(PROJECTS_STORE)
      const request = store.count(id)

      request.onsuccess = () => {
        resolve(request.result > 0)
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] indexedDBProjectStorage.ts Failed to check project existence`,
          request.error
        )
        reject(new Error('Failed to check project existence'))
      }
    })
  }

  /**
   * 모든 프로젝트 삭제
   */
  async clearAll(): Promise<void> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readwrite')
      const store = transaction.objectStore(PROJECTS_STORE)
      const request = store.clear()

      request.onsuccess = () => {
        console.log(
          `[${getTimestamp()}] indexedDBProjectStorage.ts All projects cleared`
        )
        resolve()
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] indexedDBProjectStorage.ts Failed to clear projects`,
          request.error
        )
        reject(new Error('Failed to clear projects'))
      }
    })
  }

  /**
   * 프로젝트 히스토리 저장 (undo/redo용)
   */
  async saveProjectHistory(entry: ProjectHistoryEntry): Promise<void> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECT_HISTORY_STORE], 'readwrite')
      const store = transaction.objectStore(PROJECT_HISTORY_STORE)
      const request = store.add(entry)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] indexedDBProjectStorage.ts Failed to save project history`,
          request.error
        )
        reject(new Error('Failed to save project history'))
      }
    })
  }

  /**
   * 프로젝트 히스토리 조회
   */
  async getProjectHistory(
    projectId: string,
    limit: number = 100
  ): Promise<ProjectHistoryEntry[]> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECT_HISTORY_STORE], 'readonly')
      const store = transaction.objectStore(PROJECT_HISTORY_STORE)
      const index = store.index('projectId')

      const request = index.getAll(projectId)

      request.onsuccess = () => {
        let history = request.result as ProjectHistoryEntry[]
        // 최신 순으로 정렬하고 제한
        history = history
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit)
        resolve(history)
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] indexedDBProjectStorage.ts Failed to get project history`,
          request.error
        )
        reject(new Error('Failed to get project history'))
      }
    })
  }

  /**
   * 프로젝트 히스토리 삭제
   */
  async clearProjectHistory(projectId: string): Promise<void> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECT_HISTORY_STORE], 'readwrite')
      const store = transaction.objectStore(PROJECT_HISTORY_STORE)
      const index = store.index('projectId')

      const request = index.openCursor(IDBKeyRange.only(projectId))

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] indexedDBProjectStorage.ts Failed to clear project history`,
          request.error
        )
        reject(new Error('Failed to clear project history'))
      }
    })
  }

  /**
   * 원본 클립 데이터 저장
   */
  async saveOriginalClips(projectId: string, clips: ClipItem[]): Promise<void> {
    await this.initialize()

    const project = await this.loadProject(projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    // 프로젝트에 원본 클립 데이터 추가
    const updatedProject = {
      ...project,
      originalClips: clips,
      updatedAt: new Date(),
    }

    await this.saveProject(updatedProject)

    console.log(
      `[${getTimestamp()}] indexedDBProjectStorage.ts Original clips saved for project: ${projectId}`
    )
  }

  /**
   * 원본 클립 데이터 로드
   */
  async loadOriginalClips(projectId: string): Promise<ClipItem[] | null> {
    const project = await this.loadProject(projectId)
    if (!project) {
      return null
    }

    const projectWithClips = project as ProjectData & {
      originalClips?: ClipItem[]
    }
    return projectWithClips.originalClips || null
  }

  /**
   * 스토리지 상태 확인
   */
  async getStorageInfo(): Promise<{
    projectCount: number
    storageUsed: number
    storageAvailable: number
  }> {
    await this.initialize()

    const projects = await this.getProjects()
    const storageInfo = await DatabaseManager.getStorageInfo()

    return {
      projectCount: projects.length,
      storageUsed: storageInfo?.usage || 0,
      storageAvailable: storageInfo?.quota || 0,
    }
  }

  /**
   * 프로젝트 목록 조회 (ProjectStorage 인터페이스 구현)
   */
  async listProjects(): Promise<SavedProject[]> {
    return this.getProjects()
  }

  /**
   * 프로젝트 내보내기 (ProjectStorage 인터페이스 구현)
   */
  async exportProject(
    id: string,
    format: 'srt' | 'vtt' | 'ass'
  ): Promise<string> {
    const project = await this.loadProject(id)
    if (!project) {
      throw new Error('Project not found')
    }

    // Format conversion logic would go here
    // For now, return a placeholder
    return `Exported project ${project.name} as ${format}`
  }
}

// 싱글톤 인스턴스 생성
export const indexedDBProjectStorage = new IndexedDBProjectStorage()
