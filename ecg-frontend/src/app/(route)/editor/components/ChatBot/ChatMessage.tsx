'use client'

import React from 'react'
import { ChatMessageProps } from '../../types/chatBot'

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isTyping = false,
}) => {
  const isUser = message.sender === 'user'
  const isBotTyping = message.sender === 'bot' && isTyping

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 transform transition-all duration-300 ease-out`}
    >
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message bubble */}
        <div
          className={`px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-purple-600 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          } shadow-sm`}
        >
          {isBotTyping ? (
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
              <span className="text-sm text-gray-500 ml-2">typing...</span>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
        </div>

        {/* Timestamp */}
        {!isBotTyping && (
          <div
            className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}
          >
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>

      {/* Avatar placeholder */}
      <div
        className={`flex-shrink-0 ${isUser ? 'order-1 mr-3' : 'order-2 ml-3'}`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
            isUser ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {isUser ? 'U' : 'AI'}
        </div>
      </div>
    </div>
  )
}

export default ChatMessage
