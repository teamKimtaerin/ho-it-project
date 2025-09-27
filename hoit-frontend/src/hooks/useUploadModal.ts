'use client'

import { useEditorStore } from '@/app/(route)/editor/store'
import { ClipItem, Word } from '@/app/(route)/editor/types'
import { ProjectData } from '@/app/(route)/editor/types/project'
import API_CONFIG from '@/config/api.config'
import { useProgressStore } from '@/lib/store/progressStore'
import {
  ProcessingResult,
  ProcessingStatus,
  SegmentData,
  UploadFormData,
  UploadStep,
} from '@/services/api/types/upload.types'
import { uploadService } from '@/services/api/uploadService'
import { getSpeakerColorByIndex } from '@/utils/editor/speakerColors'
import { log } from '@/utils/logger'
import {
  ensureMinimumSpeakers,
  extractSpeakersFromClips,
  normalizeSpeakerList,
  normalizeSpeakerMapping,
} from '@/utils/speaker/speakerUtils'
import { useWaveformGeneration } from '@/hooks/useWaveformGeneration'
import { projectStorage } from '@/utils/storage/projectStorage'
import { mediaStorage } from '@/utils/storage/mediaStorage'
import { processingResultStorage } from '@/utils/storage/processingResultStorage'
import { showToast } from '@/utils/ui/toast'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

export interface VideoMetadata {
  duration?: number
  size?: number
  width?: number
  height?: number
  fps?: number
}

export interface UploadModalState {
  isOpen: boolean
  step: UploadStep
  uploadProgress: number
  processingProgress: number
  currentStage?: string
  estimatedTimeRemaining?: number
  fileName?: string
  videoUrl?: string // S3 업로드된 비디오 URL 저장
  videoFile?: File // 원본 비디오 파일
  videoThumbnail?: string // 비디오 썸네일 URL
  videoMetadata?: VideoMetadata // 비디오 메타데이터
  error?: string
}

// 초기 모달 상태 정의
const getInitialModalState = (): UploadModalState => ({
  isOpen: false,
  step: 'select',
  uploadProgress: 0,
  processingProgress: 0,
  currentStage: undefined,
  estimatedTimeRemaining: undefined,
  fileName: undefined,
  videoUrl: undefined,
  error: undefined,
})

