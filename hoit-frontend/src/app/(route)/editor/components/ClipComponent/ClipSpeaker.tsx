import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDownIcon } from '@/components/icons'
import { showToast } from '@/utils/ui/toast'
import { getSpeakerColor } from '@/utils/editor/speakerColors'

interface ClipSpeakerProps {
  clipId: string
  speaker: string
  speakers: string[]
  speakerColors?: Record<string, string> // 화자별 색상 매핑
  onSpeakerChange?: (clipId: string, newSpeaker: string) => void
  onBatchSpeakerChange?: (clipIds: string[], newSpeaker: string) => void
  onOpenSpeakerManagement?: () => void
  onAddSpeaker?: (name: string) => void
  onRenameSpeaker?: (oldName: string, newName: string) => void
}

export default function ClipSpeaker({
  clipId,
  speaker,
  speakers,
  speakerColors = {},
  onSpeakerChange,
  onBatchSpeakerChange,
  onOpenSpeakerManagement,
  onAddSpeaker,
  onRenameSpeaker,
}: ClipSpeakerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [pendingRename, setPendingRename] = useState<{
    oldName: string
    newName: string
  } | null>(null)
  const [lastErrorName, setLastErrorName] = useState<string | null>(null) // 마지막 에러가 발생한 이름
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      // 드롭다운 버튼 클릭인 경우 무시
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return
      }

      // Portal로 렌더링된 드롭다운 내부 클릭인 경우 무시
      const portalDropdown = document.querySelector(
        '.fixed.rounded.bg-gray-800'
      )
      if (portalDropdown && portalDropdown.contains(target)) {
        return
      }

      // 모달 내부 클릭인 경우 무시
      const modal = document.querySelector('[role="dialog"], .fixed.inset-0')
      if (modal && modal.contains(target)) {
        return
      }

      // 체크박스나 ClipComponent의 다른 상호작용 요소 클릭인 경우 무시
      const checkbox = (target as Element).closest('input[type="checkbox"]')
      if (checkbox) {
        return
      }

      // 그 외의 경우 드롭다운 닫기
      setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSpeakerSelect = (value: string) => {
    if (value === 'add_new') {
      // 자동으로 새 화자 생성
      const nextSpeakerNumber = speakers.length + 1
      const newSpeakerName = `화자${nextSpeakerNumber}`

      if (onAddSpeaker) {
        onAddSpeaker(newSpeakerName)
      }

      // 빈 speaker가 있는 클립이 있는지 확인
      const hasEmptyClips = !speaker

      if (hasEmptyClips && onBatchSpeakerChange) {
        onBatchSpeakerChange([clipId], newSpeakerName)
      } else if (onSpeakerChange) {
        onSpeakerChange(clipId, newSpeakerName)
      }

      setIsOpen(false)
    } else if (value === 'manage_speakers') {
      if (onOpenSpeakerManagement) {
        onOpenSpeakerManagement()
      }
      setIsOpen(false)
    } else if (value.startsWith('edit_')) {
      // 화자 편집 모드
      const speakerToEdit = value.replace('edit_', '')
      setEditingSpeaker(speakerToEdit)
      setEditingName(speakerToEdit)
      setIsOpen(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      if (onSpeakerChange) {
        onSpeakerChange(clipId, value)
      }
      setIsOpen(false)
    }
  }

  const handleSaveEdit = () => {
    if (!editingName.trim() || !editingSpeaker) {
      // 빈 값이면 편집 취소
      handleCancelEdit()
      return
    }

    const trimmedName = editingName.trim()

    // 이름이 변경되지 않았으면 그냥 종료
    if (trimmedName === editingSpeaker) {
      setEditingSpeaker(null)
      setEditingName('')
      // 포커스 초기화
      if (inputRef.current) {
        inputRef.current.blur()
      }
      return
    }

    // 중복 체크 (기존 화자명과 동일한 경우는 제외)
    if (speakers.includes(trimmedName) && trimmedName !== editingSpeaker) {
      // 같은 이름에 대해 처음 에러가 발생하는 경우에만 토스트 표시
      if (lastErrorName !== trimmedName) {
        showToast('이미 존재하는 화자명입니다', 'error')
        setLastErrorName(trimmedName)
      }
      // 원래 이름으로 되돌리기
      setEditingName(editingSpeaker)
      return
    }

    // 모달을 통해 적용 범위 확인
    setPendingRename({ oldName: editingSpeaker, newName: trimmedName })
    setShowRenameModal(true)
    // 편집 상태 완전 리셋
    setEditingSpeaker(null)
    setEditingName('')
    setLastErrorName(null)
    setIsOpen(false)

    // 포커스 초기화
    if (inputRef.current) {
      inputRef.current.blur()
    }
  }

  const handleRenameChoice = (applyToAll: boolean) => {
    if (!pendingRename) return

    if (applyToAll) {
      // 전체 적용: 기존 화자를 새 이름으로 대체
      if (onRenameSpeaker) {
        onRenameSpeaker(pendingRename.oldName, pendingRename.newName)
      }
    } else {
      // 개별 적용: 새 화자 생성 후 현재 클립에만 적용
      if (onAddSpeaker) {
        onAddSpeaker(pendingRename.newName)
      }
      if (onSpeakerChange) {
        onSpeakerChange(clipId, pendingRename.newName)
      }
    }

    // 모든 상태 완전 리셋
    setShowRenameModal(false)
    setPendingRename(null)
    setEditingSpeaker(null)
    setEditingName('')
    setLastErrorName(null)
    setIsOpen(false)

    // 포커스 초기화
    if (inputRef.current) {
      inputRef.current.blur()
    }
    // 드롭다운 버튼에서도 포커스 제거
    if (dropdownRef.current) {
      const button = dropdownRef.current.querySelector('button')
      if (button) {
        button.blur()
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingSpeaker(null)
    setEditingName('')
    setLastErrorName(null)
    setIsOpen(false)

    // 포커스 초기화
    if (inputRef.current) {
      inputRef.current.blur()
    }
    if (dropdownRef.current) {
      const button = dropdownRef.current.querySelector('button')
      if (button) {
        button.blur()
      }
    }
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* 커스텀 드롭다운 또는 편집 입력 필드 */}
      {editingSpeaker ? (
        <div className="relative flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={editingName}
            onChange={(e) => {
              setEditingName(e.target.value)
              // 타이핑할 때마다 에러 이름 리셋 (새로운 이름에 대해서는 다시 에러 표시 가능)
              setLastErrorName(null)
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') handleSaveEdit()
              if (e.key === 'Escape') handleCancelEdit()
            }}
            onBlur={() => {
              // 포커스가 모달로 이동하는 경우 무시
              setTimeout(() => handleSaveEdit(), 100)
            }}
            placeholder="화자 이름 입력"
            className="h-8 px-3 text-sm bg-white text-black border border-gray-300 rounded
                      focus:outline-none focus:ring-2 focus:border-transparent 
                      w-[120px] flex-shrink-0 focus:ring-blue-500
                      overflow-hidden whitespace-nowrap"
            style={{ maxWidth: '120px', minWidth: '120px' }}
          />
        </div>
      ) : (
        <div ref={dropdownRef} className="relative flex-shrink-0">
          <button
            type="button"
            className="inline-flex items-center justify-between h-8 px-3 text-sm font-medium
                       bg-transparent text-black border border-gray-300 rounded
                       hover:bg-gray-50 hover:border-gray-400 transition-all
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       w-[120px] flex-shrink-0"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsOpen(!isOpen)
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* 화자 색상 원 */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 border border-black"
                style={{
                  backgroundColor: getSpeakerColor(speaker, speakerColors),
                }}
              />
              <span
                className={`truncate overflow-hidden whitespace-nowrap ${!speaker ? 'text-orange-500' : ''}`}
                style={{ maxWidth: '70px' }}
              >
                {speaker || '화자 없음'}
              </span>
            </div>
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* 드롭다운 메뉴 - React Portal로 body에 렌더링 */}
          {isOpen &&
            typeof window !== 'undefined' &&
            createPortal(
              <div
                className="fixed rounded bg-white border border-gray-300 shadow-lg"
                style={{
                  zIndex: 99999,
                  left: dropdownRef.current?.getBoundingClientRect().left || 0,
                  top:
                    (dropdownRef.current?.getBoundingClientRect().bottom || 0) +
                    4,
                  width: '120px',
                  minWidth: '120px',
                  maxWidth: '120px',
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Speaker 옵션들 */}
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
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* 화자 색상 원 */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 border border-black"
                          style={{
                            backgroundColor: getSpeakerColor(s, speakerColors),
                          }}
                        />
                        <span
                          className={`truncate overflow-hidden whitespace-nowrap ${speaker === s ? 'text-blue-600 font-medium' : ''}`}
                          style={{ maxWidth: '50px' }}
                        >
                          {s}
                        </span>
                      </div>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-black
                              text-xs px-1 py-0.5 rounded transition-all flex-shrink-0"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleSpeakerSelect(`edit_${s}`)
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        편집
                      </button>
                    </div>
                  </div>
                ))}

                {/* 구분선 */}
                <div className="border-t border-gray-200 my-1" />

                {/* 새 Speaker 추가 옵션 */}
                <div
                  className="px-3 py-2 text-sm text-blue-600 hover:bg-gray-50 cursor-pointer
                        transition-colors font-medium"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSpeakerSelect('add_new')
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  + 화자 추가하기
                </div>

                {/* 화자 관리 옵션 */}
                <div
                  className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 cursor-pointer
                        transition-colors font-medium flex items-center gap-2"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSpeakerSelect('manage_speakers')
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
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
                  &ldquo;{pendingRename.oldName}&rdquo;을 &ldquo;
                  {pendingRename.newName}&rdquo;로 변경합니다.
                </p>
                <p className="text-sm text-gray-400">
                  이 화자를 사용하는 다른 클립에도 변경사항을 적용하시겠습니까?
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => handleRenameChoice(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded
                          hover:bg-gray-600 transition-colors"
                >
                  아니오 (현재 클립만)
                </button>
                <button
                  onClick={() => handleRenameChoice(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded
                          hover:bg-blue-700 transition-colors"
                >
                  예 (모든 클립)
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
