'use client'

import { useAuth } from './useAuth'

export const useAuthStatus = () => {
  const { user, isLoading, logout: authLogout, isAuthenticated } = useAuth()

  const logout = () => {
    authLogout()
  }

  return {
    isLoggedIn: isAuthenticated,
    user,
    isLoading,
    logout,
  }
}
