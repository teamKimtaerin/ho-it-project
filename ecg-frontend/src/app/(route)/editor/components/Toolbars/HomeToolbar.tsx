'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import FontDropdown from '@/components/ui/FontDropdown'
import ToolbarButton from './shared/ToolbarButton'
import ToolbarDivider from './shared/ToolbarDivider'
import { EDITOR_COLORS } from '../../constants/colors'

// 기본 서식 그룹 컴포넌트 (향후 사용 예정)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TextFormattingGroup() {
  const [selectedFont, setSelectedFont] = useState('굴림고딕 볼드')
  const [fontSize, setFontSize] = useState('100')
  const [selectedColor, setSelectedColor] = useState('#FFFFFF')
  const [activeDropdown, setActiveDropdown] = useState<'color' | 'size' | null>(
    null
  )

  const sizeButtonRef = useRef<HTMLButtonElement>(null)
  const colorButtonRef = useRef<HTMLButtonElement>(null)
  const [sizeDropdownPosition, setSizeDropdownPosition] = useState({
    top: 0,
    left: 0,
  })
  const [colorDropdownPosition, setColorDropdownPosition] = useState({
    top: 0,
    left: 0,
  })

  // 외부 클릭시 드롭다운들 닫기
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null)
    }

    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [activeDropdown])

  const fontOptions = [
    {
      value: '굴림고딕 볼드',
      label: '굴림고딕 볼드',
      category: 'gothic' as const,
      keywords: ['굴림', '고딕', '볼드', '한국어'],
    },
    {
      value: '나눔스퀘어 네오 Bold',
      label: '나눔스퀘어 네오 Bold',
      category: 'rounded' as const,
      keywords: ['나눔', '스퀘어', '네오', 'Bold', '한국어', '라운드', '둥근'],
    },
    {
      value: 'Malgun Gothic',
      label: 'Malgun Gothic',
      category: 'gothic' as const,
      keywords: ['Malgun', 'Gothic', '맑은고딕', '맑은', '고딕', '한국어'],
    },
    {
      value: 'Noto Sans KR',
      label: 'Noto Sans KR',
      category: 'gothic' as const,
      keywords: ['Noto', 'Sans', 'KR', '노토', '산스', '한국어', '고딕'],
    },
    {
      value: 'Arial',
      label: 'Arial',
      category: 'gothic' as const,
      keywords: ['Arial', 'Sans-serif', '영어', '고딕'],
    },
  ]

  return (
    <div className="flex items-center space-x-2">
      {/* 폰트 선택 드롭다운 */}
      <FontDropdown
        value={selectedFont}
        options={fontOptions}
        onChange={(font: string) => setSelectedFont(font)}
        size="small"
        className="min-w-[120px]"
        variant="toolbar"
      />

      {/* 폰트 사이즈 입력/드롭다운 */}
      <div className="relative">
        <input
          type="text"
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
          className="w-16 h-8 px-2 pr-6 text-sm bg-white border border-gray-300 rounded text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-gray-400 hover:border-gray-400"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          ref={sizeButtonRef}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
          onClick={(e) => {
            e.stopPropagation()
            if (activeDropdown !== 'size') {
              const inputElement =
                e.currentTarget.parentElement?.querySelector('input')
              if (inputElement) {
                const rect = inputElement.getBoundingClientRect()
                setSizeDropdownPosition({
                  top: rect.bottom + window.scrollY + 4,
                  left: rect.left + window.scrollX,
                })
              }
              setActiveDropdown('size')
            } else {
              setActiveDropdown(null)
            }
          }}
        >
          <svg
            className="w-3 h-3 text-gray-500"
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
        </button>

        {/* 사이즈 드롭다운 메뉴 - Portal로 렌더링 */}
        {activeDropdown === 'size' &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className={`fixed ${EDITOR_COLORS.dropdown.background} ${EDITOR_COLORS.dropdown.border} rounded-default shadow-lg w-20 backdrop-blur-sm`}
              style={{
                top: sizeDropdownPosition.top,
                left: sizeDropdownPosition.left,
                zIndex: 99999,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {['50', '75', '100', '125', '150', '200', '250', '300'].map(
                (size) => (
                  <button
                    key={size}
                    className={`w-full px-3 py-1.5 text-sm text-gray-700 ${EDITOR_COLORS.dropdown.hover} text-left transition-colors`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setFontSize(size)
                      setActiveDropdown(null)
                    }}
                  >
                    {size}
                  </button>
                )
              )}
            </div>,
            document.body
          )}
      </div>

      {/* 색상 선택 버튼 */}
      <div className="relative">
        <button
          ref={colorButtonRef}
          className="w-8 h-8 border border-gray-300 rounded bg-white hover:bg-gray-50 transition-colors flex flex-col items-center justify-center p-1"
          onClick={(e) => {
            e.stopPropagation()
            if (activeDropdown !== 'color' && colorButtonRef.current) {
              const rect = colorButtonRef.current.getBoundingClientRect()
              setColorDropdownPosition({
                top: rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX,
              })
              setActiveDropdown('color')
            } else {
              setActiveDropdown(null)
            }
          }}
        >
          <span className="text-xs font-bold text-gray-700">A</span>
          <div
            className="w-5 h-1 mt-0.5 rounded-sm"
            style={{ backgroundColor: selectedColor }}
          />
        </button>

        {/* 색상 팔레트 - Portal로 렌더링 */}
        {activeDropdown === 'color' &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="fixed bg-white border border-gray-300 rounded-lg p-5 shadow-xl backdrop-blur-sm"
              style={{
                top: colorDropdownPosition.top,
                left: colorDropdownPosition.left,
                zIndex: 99999,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-5 gap-4 min-w-[280px]">
                {EDITOR_COLORS.textFormat.palette.map((color) => (
                  <button
                    key={color}
                    className="w-10 h-10 rounded-lg border-2 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                    style={{
                      backgroundColor: color,
                      borderColor:
                        selectedColor === color
                          ? '#000000'
                          : 'rgba(0, 0, 0, 0.2)',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedColor(color)
                      setActiveDropdown(null)
                    }}
                  />
                ))}
              </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  )
}

