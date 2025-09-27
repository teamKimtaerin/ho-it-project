import { useAuthStore } from '@/lib/store/authStore'
import { AuthAPI } from '@/lib/api/auth'
import { useEffect } from 'react'

/**
 * 인증 관련 기능을 제공하는 커스텀 훅
 */
export const useAuth = () => {
  const store = useAuthStore()

  // 앱 시작 시 인증 상태 복원 (토큰 또는 쿠키 기반)
  useEffect(() => {
    if (!store.hasAuthChecked && !store.isLoading) {
      // 아직 인증 상태를 확인하지 않았다면 최초 1회만 시도
      console.log('🔍 useAuth: Attempting to restore auth state')
      store.getCurrentUser()
    }
  }, [store.hasAuthChecked, store.isLoading])

  return {
    // 상태
    user: store.user,
    token: store.token,
    isLoading: store.isLoading,
    error: store.error,
    isAuthenticated: store.isAuthenticated,
    hasAuthChecked: store.hasAuthChecked,

    // 액션
    signup: store.signup,
    login: store.login,
    logout: store.logout,
    clearError: store.clearError,
    getCurrentUser: store.getCurrentUser,
    getGoogleLoginUrl: () => AuthAPI.getGoogleLoginUrl(),
  }
}

/**
 * 로그인이 필요한 페이지에서 사용하는 훅
 * 로그인되지 않은 경우 리다이렉트 로직을 포함할 수 있음
 */
export const useRequireAuth = () => {
  const auth = useAuth()

  return {
    ...auth,
    // 추후 리다이렉트 로직 추가 가능
    requireAuth: () => {
      if (!auth.isAuthenticated) {
        // 로그인 페이지로 리다이렉트 또는 모달 열기
        console.warn('로그인이 필요합니다.')
      }
    },
  }
}
