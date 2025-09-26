'use client'

import { ChevronDownIcon } from '@/components/icons'
import { cn } from '@/utils'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuSearch, LuStar } from 'react-icons/lu'

export interface FontOption {
  value: string
  label: string
  category: 'gothic' | 'serif' | 'handwriting' | 'rounded' | 'other'
  disabled?: boolean
  keywords?: string[] // 검색용 키워드
}

export interface FontDropdownProps {
  value?: string
  options: FontOption[]
  onChange?: (value: string) => void
  className?: string
  size?: 'small' | 'medium' | 'large'
  variant?: 'default' | 'toolbar'
}

// 로컬 스토리지 키
const RECENT_FONTS_KEY = 'ecg-recent-fonts'
const FAVORITE_FONTS_KEY = 'ecg-favorite-fonts'

export default function FontDropdown({
  value = '',
  options,
  onChange,
  className,
  size = 'medium',
  variant = 'default',
}: FontDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'gothic' | 'serif' | 'handwriting' | 'rounded'
  >('all')
  const [recentFonts, setRecentFonts] = useState<string[]>([])
  const [favoriteFonts, setFavoriteFonts] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'free' | 'favorite'>('free')

  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  })

  // 선택된 옵션 찾기
  const selectedOption = options.find((option) => option.value === value)

  // 사이즈별 클래스
  const sizeClasses = {
    small: {
      trigger: 'h-8 text-sm px-3',
      menu: 'text-sm',
      option: 'px-3 py-1.5',
    },
    medium: {
      trigger: 'h-10 text-base px-3',
      menu: 'text-base',
      option: 'px-3 py-2',
    },
    large: {
      trigger: 'h-12 text-lg px-4',
      menu: 'text-lg',
      option: 'px-4 py-2.5',
    },
  }[size]

  // 초기 데이터 로드
  useEffect(() => {
    try {
      const recent = JSON.parse(localStorage.getItem(RECENT_FONTS_KEY) || '[]')
      const favorites = JSON.parse(
        localStorage.getItem(FAVORITE_FONTS_KEY) || '[]'
      )
      setRecentFonts(recent)
      setFavoriteFonts(new Set(favorites))
    } catch (error) {
      console.error('Failed to load font preferences:', error)
    }
  }, [])

  // 메뉴 위치 계산
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 400), // 최소 너비 400px
      })

      // 검색창에 포커스
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (
        isOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // 즐겨찾기 토글
  const toggleFavorite = (fontValue: string) => {
    setFavoriteFonts((prev) => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(fontValue)) {
        newFavorites.delete(fontValue)
      } else {
        newFavorites.add(fontValue)
      }

      // 로컬 스토리지 업데이트
      try {
        localStorage.setItem(
          FAVORITE_FONTS_KEY,
          JSON.stringify([...newFavorites])
        )
      } catch (error) {
        console.error('Failed to save favorite fonts:', error)
      }

      return newFavorites
    })
  }

  // 최근 사용 폰트 업데이트
  const updateRecentFonts = (fontValue: string) => {
    setRecentFonts((prev) => {
      const newRecent = [
        fontValue,
        ...prev.filter((f) => f !== fontValue),
      ].slice(0, 3)

      // 로컬 스토리지 업데이트
      try {
        localStorage.setItem(RECENT_FONTS_KEY, JSON.stringify(newRecent))
      } catch (error) {
        console.error('Failed to save recent fonts:', error)
      }

      return newRecent
    })
  }

  // 폰트 선택 핸들러
  const handleFontSelect = (fontValue: string) => {
    onChange?.(fontValue)
    updateRecentFonts(fontValue)
    setIsOpen(false)
    setSearchQuery('')
  }

  // 검색 필터링
  const filterFontsBySearch = (fonts: FontOption[]) => {
    if (!searchQuery) return fonts

    const query = searchQuery.toLowerCase()
    return fonts.filter((font) => {
      const labelMatch = font.label.toLowerCase().includes(query)
      const keywordMatch = font.keywords?.some((keyword) =>
        keyword.toLowerCase().includes(query)
      )
      return labelMatch || keywordMatch
    })
  }

  // 카테고리별 필터링
  const filterFontsByCategory = (fonts: FontOption[]) => {
    if (activeCategory === 'all') return fonts
    return fonts.filter((font) => font.category === activeCategory)
  }

  // 표시할 폰트 목록 계산
  const getDisplayFonts = () => {
    if (activeTab === 'favorite') {
      const favoriteOptions = options.filter((option) =>
        favoriteFonts.has(option.value)
      )
      return filterFontsBySearch(favoriteOptions)
    }

    const categoryFiltered = filterFontsByCategory(options)
    return filterFontsBySearch(categoryFiltered)
  }

  const displayFonts = getDisplayFonts()
  const recentFontOptions = recentFonts
    .map((fontValue) => options.find((opt) => opt.value === fontValue))
    .filter(Boolean) as FontOption[]

  // 트리거 클래스
  const triggerClasses = cn(
    'relative w-full flex items-center justify-between rounded-default border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 cursor-pointer',
    sizeClasses.trigger,

    variant === 'toolbar'
      ? [
          'border-2 bg-slate-700/90',
          'border-slate-500/70 focus:ring-blue-200',
          'hover:border-slate-400 hover:shadow-sm hover:bg-slate-600/90',
          selectedOption ? 'text-white' : 'text-slate-300',
        ]
      : [
          'border-2 bg-white/95',
          'border-slate-300 focus:ring-blue-200',
          'hover:border-slate-400 hover:shadow-sm hover:bg-gray-50',
          selectedOption ? 'text-black' : 'text-gray-600',
        ],

    className
  )

  // 메뉴가 렌더링될 컨테이너
  const menuContainer = typeof document !== 'undefined' ? document.body : null

  const menuContent =
    isOpen && menuContainer ? (
      <div
        ref={menuRef}
        className="fixed bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg shadow-2xl max-h-96 overflow-hidden"
        style={{
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
          zIndex: 99999,
        }}
      >
        {/* 검색창 */}
        <div className="p-4 border-b border-slate-600/50">
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="폰트 이름을 입력해주세요"
              className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-500/50 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* 메인 탭 네비게이션 */}
        <div className="flex border-b border-slate-600/50">
          <button
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2',
              activeTab === 'free'
                ? 'text-cyan-400 border-cyan-400 bg-slate-700/30'
                : 'text-slate-400 hover:text-slate-300 border-transparent hover:bg-slate-700/20'
            )}
            onClick={() => setActiveTab('free')}
          >
            무료 폰트
          </button>
          <button
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2',
              activeTab === 'favorite'
                ? 'text-cyan-400 border-cyan-400 bg-slate-700/30'
                : 'text-slate-400 hover:text-slate-300 border-transparent hover:bg-slate-700/20'
            )}
            onClick={() => setActiveTab('favorite')}
          >
            즐겨찾는 폰트
          </button>
        </div>

        {/* 무료 폰트 탭의 카테고리 버튼들 */}
        {activeTab === 'free' && (
          <div className="p-3 border-b border-slate-600/50">
            <div className="flex flex-wrap gap-2">
              <button
                className={cn(
                  'px-3 py-1.5 text-sm rounded-full border transition-all',
                  activeCategory === 'all'
                    ? 'bg-cyan-500 text-white border-cyan-500'
                    : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600 hover:border-slate-500'
                )}
                onClick={() => setActiveCategory('all')}
              >
                모든 폰트
              </button>
              {[
                { key: 'gothic', label: '고딕' },
                { key: 'serif', label: '명조' },
                { key: 'handwriting', label: '손글씨' },
                { key: 'rounded', label: '라운드' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-full border transition-all',
                    activeCategory === key
                      ? 'bg-slate-600 text-white border-slate-500'
                      : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600 hover:border-slate-500'
                  )}
                  onClick={() =>
                    setActiveCategory(
                      key as 'gothic' | 'serif' | 'handwriting' | 'rounded'
                    )
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 폰트 목록 */}
        <div className="max-h-80 overflow-y-auto dropdown-scrollbar">
          {activeTab === 'free' ? (
            <>
              {/* 최근 사용한 폰트 */}
              {recentFontOptions.length > 0 && (
                <>
                  <div className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700/20 border-b border-slate-600/30">
                    최근 사용한 폰트
                  </div>
                  {recentFontOptions.map((font) => (
                    <div
                      key={`recent-${font.value}`}
                      className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors"
                      onClick={() => handleFontSelect(font.value)}
                    >
                      <span
                        className="text-white text-base"
                        style={{ fontFamily: font.value }}
                      >
                        {font.label}
                      </span>
                      <button
                        className="ml-auto p-1 opacity-0 hover:opacity-100 hover:bg-slate-600/50 rounded transition-all"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(font.value)
                        }}
                      >
                        <LuStar
                          className={cn(
                            'w-4 h-4',
                            favoriteFonts.has(font.value)
                              ? 'text-yellow-400 fill-current'
                              : 'text-slate-400'
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </>
              )}

              {/* 한국어 무료 폰트 */}
              <div className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700/20 border-b border-slate-600/30">
                한국어 무료 폰트
              </div>
              {displayFonts.length > 0 ? (
                displayFonts.map((font) => (
                  <div
                    key={font.value}
                    className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors"
                    onClick={() => handleFontSelect(font.value)}
                  >
                    <span
                      className="text-white text-base"
                      style={{ fontFamily: font.value }}
                    >
                      {font.label}
                    </span>
                    <button
                      className="ml-auto p-1 opacity-0 hover:opacity-100 hover:bg-slate-600/50 rounded transition-all"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(font.value)
                      }}
                    >
                      <LuStar
                        className={cn(
                          'w-4 h-4',
                          favoriteFonts.has(font.value)
                            ? 'text-yellow-400 fill-current'
                            : 'text-slate-400'
                        )}
                      />
                    </button>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-slate-400">
                  {searchQuery ? '검색 결과가 없습니다' : '폰트가 없습니다'}
                </div>
              )}
            </>
          ) : (
            /* 즐겨찾는 폰트 탭 - 별표 없이 깔끔하게 */
            <>
              {displayFonts.length > 0 ? (
                displayFonts.map((font) => (
                  <div
                    key={font.value}
                    className="px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors"
                    onClick={() => handleFontSelect(font.value)}
                  >
                    <span
                      className="text-white text-base"
                      style={{ fontFamily: font.value }}
                    >
                      {font.label}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-slate-400">
                  {searchQuery
                    ? '검색 결과가 없습니다'
                    : '즐겨찾는 폰트가 없습니다'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    ) : null

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        className={triggerClasses}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span
          className="truncate"
          style={{ fontFamily: selectedOption?.value || 'inherit' }}
        >
          {selectedOption?.label || '폰트 선택'}
        </span>
        <ChevronDownIcon
          className={cn(
            'w-4 h-4 transition-transform duration-200 flex-shrink-0 ml-2',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Portal로 렌더링된 드롭다운 메뉴 */}
      {menuContainer && createPortal(menuContent, menuContainer)}
    </div>
  )
}
