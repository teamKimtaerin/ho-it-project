'use client'

import {
  // closestCenter, // Currently unused
  closestCorners,
  DndContext,
  DragOverlay,
} from '@dnd-kit/core'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Store
import { useEditorStore } from './store'

// Storage & Managers
import { log } from '@/utils/logger'
import { AutosaveManager } from '@/utils/managers/AutosaveManager'
import { projectInfoManager } from '@/utils/managers/ProjectInfoManager'
import { mediaStorage } from '@/utils/storage/mediaStorage'
import { projectStorage } from '@/utils/storage/projectStorage'

// API Services

// Types
import { ClipItem } from './components/ClipComponent/types'
import { EditorTab } from './types'

// Hooks
import ProcessingModal from '@/components/ProcessingModal'
import { useDeployModal } from '@/hooks/useDeployModal'
import { useUploadModal } from '@/hooks/useUploadModal'
import useChatBot from './hooks/useChatBot'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { useGlobalWordDragAndDrop } from './hooks/useGlobalWordDragAndDrop'
import { useSelectionBox } from './hooks/useSelectionBox'
import { useUnsavedChanges } from './hooks/useUnsavedChanges'
import { useSpeakerSync } from './hooks/useSpeakerSync'

// Components
import SelectionBox from '@/components/DragDrop/SelectionBox'
import NewUploadModal from '@/components/NewUploadModal'
import TutorialModal from '@/components/TutorialModal'
import { ChevronDownIcon } from '@/components/icons'
import AlertDialog from '@/components/ui/AlertDialog'
import DeployModal from '@/components/ui/DeployModal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ResizablePanelDivider from '@/components/ui/ResizablePanelDivider'
import { normalizeClipOrder } from '@/utils/editor/clipTimelineUtils'
import { getSpeakerColor } from '@/utils/editor/speakerColors'
import AnimationAssetSidebar from './components/AnimationAssetSidebar'
import ChatBotContainer from './components/ChatBot/ChatBotContainer'
import EditorHeaderTabs from './components/EditorHeaderTabs'
import PlatformSelectionModal from './components/Export/PlatformSelectionModal'
import SimpleToolbar from './components/SimpleToolbar'
import SpeakerManagementSidebar from './components/SpeakerManagementSidebar'
import SubtitleEditList from './components/SubtitleEditList'
import Toolbars from './components/Toolbars'
import VideoSection from './components/VideoSection'

// Utils
import { EditorHistory } from '@/utils/editor/EditorHistory'
import { areClipsConsecutive } from '@/utils/editor/clipMerger'
import { BatchChangeSpeakerCommand } from '@/utils/editor/commands/BatchChangeSpeakerCommand'
import { ChangeSpeakerCommand } from '@/utils/editor/commands/ChangeSpeakerCommand'
import { CopyClipsCommand } from '@/utils/editor/commands/CopyClipsCommand'
import { DeleteClipCommand } from '@/utils/editor/commands/DeleteClipCommand'
import { MergeClipsCommand } from '@/utils/editor/commands/MergeClipsCommand'
import { PasteClipsCommand } from '@/utils/editor/commands/PasteClipsCommand'
import { RemoveSpeakerCommand } from '@/utils/editor/commands/RemoveSpeakerCommand'
import { SplitClipCommand } from '@/utils/editor/commands/SplitClipCommand'
import { showToast } from '@/utils/ui/toast'
import { processingResultStorage } from '@/utils/storage/processingResultStorage'

// TimelineClipCard 컴포넌트
interface TimelineClipCardProps {
  clip: ClipItem
  isActive: boolean
  startTime: number
  endTime: number
  speakers: string[]
  speakerColors: Record<string, string>
  onClipSelect: (clipId: string) => void
  onSpeakerChange: (clipId: string, newSpeaker: string) => void
  onAddSpeaker: (name: string) => void
  onRenameSpeaker: (oldName: string, newName: string) => void
  onOpenSpeakerManagement: () => void
  onTextEdit: (clipId: string, newText: string) => void
  formatTime: (seconds: number) => string
}

