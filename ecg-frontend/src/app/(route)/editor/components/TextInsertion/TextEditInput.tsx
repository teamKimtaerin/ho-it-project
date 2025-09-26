'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useEditorStore } from '../../store'

interface TextEditInputProps {
  className?: string
}

const TextEditInput: React.FC<TextEditInputProps> = ({ className = '' }) => {
  const { selectedTextId, insertedTexts, updateText, selectText } =
    useEditorStore()

  const [inputValue, setInputValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isComposing, setIsComposing] = useState(false)

  // Get selected text
  const selectedText = insertedTexts.find((text) => text.id === selectedTextId)

  // Update input value when selected text changes
  useEffect(() => {
    if (selectedText) {
      setInputValue(selectedText.content)
      setIsEditing(false)
    } else {
      setInputValue('')
      setIsEditing(false)
    }
  }, [selectedText])

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
      setIsEditing(true)
    },
    []
  )

  // Handle input blur (save changes)
  const handleInputBlur = useCallback(() => {
    // Don't save if IME composition is in progress
    if (isComposing) return

    if (
      selectedTextId &&
      isEditing &&
      inputValue.trim() !== selectedText?.content
    ) {
      updateText(selectedTextId, {
        content: inputValue.trim() || '텍스트를 입력하세요',
      })
    }
    setIsEditing(false)
  }, [
    selectedTextId,
    isEditing,
    inputValue,
    selectedText?.content,
    updateText,
    isComposing,
  ])

  // Handle composition events for IME input (Korean, etc.)
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true)
  }, [])

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false)
  }, [])

  // Handle Enter key (save changes)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Don't handle Enter during IME composition
      if (isComposing) return

      if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedTextId && inputValue.trim() !== selectedText?.content) {
          updateText(selectedTextId, {
            content: inputValue.trim() || '텍스트를 입력하세요',
          })
        }
        setIsEditing(false)
        // Optional: blur the input
        e.currentTarget.blur()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        // Reset to original value
        if (selectedText) {
          setInputValue(selectedText.content)
        }
        setIsEditing(false)
        e.currentTarget.blur()
      }
    },
    [selectedTextId, inputValue, selectedText, updateText, isComposing]
  )

  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    selectText(null)
  }, [selectText])

  if (!selectedText) {
    return (
      <div className={`bg-gray-50 border-t border-gray-200 p-3 ${className}`}>
        <div className="text-center text-gray-500 text-sm">
          텍스트를 선택하여 편집하세요
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border-t border-gray-200 p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700">텍스트 편집:</span>
        <button
          onClick={handleClearSelection}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          ✕ 선택 해제
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="텍스트를 입력하세요"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />

        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>
            시간: {selectedText.startTime.toFixed(1)}s -{' '}
            {selectedText.endTime.toFixed(1)}s
          </span>
          <div className="flex gap-2">
            <span>Enter: 저장</span>
            <span>Esc: 취소</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TextEditInput
