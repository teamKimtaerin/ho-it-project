import {
  AuthAPI,
  type LoginRequest,
  type SignupRequest,
  type User,
} from '@/lib/api/auth'
import { create } from 'zustand'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  hasAuthChecked: boolean
}

interface AuthActions {
  signup: (data: SignupRequest) => Promise<void>
  login: (data: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  getCurrentUser: () => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void
  setAuthData: (user: User, token: string | null) => void
  refreshAccessToken: () => Promise<string | null>
}

type AuthStore = AuthState & AuthActions

const useAuthStore = create<AuthStore>()((set, get) => ({
  // State
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  hasAuthChecked: false,

  // Actions
  signup: async (data: SignupRequest) => {
    try {
      set({ isLoading: true, error: null })

      const response = await AuthAPI.signup(data)

      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
        hasAuthChecked: true,
      })
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : '회원가입에 실패했습니다.',
        isLoading: false,
      })
      throw error
    }
  },

  login: async (data: LoginRequest) => {
    try {
      set({ isLoading: true, error: null })

      const response = await AuthAPI.login(data)

      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
        hasAuthChecked: true,
      })
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : '로그인에 실패했습니다.',
        isLoading: false,
      })
      throw error
    }
  },

  logout: async () => {
    try {
      // 서버에 로그아웃 요청 (refresh token 쿠키 삭제)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/logout`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )

      console.log('🚪 Logout API response:', response.ok, response.status)
    } catch (error) {
      console.error('Logout API failed:', error)
    }

    // 클라이언트 상태 즉시 초기화
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
      isLoading: false, // 로그아웃 중 로딩 상태 방지
      hasAuthChecked: true,
    })

    console.log('🚪 Client state reset after logout')
  },

  getCurrentUser: async () => {
    const { token, refreshAccessToken } = get()

    try {
      set({ isLoading: true, error: null })

      const fetchUser = (candidateToken?: string | null) =>
        AuthAPI.getCurrentUser(candidateToken || undefined)

      // 토큰이 있으면 Bearer 인증, 없으면 쿠키 인증 시도
      const user = await AuthAPI.getCurrentUser(token || undefined)

      if (user) {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          hasAuthChecked: true,
        })
      } else {
        // 401/403 에러는 정상적인 비로그인 상태로 처리
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          hasAuthChecked: true,
        })
      }
    } catch (error) {
      console.error('❌ Failed to restore auth state:', error)
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        hasAuthChecked: true,
        error: null, // 사용자에게는 에러를 보여주지 않음
      })
    }
  },

  clearError: () => set({ error: null }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setAuthData: (user: User, token: string | null) => {
    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      hasAuthChecked: true,
    })
  },

  // 새로운 토큰 갱신 기능
  refreshAccessToken: async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/refresh`,
        {
          method: 'POST',
          credentials: 'include', // 쿠키 포함
        }
      )

      if (response.ok) {
        const data = await response.json()
        set({ token: data.access_token, hasAuthChecked: true })
        return data.access_token
      } else {
        // Refresh token 만료 시 로그아웃
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          hasAuthChecked: true,
        })

        return null
      }
    } catch {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: 'Token refresh failed',
        hasAuthChecked: true,
      })
      return null
    }
  },
}))

export { useAuthStore }
export type { AuthStore, User }