export const useUploadModal = () => {
  const router = useRouter()
  const {
    setMediaInfo,
    setClips,
    clearMedia,
    cleanupPreviousBlobUrl,
    setCurrentProject,
    setSpeakerColors,
    setSpeakers,
  } = useEditorStore()

  // Progress store integration
  const {
    addTask,
    updateTask,
    removeTask,
    startGlobalPolling,
    stopGlobalPolling,
    setUploadNotification,
  } = useProgressStore()

  // Waveform generation hook
  const { generateWaveform } = useWaveformGeneration()

  const [state, setState] = useState<UploadModalState>(getInitialModalState)

  const [currentJobId, setCurrentJobId] = useState<string>()
  const [currentProgressTaskId, setCurrentProgressTaskId] = useState<number>()
  const stopPollingRef = useRef<(() => void) | null>(null)

  // 상태 업데이트 헬퍼
  const updateState = useCallback((updates: Partial<UploadModalState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  // 모달 열기 - 완전한 초기 상태로 리셋
  const openModal = useCallback(() => {
    log('useUploadModal', '🎬 Opening upload modal with fresh state')

    // 진행 중인 폴링이 있다면 중단
    if (stopPollingRef.current) {
      stopPollingRef.current()
      stopPollingRef.current = null
    }

    // 완전한 초기 상태로 리셋 (단, isOpen은 true로 설정)
    setState(() => ({
      ...getInitialModalState(),
      isOpen: true,
    }))

    // 현재 작업 ID들도 초기화
    setCurrentJobId(undefined)
    setCurrentProgressTaskId(undefined)

    console.log(
      '[UPLOAD MODAL] Modal opened with fresh state - no previous upload info'
    )
  }, [setState])

  // 모달 닫기
  const closeModal = useCallback(() => {
    // 진행 중인 로컬 폴링 중단 (전역 폴링은 유지)
    if (stopPollingRef.current) {
      stopPollingRef.current()
      stopPollingRef.current = null
    }

    // 전역 폴링은 유지하고, progress task도 유지 (다른 페이지에서 확인 가능하도록)
    // Progress store task는 제거하지 않음

    updateState({
      isOpen: false,
      step: 'select',
      uploadProgress: 0,
      processingProgress: 0,
      currentStage: undefined,
      estimatedTimeRemaining: undefined,
      fileName: undefined,
      videoFile: undefined,
      videoThumbnail: undefined,
      videoMetadata: undefined,
      error: undefined,
    })
    setCurrentJobId(undefined)
    setCurrentProgressTaskId(undefined)

    log('useUploadModal', '🔒 Upload modal closed and state reset')
  }, [setState])

  // 파일 선택 처리
  const handleFileSelect = useCallback(
    (files: File[]) => {
      if (files.length > 0) {
        updateState({ fileName: files[0].name })
      }
    },
    [updateState]
  )

  // 비디오 정보 설정 함수
  const setVideoInfo = useCallback(
    (file: File, thumbnailUrl?: string, metadata?: VideoMetadata) => {
      console.log('🎬 useUploadModal.setVideoInfo called:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        thumbnailUrl: thumbnailUrl ? 'present' : 'missing',
        metadata: metadata || 'missing',
      })
      updateState({
        videoFile: file,
        videoThumbnail: thumbnailUrl,
        videoMetadata: metadata,
        fileName: file.name,
      })
    },
    [updateState]
  )

  // 메인 업로드 및 처리 플로우
  const handleStartTranscription = useCallback(
    async (data: UploadFormData) => {
      try {
        log('useUploadModal', '🚀 Starting upload and transcription process')

        // 기존 데이터 초기화 (clearMedia는 자동으로 blob URL을 정리함)
        log(
          'useUploadModal',
          '🧹 Cleaning up previous video data and blob URLs'
        )
        cleanupPreviousBlobUrl() // 이전 blob URL 먼저 정리
        clearMedia() // 이전 영상 정보 제거 (내부적으로 blob URL도 정리)
        setClips([]) // 이전 클립 제거

        // localStorage에서 이전 프로젝트 완전 제거
        projectStorage.clearCurrentProject()

        // sessionStorage 초기화 (이전 프로젝트 정보 제거)
        sessionStorage.removeItem('currentProjectId')
        sessionStorage.removeItem('currentMediaId')
        sessionStorage.removeItem('currentStoredMediaId')
        sessionStorage.removeItem('lastUploadProjectId')

        // 🔥 핵심 변경: 즉시 로컬 Blob URL 생성하여 비디오 플레이어에서 사용
        const blobUrl = URL.createObjectURL(data.file)
        log(
          'useUploadModal',
          `🎬 Created local Blob URL for immediate playback: ${blobUrl}`
        )
        console.log('[VIDEO DEBUG] File info:', {
          name: data.file.name,
          type: data.file.type,
          size: data.file.size,
          blobUrl: blobUrl,
        })

        // 🗃️ IndexedDB에 미디어 파일 저장 (백그라운드)
        const projectId = `project-${Date.now()}`
        let storedMediaId: string | null = null

        try {
          storedMediaId = await mediaStorage.saveMedia(projectId, data.file, {
            duration: 0, // Duration은 비디오 로드 후 업데이트
          })
          log('useUploadModal', `💾 Media saved to IndexedDB: ${storedMediaId}`)
        } catch (error) {
          log(
            'useUploadModal',
            `⚠️ Failed to save media to IndexedDB: ${error}`
          )
          // IndexedDB 저장 실패해도 계속 진행
        }

        // 즉시 비디오 플레이어 업데이트 - 업로드 전에 바로 재생 가능!
        log('useUploadModal', '📺 Setting new video in player with blob URL')
        setMediaInfo({
          videoUrl: blobUrl, // S3 대신 로컬 Blob URL 사용
          videoName: data.file.name,
          videoType: data.file.type,
          videoDuration: 0, // Duration은 비디오 로드 후 자동 설정
          videoThumbnail: state.videoThumbnail, // 업로드 시 생성된 썸네일 저장
          storedMediaId: storedMediaId, // IndexedDB에 저장된 미디어 ID
        })
        console.log('[VIDEO REPLACEMENT DEBUG] Media info set successfully:', {
          videoUrl: blobUrl,
          videoName: data.file.name,
          videoType: data.file.type,
          blobUrlPrefix: blobUrl.substring(0, 20) + '...',
          timestamp: new Date().toISOString(),
        })

        // 🎵 즉시 파형 생성 시작 (백그라운드로 처리)
        log('useUploadModal', '🎵 Starting waveform generation in background')
        generateWaveform(data.file)
          .then((waveformData) => {
            if (waveformData) {
              log(
                'useUploadModal',
                '✅ Waveform generated successfully for immediate use'
              )
            } else {
              log(
                'useUploadModal',
                '⚠️ Waveform generation failed, fallback will be used'
              )
            }
          })
          .catch((error) => {
            log('useUploadModal', `❌ Waveform generation error: ${error}`)
          })

        // State에도 Blob URL 저장 (S3 업로드 중에도 계속 사용)
        updateState({
          step: 'uploading',
          uploadProgress: 0,
          error: undefined,
          videoUrl: blobUrl, // 로컬 Blob URL 저장
          fileName: data.file.name,
        })

        // Progress store에 업로드 작업 추가
        const progressTaskId = addTask({
          filename: data.file.name,
          progress: 0,
          status: 'uploading',
          type: 'upload',
        })
        setCurrentProgressTaskId(progressTaskId)

        // 백업용으로 sessionStorage에도 저장
        sessionStorage.setItem('currentVideoUrl', blobUrl)
        console.log('[VIDEO DEBUG] Saved videoUrl to sessionStorage:', blobUrl)

        // MOCK DATA MODE: 서버 업로드/처리 플로우를 생략하고 로컬 friends_result.json 사용
        if (API_CONFIG.USE_MOCK_DATA) {
          log(
            'useUploadModal',
            '🐞 USE_MOCK_DATA enabled: using local friends_result.json'
          )
          // 간단한 진행률 시뮬레이션 + 상태 업데이트
          updateState({ step: 'processing', processingProgress: 0 })

          // Progress store 업데이트
          if (progressTaskId) {
            updateTask(progressTaskId, {
              status: 'processing',
              progress: 0,
              currentStage: 'Mock: 시작',
            })
          }

          try {
            // 약간의 딜레이로 진행률 업데이트
            await new Promise((r) => setTimeout(r, 300))
            updateState({
              processingProgress: 25,
              currentStage: 'Mock: 초기화',
            })
            if (progressTaskId) {
              updateTask(progressTaskId, {
                progress: 25,
                currentStage: 'Mock: 초기화',
              })
            }

            await new Promise((r) => setTimeout(r, 400))
            updateState({
              processingProgress: 50,
              currentStage: 'Mock: 음성 세그먼트 추출',
            })
            if (progressTaskId) {
              updateTask(progressTaskId, {
                progress: 50,
                currentStage: 'Mock: 음성 세그먼트 추출',
              })
            }

            await new Promise((r) => setTimeout(r, 500))
            updateState({
              processingProgress: 75,
              currentStage: 'Mock: 자막 생성',
            })
            if (progressTaskId) {
              updateTask(progressTaskId, {
                progress: 75,
                currentStage: 'Mock: 자막 생성',
              })
            }

            // friends_result.json 로드
            const res = await fetch(API_CONFIG.MOCK_TRANSCRIPTION_PATH)
            if (!res.ok) {
              throw new Error(
                `Failed to fetch mock file: ${res.status} ${res.statusText}`
              )
            }
            const json = await res.json()

            // friends_result.json -> SegmentData[] 매핑
            interface MockSegment {
              id?: number
              start_time?: number
              start?: number
              end_time?: number
              end?: number
              text?: string
              speaker_id?: string
              speaker?: string | { speaker_id: string }
              confidence?: number
              words?: MockWord[]
            }

            interface MockWord {
              word?: string
              start_time?: number
              start?: number
              end_time?: number
              end?: number
              confidence?: number
            }

            const segments = (json.segments || []).map(
              (seg: MockSegment, idx: number) => {
                const words = (seg.words || []).map((w: MockWord) => ({
                  word: String(w.word ?? ''),
                  start: Number(w.start_time ?? w.start ?? 0),
                  end: Number(w.end_time ?? w.end ?? 0),
                  confidence: Number(w.confidence ?? 0.9),
                }))

                return {
                  id: seg.id ?? idx,
                  start: Number(seg.start_time ?? seg.start ?? 0),
                  end: Number(seg.end_time ?? seg.end ?? 0),
                  text: String(seg.text ?? ''),
                  speaker:
                    seg.speaker_id != null
                      ? String(seg.speaker_id)
                      : seg.speaker && typeof seg.speaker === 'object'
                        ? seg.speaker
                        : String(seg.speaker ?? 'Unknown'),
                  confidence: Number(seg.confidence ?? 0.9),
                  words,
                } as SegmentData
              }
            ) as SegmentData[]

            // JSON speakers 섹션에서 화자 정보 추출
            const speakersFromJson = json.speakers
              ? Object.keys(json.speakers)
              : []

            // 화자 매핑 (SPEAKER_XX -> 화자X) - 정규화 함수 사용
            const rawSpeakerMapping: Record<string, string> = {}
            const mappedSpeakers: string[] = []

            // 화자 ID를 정렬해서 일관된 순서로 매핑
            speakersFromJson.sort().forEach((speakerId, index) => {
              const mappedName = `화자${index + 1}`
              rawSpeakerMapping[speakerId] = mappedName
              mappedSpeakers.push(mappedName)
            })

            // 화자 매핑 정규화
            const speakerMapping = normalizeSpeakerMapping(rawSpeakerMapping)

            // ProcessingResult 형태로 포장해서 기존 완료 핸들러 재사용
            const mockResult: ProcessingResult = {
              job_id: 'debug_job_local',
              status: 'completed',
              result: {
                segments,
                metadata: {
                  duration: Number(json?.metadata?.duration ?? 0),
                  language: String(json?.metadata?.language ?? 'en'),
                  model: String(json?.metadata?.unified_model ?? 'mock'),
                  processing_time: Number(json?.metadata?.processing_time ?? 0),
                },
                // 화자 정보 추가
                speakers: mappedSpeakers,
                speakerMapping,
              },
            }

            updateState({ processingProgress: 100, currentStage: '완료' })
            if (progressTaskId) {
              updateTask(progressTaskId, {
                progress: 100,
                currentStage: '완료',
                status: 'completed',
              })
            }
            handleProcessingComplete(mockResult)
            return // ⛔️ 실제 업로드/ML 처리로 진행하지 않음
          } catch (e) {
            log('useUploadModal', `💥 DEBUG mock flow failed: ${e}`)
            if (progressTaskId) {
              updateTask(progressTaskId, {
                status: 'failed',
              })
            }
            updateState({
              step: 'failed',
              error:
                e instanceof Error
                  ? e.message
                  : 'Mock 데이터 로드 중 오류가 발생했습니다.',
            })
            return
          }
        }

        // 1. Presigned URL 요청 (백그라운드 처리)
        log('useUploadModal', '📝 Requesting presigned URL')
        const presignedResponse = await uploadService.getPresignedUrl(
          data.file.name,
          data.file.type
        )

        if (!presignedResponse.success || !presignedResponse.data) {
          throw new Error(
            presignedResponse.error?.message || 'Presigned URL 요청 실패'
          )
        }

        const { presigned_url, file_key } = presignedResponse.data

        // 2. S3 업로드 (진행률 추적) - 백그라운드로 진행
        log('useUploadModal', '⬆️ Starting S3 upload')
        const uploadResponse = await uploadService.uploadToS3(
          data.file,
          presigned_url,
          (progress) => {
            updateState({ uploadProgress: progress })
            if (progressTaskId) {
              updateTask(progressTaskId, { progress })
            }
          }
        )

        if (!uploadResponse.success || !uploadResponse.data) {
          throw new Error(uploadResponse.error?.message || 'S3 업로드 실패')
        }

        const s3Url = uploadResponse.data
        log('useUploadModal', `✅ S3 upload completed: ${s3Url}`)

        // S3 URL은 서버 처리용으로 별도 저장 (하지만 플레이어는 계속 Blob URL 사용)
        // state의 videoUrl은 이미 blobUrl로 설정되어 있으므로 유지
        log(
          'useUploadModal',
          `💾 S3 URL saved for server processing: ${s3Url}, but keeping Blob URL for playback`
        )

        // 4. ML 처리 요청
        updateState({ step: 'processing', processingProgress: 0 })
        if (progressTaskId) {
          updateTask(progressTaskId, {
            status: 'processing',
            progress: 0,
            currentStage: 'ML 처리 시작',
          })
        }
        log('useUploadModal', '🤖 Requesting ML processing')

        const mlResponse = await uploadService.requestMLProcessing(
          file_key,
          data.language
        )

        if (!mlResponse.success || !mlResponse.data) {
          throw new Error(mlResponse.error?.message || 'ML 처리 요청 실패')
        }

        const { job_id, estimated_time } = mlResponse.data
        setCurrentJobId(job_id)
        updateState({ estimatedTimeRemaining: estimated_time || 180 })

        // jobId를 progress task에 추가
        if (progressTaskId) {
          updateTask(progressTaskId, { jobId: job_id })
        }

        log('useUploadModal', `🔄 Starting global polling for job: ${job_id}`)
        console.log(
          '[useUploadModal] About to start global polling for job:',
          job_id
        )

        // 5. 전역 상태 폴링 시작 (페이지 이동해도 계속 폴링)
        if (progressTaskId) {
          startGlobalPolling(
            job_id,
            progressTaskId,
            (result: ProcessingResult) => {
              log(
                'useUploadModal',
                '🎉 Processing completed successfully via global polling'
              )
              handleProcessingComplete(result)
            }
          )
        }

        // 로컬 상태 업데이트를 위한 추가 폴링 (현재 페이지에 있을 때만)
        const stopPolling = uploadService.startPolling(
          job_id,
          (status: ProcessingStatus) => {
            log(
              'useUploadModal',
              `📊 Local status update: ${status.status} (${status.progress}%)`
            )
            updateState({
              processingProgress: status.progress,
              currentStage: status.current_stage,
              estimatedTimeRemaining: status.estimated_time_remaining,
            })
          },
          (result: ProcessingResult) => {
            // 전역 폴링에서 이미 처리됨
            log(
              'useUploadModal',
              '🎉 Local polling completed - handled by global polling'
            )
          },
          (error) => {
            const errorMessage =
              error?.message || error?.error || 'Unknown error'
            log('useUploadModal', `❌ Local polling failed: ${errorMessage}`)

            // 422 에러이고 이미 처리 완료된 경우 무시하고 완료 처리
            if (
              error?.error === 'RESULT_FETCH_ERROR' &&
              state.processingProgress === 100
            ) {
              log(
                'useUploadModal',
                '⚠️ Ignoring 422 error after completion - proceeding to editor'
              )
              updateState({ step: 'completed' })
              setTimeout(() => {
                goToEditor()
              }, 1000)
              return
            }

            updateState({
              step: 'failed',
              error: errorMessage,
            })
          }
        )

        console.log(
          '[useUploadModal] Local polling started, stopPolling function:',
          stopPolling
        )
        stopPollingRef.current = stopPolling
      } catch (error) {
        log('useUploadModal', `💥 Upload process failed: ${error}`)
        if (currentProgressTaskId) {
          updateTask(currentProgressTaskId, {
            status: 'failed',
          })
        }
        updateState({
          step: 'failed',
          error:
            error instanceof Error
              ? error.message
              : '업로드 중 오류가 발생했습니다.',
        })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      updateState,
      setMediaInfo,
      clearMedia,
      cleanupPreviousBlobUrl,
      setClips,
      state,
    ]
  )

  // 화자 정보 초기화 헬퍼 함수
  const initializeSpeakers = useCallback(
    (clips: ClipItem[], mlSpeakers?: string[]) => {
      try {
        // 1. ML 분석에서 받은 화자 목록 정규화
        const normalizedMLSpeakers = mlSpeakers
          ? normalizeSpeakerList(mlSpeakers).speakers
          : []

        // 2. 실제 클립에서 사용된 화자 추출
        const clipsBasedSpeakers = extractSpeakersFromClips(clips)

        // 3. 두 목록을 병합하고 정규화
        const allSpeakers = [...normalizedMLSpeakers, ...clipsBasedSpeakers]
        const { speakers: finalSpeakers, colors: speakerColors } =
          normalizeSpeakerList(allSpeakers)

        // 4. 최소 1명의 화자 보장
        const guaranteedSpeakers = ensureMinimumSpeakers(finalSpeakers)

        // 5. 보장된 화자에 대한 색상 재할당
        const finalColors: Record<string, string> = {}
        guaranteedSpeakers.forEach((speaker, index) => {
          finalColors[speaker] = getSpeakerColorByIndex(index)
        })

        // 6. Store에 화자 정보 설정
        setSpeakers(guaranteedSpeakers)
        setSpeakerColors(finalColors)

        log('useUploadModal', `🎨 Initialized speakers:`, {
          mlSpeakers: mlSpeakers || [],
          clipsBasedSpeakers,
          finalSpeakers: guaranteedSpeakers,
          colors: finalColors,
        })

        return {
          speakers: guaranteedSpeakers,
          colors: finalColors,
        }
      } catch (error) {
        log('useUploadModal', `❌ Failed to initialize speakers: ${error}`)

        // 실패 시 기본 화자 설정
        const defaultSpeakers = ['화자1']
        const defaultColors = { 화자1: getSpeakerColorByIndex(0) }

        setSpeakers(defaultSpeakers)
        setSpeakerColors(defaultColors)

        return {
          speakers: defaultSpeakers,
          colors: defaultColors,
        }
      }
    },
    [setSpeakers, setSpeakerColors]
  )

  // 처리 완료 핸들러
  const handleProcessingComplete = useCallback(
    async (result: ProcessingResult) => {
      try {
        log('useUploadModal', '🔄 Converting segments to clips')

        // 1. 결과를 IndexedDB에 저장
        try {
          await processingResultStorage.saveResult(result.job_id, result, {
            fileName: state.fileName,
            videoUrl: state.videoUrl,
          })
          log('useUploadModal', '💾 Processing result saved to IndexedDB')
        } catch (error) {
          log('useUploadModal', '⚠️ Failed to save processing result:', error)
        }

        // 2. 업로드 완료 토스트 메시지
        showToast('음성 분석이 완료되었습니다', 'success')

        // 3. 업로드 알림 설정 (벨 아이콘에 빨간 점)
        setUploadNotification(true)

        // 🔥 중요: videoUrl 안정적 해결
        const resolvedVideoUrl =
          state.videoUrl ||
          useEditorStore.getState().videoUrl ||
          sessionStorage.getItem('currentVideoUrl') ||
          undefined

        console.log(
          '[VIDEO DEBUG] handleProcessingComplete - state.videoUrl:',
          state.videoUrl
        )
        console.log(
          '[VIDEO DEBUG] handleProcessingComplete - store.videoUrl:',
          useEditorStore.getState().videoUrl
        )
        console.log(
          '[VIDEO DEBUG] handleProcessingComplete - sessionStorage.videoUrl:',
          sessionStorage.getItem('currentVideoUrl')
        )
        console.log(
          '[VIDEO DEBUG] handleProcessingComplete - resolved.videoUrl:',
          resolvedVideoUrl
        )
        console.log(
          '[VIDEO DEBUG] handleProcessingComplete - state.fileName:',
          state.fileName
        )

        // 새 프로젝트 생성 (이전 프로젝트 대체)
        const projectId = `project-${Date.now()}`
        const projectName = state.fileName
          ? state.fileName.replace(/\.[^/.]+$/, '') // 확장자 제거
          : '새 프로젝트'

        // 결과가 없거나 세그먼트가 없으면 빈 클립으로 처리
        if (
          !result ||
          !result.result?.segments ||
          result.result.segments.length === 0
        ) {
          log(
            'useUploadModal',
            '⚠️ No segments found, creating empty clips list'
          )

          const emptyClips: ClipItem[] = []
          setClips(emptyClips)

          // 빈 클립에서도 화자 정보 초기화 (최소 기본 화자 생성)
          initializeSpeakers(emptyClips, result.result?.speakers)

          // 메타데이터는 기본값으로 설정 (중요: videoUrl은 유지!)
          setMediaInfo({
            videoDuration: result?.result?.metadata?.duration || 0,
            videoUrl: resolvedVideoUrl, // ✅ 안정적으로 해결된 URL 사용!
            videoName: state.fileName,
            videoType: 'video/mp4',
            videoThumbnail: state.videoThumbnail, // 썸네일 유지
          })

          // 빈 프로젝트도 생성 및 저장 (중요: videoUrl 포함!)
          const emptyProject: ProjectData = {
            id: projectId,
            name: projectName,
            clips: emptyClips,
            settings: {
              autoSaveEnabled: true,
              autoSaveInterval: 30,
              defaultSpeaker: '화자1',
              exportFormat: 'srt',
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            videoDuration: result?.result?.metadata?.duration || 0,
            videoUrl: resolvedVideoUrl, // ✅ 안정적으로 해결된 URL 저장!
            videoName: state.fileName,
            storedMediaId: useEditorStore.getState().storedMediaId || undefined, // IndexedDB에 저장된 미디어 ID
          }

          setCurrentProject(emptyProject)

          // sessionStorage 업데이트 (새로고침 시 이 프로젝트를 로드하도록)
          sessionStorage.setItem('currentProjectId', projectId)
          sessionStorage.setItem('lastUploadProjectId', projectId)
          // storedMediaId도 백업 저장
          const currentStoredMediaId = useEditorStore.getState().storedMediaId
          if (currentStoredMediaId) {
            sessionStorage.setItem('currentStoredMediaId', currentStoredMediaId)
          }

          log(
            'useUploadModal',
            `💾 Created empty project with speakers: ${projectId}`
          )

          // 빈 프로젝트에서도 정상적인 완료 처리로 진행
          updateState({ step: 'completed' })
          setTimeout(() => {
            goToEditor()
          }, 1000)
          return
        }

        // 정상적인 결과 처리
        // 세그먼트를 클립으로 변환 (화자 매핑 적용)
        const clips = convertSegmentsToClips(
          result.result.segments,
          result.result.speakerMapping
        )

        // duration 계산 (metadata에 없으면 segments에서 계산)
        let videoDuration = result.result.metadata?.duration
        if (!videoDuration && result.result.segments?.length > 0) {
          // segments의 마지막 end 시간을 duration으로 사용
          const lastSegment =
            result.result.segments[result.result.segments.length - 1]
          videoDuration = lastSegment.end || 0

          // 모든 세그먼트의 타이밍이 0이면 세그먼트 개수 기반으로 추정
          if (videoDuration === 0) {
            videoDuration = result.result.segments.length * 1.0 // 각 세그먼트당 1초
            log(
              'useUploadModal',
              `⚠️ All timings are 0, estimated duration: ${videoDuration}s based on ${result.result.segments.length} segments`
            )
          } else {
            log(
              'useUploadModal',
              `⚠️ Using last segment end as duration: ${videoDuration}`
            )
          }
        }

        // 메타데이터 업데이트 (Blob URL 유지!)
        setMediaInfo({
          videoDuration: videoDuration || 0,
          videoUrl: resolvedVideoUrl, // ✅ 안정적으로 해결된 URL 사용!
          videoName: state.fileName,
          videoType: 'video/mp4', // 타입 명시
          videoThumbnail: state.videoThumbnail, // 썸네일 유지
        })
        setClips(clips)

        // 화자 정보 초기화 (ML 분석 결과와 클립 기반 화자 통합)
        initializeSpeakers(clips, result.result.speakers)

        // 프로젝트 생성 및 저장 (Blob URL 포함)
        const newProject: ProjectData = {
          id: projectId,
          name: projectName,
          clips: clips,
          settings: {
            autoSaveEnabled: true,
            autoSaveInterval: 30,
            defaultSpeaker: '화자1',
            exportFormat: 'srt',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          videoDuration: videoDuration || 0,
          videoUrl: resolvedVideoUrl, // ✅ 안정적으로 해결된 URL 저장!
          videoName: state.fileName,
          storedMediaId: useEditorStore.getState().storedMediaId || undefined, // IndexedDB에 저장된 미디어 ID
        }

        // 프로젝트를 localStorage에 저장
        projectStorage.saveProject(newProject).catch((error) => {
          log('useUploadModal', `⚠️ Failed to save project: ${error}`)
        })
        projectStorage.saveCurrentProject(newProject) // 현재 프로젝트로 설정

        setCurrentProject(newProject)
        // sessionStorage 업데이트 (새로고침 시 이 프로젝트를 로드하도록)
        sessionStorage.setItem('currentProjectId', projectId)
        sessionStorage.setItem('lastUploadProjectId', projectId)
        // storedMediaId도 백업 저장
        const currentStoredMediaId = useEditorStore.getState().storedMediaId
        if (currentStoredMediaId) {
          sessionStorage.setItem('currentStoredMediaId', currentStoredMediaId)
        }

        log(
          'useUploadModal',
          `💾 Created project: ${projectId} with ${clips.length} clips`
        )

        updateState({ step: 'completed' })

        // Check if this is the first time user and prepare tutorial trigger
        const hasSeenEditorTutorial = localStorage.getItem(
          'hasSeenEditorTutorial'
        )
        if (!hasSeenEditorTutorial) {
          // Set flag for immediate tutorial trigger
          sessionStorage.setItem('showTutorialAfterProcessing', 'true')
        }

        // 즉시 에디터로 이동 (3초 대기 제거)
        goToEditor()
      } catch (error) {
        log('useUploadModal', `❌ Failed to process result: ${error}`)
        log('useUploadModal', '⚠️ Proceeding to editor despite error')

        // 에러가 발생해도 완료 처리하고 즉시 에디터로 이동
        updateState({ step: 'completed' })
        goToEditor()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      setMediaInfo,
      setClips,
      setCurrentProject,
      updateState,
      state.fileName,
      state.videoUrl,
    ]
  )

  // 세그먼트 → 클립 변환 함수
  const convertSegmentsToClips = useCallback(
    (
      segments: SegmentData[],
      speakerMapping?: Record<string, string>
    ): ClipItem[] => {
      return segments.map((segment, index) => {
        // segment.id가 없으면 index 사용
        const segmentId = segment.id || index

        // speaker 처리: 객체인 경우 speaker_id 추출
        let speakerValue = 'Unknown'
        if (segment.speaker) {
          if (
            typeof segment.speaker === 'object' &&
            'speaker_id' in segment.speaker
          ) {
            speakerValue = segment.speaker.speaker_id || 'Unknown'
          } else if (typeof segment.speaker === 'string') {
            speakerValue = segment.speaker
          }
        }

        // speakerMapping이 있으면 매핑 적용 (SPEAKER_XX -> 화자X)
        if (speakerMapping && speakerMapping[speakerValue]) {
          speakerValue = speakerMapping[speakerValue]
        }

        // 세그먼트 타이밍 계산 (ML이 0을 반환한 경우 자동 생성)
        let segmentStart = segment.start || 0
        let segmentEnd = segment.end || 0

        // 타이밍 유효성 검증만 수행 (1초 단위 생성 제거)
        if (!isFinite(segmentStart) || segmentStart < 0) {
          segmentStart = 0
        }
        if (!isFinite(segmentEnd) || segmentEnd < 0) {
          segmentEnd = 0
        }

        // start와 end가 같거나 잘못된 경우에만 최소값 보장
        if (segmentEnd <= segmentStart) {
          // 최소 0.001초 차이만 보장 (MotionText 검증 통과용)
          segmentEnd = segmentStart + 0.001
        }

        // 단어 데이터 변환 (타이밍 검증 포함)
        const words: Word[] =
          segment.words?.map((word, wordIndex) => {
            // 타이밍 검증 및 수정
            let wordStart = word.start || 0
            let wordEnd = word.end || 0

            // 유효성 검증
            if (!isFinite(wordStart) || wordStart < 0) {
              wordStart = 0
            }
            if (!isFinite(wordEnd) || wordEnd < 0) {
              wordEnd = 0
            }

            // end가 start보다 작거나 같으면 최소값 보장
            if (wordEnd <= wordStart) {
              wordEnd = wordStart + 0.001
            }

            return {
              id: `word-${segmentId}-${wordIndex}`,
              text: word.word,
              start: wordStart,
              end: wordEnd,
              isEditable: true,
              confidence: word.confidence,
            }
          }) || []

        // 단어가 없으면 전체 텍스트를 하나의 단어로 처리
        if (words.length === 0 && segment.text) {
          words.push({
            id: `word-${segmentId}-0`,
            text: segment.text,
            start: segmentStart,
            end: segmentEnd,
            isEditable: true,
            confidence: segment.confidence,
          })
        }

        return {
          id: `clip-${segmentId}`,
          timeline: `${formatTime(segmentStart)} - ${formatTime(segmentEnd)}`,
          speaker: speakerValue,
          subtitle: segment.text,
          fullText: segment.text,
          duration: formatDuration(segmentEnd - segmentStart),
          thumbnail: '', // 썸네일은 추후 구현
          words,
          stickers: [],
        }
      })
    },
    []
  )

  // 시간 포맷팅 헬퍼
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  // 에디터로 이동
  const goToEditor = useCallback(() => {
    log('useUploadModal', '🚀 Navigating to editor')

    // Check if this is the first time user - show tutorial modal immediately after upload completion
    const hasSeenEditorTutorial = localStorage.getItem('hasSeenEditorTutorial')
    const shouldShowTutorial = !hasSeenEditorTutorial

    closeModal()
    router.push('/editor')

    // Trigger tutorial modal immediately after navigation starts
    if (shouldShowTutorial) {
      // Use requestAnimationFrame to ensure DOM is updated after route change
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('showTutorialOnUpload'))
      })
    }
  }, [closeModal, router])

  // 처리 취소
  const cancelProcessing = useCallback(async () => {
    if (currentJobId) {
      log('useUploadModal', `🛑 Cancelling job: ${currentJobId}`)
      await uploadService.cancelProcessing(currentJobId)

      // 전역 폴링도 중단
      stopGlobalPolling(currentJobId)
    }

    if (stopPollingRef.current) {
      stopPollingRef.current()
      stopPollingRef.current = null
    }

    // Progress store에서 작업 제거
    if (currentProgressTaskId) {
      removeTask(currentProgressTaskId)
      setCurrentProgressTaskId(undefined)
    }

    closeModal()
  }, [
    currentJobId,
    currentProgressTaskId,
    removeTask,
    closeModal,
    stopGlobalPolling,
  ])

  // 재시도
  const retryUpload = useCallback(() => {
    updateState({
      step: 'select',
      uploadProgress: 0,
      processingProgress: 0,
      error: undefined,
    })
  }, [updateState])

  return {
    // 상태
    isTranscriptionLoading:
      state.step === 'uploading' || state.step === 'processing',
    ...state,

    // 액션
    openModal,
    closeModal,
    handleFileSelect,
    setVideoInfo,
    handleStartTranscription,
    goToEditor,
    cancelProcessing,
    retryUpload,
  }
}
