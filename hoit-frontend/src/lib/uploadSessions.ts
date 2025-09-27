import { UploadProgress } from '@/app/(route)/editor/components/Export/ExportTypes'

/**
 * YouTube 업로드 세션 정보를 저장하는 인터페이스
 */
export interface UploadSession {
  id: string
  progress: UploadProgress
  createdAt: number
  lastUpdated: number
  isCompleted: boolean
  videoUrl?: string
  error?: string
}

/**
 * 업로드 세션을 관리하는 글로벌 스토어
 * 실제 운영환경에서는 Redis나 다른 영구 저장소 사용 권장
 */
class UploadSessionStore {
  private sessions = new Map<string, UploadSession>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // 5분마다 완료된 세션 정리
    this.startCleanupInterval()
  }

  /**
   * 새 업로드 세션 생성
   */
  createSession(
    sessionId: string,
    initialProgress: UploadProgress
  ): UploadSession {
    const session: UploadSession = {
      id: sessionId,
      progress: initialProgress,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      isCompleted: false,
    }

    this.sessions.set(sessionId, session)
    return session
  }

  /**
   * 세션 진행률 업데이트
   */
  updateSession(sessionId: string, progress: UploadProgress): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    session.progress = progress
    session.lastUpdated = Date.now()

    // 완료 또는 에러 상태 체크
    if (progress.status === 'completed') {
      session.isCompleted = true
      // 업로드 URL 추출 시도
      const urlMatch = progress.message.match(
        /https:\/\/(?:www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]+/
      )
      if (urlMatch) {
        session.videoUrl = urlMatch[0]
      }
    } else if (progress.status === 'error') {
      session.isCompleted = true
      session.error = progress.error || progress.message
    }

    return true
  }

  /**
   * 세션 조회
   */
  getSession(sessionId: string): UploadSession | null {
    return this.sessions.get(sessionId) || null
  }

  /**
   * 모든 활성 세션 조회
   */
  getAllSessions(): UploadSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * 세션 삭제
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId)
  }

  /**
   * 세션 존재 여부 확인
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId)
  }

  /**
   * 세션 개수 조회
   */
  getSessionCount(): number {
    return this.sessions.size
  }

  /**
   * 완료된 세션들 정리
   */
  cleanupCompletedSessions(maxAge: number = 300000): number {
    // 기본 5분
    let cleanedCount = 0
    const now = Date.now()

    for (const [sessionId, session] of this.sessions) {
      const shouldCleanup =
        session.isCompleted && now - session.lastUpdated > maxAge

      if (shouldCleanup) {
        this.sessions.delete(sessionId)
        cleanedCount++
      }
    }

    return cleanedCount
  }

  /**
   * 오래된 세션들 정리 (완료되지 않았지만 너무 오래된 것들)
   */
  cleanupStaleSessions(maxAge: number = 1800000): number {
    // 기본 30분
    let cleanedCount = 0
    const now = Date.now()

    for (const [sessionId, session] of this.sessions) {
      const shouldCleanup =
        !session.isCompleted && now - session.createdAt > maxAge

      if (shouldCleanup) {
        this.sessions.delete(sessionId)
        cleanedCount++
      }
    }

    return cleanedCount
  }

  /**
   * 정기적인 세션 정리 시작
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.cleanupInterval = setInterval(() => {
      const completedCleaned = this.cleanupCompletedSessions()
      const staleCleaned = this.cleanupStaleSessions()

      if (completedCleaned > 0 || staleCleaned > 0) {
        console.log(
          `[UploadSessionStore] 정리된 세션: 완료됨(${completedCleaned}), 만료됨(${staleCleaned})`
        )
      }
    }, 300000) // 5분마다 실행
  }

  /**
   * 정리 작업 중지
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * 모든 세션 초기화 (개발/테스트용)
   */
  clearAllSessions(): void {
    this.sessions.clear()
  }

  /**
   * 세션 스토어 통계 조회
   */
  getStats(): {
    total: number
    active: number
    completed: number
    failed: number
  } {
    let active = 0
    let completed = 0
    let failed = 0

    for (const session of this.sessions.values()) {
      if (session.progress.status === 'error') {
        failed++
      } else if (session.isCompleted) {
        completed++
      } else {
        active++
      }
    }

    return {
      total: this.sessions.size,
      active,
      completed,
      failed,
    }
  }
}

// 싱글톤 인스턴스 생성
const uploadSessionStore = new UploadSessionStore()

export default uploadSessionStore

// 편의 함수들
export const createUploadSession = (
  sessionId: string,
  initialProgress: UploadProgress
) => uploadSessionStore.createSession(sessionId, initialProgress)

export const updateUploadSession = (
  sessionId: string,
  progress: UploadProgress
) => uploadSessionStore.updateSession(sessionId, progress)

export const getUploadSession = (sessionId: string) =>
  uploadSessionStore.getSession(sessionId)

export const deleteUploadSession = (sessionId: string) =>
  uploadSessionStore.deleteSession(sessionId)

export const hasUploadSession = (sessionId: string) =>
  uploadSessionStore.hasSession(sessionId)

export const getUploadSessionStats = () => uploadSessionStore.getStats()
