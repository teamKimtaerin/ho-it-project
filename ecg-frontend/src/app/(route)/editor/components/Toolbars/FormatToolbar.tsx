'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import GoogleFontDropdown from '@/components/ui/GoogleFontDropdown'
import ToolbarButton from './shared/ToolbarButton'
import ToolbarDivider from './shared/ToolbarDivider'
import { EDITOR_COLORS } from '../../constants/colors'
import BorderStylePopup from '../ColorPicker/BorderStylePopup'
import BackgroundStylePopup from '../ColorPicker/BackgroundStylePopup'
import SimpleColorPopup from '../ColorPicker/SimpleColorPopup'
import { useEditorStore } from '../../store'
import type { ClipItem } from '../../types'

interface FormatToolbarProps {
  clips: ClipItem[]
  selectedClipIds: Set<string>
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export default function FormatToolbar({ clips }: FormatToolbarProps) {
  const { updateCaptionDefaultStyle, updateGroupNodeStyle, currentScenario } =
    useEditorStore()

  const [selectedFont, setSelectedFont] = useState('Arial')
  const [fontSize, setFontSize] = useState('100')
  const [selectedColor, setSelectedColor] = useState('#FFFF00')
  const [activeDropdown, setActiveDropdown] = useState<
    'color' | 'size' | 'saved' | null
  >(null)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [currentFormat, setCurrentFormat] = useState('전체')
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)

