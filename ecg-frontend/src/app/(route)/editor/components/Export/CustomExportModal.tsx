'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FaTimes } from 'react-icons/fa'

interface CustomExportModalProps {
  isOpen: boolean
  onClose: () => void
  closeOnBackdropClick?: boolean
  children: React.ReactNode
  'aria-label'?: string
}

export default function CustomExportModal({
  isOpen,
  onClose,
  closeOnBackdropClick = true,
  children,
  'aria-label': ariaLabel = '모달',
}: CustomExportModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // ESC 키 처리
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // body 스크롤 방지
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // 포커스 트랩
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const modal = modalRef.current
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement?.focus()
              e.preventDefault()
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement?.focus()
              e.preventDefault()
            }
          }
        }
      }

      modal.addEventListener('keydown', handleTabKey)
      firstElement?.focus()

      return () => {
        modal.removeEventListener('keydown', handleTabKey)
      }
    }
  }, [isOpen])

  // 백드롭 클릭 처리
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-md w-full max-w-lg max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="모달 닫기"
        >
          <FaTimes className="w-5 h-5" />
        </button>

        {/* 콘텐츠 */}
        {children}
      </div>
    </div>,
    document.body
  )
}
