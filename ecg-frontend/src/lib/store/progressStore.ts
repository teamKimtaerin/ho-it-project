import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uploadService } from '@/services/api/uploadService'
import type {
  ProcessingResult,
  UploadErrorResponse,
} from '@/services/api/types/upload.types'

export interface ProgressTask {
  id: number
  filename: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  completedAt?: string
  type: 'upload' | 'export'
  currentStage?: string
  estimatedTimeRemaining?: number
  isTimeout?: boolean
  jobId?: string // 업로드 작업의 jobId (에디터로 이동 시 사용)
}

interface ProgressStore {
  tasks: ProgressTask[]
  globalPollingJobs: Map<string, { taskId: number; stopPolling: () => void }>
  hasUnreadExportNotification: boolean
  hasUnreadUploadNotification: boolean

  // Task management
  addTask: (task: Omit<ProgressTask, 'id'>) => number
  updateTask: (id: number, updates: Partial<ProgressTask>) => void
  removeTask: (id: number) => void
  clearCompletedTasks: () => void
  cleanupStaleTasks: () => void

  // Task queries
  getTasksByType: (type: 'upload' | 'export') => ProgressTask[]
  getActiveUploadTasks: () => ProgressTask[]
  getActiveExportTasks: () => ProgressTask[]
  getAllActiveTasks: () => ProgressTask[]
  getCompletedTasks: () => ProgressTask[]
  getTask: (id: number) => ProgressTask | undefined
  expireOldTasks: () => void
  clearCompletedTasksByType: (type: 'upload' | 'export') => void

  // Global polling management
  startGlobalPolling: (
    jobId: string,
    taskId: number,
    onComplete?: (result: ProcessingResult) => void
  ) => void
  stopGlobalPolling: (jobId: string) => void
  stopAllPolling: () => void

  // Notification management
  setExportNotification: (hasNotification: boolean) => void
  setUploadNotification: (hasNotification: boolean) => void
  markNotificationAsRead: () => void
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      globalPollingJobs: new Map(),
      hasUnreadExportNotification: false,
      hasUnreadUploadNotification: false,

