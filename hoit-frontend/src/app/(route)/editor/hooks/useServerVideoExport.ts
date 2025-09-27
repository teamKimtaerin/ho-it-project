import { useState, useCallback, useRef, useEffect } from 'react'
import { renderService } from '@/services/api/renderService'
import {
  RenderStatus,
  RenderOptions,
  RendererScenario,
} from '@/services/api/types/render.types'
import { showToast } from '@/utils/ui/toast'
import { useProgressStore } from '@/lib/store/progressStore'

interface ExportState {
  isExporting: boolean
  progress: number
  estimatedTime: number | null
  timeRemaining: number | null
  status: RenderStatus['status'] | null
  error: string | null
  downloadUrl: string | null
  selectedFileHandle: FileSystemFileHandle | null
  suggestedFileName: string | null
}

interface UseServerVideoExportResult extends ExportState {
  startExport: (
    videoUrl: string,
    scenario: RendererScenario,
    options?: RenderOptions,
    suggestedFileName?: string
  ) => Promise<string>
  cancelExport: () => Promise<void>
  downloadFile: (url?: string, filename?: string) => Promise<void>
  reset: () => void
}

export function useServerVideoExport(): UseServerVideoExportResult {
  const [state, setState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    estimatedTime: null,
    timeRemaining: null,
    status: null,
    error: null,
    downloadUrl: null,
    selectedFileHandle: null,
    suggestedFileName: null,
  })

  const currentJobIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number>(0)

  // Progress store integration
  const { addTask, updateTask, removeTask } = useProgressStore()
  const [currentProgressTaskId, setCurrentProgressTaskId] = useState<number>()

  /**
   * 상태 업데이트 헬퍼
   */
  const updateState = useCallback((updates: Partial<ExportState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  /**
   * 진행 상황 업데이트 콜백
   */
  const handleProgress = useCallback(
    (status: RenderStatus) => {
      const elapsedTime = (Date.now() - startTimeRef.current) / 1000
      let timeRemaining = null

      // 40초부터 시작해서 진행률에 따라 카운트다운
      if (status.progress !== undefined) {
        timeRemaining = Math.max(0, 40 - Math.floor(status.progress * 0.4))
      } else {
        // 진행률 정보가 없으면 40초부터 시작
        timeRemaining = 40
      }

      updateState({
        progress: status.progress || 0,
        status: status.status,
        timeRemaining,
      })

      // Progress store 업데이트
      if (currentProgressTaskId) {
        updateTask(currentProgressTaskId, {
          progress: status.progress || 0,
          status: status.status === 'completed' ? 'completed' : 'processing',
          currentStage:
            status.status === 'processing' ? 'GPU 렌더링 중' : undefined,
          estimatedTimeRemaining: timeRemaining ?? undefined,
        })
      }

      // 상태별 토스트 메시지
      if (status.status === 'processing' && status.progress === 0) {
        showToast('GPU 렌더링이 시작되었습니다', 'success')
      }
    },
    [updateState, currentProgressTaskId, updateTask]
  )

  /**
   * 렌더링 작업 시작
   */
  const startExport = useCallback(
    async (
      videoUrl: string,
      scenario: RendererScenario,
      options: RenderOptions = {},
      suggestedFileName?: string
    ): Promise<string> => {
      try {
        // 1. 먼저 저장 위치 선택 (File System Access API 지원하는 브라우저)
        let fileHandle: FileSystemFileHandle | null = null
        const fileName = suggestedFileName || `gpu-rendered-${Date.now()}.mp4`

        if ('showSaveFilePicker' in window && window.showSaveFilePicker) {
          try {
            fileHandle = await window.showSaveFilePicker({
              suggestedName: fileName,
              types: [
                {
                  description: 'MP4 Video File',
                  accept: {
                    'video/mp4': ['.mp4'],
                  },
                },
              ],
            })

            showToast('저장 위치가 선택되었습니다', 'success')
          } catch (error) {
            // 사용자가 취소한 경우
            if (error instanceof Error && error.name === 'AbortError') {
              throw new Error('저장 위치 선택이 취소되었습니다')
            }
            console.error('File picker failed:', error)
            showToast(
              '저장 위치 선택 실패, 기본 다운로드로 진행합니다',
              'warning'
            )
          }
        }

        // 2. 렌더링 작업 초기화
        updateState({
          isExporting: true,
          progress: 0,
          estimatedTime: null,
          timeRemaining: null,
          status: 'queued',
          error: null,
          downloadUrl: null,
          selectedFileHandle: fileHandle,
          suggestedFileName: fileName,
        })

        // Progress store에 내보내기 작업 추가
        const progressTaskId = addTask({
          filename: fileName,
          progress: 0,
          status: 'processing',
          type: 'export',
          currentStage: '렌더링 준비 중',
        })
        setCurrentProgressTaskId(progressTaskId)

        startTimeRef.current = Date.now()

        // 1. 렌더링 작업 생성
        const createResponse = await renderService.createRenderJob({
          videoUrl,
          scenario,
          options,
        })

        if (!createResponse.success || !createResponse.data) {
          throw new Error(
            createResponse.error?.message || '렌더링 작업 생성 실패'
          )
        }

        const job = createResponse.data
        currentJobIdRef.current = job.jobId

        updateState({
          estimatedTime: job.estimatedTime,
          timeRemaining: job.estimatedTime,
        })

        console.log(
          `🚀 GPU 렌더링 작업 시작: ${job.jobId} (예상: ${job.estimatedTime}초)`
        )

        // 2. 상태 폴링
        const finalStatus = await renderService.pollJobStatus(
          job.jobId,
          handleProgress,
          5000, // 5초 간격
          300 // 최대 25분
        )

        if (finalStatus.status !== 'completed' || !finalStatus.downloadUrl) {
          throw new Error('렌더링이 완료되지 않았습니다')
        }

        // 3. 완료 처리
        updateState({
          progress: 100,
          status: 'completed',
          downloadUrl: finalStatus.downloadUrl,
          timeRemaining: 0,
        })

        // Progress store 완료 업데이트
        if (progressTaskId) {
          updateTask(progressTaskId, {
            progress: 100,
            status: 'completed',
          })
        }

        const totalTime = Math.round((Date.now() - startTimeRef.current) / 1000)
        showToast(`✅ GPU 렌더링 완료! (${totalTime}초)`, 'success')

        return finalStatus.downloadUrl
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '알 수 없는 오류'

        // 에러 타입에 따른 세분화된 처리
        let userMessage = errorMessage
        if (errorMessage.includes('저장 위치 선택이 취소')) {
          userMessage = '저장 위치 선택이 취소되었습니다'
        } else if (errorMessage.includes('인증 오류')) {
          userMessage = '로그인이 필요합니다. 다시 로그인해주세요.'
        } else if (errorMessage.includes('일일 렌더링 할당량')) {
          userMessage =
            '오늘의 렌더링 할당량을 모두 사용했습니다. 내일 다시 시도해주세요.'
        } else if (errorMessage.includes('요청이 너무 많습니다')) {
          userMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
        } else if (errorMessage.includes('입력 데이터가 올바르지 않습니다')) {
          userMessage =
            '비디오 파일이나 자막 데이터에 문제가 있습니다. 파일을 확인해주세요.'
        } else if (errorMessage.includes('GPU')) {
          userMessage =
            'GPU 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
        } else if (
          errorMessage.includes('network') ||
          errorMessage.includes('timeout')
        ) {
          userMessage =
            '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.'
        }

        updateState({
          error: errorMessage,
          status: 'failed',
        })

        // Progress store 실패 업데이트
        if (currentProgressTaskId) {
          updateTask(currentProgressTaskId, {
            status: 'failed',
          })
        }

        showToast(`❌ 렌더링 실패: ${userMessage}`, 'error')
        throw error
      } finally {
        updateState({ isExporting: false })
        currentJobIdRef.current = null
      }
    },
    [handleProgress, updateState, addTask, updateTask]
  )

  /**
   * 렌더링 작업 취소
   */
  const cancelExport = useCallback(async () => {
    if (!currentJobIdRef.current) return

    try {
      const success = await renderService.cancelJob(currentJobIdRef.current)

      if (success) {
        showToast('렌더링이 취소되었습니다', 'warning')
      }

      updateState({
        isExporting: false,
        status: null,
        progress: 0,
      })

      // Progress store에서 작업 제거
      if (currentProgressTaskId) {
        removeTask(currentProgressTaskId)
        setCurrentProgressTaskId(undefined)
      }

      currentJobIdRef.current = null
    } catch (error) {
      console.error('Failed to cancel export:', error)
      showToast('취소 중 오류가 발생했습니다', 'error')
    }
  }, [updateState, currentProgressTaskId, removeTask])

  /**
   * 파일 다운로드
   */
  const downloadFile = useCallback(
    async (url?: string, filename?: string) => {
      const downloadUrl = url || state.downloadUrl

      if (!downloadUrl) {
        showToast('다운로드 URL이 없습니다', 'error')
        return
      }

      try {
        await renderService.downloadFile(downloadUrl, filename)
        showToast('파일이 저장되었습니다', 'success')
      } catch (error) {
        console.error('Download failed:', error)
        showToast('다운로드 중 오류가 발생했습니다', 'error')
      }
    },
    [state.downloadUrl]
  )

  /**
   * 렌더링 완료 시 자동 저장
   */
  useEffect(() => {
    if (
      state.status === 'completed' &&
      state.downloadUrl &&
      state.selectedFileHandle
    ) {
      // 자동 저장 실행
      const autoSave = async () => {
        try {
          const response = await fetch(state.downloadUrl!)
          if (!response.ok) {
            throw new Error('Failed to fetch video')
          }

          const blob = await response.blob()
          const writable = await state.selectedFileHandle!.createWritable()
          await writable.write(blob)
          await writable.close()

          showToast('파일이 자동으로 저장되었습니다! 🎉', 'success')
        } catch (error) {
          console.error('Auto-save failed:', error)
          showToast('자동 저장 실패. 수동으로 다운로드해주세요.', 'error')
        }
      }

      autoSave()
    }
  }, [state.status, state.downloadUrl, state.selectedFileHandle])

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    setState({
      isExporting: false,
      progress: 0,
      estimatedTime: null,
      timeRemaining: null,
      status: null,
      error: null,
      downloadUrl: null,
      selectedFileHandle: null,
      suggestedFileName: null,
    })

    // Progress store 정리
    if (currentProgressTaskId) {
      setCurrentProgressTaskId(undefined)
    }

    currentJobIdRef.current = null
  }, [currentProgressTaskId])

  return {
    ...state,
    startExport,
    cancelExport,
    downloadFile,
    reset,
  }
}
