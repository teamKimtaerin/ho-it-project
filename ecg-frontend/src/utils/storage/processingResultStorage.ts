/**
 * 음성 분석 처리 결과를 IndexedDB에 저장/로드하는 유틸리티
 */

import { ProcessingResult } from '@/services/api/types/upload.types'
import { getTimestamp } from '@/utils/logger'
import { databaseManager, STORES } from './databaseManager'

export interface StoredProcessingResult extends ProcessingResult {
  createdAt: Date
  metadata?: {
    fileName?: string
    projectId?: string
    videoUrl?: string
  }
}

class ProcessingResultStorage {
  private isInitialized = false

  /**
   * IndexedDB 초기화
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await databaseManager.initialize()
      this.isInitialized = true
      console.log(
        `[${getTimestamp()}] processingResultStorage.ts Database initialized successfully`
      )
    } catch (error) {
      console.error(
        `[${getTimestamp()}] processingResultStorage.ts Failed to initialize database:`,
        error
      )
      throw error
    }
  }

  /**
   * 처리 결과 저장
   */
  async saveResult(
    jobId: string,
    result: ProcessingResult,
    metadata?: { fileName?: string; projectId?: string; videoUrl?: string }
  ): Promise<void> {
    await this.initialize()

    const storedResult: StoredProcessingResult = {
      ...result,
      createdAt: new Date(),
      metadata,
    }

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PROCESSING_RESULTS],
        'readwrite'
      )
      const store = transaction.objectStore(STORES.PROCESSING_RESULTS)
      const request = store.put(storedResult)

      request.onsuccess = () => {
        console.log(
          `[${getTimestamp()}] processingResultStorage.ts Processing result saved for job: ${jobId}`
        )
        resolve()
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] processingResultStorage.ts Failed to save processing result`,
          request.error
        )
        reject(new Error('Failed to save processing result'))
      }
    })
  }

  /**
   * 처리 결과 로드
   */
  async loadResult(jobId: string): Promise<StoredProcessingResult | null> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PROCESSING_RESULTS],
        'readonly'
      )
      const store = transaction.objectStore(STORES.PROCESSING_RESULTS)
      const request = store.get(jobId)

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          // Date 객체 복원
          result.createdAt = new Date(result.createdAt)
          console.log(
            `[${getTimestamp()}] processingResultStorage.ts Processing result loaded for job: ${jobId}`
          )
        }
        resolve(result || null)
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] processingResultStorage.ts Failed to load processing result`,
          request.error
        )
        reject(new Error('Failed to load processing result'))
      }
    })
  }

  /**
   * 처리 결과 삭제
   */
  async deleteResult(jobId: string): Promise<void> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PROCESSING_RESULTS],
        'readwrite'
      )
      const store = transaction.objectStore(STORES.PROCESSING_RESULTS)
      const request = store.delete(jobId)

      request.onsuccess = () => {
        console.log(
          `[${getTimestamp()}] processingResultStorage.ts Processing result deleted for job: ${jobId}`
        )
        resolve()
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] processingResultStorage.ts Failed to delete processing result`,
          request.error
        )
        reject(new Error('Failed to delete processing result'))
      }
    })
  }

  /**
   * 처리 결과 존재 여부 확인
   */
  async hasResult(jobId: string): Promise<boolean> {
    try {
      const result = await this.loadResult(jobId)
      return result !== null
    } catch {
      return false
    }
  }

  /**
   * 모든 처리 결과 목록 조회
   */
  async listResults(): Promise<StoredProcessingResult[]> {
    await this.initialize()

    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PROCESSING_RESULTS],
        'readonly'
      )
      const store = transaction.objectStore(STORES.PROCESSING_RESULTS)
      const request = store.getAll()

      request.onsuccess = () => {
        const results = request.result || []
        // Date 객체 복원
        results.forEach((result) => {
          result.createdAt = new Date(result.createdAt)
        })
        // 최신순으로 정렬
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        resolve(results)
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] processingResultStorage.ts Failed to list processing results`,
          request.error
        )
        reject(new Error('Failed to list processing results'))
      }
    })
  }

  /**
   * 오래된 결과 삭제 (7일 이상된 것들)
   */
  async cleanupOldResults(): Promise<void> {
    await this.initialize()

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const db = await databaseManager.getDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PROCESSING_RESULTS],
        'readwrite'
      )
      const store = transaction.objectStore(STORES.PROCESSING_RESULTS)
      const index = store.index('createdAt')
      const request = index.openCursor(IDBKeyRange.upperBound(sevenDaysAgo))

      let deletedCount = 0
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        } else {
          if (deletedCount > 0) {
            console.log(
              `[${getTimestamp()}] processingResultStorage.ts Cleaned up ${deletedCount} old processing results`
            )
          }
          resolve()
        }
      }

      request.onerror = () => {
        console.error(
          `[${getTimestamp()}] processingResultStorage.ts Failed to cleanup old results`,
          request.error
        )
        reject(new Error('Failed to cleanup old results'))
      }
    })
  }
}

// 싱글톤 인스턴스 생성
export const processingResultStorage = new ProcessingResultStorage()
