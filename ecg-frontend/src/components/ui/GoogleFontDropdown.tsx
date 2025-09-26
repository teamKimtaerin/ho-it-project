'use client'

import { ChevronDownIcon } from '@/components/icons'
import { cn } from '@/utils'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { LuSearch, LuLoader } from 'react-icons/lu'
import {
  googleFontsService,
  type GoogleFont,
} from '@/services/fonts/googleFontsService'

export interface GoogleFontDropdownProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
  size?: 'small' | 'medium' | 'large'
  variant?: 'default' | 'toolbar'
}

export default function GoogleFontDropdown({
  value = '',
  onChange,
  className,
  size = 'medium',
  variant = 'default',
}: GoogleFontDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [fonts, setFonts] = useState<GoogleFont[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [, setPage] = useState(1)
  const pageRef = useRef(1)
  const [error, setError] = useState<string | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  // Scroll container + sentinel for infinite scroll
  const listRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const hasMoreRef = useRef(true)

  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  })

  // Debounced search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Loading state ref to prevent race conditions
  const loadingRef = useRef(false)

  // Size classes
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

  // Load fonts function
  const loadFonts = useCallback(
    async (reset = false) => {
      if (loadingRef.current) return

      loadingRef.current = true
      setLoading(true)
      setError(null)

      const requestPage = reset ? 1 : pageRef.current

      try {
        const result = await googleFontsService.fetchFonts({
          page: requestPage,
          search: searchQuery,
        })

        if (reset) {
          setFonts(result.fonts)
          setPage(2)
          pageRef.current = 2
        } else {
          setFonts((prev) => [...prev, ...result.fonts])
          setPage((prev) => {
            const next = prev + 1
            pageRef.current = next
            return next
          })
        }

        setHasMore(result.hasMore)
        hasMoreRef.current = result.hasMore
      } catch (err) {
        setError('Failed to load fonts')
        console.error('Font loading error:', err)
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [searchQuery]
  )

  // Load initial fonts (once)
  useEffect(() => {
    loadFonts(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load fallback fonts if Google Fonts API fails
  useEffect(() => {
    if (error && fonts.length === 0) {
      const fallbackFonts = googleFontsService.getFallbackFonts()
      setFonts(fallbackFonts)
      setError(null) // Clear error since we have fallback fonts
      setHasMore(false) // No more fonts to load from fallback
      hasMoreRef.current = false
    }
  }, [error, fonts.length])

  // Menu position calculation
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 300),
      })

      // Focus search input
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Outside click detection
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

  // (infinite scroll handled by IntersectionObserver)

  // Intersection Observer for infinite scroll (observe sentinel within list container)
  useEffect(() => {
    if (!isOpen) return

    // Clean up existing observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    // If no more items, no need to observe
    if (!hasMoreRef.current) return

    // Create observer with the list container as root to avoid viewport flicker
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !loadingRef.current && hasMoreRef.current) {
          loadFonts(false)
        }
      },
      {
        root: listRef.current || null,
        rootMargin: '100px', // Prefetch slightly before reaching the end
        threshold: 0,
      }
    )

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [isOpen, loadFonts, fonts.length, hasMore])

  // If the first page doesn't fill the container, fetch more until it does (or no more)
  useEffect(() => {
    if (!isOpen) return
    const listEl = listRef.current
    if (!listEl) return

    const notScrollable = listEl.scrollHeight <= listEl.clientHeight + 8
    if (notScrollable && hasMoreRef.current && !loadingRef.current) {
      loadFonts(false)
    }
  }, [isOpen, fonts.length, loadFonts])

  // Handle search with debouncing
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query)

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      searchTimeoutRef.current = setTimeout(() => {
        setPage(1)
        setHasMore(true)
        hasMoreRef.current = true
        loadFonts(true)
      }, 300)
    },
    [loadFonts]
  )

  // Handle font selection
  const handleFontSelect = async (font: GoogleFont) => {
    // Preload font if from Google Fonts
    if (font.files.regular || Object.values(font.files)[0]) {
      try {
        await googleFontsService.preloadFont(font)
      } catch {
        console.warn('Failed to preload font:', font.family)
      }
    }

    onChange?.(font.family)
    setIsOpen(false)
    setSearchQuery('')
  }

  // Handle font hover for preview
  const handleFontHover = async (font: GoogleFont) => {
    if (!googleFontsService.isFontLoaded(font.family)) {
      try {
        await googleFontsService.preloadFont(font)
      } catch {
        // Silently fail on hover
      }
    }
  }

  // Find selected font in current fonts list (may not exist if not loaded yet)
  const selectedFont = fonts.find((font) => font.family === value)

  // Display value directly if font not found in current list
  const displayFontFamily = selectedFont?.family || value
  const shouldShowFontStyle =
    selectedFont && googleFontsService.isFontLoaded(selectedFont.family)

  // Trigger classes
  const triggerClasses = cn(
    'relative w-full flex items-center justify-between rounded-default border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 cursor-pointer',
    sizeClasses.trigger,

    variant === 'toolbar'
      ? [
          'border-2 bg-slate-700/90',
          'border-slate-500/70 focus:ring-blue-200',
          'hover:border-slate-400 hover:shadow-sm hover:bg-slate-600/90',
          selectedFont ? 'text-white' : 'text-slate-300',
        ]
      : [
          'border-2 bg-white/95',
          'border-slate-300 focus:ring-blue-200',
          'hover:border-slate-400 hover:shadow-sm hover:bg-gray-50',
          selectedFont ? 'text-black' : 'text-gray-600',
        ],

    className
  )

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
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-600">
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search fonts..."
              className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-500/50 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Font List */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto dropdown-scrollbar"
        >
          {error && (
            <div className="px-4 py-6 text-center text-red-400">
              <p>{error}</p>
              <button
                onClick={() => loadFonts(true)}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {fonts.length === 0 && !loading && !error && (
            <div className="px-4 py-6 text-center text-slate-400">
              {searchQuery ? 'No fonts found' : 'No fonts available'}
            </div>
          )}

          {fonts.map((font) => (
            <div
              key={font.family}
              className="px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-slate-700/30 last:border-b-0"
              onClick={() => handleFontSelect(font)}
              onMouseEnter={() => handleFontHover(font)}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-white text-base truncate"
                  style={{
                    fontFamily: googleFontsService.isFontLoaded(font.family)
                      ? font.family
                      : 'inherit',
                  }}
                >
                  {font.family}
                </span>
                <span className="text-slate-400 text-xs ml-2 flex-shrink-0">
                  {font.category}
                </span>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="px-4 py-4 text-center">
              <LuLoader className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
              <p className="text-slate-400 text-sm mt-2">Loading fonts...</p>
            </div>
          )}

          {/* Sentinel for infinite scroll. Always render to keep observer stable */}
          <div ref={sentinelRef} className="h-4" aria-hidden />

          {/* End of list indicator */}
          {!hasMore && fonts.length > 0 && !loading && (
            <div className="px-4 py-3 text-center text-slate-500 text-sm border-t border-slate-700/30">
              No more fonts to load
            </div>
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
          style={{
            fontFamily: shouldShowFontStyle ? displayFontFamily : 'inherit',
          }}
        >
          {displayFontFamily || 'Select font'}
        </span>
        <ChevronDownIcon
          className={cn(
            'w-4 h-4 transition-transform duration-200 flex-shrink-0 ml-2',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Portal rendered dropdown menu */}
      {menuContainer && createPortal(menuContent, menuContainer)}
    </div>
  )
}