      addTask: (task) => {
        const id = Date.now() + Math.random()
        const newTask: ProgressTask = { ...task, id }
        set((state) => ({
          tasks: [...state.tasks, newTask],
        }))
        return id
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  ...updates,
                  // Auto-set completedAt when status changes to completed or failed
                  completedAt:
                    (updates.status === 'completed' ||
                      updates.status === 'failed') &&
                    !task.completedAt
                      ? new Date().toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : task.completedAt,
                }
              : task
          ),
        }))
      },

      removeTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }))
      },

      clearCompletedTasks: () => {
        set((state) => ({
          tasks: state.tasks.filter(
            (task) => task.status !== 'completed' && task.status !== 'failed'
          ),
        }))
      },

      cleanupStaleTasks: () => {
        const now = Date.now()
        const maxAge = 24 * 60 * 60 * 1000 // 24시간

        set((state) => ({
          tasks: state.tasks.filter((task) => {
            // 완료/실패한 작업은 항상 유지
            if (task.status === 'completed' || task.status === 'failed') {
              return true
            }

            // 진행 중 작업은 24시간 이내만 유지
            if (task.status === 'uploading' || task.status === 'processing') {
              return now - task.id < maxAge
            }

            return true
          }),
        }))
      },

      getTasksByType: (type) => {
        return get().tasks.filter((task) => task.type === type)
      },

      getActiveUploadTasks: () => {
        return get().tasks.filter(
          (task) =>
            task.type === 'upload' &&
            (task.status === 'uploading' || task.status === 'processing')
        )
      },

      getActiveExportTasks: () => {
        return get().tasks.filter(
          (task) =>
            task.type === 'export' &&
            (task.status === 'uploading' || task.status === 'processing')
        )
      },

      getAllActiveTasks: () => {
        return get().tasks.filter(
          (task) => task.status === 'uploading' || task.status === 'processing'
        )
      },

      getCompletedTasks: () => {
        return get().tasks.filter(
          (task) => task.status === 'completed' || task.status === 'failed'
        )
      },

      getTask: (id) => {
        return get().tasks.find((task) => task.id === id)
      },

      // 2분 이상 진행 중인 작업을 완료로 처리
      expireOldTasks: () => {
        const now = Date.now()
        const timeout = 2 * 60 * 1000 // 2분 (120초)

        set((state) => ({
          tasks: state.tasks.map((task) => {
            // 진행 중 작업이고 2분 이상 경과한 경우
            if (
              (task.status === 'uploading' || task.status === 'processing') &&
              now - task.id > timeout
            ) {
              return {
                ...task,
                status: 'failed' as const,
                progress: 100,
                isTimeout: true,
                completedAt:
                  task.completedAt ||
                  new Date().toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
              }
            }
            return task
          }),
        }))
      },

      // 완료된 작업 타입별 삭제
      clearCompletedTasksByType: (type) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => {
            // 해당 타입이 아니거나 완료/실패 상태가 아닌 경우만 유지
            return (
              task.type !== type ||
              (task.status !== 'completed' && task.status !== 'failed')
            )
          }),
        }))
      },

      // Global polling management
      startGlobalPolling: (jobId, taskId, onComplete) => {
        const state = get()

        // 이미 폴링 중인 작업이면 무시
        if (state.globalPollingJobs.has(jobId)) {
          console.log(`[ProgressStore] Job ${jobId} is already being polled`)
          return
        }

        console.log(`[ProgressStore] Starting global polling for job: ${jobId}`)

        const stopPolling = uploadService.startPolling(
          jobId,
          (status) => {
            // 상태 업데이트
            get().updateTask(taskId, {
              progress: status.progress,
              currentStage: status.current_stage,
              estimatedTimeRemaining: status.estimated_time_remaining,
            })
          },
          (result) => {
            // 완료 처리
            get().updateTask(taskId, {
              status: 'completed',
              progress: 100,
            })

            // 폴링 작업 제거
            set((state) => {
              const newJobs = new Map(state.globalPollingJobs)
              newJobs.delete(jobId)
              return { globalPollingJobs: newJobs }
            })

            // 완료 콜백 호출
            if (onComplete) {
              onComplete(result)
            }
          },
          (error) => {
            // 에러 처리
            get().updateTask(taskId, {
              status: 'failed',
            })

            // 폴링 작업 제거
            set((state) => {
              const newJobs = new Map(state.globalPollingJobs)
              newJobs.delete(jobId)
              return { globalPollingJobs: newJobs }
            })
          }
        )

        // 폴링 작업 등록
        set((state) => {
          const newJobs = new Map(state.globalPollingJobs)
          newJobs.set(jobId, { taskId, stopPolling })
          return { globalPollingJobs: newJobs }
        })
      },

      stopGlobalPolling: (jobId) => {
        const state = get()
        const job = state.globalPollingJobs.get(jobId)

        if (job) {
          console.log(
            `[ProgressStore] Stopping global polling for job: ${jobId}`
          )
          job.stopPolling()

          set((state) => {
            const newJobs = new Map(state.globalPollingJobs)
            newJobs.delete(jobId)
            return { globalPollingJobs: newJobs }
          })
        }
      },

      stopAllPolling: () => {
        const state = get()
        console.log(
          `[ProgressStore] Stopping all global polling (${state.globalPollingJobs.size} jobs)`
        )

        state.globalPollingJobs.forEach((job, jobId) => {
          job.stopPolling()
        })

        set({ globalPollingJobs: new Map() })
      },

      // Notification management
      setExportNotification: (hasNotification) => {
        console.log(
          '[ProgressStore] setExportNotification called with:',
          hasNotification
        )
        set({ hasUnreadExportNotification: hasNotification })
      },

      setUploadNotification: (hasNotification) => {
        console.log(
          '[ProgressStore] setUploadNotification called with:',
          hasNotification
        )
        set({ hasUnreadUploadNotification: hasNotification })
      },

      markNotificationAsRead: () => {
        console.log('[ProgressStore] markNotificationAsRead called')
        set({
          hasUnreadExportNotification: false,
          hasUnreadUploadNotification: false,
        })
      },
    }),
    {
      name: 'ecg-progress-store',
      // Persist completed/failed tasks permanently, and active tasks for 24 hours
      partialize: (state) => {
        const now = Date.now()
        const maxAge = 24 * 60 * 60 * 1000 // 24시간

        return {
          tasks: state.tasks.filter((task) => {
            // 완료/실패한 작업은 항상 유지
            if (task.status === 'completed' || task.status === 'failed') {
              return true
            }

            // 진행 중 작업은 24시간 이내만 유지 (오래된 stale 작업 방지)
            if (task.status === 'uploading' || task.status === 'processing') {
              return now - task.id < maxAge
            }

            return false
          }),
          // globalPollingJobs는 persist하지 않음 (Map은 직렬화 불가)
          hasUnreadExportNotification: state.hasUnreadExportNotification,
          hasUnreadUploadNotification: state.hasUnreadUploadNotification,
        }
      },
      // 스토어 복원 후 오래된 작업 자동 정리
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.cleanupStaleTasks()
        }
      },
    }
  )
)
