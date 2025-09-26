interface SignupRequest {
  username: string
  email: string
  password: string
}

interface LoginRequest {
  email: string
  password: string
}

interface User {
  id: number
  username: string
  email: string
  auth_provider: string
  is_active: boolean
  is_verified: boolean
  created_at: string
}

interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

import { API_CONFIG } from '@/config/api.config'

// 개발 환경에서는 프록시 경로 사용 (CORS 문제 해결)
const BASE_URL =
  process.env.NODE_ENV === 'development'
    ? '' // 프록시 사용 (next.config.ts의 rewrites)
    : API_CONFIG.FASTAPI_BASE_URL

export class AuthAPI {
  private static getHeaders(token?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  static async signup(data: SignupRequest): Promise<AuthResponse> {
    console.log('🔍 Auth signup request:', {
      data,
      baseUrl: BASE_URL,
      fullUrl: `${BASE_URL}/api/auth/signup`,
      environment: process.env.NODE_ENV,
    })

    try {
      const response = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
        credentials: 'include', // HttpOnly 쿠키를 받기 위해 필요
      })

      console.log('🔍 Auth signup response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Signup error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        })

        if (response.status === 422) {
          // 유효성 검사 오류 상세 메시지 표시
          let message = '입력 데이터가 올바르지 않습니다.'

          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              message = errorData.detail
                .map(
                  (err: { msg?: string; message?: string }) =>
                    err.msg || err.message || '유효성 검사 실패'
                )
                .join('\n')
            } else {
              message = errorData.detail
            }
          } else if (errorData.message) {
            message = errorData.message
          }

          throw new Error(message)
        }

        throw new Error(
          errorData.detail ||
            errorData.message ||
            '회원가입 중 오류가 발생했습니다.'
        )
      }

      return response.json()
    } catch (error) {
      // CORS나 네트워크 에러 처리
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ Network/CORS error:', error)
        throw new Error(
          '서버에 연결할 수 없습니다. 네트워크 상태를 확인하거나 개발 서버를 다시 시작해주세요.'
        )
      }
      throw error
    }
  }

  static async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || '로그인 중 오류가 발생했습니다.')
    }

    return response.json()
  }

  static async getCurrentUser(token?: string): Promise<User | null> {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: token
        ? this.getHeaders(token)
        : { 'Content-Type': 'application/json' },
      credentials: 'include', // HttpOnly 쿠키 포함
    })

    if (response.status === 401 || response.status === 403) {
      // 비로그인 상태는 에러로 취급하지 않고 null 반환
      return null
    }

    if (!response.ok) {
      let message = '사용자 정보를 가져오는데 실패했습니다.'

      try {
        const errorData = await response.json()
        message = errorData.detail || errorData.message || message
      } catch (error) {
        // JSON 파싱 실패 시 기본 메시지 유지
        console.error('❌ getCurrentUser error payload parsing failed:', error)
      }

      throw new Error(message)
    }

    return response.json()
  }

  static getGoogleLoginUrl(): string {
    return `${BASE_URL}/api/auth/google/login`
  }
}

export type { AuthResponse, LoginRequest, SignupRequest, User }
