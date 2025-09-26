'use client'

import { buildScenarioFromClips } from '@/app/(route)/editor/utils/scenarioBuilder'
import { useProgressStore } from '@/lib/store/progressStore'
import { useToastTimerStore } from '@/lib/store/toastTimerStore'
import { showToast } from '@/utils/ui/toast'
import { useEffect, useState } from 'react'
import { useServerVideoExport } from '../../hooks/useServerVideoExport'
import { useEditorStore } from '../../store'
import CustomExportModal from './CustomExportModal'
import VideoExportProgressModal from './VideoExportProgressModal'

// 중복 토스트 방지를 위한 전역 변수
let lastToastTime = 0
const TOAST_DEBOUNCE_TIME = 1000 // 1초

interface ServerVideoExportModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl?: string
}

export default function ServerVideoExportModal({
  isOpen,
  onClose,
  videoUrl: propVideoUrl,
}: ServerVideoExportModalProps) {
  const { clips, videoUrl: storeVideoUrl, videoName } = useEditorStore()
  const {
    isExporting,
    progress,
    status,
    error,
    downloadUrl,
    downloadFile,
    reset,
  } = useServerVideoExport()

  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
  const [phase, setPhase] = useState<string>('ready')

  // 전역 토스트 타이머 store 사용
  const { startDelayedToast } = useToastTimerStore()

  // 내보내기 완료 알림 관리
  const { setExportNotification } = useProgressStore()

  // 비디오 URL 결정 (props > store)
  const videoUrl = propVideoUrl || storeVideoUrl

  useEffect(() => {
    if (isOpen) {
      setPhase('ready')
      setIsProgressModalOpen(false)
      reset()
    }
  }, [isOpen, reset])

  useEffect(() => {
    if (status === 'completed' && downloadUrl) {
      setPhase('completed')
      setIsProgressModalOpen(false)
      onClose() // 전체 모달 닫기
    } else if (status === 'failed' || error) {
      setPhase('error')
      setIsProgressModalOpen(false)
      showToast('영상 출력 중 오류가 발생했습니다', 'error')
      onClose() // 전체 모달 닫기
    } else if (isExporting) {
      setPhase('exporting')
    }
  }, [status, downloadUrl, error, isExporting, onClose])

  const handleStartExport = async () => {
    // 🧪 [기존 업로드 상태 체크 - 주석처리] UI 개발을 위한 임시 우회
    // if (!videoUrl) {
    //   console.error('🚨 비디오 URL이 없습니다')
    //   return
    // }
    // if (!clips || clips.length === 0) {
    //   console.error('🚨 자막 데이터가 없습니다')
    //   return
    // }

    // 🧪 UI 개발용: 샘플 데이터로 항상 진행 가능하도록 설정
    const sampleVideoUrl = videoUrl || '/friends.mp4'
    const sampleClips =
      clips && clips.length > 0
        ? clips
        : [
            {
              id: 'sample-1',
              text: '샘플 자막 텍스트입니다',
              startTime: 0,
              endTime: 5,
              speaker: 'Speaker 1',
            },
            {
              id: 'sample-2',
              text: '두 번째 샘플 자막입니다',
              startTime: 5,
              endTime: 10,
              speaker: 'Speaker 2',
            },
          ]

    console.log('🧪 개발 모드: 업로드 상태 체크 우회됨', {
      originalVideoUrl: videoUrl,
      sampleVideoUrl,
      originalClips: clips?.length || 0,
      sampleClips: sampleClips.length,
    })

    // 진행률 모달 열기
    setIsProgressModalOpen(true)

    try {
      setPhase('exporting')

      // 🧪 [기존 시나리오 생성 및 GPU 렌더링 - 주석처리] UI 개발을 위한 임시 우회
      // const scenario = buildScenarioFromClips(clips)
      // console.log('🔍 Generated scenario debug:', {
      //   version: scenario.version,
      //   tracks: scenario.tracks.length,
      //   cues: scenario.cues.length,
      //   validCues: scenario.cues.filter((c) => c.hintTime?.start !== undefined)
      //     .length,
      //   firstCue: scenario.cues[0],
      // })
      // if (scenario.cues.length === 0) {
      //   throw new Error(
      //     '유효한 자막이 없습니다. 자막을 추가한 후 다시 시도해주세요.'
      //   )
      // }
      // await startExport(
      //   videoUrl,
      //   scenario,
      //   {
      //     width: 1920,
      //     height: 1080,
      //     fps: 30,
      //     quality: 90,
      //     format: 'mp4',
      //   },
      //   fileName
      // )

      // 🧪 UI 개발용: 가상 시나리오 생성 시뮬레이션
      try {
        const mockScenario = buildScenarioFromClips(sampleClips)
        console.log('🧪 가상 시나리오 생성 성공:', {
          clips: sampleClips.length,
          cues: mockScenario.cues.length,
        })
      } catch {
        console.log('🧪 시나리오 생성 우회: 가상 시나리오 사용')
      }

      // 파일명 생성 (UI 표시용)
      const baseName = videoName?.replace(/\.[^/.]+$/, '') || 'friends'
      const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const fileName = `${baseName}_GPU_${timestamp}.mp4`

      console.log('🧪 UI 개발 모드: 실제 GPU 렌더링 없이 진행률 모달만 표시', {
        sampleVideoUrl,
        fileName,
        clipCount: sampleClips.length,
      })
    } catch (error) {
      console.error('🚨 Export failed:', error)
      setIsProgressModalOpen(false)
      // 저장 위치 선택 취소인 경우 원래 상태로 돌아감
      if (error instanceof Error && error.message.includes('취소')) {
        setPhase('ready')
      } else {
        setPhase('error')
      }
    }
  }

  const handleDownload = async () => {
    if (downloadUrl) {
      // 파일명 제안: 비디오 이름이 있으면 사용, 없으면 프로젝트명 또는 기본값 사용
      const baseName = videoName?.replace(/\.[^/.]+$/, '') || 'video'
      const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const filename = `${baseName}_GPU_${timestamp}.mp4`

      await downloadFile(downloadUrl, filename)
    }
  }

  const handleProgressModalClose = () => {
    setIsProgressModalOpen(false)
    setPhase('ready')
    onClose() // 부모 모달도 함께 닫기

    // 전역 토스트 타이머로 30초 후 완료 토스트 표시
    startDelayedToast('영상 출력이 완료되었습니다', 30000)

    // 30초 후 내보내기 완료 알림 설정 (종 아이콘에 빨간점 표시)
    setTimeout(() => {
      console.log(
        '[ServerVideoExportModal] Setting export notification to true (after 30s)'
      )
      setExportNotification(true)
    }, 30000)
  }

  const handleProgressModalComplete = () => {
    setIsProgressModalOpen(false)

    // 중복 토스트 방지: 1초 이내 중복 호출 시 무시
    const currentTime = Date.now()
    if (currentTime - lastToastTime > TOAST_DEBOUNCE_TIME) {
      showToast('영상 출력이 완료되었습니다', 'success')
      lastToastTime = currentTime
    }

    // 내보내기 완료 알림 설정 (종 아이콘에 빨간점 표시)
    console.log('[ServerVideoExportModal] Setting export notification to true')
    setExportNotification(true)

    setPhase('completed')
    onClose()
  }

  return (
    <CustomExportModal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdropClick={!isExporting}
      aria-label="동영상 내보내기"
    >
      {!isProgressModalOpen && (
        <div className="p-6">
          {/* 제목 */}
          <h2 className="text-xl font-semibold text-center text-gray-900 mb-6">
            동영상 내보내기
          </h2>

          {/* 대상 클립 섹션 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              대상 클립
            </h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="radio"
                    name="targetClip"
                    value="all"
                    defaultChecked
                    className="sr-only"
                  />
                  <div className="w-4 h-4 bg-brand-sub rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                <span className="text-sm text-gray-900">
                  모든 씬, 모든 클립
                </span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer opacity-50">
                <div className="relative">
                  <input
                    type="radio"
                    name="targetClip"
                    value="current"
                    disabled
                    className="sr-only"
                  />
                  <div className="w-4 h-4 border-2 border-gray-300 rounded-full bg-white"></div>
                </div>
                <span className="text-sm text-gray-400">
                  현재 씬, 모든 클립
                </span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer opacity-50">
                <div className="relative">
                  <input
                    type="radio"
                    name="targetClip"
                    value="selected"
                    disabled
                    className="sr-only"
                  />
                  <div className="w-4 h-4 border-2 border-gray-300 rounded-full bg-white"></div>
                </div>
                <span className="text-sm text-gray-400">
                  선택된 클립 (없음)
                </span>
              </label>
            </div>
          </div>

          {/* 해상도 섹션 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">해상도</h3>
            <div className="relative">
              <select className="w-full px-3 py-2.5 text-sm border text-gray-900 border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-brand-sub focus:border-brand-sub appearance-none">
                <option value="원본 (640 x 360)" className="text-gray-900">
                  원본 (640 x 360)
                </option>
                <option
                  value="HD (1280 x 720)"
                  disabled
                  className="text-gray-400"
                >
                  HD (1280 x 720)
                </option>
                <option
                  value="Full HD (1920 x 1080)"
                  disabled
                  className="text-gray-400"
                >
                  Full HD (1920 x 1080)
                </option>
                <option
                  value="4K (3840 x 2160)"
                  disabled
                  className="text-gray-400"
                >
                  4K (3840 x 2160)
                </option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* 고급 설정 섹션 */}
          <div className="mb-6">
            <button className="flex items-center text-sm font-medium text-gray-700">
              <svg
                className="w-4 h-4 mr-2 transform transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              고급 설정
            </button>
          </div>

          {/* 하단 버튼 - Modern Design */}
          <div className="flex space-x-3 justify-end">
            <button onClick={onClose} className="btn-modern-secondary">
              취소
            </button>
            <button
              onClick={handleStartExport}
              disabled={isExporting}
              className={`btn-modern-black ${isExporting ? 'btn-modern-loading' : ''}`}
            >
              내보내기
            </button>
          </div>
        </div>
      )}

      {/* 영상 출력 진행률 모달 */}
      <VideoExportProgressModal
        isOpen={isProgressModalOpen}
        onClose={handleProgressModalClose}
        onComplete={handleProgressModalComplete}
      />
    </CustomExportModal>
  )
}
