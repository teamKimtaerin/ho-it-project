/**
 * IndexedDB 중앙 관리 시스템
 * 단일 데이터베이스 인스턴스를 관리하여 버전 충돌 방지
 */

import { getTimestamp } from '@/utils/logger'

const DB_NAME = 'ECGMediaStorage'
const DB_VERSION = 4

// Store names
export const STORES = {
  MEDIA: 'media',
  PROJECT_MEDIA: 'projectMedia',
  PROJECTS: 'projects',
  PROJECT_HISTORY: 'projectHistory',
  PROCESSING_RESULTS: 'processingResults',
} as const

export class DatabaseManager {
  private static instance: DatabaseManager | null = null
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  private constructor() {}

  /**
   * 싱글톤 인스턴스 가져오기
   */
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  /**
   * IndexedDB 지원 여부 확인
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window
  }

  /**
   * 데이터베이스 초기화
   */
  async initialize(): Promise<void> {
    // 이미 초기화됨
    if (this.db) return

    // 초기화 진행 중
    if (this.initPromise) return this.initPromise

    // IndexedDB 지원 확인
    if (!DatabaseManager.isSupported()) {
      throw new Error('IndexedDB is not supported in this browser')
    }

    this.initPromise = this.performInitialization()
    return this.initPromise
  }

  /**
   * 실제 초기화 수행
   */
  private async performInitialization(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => {
          const error = request.error
          console.error(
            `[${getTimestamp()}] DatabaseManager: Failed to open IndexedDB`,
            error
          )

          // 더 구체적인 에러 메시지 제공
          if (error?.name === 'VersionError') {
            reject(
              new Error('Database version conflict. Please refresh the page.')
            )
          } else if (error?.name === 'QuotaExceededError') {
            reject(
              new Error('Storage quota exceeded. Please free up some space.')
            )
          } else {
            reject(
              new Error(
                `Failed to open IndexedDB: ${error?.message || 'Unknown error'}`
              )
            )
          }
        }

        request.onsuccess = () => {
          this.db = request.result
          console.log(
            `[${getTimestamp()}] DatabaseManager: IndexedDB initialized successfully (version ${DB_VERSION})`
          )

          // 에러 핸들러 등록
          this.db.onerror = (event) => {
            console.error(
              `[${getTimestamp()}] DatabaseManager: Database error`,
              event
            )
          }

          // 연결 종료 핸들러
          this.db.onclose = () => {
            console.log(
              `[${getTimestamp()}] DatabaseManager: Database connection closed`
            )
            this.db = null
            this.initPromise = null
          }

          resolve()
        }

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          const oldVersion = event.oldVersion
          const newVersion = event.newVersion || DB_VERSION

          console.log(
            `[${getTimestamp()}] DatabaseManager: Upgrading database from version ${oldVersion} to ${newVersion}`
          )

          // 미디어 파일 저장소
          if (!db.objectStoreNames.contains(STORES.MEDIA)) {
            const mediaStore = db.createObjectStore(STORES.MEDIA, {
              keyPath: 'id',
            })
            mediaStore.createIndex('projectId', 'projectId', { unique: false })
            mediaStore.createIndex('fileName', 'fileName', { unique: false })
            console.log(
              `[${getTimestamp()}] DatabaseManager: Created ${STORES.MEDIA} store`
            )
          }

          // 프로젝트-미디어 연결 정보 저장소
          if (!db.objectStoreNames.contains(STORES.PROJECT_MEDIA)) {
            db.createObjectStore(STORES.PROJECT_MEDIA, {
              keyPath: 'projectId',
            })
            console.log(
              `[${getTimestamp()}] DatabaseManager: Created ${STORES.PROJECT_MEDIA} store`
            )
          }

          // 프로젝트 데이터 저장소
          if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
            const projectsStore = db.createObjectStore(STORES.PROJECTS, {
              keyPath: 'id',
            })
            projectsStore.createIndex('name', 'name', { unique: false })
            projectsStore.createIndex('updatedAt', 'updatedAt', {
              unique: false,
            })
            projectsStore.createIndex('createdAt', 'createdAt', {
              unique: false,
            })
            console.log(
              `[${getTimestamp()}] DatabaseManager: Created ${STORES.PROJECTS} store`
            )
          }

          // 프로젝트 히스토리 저장소
          if (!db.objectStoreNames.contains(STORES.PROJECT_HISTORY)) {
            const historyStore = db.createObjectStore(STORES.PROJECT_HISTORY, {
              keyPath: ['projectId', 'timestamp'],
            })
            historyStore.createIndex('projectId', 'projectId', {
              unique: false,
            })
            historyStore.createIndex('timestamp', 'timestamp', {
              unique: false,
            })
            console.log(
              `[${getTimestamp()}] DatabaseManager: Created ${STORES.PROJECT_HISTORY} store`
            )
          }

          // 처리 결과 저장소
          if (!db.objectStoreNames.contains(STORES.PROCESSING_RESULTS)) {
            const processingStore = db.createObjectStore(
              STORES.PROCESSING_RESULTS,
              {
                keyPath: 'jobId',
              }
            )
            processingStore.createIndex('status', 'status', { unique: false })
            processingStore.createIndex('createdAt', 'createdAt', {
              unique: false,
            })
            console.log(
              `[${getTimestamp()}] DatabaseManager: Created ${STORES.PROCESSING_RESULTS} store`
            )
          }

          console.log(
            `[${getTimestamp()}] DatabaseManager: Database schema update completed`
          )
        }

        request.onblocked = () => {
          console.warn(
            `[${getTimestamp()}] DatabaseManager: Database upgrade blocked. Please close other tabs.`
          )
        }
      } catch (error) {
        console.error(
          `[${getTimestamp()}] DatabaseManager: Initialization error`,
          error
        )
        reject(error)
      }
    })
  }

  /**
   * 데이터베이스 인스턴스 가져오기
   */
  async getDatabase(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize()
    }

    if (!this.db) {
      throw new Error('Database initialization failed')
    }

    return this.db
  }

  /**
   * 트랜잭션 생성 헬퍼
   */
  async createTransaction(
    storeNames: string | string[],
    mode: IDBTransactionMode = 'readonly'
  ): Promise<IDBTransaction> {
    const db = await this.getDatabase()
    return db.transaction(storeNames, mode)
  }

  /**
   * 데이터베이스 연결 종료
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
      console.log(
        `[${getTimestamp()}] DatabaseManager: Database connection closed`
      )
    }
  }

  /**
   * 데이터베이스 삭제 (디버그/테스트용)
   */
  static async deleteDatabase(): Promise<void> {
    const instance = DatabaseManager.getInstance()
    instance.close()

    return new Promise((resolve, reject) => {
      const deleteReq = indexedDB.deleteDatabase(DB_NAME)

      deleteReq.onsuccess = () => {
        console.log(`[${getTimestamp()}] DatabaseManager: Database deleted`)
        resolve()
      }

      deleteReq.onerror = () => {
        console.error(
          `[${getTimestamp()}] DatabaseManager: Failed to delete database`
        )
        reject(new Error('Failed to delete database'))
      }
    })
  }

  /**
   * 스토리지 사용량 확인
   */
  static async getStorageInfo(): Promise<{
    usage: number
    quota: number
  } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
        }
      } catch (error) {
        console.error(
          `[${getTimestamp()}] DatabaseManager: Failed to get storage info`,
          error
        )
        return null
      }
    }
    return null
  }
}

// 싱글톤 인스턴스 export
export const databaseManager = DatabaseManager.getInstance()
