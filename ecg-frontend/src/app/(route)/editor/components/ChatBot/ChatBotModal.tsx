'use client'

import React, { useState, useRef, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { ChatBotProps } from '../../types/chatBot'
import ChatMessage from './ChatMessage'
import FloatingQuestion from './FloatingQuestion'
import { sampleQuestions } from './sampleQuestions'
import { CloseIcon } from '@/components/icons'

interface ChatBotModalProps extends ChatBotProps {
  selectedClipsCount?: number
  selectedWordsCount?: number
  onClearSelection?: () => void
}

const ChatBotModal: React.FC<ChatBotModalProps> = ({
  isOpen,
  onClose,
  messages,
  isTyping = false,
  onSendMessage,
  selectedClipsCount = 0,
  selectedWordsCount = 0,
  onClearSelection,
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

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
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
            activeIndices.push((currentStartIndex + i) % sampleQuestions.length)
          }
          setActiveQuestionIndices(activeIndices)

          // Hide questions after animation and show next group
          animationTimerRef.current = setTimeout(() => {
            setActiveQuestionIndices([])
            currentStartIndex = (currentStartIndex + 3) % sampleQuestions.length

            // Wait before showing next group
            questionCycleTimerRef.current = setTimeout(
              showNextQuestionGroup,
              1500
            )
          }, 5400) // 등장(1.2초) + 대기(3초) + 사라짐(1.2초)
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
      // Clean up when modal closes or messages exist
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
      e.stopPropagation()
      handleSendMessage()
    }
  }

  const handleQuestionClick = (question: string) => {
    // 샘플 질문은 바로 전송만 하고 입력란에는 설정하지 않음
    onSendMessage(question)
  }

  // 모달 내에서 키보드 이벤트 전파 방지
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    // ChatBot 모달 내의 모든 키보드 이벤트는 부모로 전파되지 않도록 함
    e.stopPropagation()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="둘리 어시스턴트"
      subtitle="자막 편집을 더욱 간편하게 도와드려요"
      size="md"
      className="max-w-lg"
    >
      <div className="flex flex-col h-[550px]" onKeyDown={handleModalKeyDown}>
        {/* Selected items indicator */}
        {(selectedClipsCount > 0 || selectedWordsCount > 0) && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-800 font-medium">
                {selectedClipsCount > 0 && selectedWordsCount > 0
                  ? `${selectedClipsCount}개 클립, ${selectedWordsCount}개 단어 선택됨`
                  : selectedClipsCount > 0
                    ? `${selectedClipsCount}개 클립 선택됨`
                    : `${selectedWordsCount}개 단어 선택됨`}
              </span>
            </div>
            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                title="선택 해제"
              >
                <CloseIcon size={16} className="text-blue-600" />
              </button>
            )}
          </div>
        )}

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-lg mb-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col">
              {/* Welcome message */}
              <div className="text-center text-gray-500 mb-4">
                <p className="text-sm">
                  안녕하세요! 자막 편집에 대해 궁금한 것이 있으면 언제든
                  물어보세요.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  아래 예시 질문을 클릭해보세요
                </p>
              </div>

              {/* Floating sample questions */}
              <div className="flex-1 relative min-h-[250px] overflow-visible">
                {sampleQuestions.map((question, index) => {
                  const questionIndex = activeQuestionIndices.indexOf(index)
                  const isActive = questionIndex !== -1
                  return (
                    <div
                      key={index}
                      className="absolute inset-x-0"
                      style={{
                        top: `${questionIndex * 70}px`, // Increased spacing from 60px to 70px
                        zIndex: 10 + questionIndex, // Ensure proper stacking
                      }}
                    >
                      <FloatingQuestion
                        question={question}
                        delay={questionIndex * 100}
                        onQuestionClick={handleQuestionClick}
                        isActive={isActive}
                      />
                    </div>
                  )
                })}
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
            onClick={handleSendMessage}
            isDisabled={!inputValue.trim() || isTyping}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-[10px]"
          />
        </div>
      </div>
    </Modal>
  )
}

export default ChatBotModal
