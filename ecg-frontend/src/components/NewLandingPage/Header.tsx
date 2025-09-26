'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStatus } from '@/hooks/useAuthStatus'
import { type User } from '@/lib/api/auth'
import HoitLogo from '@/components/ui/HoitLogo'
import DocumentModal from '@/components/ui/DocumentModal'
import DeployModal from '@/components/ui/DeployModal'
import UserDropdown from '@/components/ui/UserDropdown'
import { useDeployModal } from '@/hooks/useDeployModal'
import { useProgressTasks } from '@/hooks/useProgressTasks'
import { useProgressStore } from '@/lib/store/progressStore'
import { LuBell } from 'react-icons/lu'

export interface HeaderProps {
  onTryClick?: () => void
  onLoginClick?: () => void
  isLoggedIn?: boolean
  user?: User | null
  isLoading?: boolean
}

const Header: React.FC<HeaderProps> = ({
  // onTryClick,
  onLoginClick,
  isLoggedIn = false,
  user = null,
  isLoading = false,
}) => {
  const {} = useAuthStatus()
  const router = useRouter()
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
  const { deployModalProps } = useDeployModal()
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Get real progress data - variables kept for future use
  // const { exportTasks, uploadTasks } = useProgressTasks()

  // Get notification status
  const { hasUnreadExportNotification, markNotificationAsRead } =
    useProgressStore()

  // 디버깅: 알림 상태 추적
  console.log(
    '[Header] hasUnreadExportNotification:',
    hasUnreadExportNotification
  )
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
        <div className="flex items-center space-x-8">
          <Link
            href="/"
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <HoitLogo size="md" />
            <span className="text-xl font-bold text-black">Hoit</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            {/* <a
              href="#"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors cursor-pointer"
            >
              주요 기능
            </a> */}
            <Link
              href="/asset-store"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors cursor-pointer"
            >
              에셋 스토어
            </Link>
            <Link
              href="/tutorial"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors cursor-pointer"
            >
              사용법 배우기
            </Link>
            {/* <a
              href="#"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors cursor-pointer"
            >
              커뮤니티
            </a> */}
            <Link
              href="/motiontext-demo"
              className="relative text-sm font-medium text-gray-700 hover:text-black transition-colors cursor-pointer"
            >
              베타
              <span className="absolute -top-2 left-full ml-1 bg-brand-main text-white text-xs px-1.5 py-0.5 rounded-full">
                βeta
              </span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => {
                setIsDocumentModalOpen(!isDocumentModalOpen)
                // 모달을 열 때 알림을 읽음 처리
                if (!isDocumentModalOpen) {
                  markNotificationAsRead()
                }
              }}
              className="p-2 text-gray-700 hover:bg-gray-50 hover:text-black transition-colors cursor-pointer rounded-lg"
              title="알림"
            >
              <LuBell className="w-5 h-5" />
              {/* Red notification dot */}
              {hasUnreadExportNotification && (
                <div
                  className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                  style={{ zIndex: 1000 }}
                ></div>
              )}
            </button>

            <DocumentModal
              isOpen={isDocumentModalOpen}
              onClose={() => setIsDocumentModalOpen(false)}
              buttonRef={buttonRef}
              onDeployClick={(task) => {
                // 에디터 페이지로 리다이렉트하면서 배포 모달 파라미터 전달
                router.push(
                  `/editor?deploy=true&taskId=${task.id}&filename=${encodeURIComponent(task.filename)}`
                )
                setIsDocumentModalOpen(false) // 현재 모달 닫기
              }}
            />
          </div>

          {isLoading ? (
            <div className="px-4 py-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-black"></div>
            </div>
          ) : isLoggedIn && user ? (
            <UserDropdown />
          ) : (
            <button
              onClick={onLoginClick}
              className="px-4 py-2 text-sm font-medium bg-black text-white rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
            >
              로그인 / 회원가입
            </button>
          )}
        </div>
      </div>

      {/* Deploy Modal */}
      <DeployModal {...deployModalProps} />
    </header>
  )
}

export default Header
