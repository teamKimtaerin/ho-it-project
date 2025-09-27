import {
  ProjectData,
  SavedProject,
  ProjectStorage,
} from '@/app/(route)/editor/types/project'

class ServerProjectStorage implements ProjectStorage {
  private baseUrl = '/api/projects'

  async saveProject(project: ProjectData): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(project),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '프로젝트 저장에 실패했습니다.')
      }

      await response.json()
      console.log(`서버에 프로젝트 "${project.name}" 저장 완료`)
    } catch (error) {
      console.error('서버 저장 실패:', error)
      throw error
    }
  }

  async loadProject(id: string): Promise<ProjectData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        const error = await response.json()
        throw new Error(error.error || '프로젝트 불러오기에 실패했습니다.')
      }

      const result = await response.json()
      const project = result.project

      // Date 객체로 변환
      if (project.createdAt) {
        project.createdAt = new Date(project.createdAt)
      }
      if (project.updatedAt) {
        project.updatedAt = new Date(project.updatedAt)
      }

      return project
    } catch (error) {
      console.error('서버에서 프로젝트 로드 실패:', error)
      throw error
    }
  }

  async listProjects(): Promise<SavedProject[]> {
    try {
      const response = await fetch(`${this.baseUrl}/save`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '프로젝트 목록 조회에 실패했습니다.')
      }

      const result: {
        projects: Array<{
          id: string
          name: string
          lastModified: string
          [key: string]: unknown
        }>
      } = await response.json()
      return result.projects.map((project) => ({
        id: project.id,
        name: project.name,
        lastModified: new Date(project.lastModified),
        size: 0, // Server doesn't provide size yet, default to 0
      }))
    } catch (error) {
      console.error('서버에서 프로젝트 목록 조회 실패:', error)
      return []
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '프로젝트 삭제에 실패했습니다.')
      }

      console.log(`서버에서 프로젝트 ${id} 삭제 완료`)
    } catch (error) {
      console.error('서버에서 프로젝트 삭제 실패:', error)
      throw error
    }
  }

  async exportProject(
    id: string,
    format: 'srt' | 'vtt' | 'ass'
  ): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/export/${id}?format=${format}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '프로젝트 내보내기에 실패했습니다.')
      }

      return await response.text()
    } catch (error) {
      console.error('서버에서 프로젝트 내보내기 실패:', error)
      throw error
    }
  }

  // 파일 다운로드를 위한 헬퍼 메서드
  async downloadProject(
    id: string,
    format: 'srt' | 'vtt' | 'ass'
  ): Promise<void> {
    try {
      const project = await this.loadProject(id)
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.')
      }

      const response = await fetch(
        `${this.baseUrl}/export/${id}?format=${format}`
      )

      if (!response.ok) {
        throw new Error('파일 다운로드에 실패했습니다.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('파일 다운로드 실패:', error)
      throw error
    }
  }
}

// 하이브리드 저장소 - 로컬과 서버를 모두 사용
class HybridProjectStorage implements ProjectStorage {
  private localStorage: ProjectStorage
  private serverStorage: ProjectStorage

  constructor(localStorage: ProjectStorage, serverStorage: ProjectStorage) {
    this.localStorage = localStorage
    this.serverStorage = serverStorage
  }

  async saveProject(project: ProjectData): Promise<void> {
    // 로컬에 먼저 저장 (빠른 응답)
    await this.localStorage.saveProject(project)

    // 백그라운드에서 서버에 저장
    try {
      await this.serverStorage.saveProject(project)
    } catch (error) {
      console.warn('서버 저장 실패, 로컬에만 저장됨:', error)
      // 서버 저장 실패 시 사용자에게 알림을 줄 수 있음
    }
  }

  async loadProject(id: string): Promise<ProjectData | null> {
    // 서버에서 먼저 시도
    try {
      const serverProject = await this.serverStorage.loadProject(id)
      if (serverProject) {
        // 서버에서 성공적으로 로드했으면 로컬에도 저장
        await this.localStorage.saveProject(serverProject)
        return serverProject
      }
    } catch (error) {
      console.warn('서버에서 프로젝트 로드 실패, 로컬 시도:', error)
    }

    // 서버 실패 시 로컬에서 시도
    return await this.localStorage.loadProject(id)
  }

  async listProjects(): Promise<SavedProject[]> {
    try {
      // 서버 목록을 먼저 시도
      return await this.serverStorage.listProjects()
    } catch (error) {
      console.warn('서버 목록 조회 실패, 로컬 목록 사용:', error)
      // 서버 실패 시 로컬 목록 사용
      return await this.localStorage.listProjects()
    }
  }

  async deleteProject(id: string): Promise<void> {
    // 둘 다에서 삭제 시도
    await Promise.allSettled([
      this.localStorage.deleteProject(id),
      this.serverStorage.deleteProject(id),
    ])
  }

  async exportProject(
    id: string,
    format: 'srt' | 'vtt' | 'ass'
  ): Promise<string> {
    try {
      return await this.serverStorage.exportProject(id, format)
    } catch (error) {
      console.warn('서버 내보내기 실패, 로컬 시도:', error)
      return await this.localStorage.exportProject(id, format)
    }
  }
}

// 인스턴스 생성
export const serverProjectStorage = new ServerProjectStorage()

// 하이브리드 저장소를 기본으로 사용
import {
  projectStorage as localStorage,
  generateProjectId,
  defaultProjectSettings,
} from './projectStorage'
export const hybridProjectStorage = new HybridProjectStorage(
  localStorage,
  serverProjectStorage
)

// Re-export utilities
export { generateProjectId, defaultProjectSettings }
