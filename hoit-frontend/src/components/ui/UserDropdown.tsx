'use client'

import { useAuthStatus } from '@/hooks/useAuthStatus'
import { showToast } from '@/utils/ui/toast'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface UserDropdownProps {
  theme?: 'light' | 'dark'
}

const UserDropdown: React.FC<UserDropdownProps> = ({ theme = 'light' }) => {
  const { user, logout } = useAuthStatus()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [isMounted, setIsMounted] = useState(false)

  // Set mounted state
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Calculate position based on button position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: buttonRect.bottom + 8, // 8px gap below button
        left: buttonRect.left, // Align left edge with button
      })
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Theme-based color classes
  const getTextClasses = () => {
    return theme === 'dark' ? 'text-white' : 'text-gray-700'
  }

  const getHoverClasses = () => {
    return theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
  }

  const getArrowClasses = () => {
    return theme === 'dark' ? 'text-gray-300' : 'text-gray-400'
  }

  const handleLogout = () => {
    logout()
    setIsOpen(false)
    showToast('로그아웃되었습니다.', 'success')
  }

  if (!user) {
    return (
      <div className={`flex items-center text-sm ${getTextClasses()}`}>
        <span>로그인이 필요합니다</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${getHoverClasses()} hover:scale-105 hover:shadow-md transition-all duration-200 cursor-pointer`}
      >
        {/* User Avatar */}
        <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {user.username?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>

        {/* Username */}
        <span className={`text-sm font-medium ${getTextClasses()}`}>
          {user.username}
        </span>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 ${getArrowClasses()} transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu - Portal */}
      {isOpen &&
        isMounted &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] overflow-hidden"
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            {/* User Info Section */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {user.username}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <Link
                href="/mypage"
                className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:scale-105 hover:shadow-sm transition-all duration-200 cursor-pointer"
                onClick={() => setIsOpen(false)}
              >
                <svg
                  className="w-4 h-4 mr-3 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                마이페이지
              </Link>

              <div className="border-t border-gray-200 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:scale-105 hover:shadow-sm transition-all duration-200 cursor-pointer"
              >
                <svg
                  className="w-4 h-4 mr-3 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                로그아웃
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default UserDropdown