interface HomeToolbarProps {
  selectedClipIds: Set<string>
  canUndo: boolean
  canRedo: boolean
  onNewClick: () => void
  onMergeClips: () => void
  onUndo: () => void
  onRedo: () => void
  onCut?: () => void
  onCopy?: () => void
  onPaste?: () => void
  onSplitClip?: () => void
}

export default function HomeToolbar({
  canUndo,
  canRedo,
  onNewClick,
  onMergeClips,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onSplitClip,
}: HomeToolbarProps) {
  return (
    <>
      {/* 새로 만들기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        }
        label="새로 만들기"
        onClick={onNewClick}
        shortcut="Ctrl+N"
      />

      {/* 프로젝트 열기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
        label="프로젝트 열기"
        disabled={true}
        shortcut="Ctrl+O"
      />

      <ToolbarDivider />

      {/* 되돌리기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        }
        label="되돌리기"
        onClick={onUndo}
        disabled={!canUndo}
        shortcut="Ctrl+Z"
      />

      {/* 다시실행 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 10H11a8 8 0 00-8 8v2m18-10l-6-6m6 6l-6 6"
            />
          </svg>
        }
        label="다시실행"
        onClick={onRedo}
        disabled={!canRedo}
        shortcut="Ctrl+Y"
      />

      <ToolbarDivider />

      {/* 잘라내기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM6 6v12h12V6H6zm2 3h8v2H8V9zm0 4h8v2H8v-2z"
            />
          </svg>
        }
        label="잘라내기"
        onClick={onCut}
        shortcut="Ctrl+X"
      />

      {/* 복사하기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2V9.5S16 9 15.5 9H13a2 2 0 01-2-2V5.5S11 5 10.5 5H8a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v0"
            />
          </svg>
        }
        label="복사하기"
        onClick={onCopy}
        shortcut="Ctrl+C"
      />

      {/* 붙여넣기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
        label="붙여넣기"
        onClick={onPaste}
        shortcut="Ctrl+V"
      />

      <ToolbarDivider />

      {/* 클립 합치기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        }
        label="클립 합치기"
        onClick={onMergeClips}
        shortcut="Ctrl+E"
      />

      {/* 클립 나누기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect
              x="3"
              y="6"
              width="18"
              height="12"
              rx="2"
              ry="2"
              strokeWidth="2"
            />
            <line x1="12" y1="6" x2="12" y2="18" strokeWidth="2" />
          </svg>
        }
        label="클립 나누기"
        onClick={onSplitClip}
        shortcut="Enter"
      />
    </>
  )
}
