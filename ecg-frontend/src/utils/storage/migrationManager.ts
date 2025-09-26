/**
 * localStorage에서 IndexedDB로 프로젝트 데이터 마이그레이션 관리자
 */

import { ProjectData } from '@/app/(route)/editor/types/project'
import { indexedDBProjectStorage } from './indexedDBProjectStorage'
import { getTimestamp } from '@/utils/logger'

const STORAGE_KEY = 'ecg-projects'
const MIGRATION_KEY = 'ecg-migration-completed'
const BACKUP_KEY = 'ecg-localStorage-backup'

export interface MigrationResult {
  success: boolean
  migratedCount: number
  errors: string[]
  backupCreated: boolean
}

class MigrationManager {
  /**
   * localStorage에서 IndexedDB로 마이그레이션 실행
   */
  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      errors: [],
      backupCreated: false,
    }

    try {
      // 이미 마이그레이션 완료된 경우 건너뛰기
      if (this.isMigrationCompleted()) {
        console.log(
          `[${getTimestamp()}] migrationManager.ts Migration already completed`
        )
        result.success = true
        return result
      }

      // localStorage에서 기존 프로젝트 데이터 확인
      const localStorageProjects = this.getLocalStorageProjects()

      if (localStorageProjects.length === 0) {
        console.log(
          `[${getTimestamp()}] migrationManager.ts No projects found in localStorage`
        )
        this.markMigrationCompleted()
        result.success = true
        return result
      }

      console.log(
        `[${getTimestamp()}] migrationManager.ts Found ${localStorageProjects.length} projects in localStorage`
      )

      // 백업 생성
      result.backupCreated = this.createBackup(localStorageProjects)

      // IndexedDB 초기화
      await indexedDBProjectStorage.initialize()

      // 각 프로젝트를 IndexedDB로 마이그레이션
      for (const project of localStorageProjects) {
        try {
          await this.migrateProject(project)
          result.migratedCount++
          console.log(
            `[${getTimestamp()}] migrationManager.ts Migrated project: ${project.name}`
          )
        } catch (error) {
          const errorMsg = `Failed to migrate project ${project.name}: ${error}`
          console.error(`[${getTimestamp()}] migrationManager.ts ${errorMsg}`)
          result.errors.push(errorMsg)
        }
      }

      // 마이그레이션 완료 처리
      if (result.migratedCount === localStorageProjects.length) {
        this.markMigrationCompleted()
        result.success = true
        console.log(
          `[${getTimestamp()}] migrationManager.ts Migration completed successfully`
        )
      } else {
        console.error(
          `[${getTimestamp()}] migrationManager.ts Migration partially failed: ${result.migratedCount}/${localStorageProjects.length} projects migrated`
        )
      }
    } catch (error) {
      const errorMsg = `Migration failed: ${error}`
      console.error(`[${getTimestamp()}] migrationManager.ts ${errorMsg}`)
      result.errors.push(errorMsg)
    }

    return result
  }

  /**
   * 마이그레이션 롤백 (실패 시 복구)
   */
  async rollback(): Promise<boolean> {
    try {
      const backup = this.getBackup()
      if (!backup || backup.length === 0) {
        console.warn(
          `[${getTimestamp()}] migrationManager.ts No backup found for rollback`
        )
        return false
      }

      // localStorage에 백업 데이터 복원
      localStorage.setItem(STORAGE_KEY, JSON.stringify(backup))

      // 마이그레이션 플래그 제거
      localStorage.removeItem(MIGRATION_KEY)

      console.log(
        `[${getTimestamp()}] migrationManager.ts Rollback completed: ${backup.length} projects restored`
      )
      return true
    } catch (error) {
      console.error(
        `[${getTimestamp()}] migrationManager.ts Rollback failed: ${error}`
      )
      return false
    }
  }

  /**
   * 마이그레이션 필요 여부 확인
   */
  needsMigration(): boolean {
    if (this.isMigrationCompleted()) {
      return false
    }

    const localStorageProjects = this.getLocalStorageProjects()
    return localStorageProjects.length > 0
  }

  /**
   * 백업 정리
   */
  cleanupBackup(): void {
    localStorage.removeItem(BACKUP_KEY)
    // console.log(`[${getTimestamp()}] migrationManager.ts Backup cleaned up`)
  }

  // Private methods
  private getLocalStorageProjects(): ProjectData[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []

      const projects = JSON.parse(stored) as ProjectData[]

      // Date 필드 복원
      return projects.map((project) => ({
        ...project,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
      }))
    } catch (error) {
      console.error(
        `[${getTimestamp()}] migrationManager.ts Failed to parse localStorage projects: ${error}`
      )
      return []
    }
  }

  private async migrateProject(project: ProjectData): Promise<void> {
    // 프로젝트 데이터 검증 및 정리
    const cleanProject: ProjectData = {
      ...project,
      // 필수 필드 보장
      id:
        project.id ||
        `migrated_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      name: project.name || 'Untitled Project',
      clips: project.clips || [],
      settings: project.settings || {
        autoSaveEnabled: true,
        autoSaveInterval: 3,
        defaultSpeaker: '화자1',
        exportFormat: 'srt',
      },
      createdAt: project.createdAt || new Date(),
      updatedAt: new Date(), // 마이그레이션 시점으로 업데이트
    }

    await indexedDBProjectStorage.saveProject(cleanProject)
  }

  private createBackup(projects: ProjectData[]): boolean {
    try {
      // localStorage 용량 문제 해결: 간소화된 백업만 저장
      const simplifiedBackup = {
        timestamp: new Date().toISOString(),
        projectCount: projects.length,
        // 프로젝트 메타데이터만 백업 (클립 데이터 제외)
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          clipCount: p.clips?.length || 0,
        })),
      }

      // 간소화된 백업 저장 시도
      try {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(simplifiedBackup))
        console.log(
          `[${getTimestamp()}] migrationManager.ts Simplified backup created with ${projects.length} projects`
        )
      } catch {
        // localStorage가 꽉 찬 경우 기존 백업 삭제 후 재시도
        console.warn(
          `[${getTimestamp()}] migrationManager.ts localStorage quota exceeded, clearing old data...`
        )

        // 오래된 백업과 마이그레이션 관련 데이터 정리
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('ecg-backup-') || key === BACKUP_KEY)) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key))

        // 재시도 - 메타데이터만 저장
        localStorage.setItem(BACKUP_KEY, JSON.stringify(simplifiedBackup))
        console.log(
          `[${getTimestamp()}] migrationManager.ts Backup created after cleanup`
        )
      }

      return true
    } catch (error) {
      console.error(
        `[${getTimestamp()}] migrationManager.ts Failed to create backup: ${error}`
      )
      // 백업 실패해도 마이그레이션은 계속 진행
      return false
    }
  }

  private getBackup(): ProjectData[] | null {
    try {
      const backup = localStorage.getItem(BACKUP_KEY)
      if (!backup) return null

      const parsed = JSON.parse(backup)
      return parsed.projects || null
    } catch (error) {
      console.error(
        `[${getTimestamp()}] migrationManager.ts Failed to parse backup: ${error}`
      )
      return null
    }
  }

  private isMigrationCompleted(): boolean {
    return localStorage.getItem(MIGRATION_KEY) === 'true'
  }

  private markMigrationCompleted(): void {
    localStorage.setItem(MIGRATION_KEY, 'true')
    console.log(
      `[${getTimestamp()}] migrationManager.ts Migration marked as completed`
    )
  }

  /**
   * 강제 마이그레이션 재실행 (개발/테스트용)
   */
  forceMigration(): void {
    localStorage.removeItem(MIGRATION_KEY)
    // console.log(`[${getTimestamp()}] migrationManager.ts Migration flag reset`)
  }

  /**
   * 마이그레이션 상태 정보
   */
  getMigrationStatus() {
    return {
      completed: this.isMigrationCompleted(),
      needsMigration: this.needsMigration(),
      hasBackup: !!this.getBackup(),
      localStorageProjectCount: this.getLocalStorageProjects().length,
    }
  }
}

// Singleton instance
export const migrationManager = new MigrationManager()
