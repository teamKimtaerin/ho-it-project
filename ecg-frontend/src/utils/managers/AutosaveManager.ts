import { log, error as logError } from '@/utils/logger'
import { projectStorage } from '@/utils/storage/projectStorage'
import { ProjectData } from '@/app/(route)/editor/types/project'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type ProjectType = 'browser' | 'device' | 'cloud'

export interface SaveTriggerEvent {
  type: 'manual' | 'media_uploaded' | 'project_created' | 'bulk_edit' | 'auto'
  changeCount?: number
}

interface AutosaveConfig {
  enabled: boolean
  interval: number // seconds
  serverInterval: number // seconds for server save
  maxRetries: number
}

export class AutosaveManager {
  private static instance: AutosaveManager | null = null

  private projectId: string | null = null
  private projectType: ProjectType = 'browser'
  private saveTimer: NodeJS.Timeout | null = null
  private serverSaveTimer: NodeJS.Timeout | null = null
  private lastSaveTime: Date | null = null
  private lastServerSaveTime: Date | null = null
  private saveStatus: SaveStatus = 'idle'
  private changeCounter = 0
  private config: AutosaveConfig = {
    enabled: true,
    interval: 3, // 3 seconds for local
    serverInterval: 180, // 3 minutes for server
    maxRetries: 3,
  }
  private saveQueue: (() => Promise<void>)[] = []
  private isSaving = false
  private retryCount = 0
  private statusChangeCallbacks: ((status: SaveStatus) => void)[] = []

  private constructor() {
    // log('AutosaveManager.ts', 'AutosaveManager initialized')
    this.setupBeforeUnloadHandler()
  }

  static getInstance(): AutosaveManager {
    if (!AutosaveManager.instance) {
      AutosaveManager.instance = new AutosaveManager()
    }
    return AutosaveManager.instance
  }

  /**
   * 프로젝트 변경 시 호출
   */
  setProject(projectId: string, type: ProjectType = 'browser'): void {
    const oldProjectId = this.projectId
    const oldType = this.projectType

    if (oldProjectId !== projectId) {
      log(
        'AutosaveManager.ts',
        `Project changed: ${oldProjectId || ''} -> ${projectId}`
      )
    }

    if (oldType !== type) {
      // log('AutosaveManager.ts', `Project type changed: ${oldType} -> ${type}`)
    }

    this.projectId = projectId
    this.projectType = type

    // 파일 경로 로깅
    // log(
    //   'AutosaveManager.ts',
    //   `File path changed: ${oldProjectId || ''} -> ${projectId}`
    // )

    // 자동 저장 타이머 재시작
    this.restartAutosaveTimer()
  }

  /**
   * 자동 저장 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled

    if (enabled) {
      // log('AutosaveManager.ts', 'Autosave enabled')
      this.restartAutosaveTimer()
    } else {
      // log('AutosaveManager.ts', 'Autosave disabled')
      this.stopAutosaveTimer()
    }
  }

  /**
   * 자동 저장 간격 설정
   */
  setInterval(seconds: number): void {
    this.config.interval = seconds
    // log('AutosaveManager.ts', `Autosave interval changed to ${seconds} seconds`)

    if (this.config.enabled) {
      this.restartAutosaveTimer()
    }
  }

  /**
   * 중요 시점 판단
   */
  shouldTriggerServerSave(event?: SaveTriggerEvent): boolean {
    if (!this.config.enabled) return false

    const now = Date.now()
    const timeSinceLastServerSave = this.lastServerSaveTime
      ? now - this.lastServerSaveTime.getTime()
      : Infinity

    return (
      // 명시적 저장 (Cmd+S)
      event?.type === 'manual' ||
      // 대량 변경 (50개 이상)
      this.changeCounter >= 50 ||
      (event?.changeCount && event.changeCount >= 50) ||
      // 미디어 업로드 완료
      event?.type === 'media_uploaded' ||
      // 프로젝트 첫 생성
      event?.type === 'project_created' ||
      // 3분 경과
      timeSinceLastServerSave >= this.config.serverInterval * 1000
    )
  }

  /**
   * 변경사항 카운터 증가
   */
  incrementChangeCounter(count: number = 1): void {
    this.changeCounter += count
    // log('AutosaveManager.ts', `Change counter: ${this.changeCounter}`)
  }

  /**
   * 수동 저장 트리거
   */
  async save(
    projectData: ProjectData,
    event?: SaveTriggerEvent
  ): Promise<void> {
    if (!this.projectId) {
      logError('AutosaveManager.ts', 'No project ID set')
      return
    }

    // 저장 큐에 추가
    return new Promise((resolve, reject) => {
      this.saveQueue.push(async () => {
        try {
          await this.performSave(projectData, event)
          resolve()
        } catch (err) {
          reject(err)
        }
      })

      // 큐 처리 시작
      this.processSaveQueue()
    })
  }

