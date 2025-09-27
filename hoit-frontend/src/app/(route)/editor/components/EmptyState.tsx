'use client'

import React, { useState } from 'react'
import { LuX, LuPlus, LuFolderOpen } from 'react-icons/lu'

interface EmptyStateProps {
  onNewProjectClick: () => void
  onOpenProjectClick: () => void
}

const EmptyState: React.FC<EmptyStateProps> = ({
  onNewProjectClick,
  onOpenProjectClick,
}) => {
  const [showTooltip, setShowTooltip] = useState(true)
  return (
    <div className="flex-1 bg-gray-200 relative">
      {/* Speech Bubble Tooltip pointing to toolbar "새로 만들기" */}
      {showTooltip && (
        <div className="absolute top-[30px] left-4 animate-fadeIn z-10">
          <div className="bg-white rounded-2xl border border-gray-200 w-[300px] px-6 py-4 relative shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-[1.02]">
            {/* NEW Badge */}
            <div className="inline-flex items-center bg-gradient-to-r from-blue-500 to-purple-600 rounded-full px-3 py-1 shadow-sm mb-2">
              <span className="text-white text-[10px] font-bold tracking-wide">
                NEW
              </span>
            </div>

            {/* Main Text */}
            <div className="mb-1">
              <span className="text-gray-800 text-base font-bold">
                새 프로젝트 시작하기
              </span>
            </div>

            {/* Subtitle */}
            <div className="flex items-center">
              <span className="text-gray-500 text-sm font-medium">
                나만의 첫 영상을 만들어보세요! ✨
              </span>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowTooltip(false)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full w-7 h-7 flex items-center justify-center transition-all duration-200"
            >
              <LuX className="w-4 h-4" />
            </button>

            {/* Speech bubble tail pointing to toolbar "새로 만들기" button */}
            <div className="absolute -top-3 left-8">
              <div className="w-6 h-6 bg-white border-t border-l border-gray-200 transform rotate-45 shadow-sm"></div>
            </div>

            {/* Decorative elements */}
            <div
              className="absolute -top-1 right-8 w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce"
              style={{ animationDelay: '0s' }}
            ></div>
            <div
              className="absolute -top-1 right-12 w-1.5 h-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            ></div>
            <div
              className="absolute -top-1 right-16 w-1 h-1 bg-gradient-to-r from-pink-500 to-red-500 rounded-full animate-bounce"
              style={{ animationDelay: '0.4s' }}
            ></div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>

      {/* Center Cards - Positioned to avoid toolbar but stay visible */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-10 flex space-x-6">
        {/* New Project Card */}
        <button
          onClick={onNewProjectClick}
          className="bg-black rounded-xl w-[280px] h-[160px] flex flex-col items-center justify-center shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
        >
          <LuPlus className="w-12 h-12 text-white font-bold mb-3" />
          <div className="text-white text-base font-medium">새로 만들기</div>
        </button>

        {/* Open Project Card */}
        <button
          onClick={onOpenProjectClick}
          className="bg-gray-500 rounded-xl w-[280px] h-[160px] flex flex-col items-center justify-center shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
        >
          <LuFolderOpen className="w-12 h-12 text-white mb-3" />
          <div className="text-white text-base font-medium">프로젝트 열기</div>
        </button>
      </div>
    </div>
  )
}

export default EmptyState
