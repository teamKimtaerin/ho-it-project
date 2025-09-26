'use client'

import React, { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { LuX } from 'react-icons/lu'
import { MessageCircleIcon } from '@/components/icons'
import Button from '@/components/ui/Button'
import { AIAssistantSidebarProps } from './types/assetCreation.types'
import ChatMessage from '@/app/(route)/editor/components/ChatBot/ChatMessage'
import FloatingQuestion from '@/app/(route)/editor/components/ChatBot/FloatingQuestion'

// Asset creation specific sample questions
const assetCreationQuestions = [
  '글로우 효과를 더 강하게 만들려면?',
  '애니메이션 속도를 조절하는 방법은?',
  '색상 그라데이션을 추가하고 싶어요',
  '텍스트 크기를 동적으로 변경하려면?',
  '페이드 인/아웃 효과 추가 방법',
  '회전 애니메이션을 부드럽게 만들기',
  '그림자 효과를 커스터마이징하려면?',
  '여러 텍스트를 순차적으로 나타내기',
]

export const AIAssistantSidebar: React.FC<AIAssistantSidebarProps> = ({
  isOpen,
  onToggle,
  onSendMessage,
  messages,
  isTyping = false,
}) => {
  const [inputValue, setInputValue] = useState('')
  const [activeQuestionIndices, setActiveQuestionIndices] = useState<number[]>(
    []
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const questionCycleTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping])

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 300) // Wait for animation to complete
    }
  }, [isOpen])

  // Question cycling animation - only when no messages
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const startQuestionCycle = () => {
        let currentStartIndex = 0

        const showNextQuestionGroup = () => {
          // Show 3 questions at once
          const activeIndices = []
          for (let i = 0; i < 3; i++) {
            activeIndices.push(
              (currentStartIndex + i) % assetCreationQuestions.length
            )
          }
          setActiveQuestionIndices(activeIndices)

          // Hide questions after animation and show next group
          animationTimerRef.current = setTimeout(() => {
            setActiveQuestionIndices([])
            currentStartIndex =
              (currentStartIndex + 3) % assetCreationQuestions.length

            // Wait before showing next group
            questionCycleTimerRef.current = setTimeout(
              showNextQuestionGroup,
              500
            )
          }, 3000)
        }

        // Start the cycle
        showNextQuestionGroup()
      }

      // Start after a brief delay
      const initialDelay = setTimeout(startQuestionCycle, 500)

      return () => {
        clearTimeout(initialDelay)
        if (animationTimerRef.current) {
          clearTimeout(animationTimerRef.current)
        }
        if (questionCycleTimerRef.current) {
          clearTimeout(questionCycleTimerRef.current)
        }
      }
    } else {
      // Clean up when sidebar closes or messages exist
      setActiveQuestionIndices([])
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current)
      }
      if (questionCycleTimerRef.current) {
        clearTimeout(questionCycleTimerRef.current)
      }
    }
  }, [isOpen, messages.length])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current)
      }
      if (questionCycleTimerRef.current) {
        clearTimeout(questionCycleTimerRef.current)
      }
    }
  }, [])

  const handleSendMessage = () => {
    const trimmedMessage = inputValue.trim()
    if (trimmedMessage) {
      onSendMessage(trimmedMessage)
      setInputValue('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleQuestionClick = (question: string) => {
    setInputValue(question)
    // Auto-send the question
    onSendMessage(question)
  }

  const sidebarClasses = clsx(
    'bg-white border-r border-gray-300 flex flex-col transition-all duration-300 ease-in-out',
    'overflow-hidden relative',
    isOpen ? 'w-80' : 'w-0'
  )

  const contentClasses = clsx(
    'h-full flex flex-col transition-opacity duration-300',
    isOpen ? 'opacity-100' : 'opacity-0'
  )

  return (
    <div className={sidebarClasses}>
      <div className={contentClasses}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-purple-50">
          <div className="flex items-center space-x-2">
            <MessageCircleIcon className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-purple-800">AI 어시스턴트</h3>
          </div>
          <button
            onClick={onToggle}
            className={clsx(
              'w-6 h-6 flex items-center justify-center rounded',
              'text-purple-600 hover:text-purple-800 hover:bg-purple-100',
              'transition-colors duration-200 cursor-pointer'
            )}
            title="사이드바 닫기"
          >
            <LuX size={16} />
          </button>
        </div>

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-lg mx-4 mb-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col">
              {/* Welcome message */}
              <div className="text-center text-gray-500 mb-6">
                <p className="text-sm">
                  안녕하세요! 애니메이션 제작에 대해 궁금한 것이 있으면 언제든
                  물어보세요.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  아래 예시 질문을 클릭해보세요
                </p>
              </div>

              {/* Floating sample questions */}
              <div className="flex-1 overflow-hidden relative">
                {assetCreationQuestions.map((question, index) => (
                  <div
                    key={index}
                    className="absolute inset-x-0"
                    style={{
                      top: `${activeQuestionIndices.indexOf(index) * 60}px`,
                      transition: 'all 0.3s ease-in-out',
                    }}
                  >
                    <FloatingQuestion
                      question={question}
                      delay={activeQuestionIndices.indexOf(index) * 100}
                      onQuestionClick={handleQuestionClick}
                      isActive={activeQuestionIndices.includes(index)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isTyping={message.sender === 'bot' && isTyping}
                />
              ))}
              {isTyping && (
                <ChatMessage
                  message={{
                    id: 'typing',
                    content: '',
                    sender: 'bot',
                    timestamp: new Date(),
                  }}
                  isTyping={true}
                />
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
              disabled={isTyping}
            />
            <Button
              label="전송"
              variant="primary"
              size="small"
              onClick={handleSendMessage}
              isDisabled={!inputValue.trim() || isTyping}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-[8px] text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