  /**
   * 실제 저장 수행
   */
  private async performSave(
    projectData: ProjectData,
    event?: SaveTriggerEvent
  ): Promise<void> {
    this.setSaveStatus('saving')
    const startTime = Date.now()

    try {
      // 로컬 저장 (항상)
      await projectStorage.saveProject(projectData)
      projectStorage.saveCurrentProject(projectData)

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3)
      const sizeKB = JSON.stringify(projectData).length / 1024
      const sizeMB = (sizeKB / 1024).toFixed(2)

      log(
        'AutosaveManager.ts',
        `Project saved locally, elapsed: ${elapsed}s, size: ${sizeMB} MB`
      )

      this.lastSaveTime = new Date()
      this.setSaveStatus('saved')
      this.retryCount = 0

      // 서버 저장 체크 (나중에 API 구현 시 활성화)
      if (this.shouldTriggerServerSave(event)) {
        log(
          'AutosaveManager.ts',
          `Server save triggered (reason: ${event?.type || 'auto'})`
        )
        // TODO: 서버 저장 구현
        // await this.performServerSave(projectData)
        this.lastServerSaveTime = new Date()
        this.changeCounter = 0 // Reset counter after server save
      }
    } catch (err) {
      logError('AutosaveManager.ts', 'Failed to save project', err)
      this.setSaveStatus('error')

      // 재시도 로직
      if (this.retryCount < this.config.maxRetries) {
        this.retryCount++
        log(
          'AutosaveManager.ts',
          `Retrying save (${this.retryCount}/${this.config.maxRetries})`
        )

        // 1초 후 재시도
        setTimeout(() => {
          this.performSave(projectData, event)
        }, 1000)
      }
    }
  }

  /**
   * 저장 큐 처리
   */
  private async processSaveQueue(): Promise<void> {
    if (this.isSaving || this.saveQueue.length === 0) {
      return
    }

    this.isSaving = true

    while (this.saveQueue.length > 0) {
      const saveTask = this.saveQueue.shift()
      if (saveTask) {
        try {
          await saveTask()
        } catch (err) {
          logError('AutosaveManager.ts', 'Save task failed', err)
        }
      }
    }

    this.isSaving = false
  }

  /**
   * 자동 저장 타이머 시작
   */
  private restartAutosaveTimer(): void {
    this.stopAutosaveTimer()

    if (!this.config.enabled || !this.projectId) {
      return
    }

    // 로컬 저장 타이머
    this.saveTimer = setInterval(() => {
      // log('AutosaveManager.ts', 'Local autosave timer triggered')
      this.incrementChangeCounter()
    }, this.config.interval * 1000)

    // 서버 저장 타이머 (나중에 활성화)
    this.serverSaveTimer = setInterval(() => {
      // log('AutosaveManager.ts', 'Server autosave timer triggered')
      // TODO: 서버 저장 트리거
    }, this.config.serverInterval * 1000)
  }

  /**
   * 자동 저장 타이머 중지
   */
  private stopAutosaveTimer(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
      this.saveTimer = null
    }
    if (this.serverSaveTimer) {
      clearInterval(this.serverSaveTimer)
      this.serverSaveTimer = null
    }
  }

  /**
   * 저장 상태 설정
   */
  private setSaveStatus(status: SaveStatus): void {
    this.saveStatus = status

    // 상태 변경 콜백 호출
    this.statusChangeCallbacks.forEach((callback) => {
      callback(status)
    })
  }

  /**
   * 저장 상태 변경 리스너 등록
   */
  onStatusChange(callback: (status: SaveStatus) => void): () => void {
    this.statusChangeCallbacks.push(callback)

    // Unsubscribe 함수 반환
    return () => {
      const index = this.statusChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.statusChangeCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * 페이지 종료 전 저장
   */
  private setupBeforeUnloadHandler(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', (e) => {
        if (this.saveStatus === 'saving' || this.saveQueue.length > 0) {
          const message = '저장 중입니다. 페이지를 나가시겠습니까?'
          e.preventDefault()
          e.returnValue = message
          return message
        }
      })
    }
  }

  /**
   * 마지막 저장 시간 가져오기
   */
  getLastSaveTime(): Date | null {
    return this.lastSaveTime
  }

  /**
   * 현재 저장 상태 가져오기
   */
  getSaveStatus(): SaveStatus {
    return this.saveStatus
  }

  /**
   * 프로젝트 타입 가져오기
   */
  getProjectType(): ProjectType {
    return this.projectType
  }

  /**
   * 현재 프로젝트 ID 가져오기
   */
  getProjectId(): string | null {
    return this.projectId
  }

  /**
   * 정리
   */
  dispose(): void {
    this.stopAutosaveTimer()
    this.saveQueue = []
    this.statusChangeCallbacks = []
    // log('AutosaveManager.ts', 'AutosaveManager disposed')
  }
}
