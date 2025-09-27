import React, { useState, useRef, useEffect } from 'react'
import {
  LuX,
  LuPlus,
  LuTrash2,
  LuUserX,
  LuArrowRight,
  LuPalette,
  LuInfo,
  LuRefreshCw,
} from 'react-icons/lu'
import chroma from 'chroma-js'
import { getSpeakerColor } from '@/utils/editor/speakerColors'
import { useSpeakerSync } from '../hooks/useSpeakerSync'

interface ClipItem {
  id: string
  timeline: string
  speaker: string
  fullText: string
}

interface SpeakerManagementSidebarProps {
  isOpen: boolean
  onClose: () => void
  speakers: string[]
  clips: ClipItem[]
  speakerColors?: Record<string, string>
  onAddSpeaker: (name: string) => void
  onRemoveSpeaker: (name: string) => void
  onRenameSpeaker: (oldName: string, newName: string) => void
  onBatchSpeakerChange: (clipIds: string[], newSpeaker: string) => void
  onSpeakerColorChange?: (speakerName: string, color: string) => void
}

export default function SpeakerManagementSidebar({
  isOpen,
  onClose,
  speakers,
  clips,
  speakerColors = {},
  onAddSpeaker,
  onRemoveSpeaker,
  onRenameSpeaker,
  onBatchSpeakerChange,
  onSpeakerColorChange,
}: SpeakerManagementSidebarProps) {
  // 화자 동기화 훅 사용
  const {
    syncSpeakers,
    getSpeakerStats,
    getUnusedSpeakers,
    getUnassignedClipsCount,
  } = useSpeakerSync()
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [selectedUnassignedClips, setSelectedUnassignedClips] = useState<
    Set<string>
  >(new Set())
  const [showUnassignedPanel, setShowUnassignedPanel] = useState(false)
  const [selectedColorSpeaker, setSelectedColorSpeaker] = useState<
    string | null
  >(null)
  const [showSpeakerStats, setShowSpeakerStats] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 화자 통계 데이터
  const speakerStats = getSpeakerStats()
  const unusedSpeakers = getUnusedSpeakers()
  const unassignedClipsCount = getUnassignedClipsCount()

  // 미지정 클립들 필터링
  const unassignedClips = clips.filter(
    (clip) => !clip.speaker || clip.speaker.trim() === ''
  )

  // 미지정 클립 선택/해제 핸들러
  const handleUnassignedClipToggle = (clipId: string) => {
    const newSelected = new Set(selectedUnassignedClips)
    if (newSelected.has(clipId)) {
      newSelected.delete(clipId)
    } else {
      newSelected.add(clipId)
    }
    setSelectedUnassignedClips(newSelected)
  }

  // 전체 선택/해제
  const handleSelectAllUnassigned = () => {
    if (selectedUnassignedClips.size === unassignedClips.length) {
      setSelectedUnassignedClips(new Set())
    } else {
      setSelectedUnassignedClips(
        new Set(unassignedClips.map((clip) => clip.id))
      )
    }
  }

  // 선택된 미지정 클립들에 화자 일괄 적용
  const handleAssignSpeakerToSelected = (speakerName: string) => {
    if (selectedUnassignedClips.size > 0) {
      onBatchSpeakerChange(Array.from(selectedUnassignedClips), speakerName)
      setSelectedUnassignedClips(new Set())
    }
  }

  useEffect(() => {
    if (editingSpeaker && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingSpeaker])

  const handleAddSpeaker = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // 이벤트 전파 방지

    // 최대 화자 수 제한 체크 (9명)
    if (speakers.length >= 9) {
      alert('최대 9명의 화자까지만 추가할 수 있습니다.')
      return
    }

    // 현재 존재하는 화자 번호들을 추출
    const existingNumbers = speakers
      .map((speaker) => {
        const match = speaker.match(/^화자(\d+)$/)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter((num) => num > 0)

    // 가장 작은 빈 번호 찾기 (1부터 시작)
    let nextNumber = 1
    while (existingNumbers.includes(nextNumber)) {
      nextNumber++
    }

    const newSpeakerName = `화자${nextNumber}`
    console.log('Adding speaker:', newSpeakerName)
    console.log('Current speakers:', speakers)
    console.log('Existing numbers:', existingNumbers)

    onAddSpeaker(newSpeakerName)
  }

  const handleStartEdit = (speaker: string) => {
    setEditingSpeaker(speaker)
    setEditingName(speaker)
  }

  const handleSaveEdit = () => {
    const trimmedName = editingName.trim()
    if (!trimmedName || !editingSpeaker) return

    // 중복 체크 (자기 자신은 제외)
    if (trimmedName !== editingSpeaker && speakers.includes(trimmedName)) {
      alert('이미 존재하는 화자명입니다.')
      return
    }

    console.log('Renaming speaker:', editingSpeaker, '->', trimmedName)
    onRenameSpeaker(editingSpeaker, trimmedName)
    setEditingSpeaker(null)
    setEditingName('')
  }

  const handleCancelEdit = () => {
    setEditingSpeaker(null)
    setEditingName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  // 기본 색상들 (흰색, 검정색, 회색 등)
  const generateBasicColors = () => {
    return [
      { color: '#FFFFFF', name: 'White', isBasic: true },
      { color: '#000000', name: 'Black', isBasic: true },
      { color: '#808080', name: 'Gray', isBasic: true },
      { color: '#C0C0C0', name: 'Silver', isBasic: true },
      { color: '#A0A0A0', name: 'Dark Gray', isBasic: true },
      { color: '#404040', name: 'Charcoal', isBasic: true },
    ]
  }

  // 색상환을 위한 HSV 색상 생성
  const generateColorWheel = () => {
    const colors = []
    const saturation = 0.8
    const value = 0.9

    // 12개 색상으로 색상환 생성 (30도씩)
    for (let i = 0; i < 12; i++) {
      const hue = (i * 30) % 360
      const chromaColor = chroma.hsv(hue, saturation, value)
      colors.push({
        color: chromaColor.hex(),
        name: `Hue ${hue}°`,
        hue,
        angle: i * 30 - 90, // -90도로 조정하여 빨간색이 위에 오도록
        isBasic: false,
      })
    }

    return colors
  }

  const basicColors = generateBasicColors()
  const colorWheelColors = generateColorWheel()

  // 색상환 중앙의 원 위치 계산
  const getColorPosition = (angle: number, radius: number) => {
    const radian = (angle * Math.PI) / 180
    return {
      x: Math.cos(radian) * radius,
      y: Math.sin(radian) * radius,
    }
  }

  const handleColorSelect = (colorHex: string) => {
    if (!selectedColorSpeaker || !onSpeakerColorChange) return

    // 현재 선택한 화자가 이미 이 색상을 사용 중인지 확인
    if (speakerColors[selectedColorSpeaker] === colorHex) {
      setSelectedColorSpeaker(null)
      return
    }

    // 다른 화자가 이미 이 색상을 사용 중인지 확인
    const otherSpeakerWithColor = Object.entries(speakerColors).find(
      ([speaker, color]) =>
        speaker !== selectedColorSpeaker && color === colorHex
    )

    if (otherSpeakerWithColor) {
      const [otherSpeaker] = otherSpeakerWithColor
      const currentSpeakerColor = speakerColors[selectedColorSpeaker]

      // 색상 교환 확인 다이얼로그
      const confirmMessage = `${otherSpeaker}가 이미 이 색상을 사용 중입니다.\n${selectedColorSpeaker}와 ${otherSpeaker}의 색상을 교환하시겠습니까?`

      if (confirm(confirmMessage)) {
        // 두 화자의 색상을 교환
        onSpeakerColorChange(selectedColorSpeaker, colorHex)
        onSpeakerColorChange(otherSpeaker, currentSpeakerColor)
      }
    } else {
      // 사용 중이지 않은 색상은 바로 적용
      onSpeakerColorChange(selectedColorSpeaker, colorHex)
    }

    setSelectedColorSpeaker(null)
  }

  // 화자 동기화 핸들러
  const handleRefreshSpeakers = async () => {
    setIsRefreshing(true)
    try {
      syncSpeakers()
      console.log('🔄 Manual speaker sync completed')
    } catch (error) {
      console.error('❌ Manual speaker sync failed:', error)
    } finally {
      setTimeout(() => setIsRefreshing(false), 500) // 시각적 피드백을 위한 딜레이
    }
  }

  // 사용되지 않는 화자 정리
  const handleCleanupUnusedSpeakers = () => {
    if (unusedSpeakers.length === 0) {
      alert('정리할 사용되지 않는 화자가 없습니다.')
      return
    }

    const confirmMessage = `다음 화자들이 어떤 클립에서도 사용되지 않습니다:\n${unusedSpeakers.join(', ')}\n\n이 화자들을 삭제하시겠습니까?`

    if (confirm(confirmMessage)) {
      unusedSpeakers.forEach((speaker) => {
        onRemoveSpeaker(speaker)
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-black">화자 관리</h2>
          <p className="text-sm text-gray-600 mt-1">
            {speakers.length}/9명
            {speakers.length >= 9 && (
              <span className="text-yellow-400 ml-1">(최대)</span>
            )}
          </p>
          {/* 동기화 상태 표시 */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleRefreshSpeakers}
              disabled={isRefreshing}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                isRefreshing
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
              title="클립에서 화자 정보 동기화"
            >
              <LuRefreshCw
                className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? '동기화 중...' : '동기화'}
            </button>

            <button
              onClick={() => setShowSpeakerStats(!showSpeakerStats)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-600 hover:bg-green-200 rounded transition-colors"
              title="화자 통계 보기"
            >
              <LuInfo className="w-3 h-3" />
              통계
            </button>

            {unusedSpeakers.length > 0 && (
              <button
                onClick={handleCleanupUnusedSpeakers}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-600 hover:bg-orange-200 rounded transition-colors"
                title="사용되지 않는 화자 정리"
              >
                <LuTrash2 className="w-3 h-3" />
                정리 ({unusedSpeakers.length})
              </button>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-600 hover:text-black transition-colors cursor-pointer"
        >
          <LuX className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 overflow-y-auto flex-1">
        {/* 화자 통계 패널 */}
        {showSpeakerStats && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LuInfo className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-semibold text-black">화자 통계</h3>
              </div>
              <button
                onClick={() => setShowSpeakerStats(false)}
                className="p-1 text-gray-600 hover:text-black transition-colors cursor-pointer"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* 전체 통계 */}
              <div className="text-xs text-gray-600 bg-white rounded p-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">총 클립:</span> {clips.length}
                    개
                  </div>
                  <div>
                    <span className="font-medium">미지정:</span>{' '}
                    {unassignedClipsCount}개
                  </div>
                  <div>
                    <span className="font-medium">화자 수:</span>{' '}
                    {speakers.length}명
                  </div>
                  <div>
                    <span className="font-medium">미사용 화자:</span>{' '}
                    {unusedSpeakers.length}명
                  </div>
                </div>
              </div>

              {/* 개별 화자 통계 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700">
                  화자별 상세 정보:
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {speakers.map((speaker) => {
                    const stats = speakerStats[speaker]
                    const isUnused = unusedSpeakers.includes(speaker)

                    if (isUnused) {
                      return (
                        <div
                          key={speaker}
                          className="flex items-center justify-between text-xs bg-orange-100 rounded p-2"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full border"
                              style={{
                                backgroundColor: getSpeakerColor(
                                  speaker,
                                  speakerColors
                                ),
                              }}
                            />
                            <span className="text-orange-700">{speaker}</span>
                          </div>
                          <span className="text-orange-600 text-xs">
                            미사용
                          </span>
                        </div>
                      )
                    }

                    if (!stats) return null

                    return (
                      <div
                        key={speaker}
                        className="flex items-center justify-between text-xs bg-white rounded p-2"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full border"
                            style={{
                              backgroundColor: getSpeakerColor(
                                speaker,
                                speakerColors
                              ),
                            }}
                          />
                          <span className="text-gray-700">{speaker}</span>
                        </div>
                        <div className="text-gray-600">
                          클립 {stats.clipCount}개 · 단어 {stats.wordCount}개
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 미지정 클립 관리 패널 */}
        {unassignedClips.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LuUserX className="w-5 h-5 text-orange-400" />
                <h3 className="text-sm font-semibold text-black">
                  미지정 클립 ({unassignedClips.length}개)
                </h3>
              </div>
              <button
                onClick={() => setShowUnassignedPanel(!showUnassignedPanel)}
                className="text-gray-600 hover:text-black transition-colors cursor-pointer"
              >
                <LuArrowRight
                  className={`w-4 h-4 transition-transform ${showUnassignedPanel ? 'rotate-90' : ''}`}
                />
              </button>
            </div>

            {showUnassignedPanel && (
              <div className="space-y-3">
                {/* 전체 선택 체크박스 */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        selectedUnassignedClips.size ===
                          unassignedClips.length && unassignedClips.length > 0
                      }
                      onChange={handleSelectAllUnassigned}
                      className="w-4 h-4 rounded"
                    />
                    전체 선택
                  </label>
                  <span className="text-gray-600">
                    {selectedUnassignedClips.size}개 선택됨
                  </span>
                </div>

                {/* 클립 리스트 */}
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {unassignedClips.map((clip) => (
                    <label
                      key={clip.id}
                      className="flex items-start gap-2 p-2 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUnassignedClips.has(clip.id)}
                        onChange={() => handleUnassignedClipToggle(clip.id)}
                        className="w-4 h-4 rounded mt-0.5 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-gray-600 mb-1">
                          {clip.timeline}
                        </div>
                        <div className="text-sm text-gray-700 truncate">
                          {clip.fullText}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* 화자 할당 버튼들 */}
                {selectedUnassignedClips.size > 0 && (
                  <div className="border-t border-gray-700 pt-3">
                    <div className="text-xs text-gray-600 mb-2">
                      선택된 클립에 화자 할당:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {speakers.map((speaker) => (
                        <button
                          key={speaker}
                          onClick={() => handleAssignSpeakerToSelected(speaker)}
                          className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors cursor-pointer"
                        >
                          {speaker}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Speaker List */}
        <div className="space-y-3">
          {speakers.map((speaker) => (
            <div
              key={speaker}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg min-h-[52px] border border-gray-200"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-300 border border-black"
                  style={{
                    backgroundColor: getSpeakerColor(speaker, speakerColors),
                  }}
                  onClick={() =>
                    setSelectedColorSpeaker(
                      selectedColorSpeaker === speaker ? null : speaker
                    )
                  }
                  title="색상 변경"
                />
                {editingSpeaker === speaker ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSaveEdit}
                    className="flex-1 bg-transparent text-black font-medium border-b border-cyan-500 outline-none min-w-0 truncate"
                    style={{ maxWidth: 'calc(100% - 60px)' }}
                  />
                ) : (
                  <span
                    className="text-black font-medium cursor-pointer hover:text-cyan-400 transition-colors flex-1 truncate overflow-hidden whitespace-nowrap"
                    onClick={() => handleStartEdit(speaker)}
                    style={{ maxWidth: 'calc(100% - 60px)' }}
                  >
                    {speaker}
                  </span>
                )}
              </div>
              {editingSpeaker !== speaker && (
                <button
                  onClick={() => onRemoveSpeaker(speaker)}
                  className="p-1 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 cursor-pointer"
                  title="삭제"
                >
                  <LuTrash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {speakers.length === 0 && (
            <div className="text-center py-8 text-gray-600">
              등록된 화자가 없습니다
            </div>
          )}

          {/* Add Speaker */}
          <button
            onClick={handleAddSpeaker}
            disabled={speakers.length >= 9}
            className={`w-full p-3 border-2 border-dashed rounded-lg
                        transition-all flex items-center justify-center space-x-2
                        ${
                          speakers.length >= 9
                            ? 'border-gray-700 text-gray-500 cursor-not-allowed'
                            : 'border-gray-600 text-gray-600 hover:text-black hover:border-gray-500'
                        }`}
            title={
              speakers.length >= 9
                ? '최대 9명의 화자까지만 추가할 수 있습니다.'
                : '화자 추가하기'
            }
          >
            <LuPlus className="w-5 h-5" />
            <span>
              {speakers.length >= 9 ? '화자 추가 제한 (9/9)' : '화자 추가하기'}
            </span>
          </button>
        </div>

        {/* 색상 변경 섹션 */}
        {selectedColorSpeaker && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LuPalette className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-black">
                  {selectedColorSpeaker} 색상 변경
                </h3>
              </div>
              <button
                onClick={() => setSelectedColorSpeaker(null)}
                className="p-1 text-gray-600 hover:text-black transition-colors cursor-pointer"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            {/* 색상 선택 섹션 */}
            <div className="flex flex-col items-center">
              {/* 기본 색상들 */}
              <div className="mb-4">
                <p className="text-xs text-gray-600 text-center mb-2">
                  기본 색상
                </p>
                <div className="flex justify-center gap-2">
                  {basicColors.map((colorData, index) => {
                    const isCurrentSpeakerColor =
                      speakerColors[selectedColorSpeaker] === colorData.color
                    const isUsedByOtherSpeaker = Object.entries(
                      speakerColors
                    ).some(
                      ([speaker, color]) =>
                        speaker !== selectedColorSpeaker &&
                        color === colorData.color
                    )

                    return (
                      <div
                        key={`basic-${colorData.color}-${index}`}
                        className={`relative w-6 h-6 rounded-full border-2 transition-all shadow-md cursor-pointer hover:shadow-lg hover:scale-110 ${
                          isCurrentSpeakerColor
                            ? 'border-blue-500 ring-2 ring-blue-300 scale-110'
                            : isUsedByOtherSpeaker
                              ? 'border-black border-2 opacity-80 hover:opacity-100'
                              : colorData.color === '#FFFFFF'
                                ? 'border-gray-300 hover:border-gray-400'
                                : 'border-gray-500 hover:border-gray-600'
                        }`}
                        style={{
                          backgroundColor: colorData.color,
                        }}
                        onClick={() => handleColorSelect(colorData.color)}
                        title={`${colorData.name}\nHex: ${colorData.color}${
                          isCurrentSpeakerColor
                            ? '\n✓ 현재 선택된 색상'
                            : isUsedByOtherSpeaker
                              ? '\n🔄 다른 화자가 사용 중 (클릭하여 색상 교환)'
                              : '\n클릭하여 선택'
                        }`}
                      >
                        {/* 사용 중인 기본 색상에 교환 아이콘 표시 */}
                        {isUsedByOtherSpeaker && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg
                              className={`w-3 h-3 drop-shadow-lg ${colorData.color === '#FFFFFF' ? 'text-black' : 'text-white'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                        {/* 현재 선택된 기본 색상에 체크 표시 */}
                        {isCurrentSpeakerColor && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white drop-shadow-lg filter brightness-150"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 색상환 */}
              <div
                className="relative w-32 h-32 mb-3"
                style={{ marginTop: '3px' }}
              >
                <p
                  className="text-xs text-gray-600 text-center mb-2"
                  style={{ marginTop: '-7px' }}
                >
                  색상환
                </p>
                {/* 색상환 배경 그라디언트 */}

                {/* 색상환의 색상 점들 */}
                {colorWheelColors.map((colorData, index) => {
                  const radius = 50 // 색상환 반지름 (작은 사이즈)
                  const position = getColorPosition(colorData.angle, radius)

                  // 이 색상이 현재 사용 중인지 확인
                  const isCurrentSpeakerColor =
                    speakerColors[selectedColorSpeaker] === colorData.color
                  const isUsedByOtherSpeaker = Object.entries(
                    speakerColors
                  ).some(
                    ([speaker, color]) =>
                      speaker !== selectedColorSpeaker &&
                      color === colorData.color
                  )

                  return (
                    <div
                      key={`${colorData.color}-${index}`}
                      className={`absolute w-4 h-4 rounded-full border transition-all shadow-md cursor-pointer hover:shadow-lg hover:scale-110 ${
                        isCurrentSpeakerColor
                          ? 'border-white ring-2 ring-blue-500 scale-125'
                          : isUsedByOtherSpeaker
                            ? 'border-black border-2 opacity-80 hover:opacity-100'
                            : 'border-white hover:border-gray-200'
                      }`}
                      style={{
                        backgroundColor: colorData.color,
                        left: `calc(50% + ${position.x}px - 8px)`,
                        top: `calc(50% + ${position.y}px - 6px)`,
                      }}
                      onClick={() => handleColorSelect(colorData.color)}
                      title={`${colorData.name}\nHex: ${colorData.color}${
                        isCurrentSpeakerColor
                          ? '\n✓ 현재 선택된 색상'
                          : isUsedByOtherSpeaker
                            ? '\n🔄 다른 화자가 사용 중 (클릭하여 색상 교환)'
                            : '\n클릭하여 선택'
                      }`}
                    >
                      {/* 사용 중인 색상에 교환 아이콘 표시 */}
                      {isUsedByOtherSpeaker && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg
                            className={`w-2 h-2 drop-shadow-lg ${colorData.color === '#FFFFFF' ? 'text-black' : 'text-white'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                      {/* 현재 선택된 색상에 체크 표시 */}
                      {isCurrentSpeakerColor && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg
                            className="w-2 h-2 text-white drop-shadow-lg"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* 중앙 원 */}
                <div
                  className="absolute inset-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center"
                  style={{
                    top: '40px',
                    left: '40px',
                    right: '40px',
                    bottom: '40px',
                  }}
                >
                  <div className="text-xs text-gray-600 text-center font-medium">
                    색상
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600 text-center">
                색상을 선택하여 {selectedColorSpeaker}의 색상을 변경하세요
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
