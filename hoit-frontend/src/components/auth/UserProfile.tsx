'use client'

import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

interface UserProfileProps {
  onLogin?: () => void
  className?: string
}

const UserProfile: React.FC<UserProfileProps> = ({ onLogin, className }) => {
  const { user, isAuthenticated, logout, isLoading } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  if (isLoading) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant="secondary"
          style="outline"
          size="small"
          onClick={onLogin}
        >
          로그인
        </Button>
      </div>
    )
  }

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleLogout = () => {
    logout()
    setIsMenuOpen(false)
  }

  return (
    <div className={`relative flex items-center gap-3 ${className}`}>
      {/* 사용자 정보 */}
      <div className="hidden md:block text-right">
        <div className="text-sm font-medium text-white">{user.username}</div>
        <div className="text-xs text-gray-400">{user.email}</div>
      </div>

      {/* 사용자 아바타 & 메뉴 */}
      <div className="relative">
        <button
          onClick={handleMenuToggle}
          className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-800 cursor-pointer transition-colors"
        >
          {/* 아바타 */}
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {user.username.charAt(0).toUpperCase()}
          </div>
          {/* 모바일에서 사용자명 */}
          <span className="md:hidden text-sm font-medium text-white">
            {user.username}
          </span>
        </button>

        {/* 드롭다운 메뉴 */}
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
            <button
              onClick={() => {
                console.log('프로필 페이지로 이동')
                setIsMenuOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              프로필
            </button>
            <button
              onClick={() => {
                console.log('설정 페이지로 이동')
                setIsMenuOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              설정
            </button>
            <hr className="my-1" />
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>

      {/* 메뉴가 열려있을 때 배경 클릭으로 닫기 */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  )
}

export default UserProfile
