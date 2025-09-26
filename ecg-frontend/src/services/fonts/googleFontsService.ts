export interface GoogleFont {
  family: string
  variants: string[]
  files: { [variant: string]: string }
  subsets: string[]
  category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace'
}

export interface GoogleFontsResponse {
  kind: string
  items: GoogleFont[]
}

export interface FetchFontsParams {
  page?: number
  search?: string
  subset?: 'korean' | 'latin'
}

export interface FetchFontsResult {
  fonts: GoogleFont[]
  hasMore: boolean
  totalCount: number
}

class GoogleFontsService {
  private apiKey: string
  private baseUrl = 'https://www.googleapis.com/webfonts/v1/webfonts'
  private fontsCache: GoogleFont[] = []
  private loadedFonts = new Set<string>()
  private pageSize = 20
  private lastFetchTime = 0
  private cacheValidTime = 5 * 60 * 1000 // 5 minutes cache

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY || ''
    if (!this.apiKey) {
      console.warn('Google Fonts API key not found. Using fallback fonts only.')
    }
  }

  /**
   * Fetch fonts from Google Fonts API with pagination
   */
  async fetchFonts(params: FetchFontsParams = {}): Promise<FetchFontsResult> {
    const { page = 1, search = '' } = params

    try {
      // If no API key, return fallback fonts
      if (!this.apiKey) {
        console.warn(
          'Google Fonts API key not found. Using fallback fonts only.'
        )
        const fallbackFonts = this.getFallbackFonts()
        return {
          fonts: fallbackFonts,
          hasMore: false,
          totalCount: fallbackFonts.length,
        }
      }

      // Use cache if available and not searching
      const now = Date.now()
      if (
        !search &&
        this.fontsCache.length > 0 &&
        now - this.lastFetchTime < this.cacheValidTime
      ) {
        const fonts = this.sortFontsWithKoreanPriority(this.fontsCache)
        const startIndex = (page - 1) * this.pageSize
        const endIndex = startIndex + this.pageSize
        const paginatedFonts = fonts.slice(startIndex, endIndex)
        const hasMore = endIndex < fonts.length

        return {
          fonts: paginatedFonts,
          hasMore,
          totalCount: fonts.length,
        }
      }

      // Build URL with parameters
      const url = new URL(this.baseUrl)
      url.searchParams.set('key', this.apiKey)
      // Do NOT limit subsets here; fetch full catalog and prioritize Korean in sorting
      if (search) {
        url.searchParams.set('sort', 'popularity') // Sort by popularity for search results
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Google Fonts API error details:', {
          status: response.status,
          statusText: response.statusText,
          url: url.toString(),
          errorBody: errorText,
        })
        throw new Error(
          `Google Fonts API error: ${response.status} - ${response.statusText}`
        )
      }

      const data: GoogleFontsResponse = await response.json()
      let fonts = data.items || []

      // Cache the raw fonts data if not searching
      if (!search) {
        this.fontsCache = fonts
        this.lastFetchTime = Date.now()
      }

      // Filter by search query if provided
      if (search) {
        const searchLower = search.toLowerCase()
        fonts = fonts.filter((font) =>
          font.family.toLowerCase().includes(searchLower)
        )
      }

      // Sort fonts with Korean fonts prioritized
      fonts = this.sortFontsWithKoreanPriority(fonts)

      // Calculate pagination
      const startIndex = (page - 1) * this.pageSize
      const endIndex = startIndex + this.pageSize
      const paginatedFonts = fonts.slice(startIndex, endIndex)
      const hasMore = endIndex < fonts.length

      return {
        fonts: paginatedFonts,
        hasMore,
        totalCount: fonts.length,
      }
    } catch (error) {
      console.error('Failed to fetch Google Fonts:', error)
      // Return fallback fonts when API fails
      const fallbackFonts = this.getFallbackFonts()
      return {
        fonts: fallbackFonts,
        hasMore: false,
        totalCount: fallbackFonts.length,
      }
    }
  }

  /**
   * Load a font using FontFace API
   */
  async loadFontWithFontFace(
    fontFamily: string,
    fontUrl: string
  ): Promise<void> {
    try {
      // Skip if already loaded
      if (this.loadedFonts.has(fontFamily)) {
        return
      }

      // Check if font is already available in the browser
      if (document.fonts.check(`12px "${fontFamily}"`)) {
        this.loadedFonts.add(fontFamily)
        return
      }

      // Load font using FontFace API
      const font = new FontFace(fontFamily, `url(${fontUrl})`)
      await font.load()
      document.fonts.add(font)
      this.loadedFonts.add(fontFamily)

      console.log(`Font loaded successfully: ${fontFamily}`)
    } catch (error) {
      console.error(`Failed to load font ${fontFamily}:`, error)
    }
  }

  /**
   * Preload a font for immediate use
   */
  async preloadFont(font: GoogleFont): Promise<void> {
    const fontUrl =
      font.files.regular || font.files['400'] || Object.values(font.files)[0]
    if (fontUrl) {
      await this.loadFontWithFontFace(font.family, fontUrl)
    }
  }

  /**
   * Check if a font is already loaded
   */
  isFontLoaded(fontFamily: string): boolean {
    return (
      this.loadedFonts.has(fontFamily) ||
      document.fonts.check(`12px "${fontFamily}"`)
    )
  }

  /**
   * Sort fonts with Korean fonts prioritized at the top
   */
  private sortFontsWithKoreanPriority(fonts: GoogleFont[]): GoogleFont[] {
    // Common Korean font names that should be prioritized
    const koreanFontNames = [
      'Noto Sans Korean',
      'Noto Serif Korean',
      'Nanum Gothic',
      'Nanum Myeongjo',
      'Nanum Brush Script',
      'Nanum Pen Script',
      'Nanum Gothic Coding',
      'Black Han Sans',
      'Dokdo',
      'East Sea Dokdo',
      'Gamja Flower',
      'Gaegu',
      'Gugi',
      'Hahmlet',
      'Hi Melody',
      'Jua',
      'Kirang Haerang',
      'Song Myung',
      'Stylish',
      'Sunflower',
      'Yeon Sung',
      'Cute Font',
      'Do Hyeon',
      'Gowun Batang',
      'Gowun Dodum',
      'Gothic A1',
      'IBM Plex Sans KR',
      'Poor Story',
      'Single Day',
      'Bagel Fat One',
    ]

    const isKoreanFont = (font: GoogleFont): boolean => {
      return (
        font.subsets.includes('korean') ||
        koreanFontNames.some((kName) =>
          font.family.toLowerCase().includes(kName.toLowerCase())
        )
      )
    }

    // Separate Korean and non-Korean fonts
    const koreanFonts = fonts.filter(isKoreanFont)
    const otherFonts = fonts.filter((font) => !isKoreanFont(font))

    // Sort Korean fonts by popularity (they should already be sorted by API)
    // Then append other fonts
    return [...koreanFonts, ...otherFonts]
  }

  /**
   * Get fallback fonts when Google Fonts API is unavailable
   */
  getFallbackFonts(): GoogleFont[] {
    return [
      // Korean system fonts first
      {
        family: '맑은 고딕',
        variants: ['regular', 'bold'],
        files: { regular: '', bold: '' },
        subsets: ['korean', 'latin'],
        category: 'sans-serif',
      },
      {
        family: '돋움',
        variants: ['regular', 'bold'],
        files: { regular: '', bold: '' },
        subsets: ['korean', 'latin'],
        category: 'sans-serif',
      },
      {
        family: '굴림',
        variants: ['regular', 'bold'],
        files: { regular: '', bold: '' },
        subsets: ['korean', 'latin'],
        category: 'sans-serif',
      },
      {
        family: '바탕',
        variants: ['regular', 'bold'],
        files: { regular: '', bold: '' },
        subsets: ['korean', 'latin'],
        category: 'serif',
      },
      // English system fonts
      {
        family: 'Arial',
        variants: ['regular', 'bold'],
        files: { regular: '', bold: '' },
        subsets: ['latin'],
        category: 'sans-serif',
      },
      {
        family: 'Helvetica',
        variants: ['regular', 'bold'],
        files: { regular: '', bold: '' },
        subsets: ['latin'],
        category: 'sans-serif',
      },
      {
        family: 'Times New Roman',
        variants: ['regular', 'bold'],
        files: { regular: '', bold: '' },
        subsets: ['latin'],
        category: 'serif',
      },
      {
        family: 'Georgia',
        variants: ['regular', 'bold'],
        files: { regular: '', bold: '' },
        subsets: ['latin'],
        category: 'serif',
      },
      {
        family: 'Courier New',
        variants: ['regular', 'bold'],
        files: { regular: '', bold: '' },
        subsets: ['latin'],
        category: 'monospace',
      },
    ]
  }
}

// Export singleton instance
export const googleFontsService = new GoogleFontsService()
