'use client'

import React from 'react'
import { MessageCircleIcon } from '@/components/icons'
import { ChatBotFloatingButtonProps } from '../../types/chatBot'

const ChatBotFloatingButton: React.FC<ChatBotFloatingButtonProps> = ({
  onClick,
  hasUnreadMessages = false,
}) => {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="fixed left-4 bottom-17 z-50
                   w-14 h-14 bg-white border-2 border-gray-200 rounded-full shadow-lg 
                   hover:bg-purple-600 hover:border-purple-600 
                   transition-all duration-300 ease-in-out 
                   transform hover:scale-110 
                   flex items-center justify-center
                   group
                   focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        title="둘리 어시스턴트와 대화하기"
        aria-label="둘리 어시스턴트 열기"
      >
        <MessageCircleIcon
          className="w-6 h-6 text-purple-600 group-hover:text-purple-600 transition-colors duration-300"
          size={24}
        />

        {/* Unread message indicator */}
        {hasUnreadMessages && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        )}
      </button>

      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-1 pointer-events-none">
        <div className="bg-gray-900 text-white text-xs rounded py-1 px-3 whitespace-nowrap shadow-lg">
          AI 어시스턴트
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  )
}

export default ChatBotFloatingButton