function TimelineClipCard({
  clip,
  isActive,
  startTime,
  endTime,
  speakers,
  speakerColors,
  onClipSelect,
  onSpeakerChange,
  onAddSpeaker,
  onRenameSpeaker,
  onOpenSpeakerManagement,
  onTextEdit,
  formatTime,
}: TimelineClipCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isEditingText, setIsEditingText] = useState(false)
  const [editingText, setEditingText] = useState('')
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [pendingRename, setPendingRename] = useState<{
    oldName: string
    newName: string
  } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLTextAreaElement>(null)

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return
      }

      const portalDropdown = document.querySelector('.fixed.rounded.bg-white')
      if (portalDropdown && portalDropdown.contains(target)) {
        return
      }

      setIsDropdownOpen(false)
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleSpeakerSelect = (value: string) => {
    if (value === 'add_new') {
      const nextSpeakerNumber = speakers.length + 1
      const newSpeakerName = `화자${nextSpeakerNumber}`
      onAddSpeaker(newSpeakerName)
      onSpeakerChange(clip.id, newSpeakerName)
      setIsDropdownOpen(false)
    } else if (value === 'manage_speakers') {
      onOpenSpeakerManagement()
      setIsDropdownOpen(false)
    } else if (value.startsWith('edit_')) {
      const speakerToEdit = value.replace('edit_', '')
      setEditingSpeaker(speakerToEdit)
      setEditingName(speakerToEdit)
      setIsDropdownOpen(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      onSpeakerChange(clip.id, value)
      setIsDropdownOpen(false)
    }
  }

  const handleSaveEdit = () => {
    if (!editingName.trim() || !editingSpeaker) {
      handleCancelEdit()
      return
    }

    const trimmedName = editingName.trim()

    if (trimmedName === editingSpeaker) {
      setEditingSpeaker(null)
      setEditingName('')
      return
    }

    if (speakers.includes(trimmedName) && trimmedName !== editingSpeaker) {
      showToast('이미 존재하는 화자명입니다', 'error')
      setEditingName(editingSpeaker)
      return
    }

    setPendingRename({ oldName: editingSpeaker, newName: trimmedName })
    setShowRenameModal(true)
    setEditingSpeaker(null)
    setEditingName('')
  }

  const handleRenameChoice = (applyToAll: boolean) => {
    if (!pendingRename) return

    if (applyToAll) {
      onRenameSpeaker(pendingRename.oldName, pendingRename.newName)
    } else {
      onAddSpeaker(pendingRename.newName)
      onSpeakerChange(clip.id, pendingRename.newName)
    }

    setShowRenameModal(false)
    setPendingRename(null)
    setEditingSpeaker(null)
    setEditingName('')
  }

  const handleCancelEdit = () => {
    setEditingSpeaker(null)
    setEditingName('')
    if (inputRef.current) {
      inputRef.current.blur()
    }
  }

  const handleTextClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditingText(true)
    setEditingText(clip.fullText)
  }

  const handleTextSave = () => {
    if (editingText.trim() !== clip.fullText && editingText.trim() !== '') {
      onTextEdit(clip.id, editingText.trim())
    }
    setIsEditingText(false)
    setEditingText('')
  }

  const handleTextCancel = () => {
    setIsEditingText(false)
    setEditingText('')
  }

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleTextCancel()
    }
  }

  // 텍스트 편집 시 자동 포커스
  useEffect(() => {
    if (isEditingText && textInputRef.current) {
      textInputRef.current.focus()
      textInputRef.current.select()
    }
  }, [isEditingText])

  return (
    <>
      <div
        className={`p-3 rounded-lg cursor-pointer transition-all border ${
          isActive
            ? 'bg-blue-50 border-blue-200 shadow-md'
            : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
        }`}
        onClick={() => onClipSelect(clip.id)}
      >
        {/* 시간 정보 */}
        <div className="mb-3">
          <span className="text-xs text-gray-500">
            {formatTime(startTime)} - {formatTime(endTime)}
          </span>
        </div>

        {/* 메인 콘텐츠 - 고급 편집 페이지와 동일한 그리드 레이아웃 */}
        <div className="grid grid-cols-[160px_1fr] gap-3 items-start">
          {/* 화자 영역 */}
          <div className="flex items-center h-8">
            {editingSpeaker ? (
              <div
                className="relative flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') handleSaveEdit()
                    if (e.key === 'Escape') handleCancelEdit()
                  }}
                  onBlur={() => setTimeout(() => handleSaveEdit(), 100)}
                  placeholder="화자 이름 입력"
                  className="h-8 px-3 text-sm bg-white text-black border border-gray-300 rounded
                            focus:outline-none focus:ring-2 focus:border-transparent 
                            w-[120px] flex-shrink-0 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div
                ref={dropdownRef}
                className="relative flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="inline-flex items-center justify-between h-8 px-3 text-sm font-medium
                             bg-transparent text-black border border-gray-300 rounded
                             hover:bg-gray-50 hover:border-gray-400 transition-all
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             w-[120px] flex-shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsDropdownOpen(!isDropdownOpen)
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: getSpeakerColor(
                          clip.speaker,
                          speakerColors
                        ),
                      }}
                    />
                    <span
                      className={`truncate overflow-hidden whitespace-nowrap ${!clip.speaker ? 'text-orange-500' : ''}`}
                      style={{ maxWidth: '70px' }}
                    >
                      {clip.speaker || '화자 없음'}
                    </span>
                  </div>
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* 드롭다운 메뉴 */}
                {isDropdownOpen &&
                  typeof window !== 'undefined' &&
                  createPortal(
                    <div
                      className="fixed rounded bg-white border border-gray-300 shadow-lg"
                      style={{
                        zIndex: 99999,
                        left:
                          dropdownRef.current?.getBoundingClientRect().left ||
                          0,
                        top:
                          (dropdownRef.current?.getBoundingClientRect()
                            .bottom || 0) + 4,
                        width: '120px',
                        minWidth: '120px',
                        maxWidth: '120px',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {speakers.map((s) => (
                        <div key={s} className="group">
                          <div
                            className="px-3 py-2 text-sm text-black hover:bg-gray-50 cursor-pointer
                                  transition-colors flex items-center justify-between"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleSpeakerSelect(s)
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: getSpeakerColor(
                                    s,
                                    speakerColors
                                  ),
                                }}
                              />
                              <span
                                className={`truncate overflow-hidden whitespace-nowrap ${clip.speaker === s ? 'text-blue-600 font-medium' : ''}`}
                                style={{ maxWidth: '50px' }}
                              >
                                {s}
                              </span>
                            </div>
                            <button
                              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-black
                                    text-xs px-1 py-0.5 rounded transition-all flex-shrink-0 cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleSpeakerSelect(`edit_${s}`)
                              }}
                            >
                              편집
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="border-t border-gray-200 my-1" />

                      <div
                        className="px-3 py-2 text-sm text-blue-600 hover:bg-gray-50 cursor-pointer
                              transition-colors font-medium"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleSpeakerSelect('add_new')
                        }}
                      >
                        + 화자 추가하기
                      </div>

                      <div
                        className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 cursor-pointer
                              transition-colors font-medium flex items-center gap-2"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleSpeakerSelect('manage_speakers')
                        }}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        화자 관리
                      </div>
                    </div>,
                    document.body
                  )}
              </div>
            )}
          </div>

          {/* 텍스트 영역 */}
          <div className="overflow-hidden min-w-0 min-h-[32px] flex items-center">
            {isEditingText ? (
              <textarea
                ref={textInputRef}
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={handleTextKeyDown}
                onBlur={handleTextSave}
                className="w-full text-sm text-black bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                rows={2}
              />
            ) : (
              <div
                className={`text-sm cursor-text hover:bg-gray-50 rounded px-2 py-1 transition-colors ${isActive ? 'font-medium text-gray-900' : 'text-gray-700'}`}
                onClick={handleTextClick}
              >
                {clip.fullText}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 화자 이름 변경 적용 범위 확인 모달 */}
      {showRenameModal &&
        pendingRename &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center"
            style={{ zIndex: 99999 }}
          >
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                화자 이름 변경 적용 범위
              </h3>
              <div className="text-gray-300 mb-6 space-y-2">
                <p>
                  &quot;{pendingRename.oldName}&quot;을 &quot;
                  {pendingRename.newName}&quot;로 변경합니다.
                </p>
                <p className="text-sm text-gray-400">
                  이 화자를 사용하는 다른 클립에도 변경사항을 적용하시겠습니까?
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => handleRenameChoice(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded
                          hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  아니오 (현재 클립만)
                </button>
                <button
                  onClick={() => handleRenameChoice(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded
                          hover:bg-purple-700 transition-colors cursor-pointer"
                >
                  예 (모든 클립)
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

export default function EditorPage() {
  // Store state for DnD and selection
  const {
    clips,
    setClips,
    setOriginalClips,
    restoreOriginalClips,
    saveOriginalClipsToStorage,
    loadOriginalClipsFromStorage,
    selectedClipIds,
    setSelectedClipIds,
    clearSelection,
    updateClipWords,
    updateClipFullText,
    updateClipFullTextAdvanced,
    // updateClipTiming, // Currently unused
    saveProject,
    activeClipId,
    setActiveClipId,
    videoPanelWidth,
    setVideoPanelWidth,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    rightSidebarType,
    setRightSidebarType,
    // isAssetSidebarOpen,
    assetSidebarWidth,
    setAssetSidebarWidth,
    editingMode,
    isMultipleWordsSelected,
    deleteSelectedWords,
    clearMultiSelection,
    speakerColors,
    setSpeakerColor,
    removeSpeakerColor,
    speakers: globalSpeakers,
    setSpeakers: setGlobalSpeakers,
    setSpeakerColors,
    buildInitialScenario,
    setCurrentProject,
    applyAutoLineBreak,
  } = useEditorStore()

  // ChatBot state
  const { isOpen: isChatBotOpen } = useChatBot()

  // Local state
  const [activeTab, setActiveTab] = useState<EditorTab>('home')
  const [showTutorialModal, setShowTutorialModal] = useState(false)
  const [isToolbarVisible, setIsToolbarVisible] = useState(true)
  const [editorHistory] = useState(() => {
    const history = new EditorHistory()
    // Connect history to save state
    history.setOnChangeCallback((hasChanges) => {
      setHasUnsavedChanges(hasChanges)
    })
    return history
  })
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1920
  )
  const [isRecovering, setIsRecovering] = useState(false) // 세션 복구 스피너 비활성화
  const [scrollProgress, setScrollProgress] = useState(0) // 스크롤 진행도
  // Store에서 rightSidebarType 가져오기 (로컬 state 대신 store 사용)
  const [clipboard, setClipboard] = useState<ClipItem[]>([]) // 클립보드 상태
  const [skipAutoFocus, setSkipAutoFocus] = useState(false) // 자동 포커스 스킵 플래그
  const [showRestoreModal, setShowRestoreModal] = useState(false) // 복원 확인 모달 상태
  const [shouldOpenExportModal, setShouldOpenExportModal] = useState(false) // OAuth 인증 후 모달 재오픈 플래그
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false) // 상태 초기화 확인 모달

  // Platform selection and deploy modal states
  const [isPlatformSelectionModalOpen, setIsPlatformSelectionModalOpen] =
    useState(false)
  const [, setSelectedPlatforms] = useState<string[]>([])
  const [pendingDeployTask, setPendingDeployTask] = useState<{
    id: number
    filename: string
  } | null>(null)

  // Deploy modal hook
  const { openDeployModal, deployModalProps } = useDeployModal()

  // Get media actions from store
  const { setMediaInfo, validateAndRestoreBlobUrl } = useEditorStore()

  // 대기 중인 처리 결과 확인 및 적용
  const checkAndApplyPendingResults = useCallback(async () => {
    const pendingJobId = sessionStorage.getItem('pendingJobId')
    if (!pendingJobId) return

    try {
      log(
        'EditorPage.tsx',
        `🔍 Checking pending result for job: ${pendingJobId}`
      )

      // IndexedDB에서 결과 로드
      const result = await processingResultStorage.loadResult(pendingJobId)
      if (!result) {
        log('EditorPage.tsx', '⚠️ No result found for pending job')
        sessionStorage.removeItem('pendingJobId')
        return
      }

      log('EditorPage.tsx', '🎉 Found pending result, applying to editor')

      // useUploadModal의 convertSegmentsToClips 로직을 여기서 재현
      const convertedClips: ClipItem[] = result.result.segments.map(
        (segment, index) => {
          const segmentId = `clip-${index + 1}`

          // 세그먼트 타이밍 계산
          let segmentStart = segment.start || 0
          let segmentEnd = segment.end || 0

          if (!isFinite(segmentStart) || segmentStart < 0) segmentStart = 0
          if (!isFinite(segmentEnd) || segmentEnd < 0) segmentEnd = 0
          if (segmentEnd <= segmentStart) segmentEnd = segmentStart + 0.001

          // 화자 정보 처리
          let speakerValue = 'Unknown'
          if (typeof segment.speaker === 'string') {
            speakerValue = segment.speaker
          } else if (segment.speaker && typeof segment.speaker === 'object') {
            speakerValue = (segment.speaker as any).speaker_id || 'Unknown'
          }

          // 화자 매핑 적용
          if (
            result.result.speakerMapping &&
            result.result.speakerMapping[speakerValue]
          ) {
            speakerValue = result.result.speakerMapping[speakerValue]
          }

          // 단어 데이터 변환
          const words =
            segment.words?.map((word, wordIndex) => {
              let wordStart = word.start || 0
              let wordEnd = word.end || 0

              if (!isFinite(wordStart) || wordStart < 0) wordStart = 0
              if (!isFinite(wordEnd) || wordEnd < 0) wordEnd = 0
              if (wordEnd <= wordStart) wordEnd = wordStart + 0.001

              return {
                id: `word-${segmentId}-${wordIndex}`,
                text: word.word,
                start: wordStart,
                end: wordEnd,
                isEditable: true,
                confidence: word.confidence || 0.9,
              }
            }) || []

          return {
            id: segmentId,
            timeline: `${(segmentStart || 0).toFixed(2)}s - ${(segmentEnd || 0).toFixed(2)}s`,
            text: segment.text,
            subtitle: segment.text,
            fullText: segment.text,
            speaker: speakerValue,
            start: segmentStart,
            end: segmentEnd,
            duration: `${((segmentEnd || 0) - (segmentStart || 0)).toFixed(2)}초`,
            thumbnail: '',
            confidence: segment.confidence || 0.9,
            words,
            stickers: [],
          }
        }
      )

      // 화자 정보 초기화 (감지된 화자가 없으면 빈 배열)
      const mlSpeakers = result.result.speakers || []
      const allSpeakers = [...mlSpeakers]
      const finalSpeakers = allSpeakers

      const finalColors: Record<string, string> = {}
      finalSpeakers.forEach((speaker, index) => {
        // getSpeakerColorByIndex 함수 대신 간단한 색상 할당
        const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6']
        finalColors[speaker] = colors[index % colors.length]
      })

      // Store에 데이터 적용
      setClips(convertedClips)
      setGlobalSpeakers(finalSpeakers)
      setSpeakerColors(finalColors)

      // 시나리오 생성
      try {
        buildInitialScenario(convertedClips)
      } catch (error) {
        log('EditorPage.tsx', '⚠️ Failed to build scenario:', error)
      }

      // 프로젝트 생성
      const projectId = `project-${Date.now()}`
      const projectName =
        result.metadata?.fileName?.replace(/\.[^/.]+$/, '') || 'Untitled'

      const newProject = {
        id: projectId,
        name: projectName,
        clips: convertedClips,
        settings: {
          autoSaveEnabled: true,
          autoSaveInterval: 30,
          defaultSpeaker: finalSpeakers.length > 0 ? finalSpeakers[0] : '',
          exportFormat: 'srt' as const,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        videoDuration: result.result.metadata?.duration || 0,
        videoUrl: result.metadata?.videoUrl,
        videoName: result.metadata?.fileName,
      }

      setCurrentProject(newProject)
      sessionStorage.setItem('currentProjectId', projectId)

      // 정리
      sessionStorage.removeItem('pendingJobId')
      showToast('음성 분석 결과가 적용되었습니다', 'success')

      log('EditorPage.tsx', '✅ Pending result applied successfully')
    } catch (error) {
      log('EditorPage.tsx', '❌ Failed to apply pending result:', error)
      sessionStorage.removeItem('pendingJobId')
      showToast('결과 적용 중 오류가 발생했습니다', 'error')
    }
  }, [
    setClips,
    setGlobalSpeakers,
    setSpeakerColors,
    buildInitialScenario,
    setCurrentProject,
  ])

  // URL 파라미터에서 deploy 모달 파라미터 감지
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const shouldDeploy = urlParams.get('deploy')
      const taskId = urlParams.get('taskId')
      const filename = urlParams.get('filename')

      if (shouldDeploy === 'true' && taskId && filename) {
        // 배포 작업 정보 저장하고 플랫폼 선택 모달 먼저 열기
        setPendingDeployTask({
          id: parseInt(taskId),
          filename: decodeURIComponent(filename),
        })
        setIsPlatformSelectionModalOpen(true)

        // URL에서 파라미터 제거 (뒤로가기 시 모달이 다시 뜨지 않도록)
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [])

  // Platform selection modal handlers
  const handlePlatformSelectionClose = () => {
    setIsPlatformSelectionModalOpen(false)
    setPendingDeployTask(null)
    setSelectedPlatforms([])
  }

  const handlePlatformSelectionNext = (platforms: string[]) => {
    setSelectedPlatforms(platforms)
    setIsPlatformSelectionModalOpen(false)

    // 플랫폼 선택 완료 후 배포 모달 열기
    if (pendingDeployTask) {
      openDeployModal(pendingDeployTask)
    }
  }

  // 전체 상태 초기화 함수
  const resetEditorState = async () => {
    try {
      log('EditorPage.tsx', '🔄 Starting complete editor state reset')

      // 1. Store 상태 초기화
      const store = useEditorStore.getState()

      // 2. Scenario 초기화 (자막 파일 데이터)
      store.clearScenario()

      // 3. 미디어 상태 초기화
      store.clearMedia()

      // 4. 클립 데이터 초기화
      store.setClips([])
      store.setOriginalClips([])
      store.clearDeletedClips()

      // 5. 선택 상태 초기화
      store.setSelectedClipIds(new Set())

      // 6. 워드 애니메이션 상태 초기화 (개별 워드별로 처리해야 하므로 스킵)
      // clearAnimationTracks는 wordId별로 처리하는 메서드이므로 전체 초기화에서는 생략

      // 7. 텍스트 삽입 상태 초기화
      // insertedTexts를 직접 빈 배열로 설정
      const editorStoreAny = store as any
      if (editorStoreAny.insertedTexts) {
        editorStoreAny.insertedTexts = []
      }

      // 8. 화자 색상 초기화
      store.setSpeakerColors({})

      // 9. UI 상태 초기화
      store.setRightSidebarType(null)
      store.setActiveClipId(null)

      // 10. 로컬 상태 초기화
      setActiveTab('home')
      setShowResetConfirmModal(false)
      setClipboard([])
      setSelectedClipIds(new Set())

      // 11. 편집 히스토리 초기화
      editorHistory.clear()

      // 12. IndexedDB 프로젝트 데이터 삭제 (로그인 정보 제외)
      try {
        // 개별 프로젝트 삭제 방식으로 대체
        // clearAllProjects 메서드가 없으므로 건너뛰기
        log(
          'EditorPage.tsx',
          '✅ Skipped IndexedDB project clearing (method not available)'
        )
      } catch (error) {
        log(
          'EditorPage.tsx',
          '⚠️ Failed to clear projects from IndexedDB:',
          error
        )
      }

      // 13. 세션 스토리지 정리
      try {
        sessionStorage.removeItem('currentStoredMediaId')
        sessionStorage.removeItem('autosave_project')
        log('EditorPage.tsx', '✅ Cleared session storage')
      } catch (error) {
        log('EditorPage.tsx', '⚠️ Failed to clear session storage:', error)
      }

      // 14. Upload Modal 상태 초기화
      try {
        uploadModal.closeModal()
        log('EditorPage.tsx', '✅ Upload modal state reset')
      } catch (error) {
        log('EditorPage.tsx', '⚠️ Failed to reset upload modal:', error)
      }

      log('EditorPage.tsx', '✅ Complete editor state reset finished')
      showToast('새 프로젝트가 생성되었습니다', 'success')
    } catch (error) {
      log('EditorPage.tsx', '❌ Failed to reset editor state:', error)
      showToast('상태 초기화 중 오류가 발생했습니다', 'error')
    }
  }

  // 새 프로젝트 생성 핸들러
  const handleNewProject = () => {
    // 편집 중인 데이터가 있는지 확인
    if (clips.length > 0 || hasUnsavedChanges) {
      setShowResetConfirmModal(true)
    } else {
      // 데이터가 없으면 바로 업로드 모달 열기
      uploadModal.openModal()
    }
  }

  // 초기화 확인 핸들러
  const handleResetConfirm = async () => {
    await resetEditorState()
    // 상태 초기화가 완전히 완료되도록 약간의 지연 추가
    setTimeout(() => {
      uploadModal.openModal()
    }, 100)
  }

  // 초기화 취소 핸들러
  const handleResetCancel = () => {
    setShowResetConfirmModal(false)
  }

  // Get current videoUrl for blob URL tracking
  const { videoUrl, cleanupPreviousBlobUrl } = useEditorStore()

  // Cleanup blob URLs when videoUrl changes
  useEffect(() => {
    // When videoUrl changes, check if we need to cleanup the previous blob URL
    // The store will handle the cleanup automatically through cleanupPreviousBlobUrl
    console.log('🔄 VideoUrl changed in page.tsx:', {
      videoUrl,
      isBlobUrl: videoUrl?.startsWith('blob:'),
      timestamp: new Date().toISOString(),
    })
  }, [videoUrl])

  // Cleanup blob URLs on component unmount (fallback safety)
  useEffect(() => {
    return () => {
      console.log('🧹 Page unmounting - performing final blob URL cleanup')

      // Cleanup any blob URLs on unmount to prevent memory leaks
      const urls = document.querySelectorAll('video[src^="blob:"]')
      urls.forEach((video) => {
        const videoElement = video as HTMLVideoElement
        if (videoElement.src && videoElement.src.startsWith('blob:')) {
          console.log(
            '🧹 Cleaning up blob URL from video element:',
            videoElement.src
          )
          try {
            URL.revokeObjectURL(videoElement.src)
          } catch (error) {
            console.warn('Failed to revoke blob URL from video element:', error)
          }
        }
      })

      // Final cleanup through store
      cleanupPreviousBlobUrl()
    }
  }, [cleanupPreviousBlobUrl])

  // Track unsaved changes
  useUnsavedChanges(hasUnsavedChanges)

  // 화자 동기화 훅 - 클립 변경 시 자동으로 화자 목록 동기화
  useSpeakerSync()

  // URL 파라미터 감지 및 모달 상태 복원
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const authStatus = urlParams.get('auth')
      const returnTo = urlParams.get('returnTo')

      // OAuth 인증 완료 후 YouTube 업로드 모달로 복귀
      if (authStatus === 'success' && returnTo === 'youtube-upload') {
        console.log('OAuth 인증 완료, YouTube 업로드 모달 재오픈 예정')
        setShouldOpenExportModal(true)

        // URL 파라미터 제거
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [])

  // Session recovery and initialization
  useEffect(() => {
    const initializeEditor = async () => {
      try {
        log('EditorPage.tsx', 'Initializing editor...')

        // Initialize AutosaveManager
        const autosaveManager = AutosaveManager.getInstance()

        // No automatic sample data loading for clean initial state
        log(
          'EditorPage.tsx',
          'Skipping sample data loading for clean initial state'
        )

        // Check for project to recover
        const projectId = sessionStorage.getItem('currentProjectId')
        const mediaId = sessionStorage.getItem('currentMediaId')
        const storedMediaIdFromSession = sessionStorage.getItem(
          'currentStoredMediaId'
        )
        const lastUploadProjectId = sessionStorage.getItem(
          'lastUploadProjectId'
        )

        // Only recover if it's not from a fresh upload (to avoid loading old projects)
        if ((projectId || mediaId) && projectId === lastUploadProjectId) {
          log(
            'EditorPage.tsx',
            `Fresh upload detected - projectId: ${projectId}, loading project with videoUrl`
          )

          // Load the newly created project (complete data)
          try {
            const savedProject = projectStorage.loadCurrentProject()
            if (savedProject) {
              log(
                'EditorPage.tsx',
                `🎬 Restoring new project: ${savedProject.name}`
              )

              // Restore clips
              if (savedProject.clips && savedProject.clips.length > 0) {
                setClips(savedProject.clips)
                log(
                  'EditorPage.tsx',
                  `📝 Loaded ${savedProject.clips.length} clips`
                )
              }

              // Restore media info - Blob URL 우선 사용, storedMediaId 포함
              if (savedProject.videoUrl) {
                // 신규 업로드인 경우 유효성 검사 없이 바로 사용
                setMediaInfo({
                  videoUrl: savedProject.videoUrl,
                  videoName: savedProject.videoName,
                  videoDuration: savedProject.videoDuration,
                  videoType: savedProject.videoType || 'video/mp4',
                  videoMetadata: savedProject.videoMetadata,
                  storedMediaId: savedProject.storedMediaId, // IndexedDB 미디어 ID 포함
                })

                log(
                  'EditorPage.tsx',
                  `🎬 Restored video URL (fresh upload): ${savedProject.videoUrl}`
                )

                // Blob URL 경고 메시지만 표시 (null로 설정하지 않음)
                if (savedProject.videoUrl.startsWith('blob:')) {
                  log(
                    'EditorPage.tsx',
                    '⚠️ Using Blob URL - may expire on page refresh'
                  )

                  // Blob URL 유효성 검사 및 복원 시도 (백그라운드)
                  if (savedProject.storedMediaId) {
                    setTimeout(() => {
                      validateAndRestoreBlobUrl().catch((error) => {
                        log(
                          'EditorPage.tsx',
                          `Failed to validate blob URL: ${error}`
                        )
                      })
                    }, 1000) // 1초 후 검증 시도
                  }
                }
              }
            }
          } catch (error) {
            log('EditorPage.tsx', `❌ Failed to restore new project: ${error}`)
          }

          // Clear the lastUploadProjectId flag after use
          sessionStorage.removeItem('lastUploadProjectId')
        } else if (projectId || mediaId) {
          log(
            'EditorPage.tsx',

            `Found session data to recover - projectId: ${projectId}, mediaId: ${mediaId}`
          )

          try {
            // Load project media info
            if (projectId) {
              const projectMediaInfo =
                await mediaStorage.loadProjectMedia(projectId)
              if (projectMediaInfo) {
                log(
                  'EditorPage.tsx',
                  `Loaded project media info: ${projectMediaInfo.fileName}`
                )

                // Set media info in store
                setMediaInfo({
                  mediaId: projectMediaInfo.mediaId,
                  videoName: projectMediaInfo.fileName,
                  videoType: projectMediaInfo.fileType,
                  videoDuration: projectMediaInfo.duration,
                  videoMetadata: projectMediaInfo.metadata,
                })

                // Notify ProjectInfoManager
                projectInfoManager.notifyFileOpen('browser', 'recovery', {
                  id: projectId,
                  name: projectMediaInfo.fileName.replace(/\.[^/.]+$/, ''), // Remove extension
                })

                // Set project in AutosaveManager
                autosaveManager.setProject(projectId, 'browser')
              }
            }

            // Load saved project data
            const savedProject = projectStorage.loadCurrentProject()
            if (
              savedProject &&
              savedProject.clips &&
              savedProject.clips.length > 0
            ) {
              log('EditorPage.tsx', `Recovered project: ${savedProject.name}`)
              // 프로젝트 복구 시 클립 순서를 실제 타임라인 순서로 정규화
              const normalizedClips = normalizeClipOrder(savedProject.clips)
              setClips(normalizedClips)

              // 프로젝트 복구 시 IndexedDB에서 원본 클립 로드 시도
              if (projectId) {
                loadOriginalClipsFromStorage().catch((error) => {
                  console.warn(
                    'Failed to load original clips from storage:',
                    error
                  )
                  // 실패해도 프로젝트 복구는 계속 진행
                })
              }

              // Restore media information if available
              if (savedProject.mediaId || savedProject.videoUrl) {
                setMediaInfo({
                  mediaId: savedProject.mediaId || null,
                  videoUrl: savedProject.videoUrl || null,
                  videoName: savedProject.videoName || null,
                  videoType: savedProject.videoType || null,
                  videoDuration: savedProject.videoDuration || null,
                  videoMetadata: savedProject.videoMetadata || null,
                  storedMediaId: savedProject.storedMediaId || null, // IndexedDB 미디어 ID 포함
                })

                // 기존 프로젝트의 경우 blob URL 검증 및 복원 시도
                if (
                  savedProject.storedMediaId &&
                  savedProject.videoUrl?.startsWith('blob:')
                ) {
                  log(
                    'EditorPage.tsx',
                    '🔄 Validating existing project blob URL...'
                  )
                  setTimeout(() => {
                    validateAndRestoreBlobUrl().catch((error) => {
                      log(
                        'EditorPage.tsx',
                        `Failed to restore blob URL: ${error}`
                      )
                    })
                  }, 500) // 0.5초 후 검증 시도
                }
              }

              // Set project in AutosaveManager
              autosaveManager.setProject(savedProject.id, 'browser')

              // Show recovery notification
              showToast('이전 세션이 복구되었습니다', 'success')
            }
          } catch (error) {
            console.error('Failed to recover session:', error)
            showToast('세션 복구에 실패했습니다', 'error')
          }
        } else {
          // No session to recover - check for autosaved project
          const currentProject = projectStorage.loadCurrentProject()
          if (
            currentProject &&
            currentProject.clips &&
            currentProject.clips.length > 0
          ) {
            log(
              'EditorPage.tsx',
              `Found autosaved project: ${currentProject.name}`
            )
            // 기존 프로젝트 로드 시에도 클립 순서를 실제 타임라인 순서로 정규화
            const normalizedClips = normalizeClipOrder(currentProject.clips)
            setClips(normalizedClips)
            autosaveManager.setProject(currentProject.id, 'browser')

            // 미디어 정보 복원 (storedMediaId가 있으면 즉시 복원)
            if (
              currentProject.storedMediaId ||
              currentProject.videoUrl ||
              currentProject.mediaId
            ) {
              log(
                'EditorPage.tsx',
                '🔄 Restoring media from autosaved project...'
              )

              setMediaInfo({
                mediaId: currentProject.mediaId || null,
                videoUrl: currentProject.videoUrl || null,
                videoName: currentProject.videoName || null,
                videoType: currentProject.videoType || null,
                videoDuration: currentProject.videoDuration || null,
                videoMetadata: currentProject.videoMetadata || null,
                storedMediaId: currentProject.storedMediaId || null,
              })

              // storedMediaId가 있으면 즉시 복원 시도
              if (currentProject.storedMediaId) {
                log(
                  'EditorPage.tsx',
                  `🎬 Attempting immediate media restoration: ${currentProject.storedMediaId}`
                )
                setTimeout(() => {
                  validateAndRestoreBlobUrl().catch((error) => {
                    log(
                      'EditorPage.tsx',
                      `Failed to restore autosaved media: ${error}`
                    )
                  })
                }, 100) // 100ms 후 즉시 복원 시도
              }
            }
          } else {
            // New project
            const newProjectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
            log('EditorPage.tsx', `Creating new project: ${newProjectId}`)
            autosaveManager.setProject(newProjectId, 'browser')
            projectInfoManager.notifyFileOpen('browser', 'newProject')
          }
        }

        // Clear session storage after recovery
        sessionStorage.removeItem('currentProjectId')
        sessionStorage.removeItem('currentMediaId')
        sessionStorage.removeItem('currentStoredMediaId')
      } catch (error) {
        console.error('Failed to initialize editor:', error)
        showToast('에디터 초기화에 실패했습니다', 'error')
      } finally {
        // Always set recovering to false
        setIsRecovering(false)
      }
    }

    initializeEditor()
  }, [
    setClips,
    setOriginalClips,
    setMediaInfo,
    saveOriginalClipsToStorage,
    loadOriginalClipsFromStorage,
    setGlobalSpeakers,
  ])

  // Check for pending processing results on page load
  useEffect(() => {
    // sessionStorage에 pendingJobId가 있을 때만 실행
    if (
      typeof window !== 'undefined' &&
      sessionStorage.getItem('pendingJobId')
    ) {
      checkAndApplyPendingResults()
    }
  }, [checkAndApplyPendingResults])

  // Generate stable ID for DndContext to prevent hydration mismatch
  const dndContextId = useId()

  // Upload modal hook - 새로운 API 사용
  const uploadModal = useUploadModal()

  // DnD functionality
  const {
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useDragAndDrop()

  // Word drag and drop functionality (cross-clip support)
  const {
    handleWordDragStart,
    handleWordDragOver,
    handleWordDragEnd,
    handleWordDragCancel,
  } = useGlobalWordDragAndDrop()

  // Selection box functionality
  const {
    containerRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    isSelecting,
    selectionBox,
  } = useSelectionBox()

  // Scroll progress handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget
    const scrollTop = element.scrollTop
    const scrollHeight = element.scrollHeight - element.clientHeight
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
    setScrollProgress(progress)
  }, [])

  // Panel resize handler
  const handlePanelResize = useCallback(
    (delta: number) => {
      const newWidth = videoPanelWidth + delta
      const minWidth = 300 // Minimum width
      const maxWidth = windowWidth / 2 // Maximum 50% of viewport

      // Constrain the width between min and max
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      setVideoPanelWidth(constrainedWidth)

      // Save to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'editor-video-panel-width',
          constrainedWidth.toString()
        )
      }
    },
    [videoPanelWidth, windowWidth, setVideoPanelWidth]
  )

  // Asset sidebar resize handler
  const handleAssetSidebarResize = useCallback(
    (delta: number) => {
      const newWidth = assetSidebarWidth - delta // Reverse delta for right sidebar
      const minWidth = 280 // Minimum width
      const maxWidth = windowWidth / 2 // Maximum 50% of viewport

      // Constrain the width between min and max
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      setAssetSidebarWidth(constrainedWidth)

      // Save to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'editor-asset-sidebar-width',
          constrainedWidth.toString()
        )
      }
    },
    [assetSidebarWidth, windowWidth, setAssetSidebarWidth]
  )

  // Edit handlers
  const handleWordEdit = (clipId: string, wordId: string, newText: string) => {
    updateClipWords(clipId, wordId, newText)
  }

  const handleSpeakerChange = (clipId: string, newSpeaker: string) => {
    // Use Command pattern for undo/redo support
    const command = new ChangeSpeakerCommand(
      clips,
      globalSpeakers,
      clipId,
      newSpeaker,
      setClips,
      setGlobalSpeakers
    )
    editorHistory.executeCommand(command)
  }

  const handleBatchSpeakerChange = (clipIds: string[], newSpeaker: string) => {
    // If only one clipId is passed, check if we should apply to all empty clips
    let targetClipIds = clipIds

    if (clipIds.length === 1) {
      // Check if the current clip is empty and find all empty clips
      const currentClip = clips.find((c) => c.id === clipIds[0])
      if (currentClip && !currentClip.speaker) {
        // Find all clips without speakers
        const emptyClipIds = clips
          .filter((clip) => !clip.speaker)
          .map((clip) => clip.id)

        // If there are multiple empty clips, we'll apply to all of them
        if (emptyClipIds.length > 1) {
          targetClipIds = emptyClipIds
        }
      }
    }

    // Use Command pattern for batch speaker change
    const command = new BatchChangeSpeakerCommand(
      clips,
      globalSpeakers,
      targetClipIds,
      newSpeaker,
      setClips,
      setGlobalSpeakers
    )
    editorHistory.executeCommand(command)
  }

  // 오른쪽 사이드바 핸들러들
  const handleOpenSpeakerManagement = () => {
    setRightSidebarType(rightSidebarType === 'speaker' ? null : 'speaker')
  }

  // const handleOpenAnimationSidebar = () => {
  //   setRightSidebarType('animation')
  // }

  const handleToggleAnimationSidebar = () => {
    setRightSidebarType(rightSidebarType === 'animation' ? null : 'animation')
  }

  // Template sidebar disabled
  // const handleToggleTemplateSidebar = () => {
  //   setRightSidebarType(rightSidebarType === 'template' ? null : 'template')
  // }

  const handleCloseSidebar = () => {
    setRightSidebarType(null)
  }

  const handleAddSpeaker = (name: string) => {
    console.log('handleAddSpeaker called with:', name)
    console.log('Current speakers before adding:', globalSpeakers)

    // 최대 화자 수 제한 체크 (9명)
    if (globalSpeakers.length >= 9) {
      console.log('Maximum speaker limit reached (9), cannot add more')
      return
    }

    if (!globalSpeakers.includes(name)) {
      const newSpeakers = [...globalSpeakers, name]
      setGlobalSpeakers(newSpeakers)
      console.log('Speaker added successfully. New speakers:', newSpeakers)
    } else {
      console.log('Speaker already exists, skipping addition')
    }
  }

  const handleRemoveSpeaker = (name: string) => {
    // Use Command pattern for speaker removal
    const command = new RemoveSpeakerCommand(
      clips,
      globalSpeakers,
      name,
      setClips,
      setGlobalSpeakers
    )
    editorHistory.executeCommand(command)

    // Remove speaker color mapping
    removeSpeakerColor(name)
  }

  const handleRenameSpeaker = (oldName: string, newName: string) => {
    // Update clips with the new speaker name
    const updatedClips = clips.map((clip) =>
      clip.speaker === oldName ? { ...clip, speaker: newName } : clip
    )

    // Update speakers list
    const updatedSpeakers = globalSpeakers.map((speaker) =>
      speaker === oldName ? newName : speaker
    )

    // Update speaker colors mapping
    if (speakerColors[oldName]) {
      setSpeakerColor(newName, speakerColors[oldName])
      removeSpeakerColor(oldName)
    }

    setClips(updatedClips)
    setGlobalSpeakers(updatedSpeakers)
  }

  const handleSpeakerColorChange = (speakerName: string, color: string) => {
    setSpeakerColor(speakerName, color)
  }

  const handleClipCheck = (clipId: string, checked: boolean) => {
    if (checked) {
      const newSet = new Set(selectedClipIds)
      newSet.add(clipId)
      setSelectedClipIds(newSet)
      // 체크 시에는 포커싱을 변경하지 않음 (포커스와 선택을 분리)
    } else {
      const newSet = new Set(selectedClipIds)
      newSet.delete(clipId)
      setSelectedClipIds(newSet)
      // 체크 해제 시에도 포커싱 유지
    }
  }

  const handleClipSelect = (clipId: string) => {
    // Clear multi-word selection when clicking on clips
    clearMultiSelection()
    // 체크된 클립이 있으면 모든 선택 해제, 없으면 포커스만 변경
    if (selectedClipIds.size > 0) {
      clearSelection()
      setActiveClipId(null) // 선택 해제 시 포커스도 해제
    } else {
      setActiveClipId(clipId)

      // 선택된 클립의 시작 시간으로 비디오 이동
      const selectedClip = clips.find((c) => c.id === clipId)
      if (selectedClip && selectedClip.timeline) {
        // timeline 형식: "00:00 → 00:07"
        const [startTimeStr] = selectedClip.timeline.split(' → ')
        const [mins, secs] = startTimeStr.split(':').map(Number)
        const timeInSeconds = mins * 60 + secs

        // 비디오 플레이어로 시간 이동
        const videoPlayer = (
          window as { videoPlayer?: { seekTo: (time: number) => void } }
        ).videoPlayer
        if (videoPlayer) {
          videoPlayer.seekTo(timeInSeconds)
        }
      }
    }
  }

  // 빈 공간 클릭 시 모든 선택 해제
  const handleEmptySpaceClick = () => {
    if (selectedClipIds.size > 0) {
      clearSelection()
      setActiveClipId(null)
    }
    // Clear multi-word selection as well
    clearMultiSelection()
  }

  // 새로운 업로드 모달 래퍼
  const wrappedHandleStartTranscription = async (data: {
    files: File[]
    settings: { language: string }
  }) => {
    if (data.files.length > 0) {
      // NewUploadModal을 닫지 않고 handleStartTranscription만 호출
      // step이 변경되면 NewUploadModal은 자동으로 닫히고 ProcessingModal이 표시됨
      await uploadModal.handleStartTranscription({
        file: data.files[0],
        language: data.settings.language as 'auto' | 'ko' | 'en' | 'ja' | 'zh',
      })
    }
  }

  // Merge clips handler
  const handleMergeClips = useCallback(() => {
    try {
      // Get selected clips from store
      const uniqueSelectedIds = Array.from(selectedClipIds)

      // 체크된 클립이 있으면 기존 로직 사용 (2개 이상 선택된 경우)
      if (uniqueSelectedIds.length >= 2) {
        // 2개 이상의 클립이 선택된 경우 - 기존 로직
        if (!areClipsConsecutive(clips, uniqueSelectedIds)) {
          showToast(
            '선택된 클립들이 연속되어 있지 않습니다. 연속된 클립만 합칠 수 있습니다.'
          )
          return
        }

        // 클립 합치기 실행 - Command 패턴 사용
        const command = new MergeClipsCommand(
          clips,
          [],
          uniqueSelectedIds,
          setClips
        )

        editorHistory.executeCommand(command)
        clearSelection()

        // 자동 포커스 스킵 설정 및 합쳐진 클립에 포커스
        setSkipAutoFocus(true)
        setTimeout(() => {
          // Command에서 합쳐진 클립의 ID 가져오기
          const mergedClipId = command.getMergedClipId()
          if (mergedClipId) {
            setActiveClipId(mergedClipId)
            console.log(
              'Merge completed, focused on merged clip:',
              mergedClipId
            )
          }
        }, 100) // 상태 업데이트 완료 대기
        return
      }

      // 체크된 클립이 0~1개인 경우: 포커스된 클립과 다음 클립을 합치기
      if (!activeClipId) {
        showToast('합칠 클립을 선택해주세요.')
        return
      }

      // 포커스된 클립의 인덱스 찾기
      const currentIndex = clips.findIndex((clip) => clip.id === activeClipId)
      if (currentIndex === -1) {
        showToast('포커스된 클립을 찾을 수 없습니다.')
        return
      }

      // 다음 클립이 있는지 확인
      if (currentIndex >= clips.length - 1) {
        showToast('다음 클립이 존재하지 않습니다.')
        return
      }

      // 포커스된 클립과 다음 클립을 합치기
      const nextClipId = clips[currentIndex + 1].id
      const clipsToMerge = [activeClipId, nextClipId]
      const command = new MergeClipsCommand(clips, [], clipsToMerge, setClips)

      editorHistory.executeCommand(command)
      clearSelection()

      // 자동 포커스 스킵 설정 및 합쳐진 클립에 포커스
      setSkipAutoFocus(true)
      setTimeout(() => {
        // Command에서 합쳐진 클립의 ID 가져오기
        const mergedClipId = command.getMergedClipId()
        if (mergedClipId) {
          setActiveClipId(mergedClipId)
          console.log(
            'Single merge completed, focused on merged clip:',
            mergedClipId
          )
        }
      }, 100) // 상태 업데이트 완료 대기
    } catch (error) {
      console.error('클립 합치기 오류:', error)
      showToast(
        error instanceof Error
          ? error.message
          : '클립 합치기 중 오류가 발생했습니다.'
      )
    }
  }, [
    clips,
    selectedClipIds,
    activeClipId,
    clearSelection,
    setClips,
    editorHistory,
    setActiveClipId,
  ])

  // Split clip handler
  const handleSplitClip = useCallback(() => {
    try {
      if (!activeClipId) {
        showToast('나눌 클립을 선택해주세요.')
        return
      }

      // 포커싱된 클립 찾기
      const targetClip = clips.find((clip) => clip.id === activeClipId)
      if (!targetClip) {
        showToast('선택된 클립을 찾을 수 없습니다.')
        return
      }

      // 단어가 2개 이상인지 확인
      if (targetClip.words.length <= 1) {
        showToast('클립을 나누려면 단어가 2개 이상이어야 합니다.')
        return
      }

      // 클립 나누기 실행 - Command 패턴 사용
      const command = new SplitClipCommand(clips, activeClipId, setClips)
      editorHistory.executeCommand(command)

      // 자동 포커스 스킵 설정 및 분할된 첫 번째 클립에 포커스
      setSkipAutoFocus(true)
      setTimeout(() => {
        // SplitClipCommand에서 반환받은 첫 번째 분할 클립 ID로 포커스 설정
        const firstSplitClipId = command.getFirstSplitClipId()
        if (firstSplitClipId) {
          setActiveClipId(firstSplitClipId)
          console.log(
            'Split completed, focused on first split clip:',
            firstSplitClipId
          )
        } else {
          console.log('Split completed, but could not get first split clip ID')
        }
      }, 100) // 상태 업데이트 완료 대기
    } catch (error) {
      console.error('클립 나누기 오류:', error)
      showToast(
        error instanceof Error
          ? error.message
          : '클립 나누기 중 오류가 발생했습니다.'
      )
    }
  }, [activeClipId, clips, setClips, editorHistory, setActiveClipId])

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    if (editorHistory.canUndo()) {
      editorHistory.undo()
    }
  }, [editorHistory])

  const handleRedo = useCallback(() => {
    if (editorHistory.canRedo()) {
      editorHistory.redo()
    }
  }, [editorHistory])

  // Delete clip handler
  const handleDeleteClip = useCallback(() => {
    try {
      if (!activeClipId) {
        showToast('삭제할 클립을 선택해주세요.')
        return
      }

      // 클립이 1개뿐이면 삭제 불가
      if (clips.length <= 1) {
        showToast('마지막 클립은 삭제할 수 없습니다.')
        return
      }

      // 삭제할 클립 찾기
      const targetClipIndex = clips.findIndex(
        (clip) => clip.id === activeClipId
      )
      if (targetClipIndex === -1) {
        showToast('삭제할 클립을 찾을 수 없습니다.')
        return
      }

      // 클립 삭제 실행 - Command 패턴 사용
      const command = new DeleteClipCommand(clips, activeClipId, setClips)
      editorHistory.executeCommand(command)

      // 자동 포커스 스킵 설정 및 적절한 클립에 포커스
      setSkipAutoFocus(true)

      // 삭제 후 포커스 이동: 다음 클립이 있으면 다음, 없으면 이전 클립
      let nextFocusIndex = targetClipIndex
      if (targetClipIndex >= clips.length - 1) {
        // 마지막 클립을 삭제한 경우, 이전 클립으로 포커스
        nextFocusIndex = Math.max(0, targetClipIndex - 1)
      }

      // 새로운 클립 목록에서 포커스할 클립 ID 찾기
      setTimeout(() => {
        const updatedClips = clips.filter((clip) => clip.id !== activeClipId)
        if (updatedClips.length > 0 && nextFocusIndex < updatedClips.length) {
          setActiveClipId(updatedClips[nextFocusIndex].id)
          console.log(
            'Delete completed, focused on clip at index:',
            nextFocusIndex
          )
        }
      }, 0)

      showToast('클립이 삭제되었습니다.', 'success')
    } catch (error) {
      console.error('클립 삭제 오류:', error)
      showToast(
        error instanceof Error
          ? error.message
          : '클립 삭제 중 오류가 발생했습니다.'
      )
    }
  }, [activeClipId, clips, setClips, editorHistory, setActiveClipId])

  // Copy clips handler
  const handleCopyClips = useCallback(() => {
    try {
      const selectedIds = Array.from(selectedClipIds)

      if (selectedIds.length === 0) {
        showToast('복사할 클립을 선택해주세요.')
        return
      }

      // Create and execute copy command
      const command = new CopyClipsCommand(clips, selectedIds, setClipboard)

      command.execute() // Copy command doesn't need undo/redo
      showToast(`${selectedIds.length}개 클립을 복사했습니다.`, 'success')
    } catch (error) {
      console.error('클립 복사 오류:', error)
      showToast('클립 복사 중 오류가 발생했습니다.')
    }
  }, [clips, selectedClipIds, setClipboard])

  // Paste clips handler
  const handlePasteClips = useCallback(() => {
    try {
      if (clipboard.length === 0) {
        showToast('붙여넣을 클립이 없습니다.')
        return
      }

      // Create and execute paste command
      const command = new PasteClipsCommand(clips, clipboard, setClips)

      editorHistory.executeCommand(command)

      // 자동 포커스 스킵 설정 및 붙여넣은 마지막 클립에 포커스
      setSkipAutoFocus(true)
      setTimeout(() => {
        // 붙여넣은 클립들은 기존 클립들 뒤에 추가되므로
        // 마지막에 붙여넣은 클립에 포커스
        const newTotalClips = clips.length + clipboard.length
        if (newTotalClips > clips.length) {
          const lastPastedIndex = newTotalClips - 1
          // 실제로는 붙여넣은 클립들의 새 ID를 알아야 함
          console.log(
            'Paste completed, should focus on last pasted clip at index:',
            lastPastedIndex
          )
          // PasteClipsCommand에서 생성된 클립 ID들을 반환받아서 마지막 클립에 포커스해야 함
        }
      }, 0)

      showToast(`${clipboard.length}개 클립을 붙여넣었습니다.`, 'success')
    } catch (error) {
      console.error('클립 붙여넣기 오류:', error)
      showToast('클립 붙여넣기 중 오류가 발생했습니다.')
    }
  }, [clips, clipboard, setClips, editorHistory])

  // 원본 복원 핸들러
  const handleRestore = useCallback(() => {
    setShowRestoreModal(true)
  }, [])

  const handleConfirmRestore = useCallback(() => {
    restoreOriginalClips()
    clearSelection()
    setActiveClipId(null)
    setShowRestoreModal(false)
    showToast('원본으로 복원되었습니다.', 'success')
  }, [restoreOriginalClips, clearSelection, setActiveClipId])

  // 자동 줄바꿈 핸들러
  const handleAutoLineBreak = useCallback(() => {
    try {
      applyAutoLineBreak()
      showToast('자동 줄바꿈이 적용되었습니다.', 'success')
    } catch (error) {
      console.error('Auto line break error:', error)
      showToast('자동 줄바꿈 적용 중 오류가 발생했습니다.', 'error')
    }
  }, [applyAutoLineBreak])

  // 프로젝트 저장 핸들러
  const handleSave = useCallback(() => {
    saveProject()
      .then(() => {
        editorHistory.markAsSaved()
        markAsSaved()
        showToast('프로젝트가 저장되었습니다.', 'success')
      })
      .catch((error) => {
        console.error('Save failed:', error)
        showToast('저장에 실패했습니다.', 'error')
      })
  }, [saveProject, editorHistory, markAsSaved])

  // 다른 프로젝트로 저장 핸들러
  const handleSaveAs = useCallback(() => {
    // TODO: 새로운 프로젝트 ID 생성 및 저장 로직 구현
    const newProjectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    // 현재 프로젝트 데이터를 새 ID로 저장
    const autosaveManager = AutosaveManager.getInstance()
    const oldProjectId = autosaveManager.getProjectId()

    // 새 프로젝트로 설정
    autosaveManager.setProject(newProjectId, 'browser')

    saveProject()
      .then(() => {
        editorHistory.markAsSaved()
        markAsSaved()
        showToast(`새 프로젝트로 저장되었습니다. (${newProjectId})`, 'success')

        // 프로젝트 정보 업데이트
        projectInfoManager.notifyFileOpen('browser', 'newProject', {
          id: newProjectId,
          name: `Copy of Project ${new Date().toLocaleDateString()}`,
        })
      })
      .catch((error) => {
        // 실패 시 원래 프로젝트로 되돌리기
        if (oldProjectId) {
          autosaveManager.setProject(oldProjectId, 'browser')
        }
        console.error('Save as failed:', error)
        showToast('다른 이름으로 저장에 실패했습니다.', 'error')
      })
  }, [saveProject, editorHistory, markAsSaved])

  // 내보내기 모달 상태 변경 핸들러
  const handleExportModalStateChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      // 모달이 닫힐 때 강제 오픈 플래그 리셋
      setShouldOpenExportModal(false)
    }
  }, [])

  // Auto-save every 3 seconds
  useEffect(() => {
    if (!clips.length) return

    const autoSave = () => {
      saveProject().catch((error) => {
        console.error('Auto-save failed:', error)
      })
    }

    const interval = setInterval(autoSave, 3000)
    return () => clearInterval(interval)
  }, [clips, saveProject])

  // clips 변경 시 AutosaveManager에 알림
  useEffect(() => {
    const autosaveManager = AutosaveManager.getInstance()
    if (clips.length > 0) {
      autosaveManager.incrementChangeCounter()
    }
  }, [clips])

  // 키보드 단축키 처리 (macOS Command + Windows/Linux Ctrl 지원)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ChatBot 모달이 열려있을 때는 단축키 비활성화
      if (isChatBotOpen) {
        return
      }

      // 입력 필드에서는 단축키 비활성화
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const cmdOrCtrl = event.metaKey || event.ctrlKey

      // Command/Ctrl+Z (undo)
      if (cmdOrCtrl && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        handleUndo()
      }
      // Command/Ctrl+Shift+Z (redo)
      else if (cmdOrCtrl && event.shiftKey && event.key === 'Z') {
        event.preventDefault()
        handleRedo()
      }
      // Command/Ctrl+Y (redo - 대체 단축키)
      else if (cmdOrCtrl && event.key === 'y') {
        event.preventDefault()
        handleRedo()
      }
      // Command/Ctrl+S (save)
      else if (cmdOrCtrl && event.key === 's') {
        event.preventDefault()
        saveProject()
          .then(() => {
            editorHistory.markAsSaved()
            markAsSaved()
            showToast('프로젝트가 저장되었습니다.', 'success')
          })
          .catch((error) => {
            console.error('Save failed:', error)
            showToast('저장에 실패했습니다.')
          })
      }
      // Command/Ctrl+E (merge clips) - 윈도우에서는 Ctrl+E
      else if (cmdOrCtrl && event.key === 'e') {
        event.preventDefault()
        handleMergeClips()
      }
      // Command/Ctrl+X (delete clips) - 윈도우에서는 Ctrl+X, Mac에서는 Command+X
      else if (cmdOrCtrl && event.key === 'x') {
        event.preventDefault()
        handleDeleteClip()
      }
      // Command/Ctrl+C (copy clips)
      else if (cmdOrCtrl && event.key === 'c') {
        event.preventDefault()
        if (selectedClipIds.size > 0) {
          handleCopyClips()
        }
      }
      // Command/Ctrl+V (paste clips)
      else if (cmdOrCtrl && event.key === 'v') {
        event.preventDefault()
        if (clipboard.length > 0) {
          handlePasteClips()
        }
      }
      // Delete key - delete selected words if any are selected
      else if (event.key === 'Delete' || event.key === 'Backspace') {
        if (isMultipleWordsSelected()) {
          event.preventDefault()
          deleteSelectedWords()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    isChatBotOpen,
    handleUndo,
    handleRedo,
    saveProject,
    handleMergeClips,
    handleSplitClip,
    handleDeleteClip,
    handleCopyClips,
    handlePasteClips,
    selectedClipIds,
    clipboard,
    editorHistory,
    markAsSaved,
    isMultipleWordsSelected,
    deleteSelectedWords,
  ])

  // 에디터 진입 시 첫 번째 클립에 자동 포커스 및 패널 너비 복원
  useEffect(() => {
    if (clips.length > 0 && !activeClipId) {
      setActiveClipId(clips[0].id)
    }

    // Restore panel width from localStorage
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('editor-video-panel-width')
      if (savedWidth) {
        const width = parseInt(savedWidth, 10)
        if (!isNaN(width)) {
          setVideoPanelWidth(width)
        }
      }

      // Restore asset sidebar width from localStorage
      const savedAssetSidebarWidth = localStorage.getItem(
        'editor-asset-sidebar-width'
      )
      if (savedAssetSidebarWidth) {
        const width = parseInt(savedAssetSidebarWidth, 10)
        if (!isNaN(width)) {
          setAssetSidebarWidth(width)
        }
      }
    }
  }, [
    clips,
    activeClipId,
    setActiveClipId,
    setVideoPanelWidth,
    setAssetSidebarWidth,
  ])

  // 편집 모드 변경 시 사이드바 자동 설정 (템플릿 사이드바 비활성화됨)
  useEffect(() => {
    if (editingMode === 'simple' && clips.length > 0) {
      // 템플릿 사이드바가 비활성화되어 사이드바를 닫음
      setRightSidebarType(null)
    } else if (clips.length === 0) {
      // 빈 상태에서는 사이드바 닫기
      setRightSidebarType(null)
    }
  }, [editingMode, clips.length, setRightSidebarType])

  // Tutorial modal will now be triggered after upload completion, not page visit
  useEffect(() => {
    const handleShowTutorialOnUpload = () => {
      const hasSeenEditorTutorial = localStorage.getItem(
        'hasSeenEditorTutorial'
      )
      if (!hasSeenEditorTutorial) {
        setShowTutorialModal(true)
      }
    }

    // Check for immediate tutorial trigger flag from upload completion
    const showTutorialFlag = sessionStorage.getItem(
      'showTutorialAfterProcessing'
    )
    if (showTutorialFlag) {
      sessionStorage.removeItem('showTutorialAfterProcessing')
      const hasSeenEditorTutorial = localStorage.getItem(
        'hasSeenEditorTutorial'
      )
      if (!hasSeenEditorTutorial) {
        // Show tutorial immediately when editor loads after processing
        setShowTutorialModal(true)
      }
    }

    window.addEventListener('showTutorialOnUpload', handleShowTutorialOnUpload)
    return () => {
      window.removeEventListener(
        'showTutorialOnUpload',
        handleShowTutorialOnUpload
      )
    }
  }, [])

  const handleTutorialClose = () => {
    // TODO: localStorage 대신 DB에 튜토리얼 완료 상태 저장하도록 변경
    // - POST /api/user/tutorial-status API 호출
    // - 사용자가 로그인된 경우 DB에 저장, 미로그인 시 localStorage 사용
    // - 튜토리얼 완료 날짜/시간, 완료 단계도 함께 저장
    setShowTutorialModal(false)
    localStorage.setItem('hasSeenEditorTutorial', 'true')
  }

  const handleTutorialComplete = () => {
    console.log('Editor tutorial completed!')
  }

  // Toolbar toggle handler
  const handleToolbarToggle = () => {
    setIsToolbarVisible(!isToolbarVisible)
  }

  // Show toolbar handler
  const handleShowToolbar = () => {
    setIsToolbarVisible(true)
  }

  // Window resize handler to update max width constraint
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
      // Adjust video panel width if it exceeds new max
      const maxWidth = window.innerWidth / 2
      if (videoPanelWidth > maxWidth) {
        setVideoPanelWidth(maxWidth)
      }

      // Adjust asset sidebar width if it exceeds new max
      if (assetSidebarWidth > maxWidth) {
        setAssetSidebarWidth(maxWidth)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [
    videoPanelWidth,
    setVideoPanelWidth,
    assetSidebarWidth,
    setAssetSidebarWidth,
  ])

  // 클립이 변경되었을 때 포커스 유지/이동 로직
  useEffect(() => {
    if (clips.length === 0) {
      setActiveClipId(null)
      return
    }

    // 자동 포커스 스킵이 설정된 경우 리셋하고 건너뛰기
    if (skipAutoFocus) {
      setSkipAutoFocus(false)
      return
    }

    // 현재 포커싱된 클립이 없거나 존재하지 않으면 첫 번째 클립에 포커스
    if (!activeClipId || !clips.find((clip) => clip.id === activeClipId)) {
      setActiveClipId(clips[0].id)
    }
  }, [clips, activeClipId, setActiveClipId, skipAutoFocus])

  // 복구 중일 때 로딩 화면 표시 (임시 비활성화)
  if (isRecovering) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner
          size="lg"
          message="세션을 복구하고 있습니다..."
          showLogo={true}
          variant="fullscreen"
        />
      </div>
    )
  }

  return (
    <>
      <DndContext
        id={dndContextId}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event) => {
          // Handle both clip and word drag start
          if (event.active.data.current?.type === 'word') {
            handleWordDragStart(event)
          } else {
            handleDragStart(event)
          }
        }}
        onDragOver={(event) => {
          // Handle both clip and word drag over
          if (event.active.data.current?.type === 'word') {
            handleWordDragOver(event)
          } else {
            handleDragOver(event)
          }
        }}
        onDragEnd={(event) => {
          // Handle both clip and word drag end
          if (event.active.data.current?.type === 'word') {
            handleWordDragEnd(event)
          } else {
            handleDragEnd(event)
          }
        }}
        onDragCancel={(event) => {
          // Handle both clip and word drag cancel
          if (event.active.data.current?.type === 'word') {
            handleWordDragCancel()
          } else {
            handleDragCancel()
          }
        }}
      >
        <div className="min-h-screen bg-gray-50 text-gray-900">
          <EditorHeaderTabs
            activeTab={activeTab}
            onTabChange={(tabId: string) => setActiveTab(tabId as EditorTab)}
            isToolbarVisible={isToolbarVisible}
            onToolbarToggle={handleToolbarToggle}
            onShowToolbar={handleShowToolbar}
            onPlatformSelectionOpen={(task) => {
              setPendingDeployTask(task)
              setIsPlatformSelectionModalOpen(true)
            }}
          />

          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isToolbarVisible ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {editingMode === 'advanced' ? (
              <Toolbars
                activeTab={activeTab}
                clips={clips}
                selectedClipIds={selectedClipIds}
                activeClipId={activeClipId}
                canUndo={editorHistory.canUndo()}
                canRedo={editorHistory.canRedo()}
                onSelectionChange={setSelectedClipIds}
                onNewClick={handleNewProject}
                onMergeClips={handleMergeClips}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onCut={undefined}
                onCopy={handleCopyClips}
                onPaste={handlePasteClips}
                onSplitClip={handleSplitClip}
                onRestore={handleRestore}
                onAutoLineBreak={handleAutoLineBreak}
                onToggleAnimationSidebar={handleToggleAnimationSidebar}
                onToggleTemplateSidebar={() => {}} // Template sidebar disabled
                onSave={handleSave}
                onSaveAs={handleSaveAs}
                forceOpenExportModal={shouldOpenExportModal}
                onExportModalStateChange={handleExportModalStateChange}
              />
            ) : (
              <SimpleToolbar
                activeClipId={activeClipId}
                canUndo={editorHistory.canUndo()}
                canRedo={editorHistory.canRedo()}
                onNewClick={handleNewProject}
                onMergeClips={handleMergeClips}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onSplitClip={handleSplitClip}
                onToggleTemplateSidebar={() => {}} // Template sidebar disabled
                onAutoLineBreak={handleAutoLineBreak}
                onSave={handleSave}
                onSaveAs={handleSaveAs}
                forceOpenExportModal={shouldOpenExportModal}
                onExportModalStateChange={handleExportModalStateChange}
              />
            )}
          </div>

          <div
            className={`flex relative transition-all duration-300 ease-in-out ${
              isToolbarVisible
                ? 'h-[calc(100vh-176px)]' // ~56px for toolbar + ~120px for header tabs
                : 'h-[calc(100vh-120px)]' // Only header tabs
            }`}
          >
            {clips.length > 0 && (
              <>
                <div
                  className={`sticky top-0 transition-all duration-300 ease-in-out ${
                    isToolbarVisible
                      ? 'h-[calc(100vh-176px)]'
                      : 'h-[calc(100vh-120px)]'
                  }`}
                >
                  <VideoSection width={videoPanelWidth} />
                </div>

                <ResizablePanelDivider
                  orientation="vertical"
                  onResize={handlePanelResize}
                  className="z-10"
                />
              </>
            )}

            <div
              className="flex-1 flex justify-center relative overflow-y-auto custom-scrollbar"
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onScroll={handleScroll}
              style={
                {
                  '--scroll-progress': `${scrollProgress}%`,
                } as React.CSSProperties
              }
            >
              {clips.length === 0 ? (
                // Empty state - show centered "새로 만들기" button
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                      새로운 프로젝트를 시작하세요
                    </h2>
                    <p className="text-gray-600 mb-8 max-w-md">
                      영상 파일을 업로드하여 자막을 생성하고 편집해보세요.
                    </p>
                    <button
                      onClick={handleNewProject}
                      className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:outline-2 hover:outline-purple-500 hover:outline-offset-4 hover:scale-105"
                    >
                      새로 만들기
                    </button>
                  </div>
                </div>
              ) : editingMode === 'advanced' ? (
                <SubtitleEditList
                  clips={clips}
                  selectedClipIds={selectedClipIds}
                  activeClipId={activeClipId}
                  speakers={globalSpeakers}
                  speakerColors={speakerColors}
                  onClipSelect={handleClipSelect}
                  onClipCheck={handleClipCheck}
                  onWordEdit={handleWordEdit}
                  onSpeakerChange={handleSpeakerChange}
                  onBatchSpeakerChange={handleBatchSpeakerChange}
                  onOpenSpeakerManagement={handleOpenSpeakerManagement}
                  onAddSpeaker={handleAddSpeaker}
                  onRenameSpeaker={handleRenameSpeaker}
                  onEmptySpaceClick={handleEmptySpaceClick}
                />
              ) : (
                <div className="flex-1 bg-white p-4 flex flex-col overflow-y-auto items-center">
                  <div className="w-full max-w-[600px]">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                      자막 타임라인
                    </h2>
                    <div className="space-y-2">
                      {clips.map((clip) => {
                        const isActive = clip.id === activeClipId
                        const formatTime = (seconds: number) => {
                          const mins = Math.floor(seconds / 60)
                          const secs = Math.floor(seconds % 60)
                          return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                        }

                        // Calculate start and end times from words
                        const startTime =
                          clip.words.length > 0 ? clip.words[0].start : 0
                        const endTime =
                          clip.words.length > 0
                            ? clip.words[clip.words.length - 1].end
                            : 0

                        return (
                          <TimelineClipCard
                            key={clip.id}
                            clip={clip}
                            isActive={isActive}
                            startTime={startTime}
                            endTime={endTime}
                            speakers={globalSpeakers}
                            speakerColors={speakerColors}
                            onClipSelect={handleClipSelect}
                            onSpeakerChange={handleSpeakerChange}
                            onAddSpeaker={handleAddSpeaker}
                            onRenameSpeaker={handleRenameSpeaker}
                            onOpenSpeakerManagement={
                              handleOpenSpeakerManagement
                            }
                            onTextEdit={updateClipFullTextAdvanced}
                            formatTime={formatTime}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              <SelectionBox
                startX={selectionBox.startX}
                startY={selectionBox.startY}
                endX={selectionBox.endX}
                endY={selectionBox.endY}
                isSelecting={isSelecting}
              />
            </div>

            {/* Right Sidebar - 슬라이드 애니메이션과 함께 */}
            {/* Only show sidebar when clips exist (not in init state) */}
            {clips.length > 0 && (
              <div
                className={`transition-all duration-300 ease-out overflow-hidden ${
                  rightSidebarType
                    ? `w-[${assetSidebarWidth}px] opacity-100`
                    : 'w-0 opacity-0'
                }`}
                style={{
                  width: rightSidebarType ? `${assetSidebarWidth}px` : '0px',
                }}
              >
                <div className="flex h-full">
                  {rightSidebarType && (
                    <>
                      <ResizablePanelDivider
                        orientation="vertical"
                        onResize={handleAssetSidebarResize}
                        className="z-10"
                      />

                      {/* Animation Asset Sidebar */}
                      {rightSidebarType === 'animation' && (
                        <div
                          className={`transform transition-all duration-300 ease-out w-full ${
                            rightSidebarType === 'animation'
                              ? 'translate-x-0 opacity-100'
                              : 'translate-x-full opacity-0'
                          }`}
                        >
                          <AnimationAssetSidebar
                            onAssetSelect={(asset) => {
                              console.log('Asset selected in editor:', asset)
                              // TODO: Apply asset effect to focused clip
                            }}
                            onClose={handleCloseSidebar}
                          />
                        </div>
                      )}

                      {/* Template Sidebar - DISABLED */}

                      {/* Speaker Management Sidebar */}
                      {rightSidebarType === 'speaker' && (
                        <div
                          className={`sticky top-0 transition-all duration-300 ease-out transform w-full ${
                            isToolbarVisible
                              ? 'h-[calc(100vh-176px)]'
                              : 'h-[calc(100vh-120px)]'
                          } ${
                            rightSidebarType === 'speaker'
                              ? 'translate-x-0 opacity-100'
                              : 'translate-x-full opacity-0'
                          }`}
                        >
                          <SpeakerManagementSidebar
                            isOpen={rightSidebarType === 'speaker'}
                            onClose={handleCloseSidebar}
                            speakers={globalSpeakers}
                            clips={clips}
                            speakerColors={speakerColors}
                            onAddSpeaker={handleAddSpeaker}
                            onRemoveSpeaker={handleRemoveSpeaker}
                            onRenameSpeaker={handleRenameSpeaker}
                            onBatchSpeakerChange={handleBatchSpeakerChange}
                            onSpeakerColorChange={handleSpeakerColorChange}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <NewUploadModal
            isOpen={uploadModal.isOpen && uploadModal.step === 'select'}
            onClose={() =>
              !uploadModal.isTranscriptionLoading && uploadModal.closeModal()
            }
            onFileSelect={uploadModal.handleFileSelect}
            onStartTranscription={wrappedHandleStartTranscription}
            onVideoInfoReady={uploadModal.setVideoInfo}
            acceptedTypes={['audio/*', 'video/*']}
            maxFileSize={500 * 1024 * 1024} // 500MB
            multiple={false}
            isLoading={uploadModal.isTranscriptionLoading}
          />

          <TutorialModal
            isOpen={showTutorialModal}
            onClose={handleTutorialClose}
            onComplete={handleTutorialComplete}
          />

          {/* 원본 복원 확인 모달 */}
          <AlertDialog
            isOpen={showRestoreModal}
            title="원본으로 복원"
            description="원본으로 돌아가시겠습니까? 모든 변경사항이 초기화됩니다."
            variant="warning"
            primaryActionLabel="예"
            cancelActionLabel="아니오"
            onPrimaryAction={handleConfirmRestore}
            onCancel={() => setShowRestoreModal(false)}
            onClose={() => setShowRestoreModal(false)}
          />

          {/* 상태 초기화 확인 모달 */}
          <AlertDialog
            isOpen={showResetConfirmModal}
            title="새 프로젝트 만들기"
            description="편집 중이던 모든 자료가 초기화됩니다. 계속하시겠습니까?"
            variant="warning"
            primaryActionLabel="확인"
            cancelActionLabel="취소"
            onPrimaryAction={handleResetConfirm}
            onCancel={handleResetCancel}
            onClose={handleResetCancel}
          />

          {/* Drag overlay for word drag and drop */}
          <DragOverlay>
            {(() => {
              const { draggedWordId, clips, groupedWordIds } =
                useEditorStore.getState()
              if (!draggedWordId) return null

              const draggedWord = clips
                .flatMap((clip) => clip.words)
                .find((word) => word.id === draggedWordId)

              if (!draggedWord) return null

              return (
                <div className="bg-purple-500 text-white px-2 py-1 rounded text-sm shadow-lg opacity-90">
                  {groupedWordIds.size > 1
                    ? `${groupedWordIds.size} words`
                    : draggedWord.text}
                </div>
              )
            })()}
          </DragOverlay>
        </div>
      </DndContext>

      {/* ProcessingModal을 DndContext 밖에 배치 */}
      <ProcessingModal
        isOpen={
          uploadModal.step !== 'select' && uploadModal.step !== 'completed'
        }
        onClose={uploadModal.closeModal}
        onCancel={uploadModal.cancelProcessing}
        backdrop={false}
      />

      {/* Platform Selection Modal */}
      <PlatformSelectionModal
        isOpen={isPlatformSelectionModalOpen}
        onClose={handlePlatformSelectionClose}
        onNext={handlePlatformSelectionNext}
      />

      {/* Deploy Modal */}
      <DeployModal {...deployModalProps} />

      {/* ChatBot */}
      <ChatBotContainer />
    </>
  )
}