  // Style popup states
  const [activeStylePopup, setActiveStylePopup] = useState<
    'border' | 'background' | 'highlight' | 'shadow' | null
  >(null)
  const [borderColor, setBorderColor] = useState('#FFFFFF')
  const [borderThickness, setBorderThickness] = useState(2)
  const [backgroundColor, setBackgroundColor] = useState('#000000')
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.5)
  const [highlightColor, setHighlightColor] = useState('#FFFF00')
  const [shadowColor, setShadowColor] = useState('#000000')

  const sizeButtonRef = useRef<HTMLButtonElement>(null)
  const colorButtonRef = useRef<HTMLButtonElement>(null)
  const savedFormatRef = useRef<HTMLButtonElement>(null)
  const borderButtonRef = useRef<HTMLDivElement>(null)
  const backgroundButtonRef = useRef<HTMLDivElement>(null)
  const highlightButtonRef = useRef<HTMLDivElement>(null)
  const shadowButtonRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })

  // 스타일 동기화 함수
  const syncStylesFromScenario = useCallback(() => {
    let targetStyle: Record<string, unknown> = {}
    let targetBoxStyle: Record<string, unknown> = {}

    if (selectedClipId === null) {
      // 전체 스타일 - caption track에서 가져오기
      if (currentScenario?.tracks) {
        const captionTrack = currentScenario.tracks.find(
          (track) => track.id === 'caption' || track.type === 'subtitle'
        )
        if (captionTrack?.defaultStyle) {
          targetStyle = captionTrack.defaultStyle
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((captionTrack as any)?.defaultBoxStyle) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          targetBoxStyle = (captionTrack as any).defaultBoxStyle
        }
      }
    } else {
      // 클립별 스타일 - group node에서 가져오기
      if (currentScenario?.cues) {
        const groupNodeId = `clip-${selectedClipId}`
        for (const cue of currentScenario.cues) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const root = (cue as any).root
          if (root && root.id === groupNodeId) {
            let currentStyle = root.style || {}
            if (typeof currentStyle === 'string') {
              currentStyle = {}
            }
            targetStyle = currentStyle

            let currentBoxStyle = root.boxStyle || {}
            if (typeof currentBoxStyle === 'string') {
              currentBoxStyle = {}
            }
            targetBoxStyle = currentBoxStyle
            break
          }
        }
      }
    }

    // Combine styles for UI synchronization
    const combinedStyle = { ...targetStyle, ...targetBoxStyle }

    // UI 상태 업데이트
    if (combinedStyle.fontFamily) {
      setSelectedFont(combinedStyle.fontFamily as string)
    }

    if (typeof combinedStyle.fontSizeRel === 'number') {
      const sizePercent = Math.round((combinedStyle.fontSizeRel / 0.05) * 100)
      setFontSize(sizePercent.toString())
    }

    if (combinedStyle.color) {
      setSelectedColor(combinedStyle.color as string)
    }

    setIsBold(
      combinedStyle.fontWeight === 'bold' || combinedStyle.fontWeight === 700
    )
    setIsItalic(combinedStyle.fontStyle === 'italic')

    if (combinedStyle.borderColor) {
      setBorderColor(combinedStyle.borderColor as string)
    }
    if (typeof combinedStyle.borderWidth === 'number') {
      setBorderThickness(combinedStyle.borderWidth)
    }
    if (combinedStyle.backgroundColor) {
      setBackgroundColor(combinedStyle.backgroundColor as string)
    }
    if (typeof combinedStyle.backgroundOpacity === 'number') {
      setBackgroundOpacity(combinedStyle.backgroundOpacity)
    }
  }, [currentScenario, selectedClipId])

  // scenario나 selectedClipId가 변경될 때 스타일 동기화
  useEffect(() => {
    syncStylesFromScenario()
  }, [currentScenario, selectedClipId, syncStylesFromScenario])

  // 외부 클릭시 드롭다운들 닫기
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null)
      setActiveStylePopup(null)
    }

    if (activeDropdown || activeStylePopup) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [activeDropdown, activeStylePopup])

  // Generate format options dynamically
  const savedFormats = [
    { id: 'all', name: '전체' },
    ...clips.map((clip, index) => ({
      id: clip.id,
      name: `클립 ${index + 1}`,
    })),
  ]

  // Helper function to separate text and box styles
  const separateStyles = (combinedStyle: Record<string, unknown>) => {
    const {
      backgroundColor,
      backgroundOpacity,
      border,
      borderColor,
      borderWidth,
      padding,
      borderRadius,
      opacity,
      ...textStyle
    } = combinedStyle

    const boxStyle =
      backgroundColor ||
      backgroundOpacity !== undefined ||
      border ||
      borderColor ||
      borderWidth ||
      padding ||
      borderRadius ||
      opacity !== undefined
        ? {
            backgroundColor,
            backgroundOpacity,
            border,
            borderColor,
            borderWidth,
            padding,
            borderRadius,
            opacity,
          }
        : undefined

    // Remove undefined properties
    const cleanTextStyle = Object.fromEntries(
      Object.entries(textStyle).filter(([, value]) => value !== undefined)
    )
    const cleanBoxStyle = boxStyle
      ? Object.fromEntries(
          Object.entries(boxStyle).filter(([, value]) => value !== undefined)
        )
      : undefined

    return {
      style:
        Object.keys(cleanTextStyle).length > 0 ? cleanTextStyle : undefined,
      boxStyle: cleanBoxStyle,
    }
  }

  // Conditional style application function
  const applyStyle = (styleUpdates: Record<string, unknown>) => {
    console.log('applyStyle called with:', { styleUpdates, selectedClipId })
    const { style, boxStyle } = separateStyles(styleUpdates)
    console.log('separateStyles result:', { style, boxStyle })

    if (selectedClipId === null) {
      // Apply to global caption track
      console.log('Applying to global caption track')
      updateCaptionDefaultStyle({ style, boxStyle })
    } else {
      // Apply to specific clip's group node
      console.log('Applying to specific clip group node:', selectedClipId)
      updateGroupNodeStyle(selectedClipId, { style, boxStyle })
    }
  }

  return (
    <>
      {/* 서식 지우기 */}
      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12.318 5L20 12.682l-1.318 1.318L11 6.318 3.318 14 2 12.682 9.682 5A2 2 0 0111 4.318l1.318.682z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 20h18"
            />
          </svg>
        }
        label="서식 지우기"
      />

      {/* 저장된 서식 */}
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
        label="저장된 서식"
      />

      <ToolbarDivider />

      {/* 클립 1 표시 버튼 */}
      <div className="relative">
        <button
          ref={savedFormatRef}
          className="flex items-center space-x-2 px-3 py-1.5 bg-green-600/90 hover:bg-green-700/90 rounded-default text-white text-sm transition-colors min-w-[80px]"
          onClick={(e) => {
            e.stopPropagation()
            if (activeDropdown !== 'saved' && savedFormatRef.current) {
              const rect = savedFormatRef.current.getBoundingClientRect()
              setDropdownPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
              })
              setActiveDropdown('saved')
            } else {
              setActiveDropdown(null)
            }
          }}
        >
          <span>{currentFormat}</span>
          <svg
            className={`w-4 h-4 transition-transform ${
              activeDropdown === 'saved' ? 'rotate-180' : ''
            }`}
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

        {/* 저장된 서식 드롭다운 */}
        {activeDropdown === 'saved' &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className={`fixed ${EDITOR_COLORS.dropdown.dark.background} ${EDITOR_COLORS.dropdown.dark.border} ${EDITOR_COLORS.dropdown.dark.shadow} rounded-lg backdrop-blur-sm min-w-[120px] max-w-[200px] max-h-[300px] overflow-y-auto dropdown-scrollbar`}
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                zIndex: 99999,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {savedFormats.map((format) => (
                <button
                  key={format.id}
                  className={`w-full px-3 py-2 text-sm ${EDITOR_COLORS.dropdown.dark.text} ${EDITOR_COLORS.dropdown.dark.hover} text-left transition-colors ${
                    currentFormat === format.name
                      ? EDITOR_COLORS.dropdown.dark.selected
                      : ''
                  } first:rounded-t-lg last:rounded-b-lg`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentFormat(format.name)
                    setSelectedClipId(format.id === 'all' ? null : format.id)
                    setActiveDropdown(null)
                  }}
                >
                  {format.name}
                </button>
              ))}
            </div>,
            document.body
          )}
      </div>

      {/* Bold 버튼 */}
      <button
        className={`w-8 h-8 border rounded flex items-center justify-center text-sm font-bold transition-colors ${
          isBold ? EDITOR_COLORS.button.active : EDITOR_COLORS.button.inactive
        }`}
        onClick={() => {
          const newBold = !isBold
          setIsBold(newBold)
          applyStyle({
            fontWeight: newBold ? 'bold' : 'normal',
          })
        }}
      >
        B
      </button>

      {/* Italic 버튼 */}
      <button
        className={`w-8 h-8 border rounded flex items-center justify-center text-sm italic transition-colors ${
          isItalic ? EDITOR_COLORS.button.active : EDITOR_COLORS.button.inactive
        }`}
        onClick={() => {
          const newItalic = !isItalic
          setIsItalic(newItalic)
          applyStyle({
            fontStyle: newItalic ? 'italic' : 'normal',
          })
        }}
      >
        I
      </button>

      {/* 폰트 선택 드롭다운 */}
      <GoogleFontDropdown
        value={selectedFont}
        onChange={(font: string) => {
          setSelectedFont(font)
          applyStyle({
            fontFamily: font,
          })
        }}
        size="small"
        className="min-w-[140px]"
        variant="toolbar"
      />

      {/* 폰트 사이즈 입력/드롭다운 */}
      <div className="relative">
        <input
          type="text"
          value={fontSize}
          onChange={(e) => {
            const newSize = e.target.value
            setFontSize(newSize)
            // 폰트 크기를 fontSizeRel로 변환 (100% = 0.05)
            const sizePercent = parseInt(newSize) || 100
            const fontSizeRel = (sizePercent / 100) * 0.05
            applyStyle({
              fontSizeRel: fontSizeRel,
            })
          }}
          className="w-16 h-8 px-2 pr-6 text-sm bg-slate-700/90 border-2 border-slate-500/70 rounded-default text-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-slate-400 hover:border-slate-400 hover:bg-slate-600/90"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          ref={sizeButtonRef}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-600/70 rounded"
          onClick={(e) => {
            e.stopPropagation()
            if (activeDropdown !== 'size') {
              const inputElement =
                e.currentTarget.parentElement?.querySelector('input')
              if (inputElement) {
                const rect = inputElement.getBoundingClientRect()
                setDropdownPosition({
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
            className="w-3 h-3 text-slate-300"
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

        {/* 사이즈 드롭다운 메뉴 */}
        {activeDropdown === 'size' &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className={`fixed ${EDITOR_COLORS.dropdown.dark.background} ${EDITOR_COLORS.dropdown.dark.border} ${EDITOR_COLORS.dropdown.dark.shadow} rounded-lg w-20 backdrop-blur-sm max-h-60 overflow-y-auto dropdown-scrollbar`}
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                zIndex: 99999,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {['50', '75', '100', '125', '150', '200', '250', '300'].map(
                (size) => (
                  <button
                    key={size}
                    className={`w-full px-3 py-2 text-sm ${EDITOR_COLORS.dropdown.dark.text} ${EDITOR_COLORS.dropdown.dark.hover} text-left transition-colors first:rounded-t-lg last:rounded-b-lg`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setFontSize(size)
                      // 폰트 크기를 fontSizeRel로 변환 (100% = 0.05)
                      const sizePercent = parseInt(size) || 100
                      const fontSizeRel = (sizePercent / 100) * 0.05
                      applyStyle({
                        fontSizeRel: fontSizeRel,
                      })
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
          className="w-8 h-8 border border-slate-500/70 rounded bg-slate-700/90 hover:bg-slate-600/90 transition-colors flex flex-col items-center justify-center p-1"
          onClick={(e) => {
            e.stopPropagation()
            if (activeDropdown !== 'color' && colorButtonRef.current) {
              const rect = colorButtonRef.current.getBoundingClientRect()
              setDropdownPosition({
                top: rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX,
              })
              setActiveDropdown('color')
            } else {
              setActiveDropdown(null)
            }
          }}
        >
          <span className="text-xs font-bold text-white">A</span>
          <div
            className="w-5 h-1 mt-0.5 rounded-sm"
            style={{ backgroundColor: selectedColor }}
          />
        </button>

        {/* 색상 팔레트 */}
        {activeDropdown === 'color' &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="fixed bg-slate-800/95 border border-slate-600 rounded-lg p-5 shadow-2xl backdrop-blur-sm"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
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
                          ? '#60A5FA'
                          : 'rgba(255, 255, 255, 0.2)',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedColor(color)
                      applyStyle({
                        color: color,
                      })
                      setActiveDropdown(null)
                    }}
                  />
                ))}
              </div>
            </div>,
            document.body
          )}
      </div>

      <ToolbarDivider />

      {/* 테두리 버튼 */}
      <div className="relative" ref={borderButtonRef}>
        <ToolbarButton
          icon={
            <svg
              className="w-full h-full"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" />
            </svg>
          }
          label="테두리"
          onClick={() => {
            if (activeStylePopup !== 'border' && borderButtonRef.current) {
              const rect = borderButtonRef.current.getBoundingClientRect()
              setPopupPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
              })
              setActiveStylePopup('border')
            } else {
              setActiveStylePopup(null)
            }
          }}
        />
      </div>

      {/* 배경 버튼 */}
      <div className="relative" ref={backgroundButtonRef}>
        <ToolbarButton
          icon={
            <svg
              className="w-full h-full"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          }
          label="배경"
          onClick={() => {
            if (
              activeStylePopup !== 'background' &&
              backgroundButtonRef.current
            ) {
              const rect = backgroundButtonRef.current.getBoundingClientRect()
              setPopupPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
              })
              setActiveStylePopup('background')
            } else {
              setActiveStylePopup(null)
            }
          }}
        />
      </div>

      {/* 형광펜 버튼 */}
      <div className="relative" ref={highlightButtonRef}>
        <ToolbarButton
          icon={
            <svg
              className="w-full h-full"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 10l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M7 14l-2 2m0 0l-2 2m2-2l2 2m-2-2l-2-2m12 0h.01M12 12h.01M16 16h.01M8 8h.01"
              />
            </svg>
          }
          label="형광펜"
          onClick={() => {
            if (
              activeStylePopup !== 'highlight' &&
              highlightButtonRef.current
            ) {
              const rect = highlightButtonRef.current.getBoundingClientRect()
              setPopupPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
              })
              setActiveStylePopup('highlight')
            } else {
              setActiveStylePopup(null)
            }
          }}
        />
      </div>

      <ToolbarDivider />

      {/* 그림자 버튼 */}
      <div className="relative" ref={shadowButtonRef}>
        <ToolbarButton
          icon={
            <svg
              className="w-full h-full"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <rect x="6" y="6" width="14" height="14" rx="2" strokeWidth="2" />
              <rect
                x="4"
                y="4"
                width="14"
                height="14"
                rx="2"
                fill="currentColor"
                opacity="0.3"
              />
            </svg>
          }
          label="그림자"
          onClick={() => {
            if (activeStylePopup !== 'shadow' && shadowButtonRef.current) {
              const rect = shadowButtonRef.current.getBoundingClientRect()
              setPopupPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
              })
              setActiveStylePopup('shadow')
            } else {
              setActiveStylePopup(null)
            }
          }}
        />
      </div>

      {/* 간격 버튼 */}
      <ToolbarButton
        icon={
          <svg
            className="w-full h-full"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        }
        label="간격"
      />

      <ToolbarDivider />

      {/* 고급 버튼 */}
      <ToolbarButton
        icon={
          <svg
            className="w-full h-full"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
        }
        label="고급"
      />

      {/* Style Popups */}
      {activeStylePopup === 'border' &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[99999]"
            style={{
              top: popupPosition.top,
              left: popupPosition.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <BorderStylePopup
              color={borderColor}
              thickness={borderThickness}
              onColorChange={(color) => {
                setBorderColor(color)
                applyStyle({
                  borderColor: color,
                  border: `${borderThickness}px solid ${color}`,
                })
              }}
              onThicknessChange={(thickness) => {
                setBorderThickness(thickness)
                applyStyle({
                  borderWidth: thickness,
                  border: `${thickness}px solid ${borderColor}`,
                })
              }}
              onClose={() => setActiveStylePopup(null)}
            />
          </div>,
          document.body
        )}

      {activeStylePopup === 'background' &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[99999]"
            style={{
              top: popupPosition.top,
              left: popupPosition.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <BackgroundStylePopup
              color={backgroundColor}
              opacity={backgroundOpacity}
              onColorChange={(color) => {
                setBackgroundColor(color)
                applyStyle({
                  backgroundColor: color,
                })
              }}
              onOpacityChange={(opacity) => {
                setBackgroundOpacity(opacity)
                applyStyle({
                  backgroundOpacity: opacity,
                })
              }}
              onClose={() => setActiveStylePopup(null)}
            />
          </div>,
          document.body
        )}

      {activeStylePopup === 'highlight' &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[99999]"
            style={{
              top: popupPosition.top,
              left: popupPosition.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <SimpleColorPopup
              color={highlightColor}
              onColorChange={(color) => {
                setHighlightColor(color)
                applyStyle({
                  textShadow: `0 0 10px ${color}`,
                  // 또는 배경색으로 형광펜 효과
                  // backgroundColor: `${color}88` // 50% 투명도
                })
              }}
              onClose={() => setActiveStylePopup(null)}
            />
          </div>,
          document.body
        )}

      {activeStylePopup === 'shadow' &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[99999]"
            style={{
              top: popupPosition.top,
              left: popupPosition.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <SimpleColorPopup
              color={shadowColor}
              onColorChange={(color) => {
                setShadowColor(color)
                applyStyle({
                  textShadow: `2px 2px 4px ${color}`,
                })
              }}
              onClose={() => setActiveStylePopup(null)}
            />
          </div>,
          document.body
        )}
    </>
  )
}
