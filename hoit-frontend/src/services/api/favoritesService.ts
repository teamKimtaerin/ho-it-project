/**
 * 사용자 즐겨찾기 API 서비스
 * AWS RDS PostgreSQL을 통한 즐겨찾기 CRUD 작업
 */

import { useAuthStore } from '@/lib/store/authStore'

// API 기본 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// 즐겨찾기 API 응답 타입
export interface FavoriteItem {
  id: number
  user_id: number
  plugin_key: string
  created_at: string
  updated_at: string
}

export interface FavoritesResponse {
  favorites: FavoriteItem[]
  total: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

/**
 * 공통 요청 헤더 생성
 */
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // 인증 토큰 추가
  const { token } = useAuthStore.getState()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

/**
 * 공통 API 요청 핸들러
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
      credentials: 'include', // 쿠키 포함
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || data.message || '요청 처리에 실패했습니다.',
      }
    }

    return {
      success: true,
      data: data,
    }
  } catch (error) {
    console.error(`API request failed [${endpoint}]:`, error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '네트워크 오류가 발생했습니다.',
    }
  }
}

export class FavoritesService {
  /**
   * 사용자의 즐겨찾기 목록 조회
   */
  static async getFavorites(): Promise<ApiResponse<FavoritesResponse>> {
    console.log('🔍 Fetching user favorites...')

    const result = await apiRequest<FavoritesResponse>('/api/v1/favorites', {
      method: 'GET',
    })

    if (result.success) {
      console.log('✅ Favorites fetched:', result.data?.total || 0, 'items')
    } else {
      console.error('❌ Failed to fetch favorites:', result.error)
    }

    return result
  }

  /**
   * 즐겨찾기 추가
   */
  static async addFavorite(
    pluginKey: string
  ): Promise<ApiResponse<FavoriteItem>> {
    console.log('❤️ Adding favorite:', pluginKey)

    const result = await apiRequest<FavoriteItem>('/api/v1/favorites', {
      method: 'POST',
      body: JSON.stringify({ plugin_key: pluginKey }),
    })

    if (result.success) {
      console.log('✅ Favorite added:', pluginKey)
    } else {
      console.error('❌ Failed to add favorite:', result.error)
    }

    return result
  }

  /**
   * 즐겨찾기 제거
   */
  static async removeFavorite(
    pluginKey: string
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    console.log('💔 Removing favorite:', pluginKey)

    const result = await apiRequest<{ deleted: boolean }>('/api/v1/favorites', {
      method: 'DELETE',
      body: JSON.stringify({ plugin_key: pluginKey }),
    })

    if (result.success) {
      console.log('✅ Favorite removed:', pluginKey)
    } else {
      console.error('❌ Failed to remove favorite:', result.error)
    }

    return result
  }

  /**
   * 특정 플러그인의 즐겨찾기 상태 확인
   */
  static async isFavorite(pluginKey: string): Promise<boolean> {
    const result = await this.getFavorites()

    if (result.success && result.data) {
      return result.data.favorites.some((fav) => fav.plugin_key === pluginKey)
    }

    return false
  }

  /**
   * 즐겨찾기 토글 (추가/제거)
   */
  static async toggleFavorite(
    pluginKey: string
  ): Promise<ApiResponse<{ is_favorite: boolean }>> {
    console.log('🔄 Toggling favorite:', pluginKey)

    // 백엔드의 toggle 엔드포인트 사용
    const result = await apiRequest<{ is_favorite: boolean; message: string }>(
      '/api/v1/favorites/toggle',
      {
        method: 'POST',
        body: JSON.stringify({ plugin_key: pluginKey }),
      }
    )

    if (result.success && result.data) {
      console.log('✅ Favorite toggled:', result.data.message)
      return {
        success: true,
        data: { is_favorite: result.data.is_favorite },
      }
    } else {
      console.error('❌ Failed to toggle favorite:', result.error)
      return {
        success: false,

        error: result.error,
      }
    }
  }

  /**
   * 사용자의 즐겨찾기 플러그인 키 목록만 반환
   */
  static async getFavoritePluginKeys(): Promise<string[]> {
    const result = await this.getFavorites()

    if (result.success && result.data) {
      return result.data.favorites.map((fav) => fav.plugin_key)
    }

    return []
  }
}

export default FavoritesService
