'use client'

import {
  applySelectionMode,
  validateClipRange,
  type ClipSelectionMode,
} from '@/utils/editor/clipSelection'
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EDITOR_COLORS, getDropdownClasses } from '../../../constants/colors'
import { ClipItem } from '../../../types'

interface ClipSelectionDropdownProps {
  clips: ClipItem[]
  selectedClipIds: Set<string>
  activeClipId: string | null
  onSelectionChange: (selectedIds: Set<string>) => void
}

/**
 * 클립 선택 드롭다운 컴포넌트
 * 다양한 방식으로 클립을 선택할 수 있는 드롭다운 메뉴
 */
export default function ClipSelectionDropdown({
  clips,
  selectedClipIds,
  activeClipId,
  onSelectionChange,
}: ClipSelectionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showRangeInput, setShowRangeInput] = useState(false)
  const [customRange, setCustomRange] = useState('')
  const [rangeError, setRangeError] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const rangeButtonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  })
  const [rangeDropdownPosition, setRangeDropdownPosition] = useState({
    top: 0,
    left: 0,
  })

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        !target.closest('[data-clip-selection-dropdown]') &&
        !target.closest('[data-range-dropdown]')
      ) {
        setIsOpen(false)
        setShowRangeInput(false)
      }
    }

    if (isOpen || showRangeInput) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen, showRangeInput])

  // ESC 키로 드롭다운 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showRangeInput) {
          setShowRangeInput(false)
        } else {
          setIsOpen(false)
        }
      }
    }

    if (isOpen || showRangeInput) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, showRangeInput])

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const buttonWidth = rect.width
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(buttonWidth * 2.5, 160), // 버튼 너비의 2.5배, 최소 160px
      })
    }
    setIsOpen(!isOpen)
    setShowRangeInput(false)
  }

  const handleRangeToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (!showRangeInput && rangeButtonRef.current) {
      const rect = rangeButtonRef.current.getBoundingClientRect()
      setRangeDropdownPosition({
        top: rect.top + window.scrollY,
        left: rect.right + window.scrollX + 4,
      })
    }
    setShowRangeInput(!showRangeInput)
  }

  const handleSelectionMode = (mode: ClipSelectionMode) => {
    const newSelection = applySelectionMode(
      mode,
      clips,
      selectedClipIds,
      activeClipId,
      mode === 'custom' ? customRange : undefined
    )
    onSelectionChange(newSelection)

    if (mode !== 'custom') {
      setIsOpen(false)
    }
  }

  const handleCustomRangeChange = (value: string) => {
    setCustomRange(value)

    // 실시간 유효성 검증
    if (value && !validateClipRange(value)) {
      setRangeError('올바른 형식: 1-5, 8, 11-13')
    } else {
      setRangeError('')
    }
  }

  const handleApplyCustomRange = () => {
    if (validateClipRange(customRange)) {
      handleSelectionMode('custom')
      setIsOpen(false)
      setShowRangeInput(false)
      setCustomRange('')
      setRangeError('')
    } else {
      setRangeError('올바른 형식을 입력해주세요')
    }
  }

  return (
    <div className="relative" data-clip-selection-dropdown>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={`
          flex flex-col items-center space-y-1 px-2 py-1 rounded cursor-pointer relative
          ${EDITOR_COLORS.toolbar.base.hover}
          text-gray-700
          transition-colors
        `}
      >
        <div className="w-5 h-5 text-gray-700">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <span className="text-xs text-gray-700 flex items-center gap-0.5">
          클립선택
          <svg
            className="w-2.5 h-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>

      {/* 메인 드롭다운 메뉴 */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`fixed ${getDropdownClasses()} rounded-lg`}
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width || 140,
              zIndex: 99999,
              backgroundColor: EDITOR_COLORS.toolbar.edit.backgroundRaw,
            }}
            data-clip-selection-dropdown
          >
            <div className="p-2">
              {/* 현재 클립 */}
              <button
                onClick={() => handleSelectionMode('current')}
                className={`w-full text-left px-3 py-1.5 text-xs ${EDITOR_COLORS.dropdown.text} ${EDITOR_COLORS.dropdown.hover} rounded transition-colors`}
                disabled={!activeClipId}
              >
                <div className="flex items-center">
                  <span className="truncate">현재 클립</span>
                  {!activeClipId && (
                    <span className="text-xs text-gray-500 ml-1">(없음)</span>
                  )}
                </div>
              </button>

              {/* 전체 선택 */}
              <button
                onClick={() => handleSelectionMode('all')}
                className={`w-full text-left px-3 py-1.5 text-xs ${EDITOR_COLORS.dropdown.text} ${EDITOR_COLORS.dropdown.hover} rounded transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">전체 선택</span>
                  <span className="text-xs text-gray-500">{clips.length}</span>
                </div>
              </button>

              {/* 클립 번호로 선택 - 서브 드롭다운 트리거 */}
              <button
                ref={rangeButtonRef}
                onClick={handleRangeToggle}
                className={`w-full text-left px-3 py-1.5 text-xs ${EDITOR_COLORS.dropdown.text} ${EDITOR_COLORS.dropdown.hover} rounded transition-colors relative`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">번호로 선택</span>
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>

              {/* 홀수 클립 */}
              <button
                onClick={() => handleSelectionMode('odd')}
                className={`w-full text-left px-3 py-1.5 text-xs ${EDITOR_COLORS.dropdown.text} ${EDITOR_COLORS.dropdown.hover} rounded transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">홀수 클립</span>
                  <span className="text-xs text-gray-500">1,3,5...</span>
                </div>
              </button>

              {/* 짝수 클립 */}
              <button
                onClick={() => handleSelectionMode('even')}
                className={`w-full text-left px-3 py-1.5 text-xs ${EDITOR_COLORS.dropdown.text} ${EDITOR_COLORS.dropdown.hover} rounded transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">짝수 클립</span>
                  <span className="text-xs text-gray-500">2,4,6...</span>
                </div>
              </button>

              {/* 선택 반전 */}
              <button
                onClick={() => handleSelectionMode('invert')}
                className={`w-full text-left px-3 py-1.5 text-xs ${EDITOR_COLORS.dropdown.text} ${EDITOR_COLORS.dropdown.hover} rounded transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">선택 반전</span>
                  <span className="text-xs text-gray-500">↔</span>
                </div>
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* 클립 번호 입력 서브 드롭다운 */}
      {showRangeInput &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`fixed ${getDropdownClasses()} rounded-lg p-3 min-w-[200px]`}
            style={{
              top: rangeDropdownPosition.top,
              left: rangeDropdownPosition.left,
              zIndex: 100000,
              backgroundColor: EDITOR_COLORS.toolbar.edit.backgroundRaw,
            }}
            data-range-dropdown
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-300">
                클립 번호 입력
              </div>

              <input
                type="text"
                value={customRange}
                onChange={(e) => handleCustomRangeChange(e.target.value)}
                placeholder="예: 1-5, 8, 11"
                className={`
                  w-full px-2 py-1.5 text-xs rounded
                  bg-slate-800 border border-slate-600
                  text-white placeholder-gray-500
                  focus:outline-none focus:border-blue-500
                  ${rangeError ? 'border-red-500' : ''}
                `}
                autoFocus
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter' && !rangeError && customRange) {
                    handleApplyCustomRange()
                  }
                }}
              />

              {rangeError && (
                <div className="text-xs text-red-400">{rangeError}</div>
              )}

              <div className="text-xs text-gray-400">
                • 범위: 1-5
                <br />
                • 개별: 1,3,5
                <br />• 혼합: 1-3,5,7
              </div>

              <button
                onClick={handleApplyCustomRange}
                disabled={!customRange || !!rangeError}
                className={`
                  w-full px-2 py-1.5 text-xs rounded font-medium
                  ${
                    !customRange || rangeError
                      ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                      : 'bg-[#33BFD9] text-white hover:bg-[#2BA5C3]'
                  }
                  transition-colors
                `}
              >
                적용
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
