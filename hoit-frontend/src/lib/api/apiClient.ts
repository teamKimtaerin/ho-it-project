import { useAuthStore } from '@/lib/store/authStore'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// API 요청을 위한 인터셉터
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const authStore = useAuthStore.getState()

  // 기본 헤더 설정
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  // access token이 있으면 추가
  if (authStore.token) {
    headers['Authorization'] = `Bearer ${authStore.token}`
  }

  const requestOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, requestOptions)

    // 401 오류 시 토큰 갱신 시도
    if (response.status === 401 && authStore.token) {
      console.log('Access token expired, trying to refresh...')

      const newToken = await authStore.refreshAccessToken()

      if (newToken) {
        // 새 토큰으로 요청 재시도
        headers['Authorization'] = `Bearer ${newToken}`
        const retryOptions: RequestInit = {
          ...options,
          headers,
          credentials: 'include',
        }

        const retryResponse = await fetch(
          `${BASE_URL}${endpoint}`,
          retryOptions
        )
        return retryResponse
      } else {
        // refresh token도 만료된 경우 - 로그인 페이지로 리다이렉트
        window.location.href = '/auth?mode=login'
        throw new Error('Authentication failed')
      }
    }

    return response
  } catch (error) {
    console.error('API request failed:', error)
    throw error
  }
}

// 편의 함수들
export const apiGet = (endpoint: string, options?: RequestInit) =>
  apiRequest(endpoint, { method: 'GET', ...options })

export const apiPost = (
  endpoint: string,
  data?: unknown,
  options?: RequestInit
) =>
  apiRequest(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  })

export const apiPut = (
  endpoint: string,
  data?: unknown,
  options?: RequestInit
) =>
  apiRequest(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  })

export const apiDelete = (endpoint: string, options?: RequestInit) =>
  apiRequest(endpoint, { method: 'DELETE', ...options })
