'use client'

import { useProgressTasks } from '@/hooks/useProgressTasks'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface DocumentModalProps {
  isOpen: boolean
  onClose: () => void
  buttonRef: React.RefObject<HTMLButtonElement | null>
  onDeployClick?: (task: { id: number; filename: string }) => void
}

const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  buttonRef,
  onDeployClick,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'upload'>('upload')
  const modalRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  // Get formatted progress data (automatic timeout checking is now handled in useProgressTasks)
  const {
    exportTasks,
    uploadTasks,
    raw: { activeUploadTasks },
    clearCompletedTasksByType,
  } = useProgressTasks()

  // Set mounted state
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Calculate position based on button position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const modalWidth = 384 // 실제 모달 너비 (w-96 = 384px)

      setPosition({
        top: buttonRect.bottom + 8, // 8px gap below button
        left: buttonRect.left + buttonRect.width / 2 - modalWidth / 2, // 버튼 중앙에 모달 중앙 정렬
      })
    }
  }, [isOpen, buttonRef])

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, buttonRef])

  // 완료된 업로드 클릭 핸들러
  const handleUploadClick = (task: any) => {
    if (task.status === 'completed' && task.jobId) {
      // jobId를 세션에 저장하고 에디터로 이동
      sessionStorage.setItem('pendingJobId', task.jobId)
      router.push('/editor')
      onClose()
    }
  }

  if (!isOpen || !isMounted) return null

  return createPortal(
    <div
      ref={modalRef}
      className="fixed w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-[9997]"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Tab Bar */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'upload'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-600 hover:text-black bg-gray-50'
          }`}
        >
          업로드
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'export'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-600 hover:text-black bg-gray-50'
          }`}
        >
          내보내기
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-80 overflow-y-auto">
        {activeTab === 'export' && (
          <div className="space-y-4">
            {/* 현재 진행중인 내보내기 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                현재 진행중인 내보내기
              </h3>
              {exportTasks.filter((task) => task.status === 'processing')
                .length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500">
                    진행 중인 내보내기가 없습니다
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {exportTasks
                    .filter((task) => task.status === 'processing')
                    .map((task) => (
                      <div key={task.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {task.filename}
                          </span>
                          <span className="text-xs text-black font-medium">
                            {task.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-black h-2 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse mr-2"></div>
                          <span className="text-xs text-gray-600">
                            처리 중...
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 완료된 내보내기 */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  종료된 내보내기
                </h3>
                {exportTasks.filter(
                  (task) =>
                    task.status === 'completed' || task.status === 'failed'
                ).length > 0 && (
                  <button
                    onClick={() => {
                      if (
                        confirm('모든 완료된 내보내기 기록을 삭제하시겠습니까?')
                      ) {
                        clearCompletedTasksByType('export')
                      }
                    }}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                    title="모든 내보내기 기록 삭제"
                  >
                    전체 삭제
                  </button>
                )}
              </div>
              {exportTasks.filter(
                (task) =>
                  task.status === 'completed' || task.status === 'failed'
              ).length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500">
                    완료된 내보내기가 없습니다
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {exportTasks
                    .filter(
                      (task) =>
                        task.status === 'completed' || task.status === 'failed'
                    )
                    .map((task) => (
                      <div
                        key={task.id}
                        className={`rounded-lg p-3 border ${
                          task.status === 'completed'
                            ? 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
                            : 'bg-red-50 border-red-200'
                        } transition-colors`}
                        onClick={() =>
                          task.status === 'completed' && onDeployClick?.(task)
                        }
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {task.filename}
                          </span>
                          <div className="flex items-center">
                            <div
                              className={`w-2 h-2 rounded-full mr-2 ${
                                task.status === 'completed'
                                  ? 'bg-green-500'
                                  : 'bg-red-500'
                              }`}
                            ></div>
                            <span
                              className={`text-xs font-medium ${
                                task.status === 'completed'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {task.status === 'completed' ? '완료' : '실패'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {task.completedAt}
                          </span>
                          {task.status === 'completed' && (
                            <span className="text-xs text-brand-main font-medium">
                              배포하기
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-4">
            {/* 현재 진행중인 업로드 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                현재 진행중인 업로드
              </h3>
              {uploadTasks.filter(
                (task) =>
                  task.status === 'uploading' || task.status === 'processing'
              ).length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500">
                    진행 중인 업로드가 없습니다
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {uploadTasks
                    .filter(
                      (task) =>
                        task.status === 'uploading' ||
                        task.status === 'processing'
                    )
                    .map((task) => (
                      <div
                        key={task.id}
                        className="bg-purple-50 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {task.filename}
                          </span>
                          <span className="text-xs text-black font-medium">
                            {task.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-black h-2 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse mr-2"></div>
                          <span className="text-xs text-gray-600">
                            {task.status === 'processing'
                              ? '처리 중...'
                              : '업로드 중...'}
                          </span>
                          {task.currentStage && (
                            <span className="text-xs text-gray-500 ml-2">
                              {task.currentStage}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 완료된 업로드 */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  종료된 업로드
                </h3>
                {uploadTasks.filter(
                  (task) =>
                    task.status === 'completed' || task.status === 'failed'
                ).length > 0 && (
                  <button
                    onClick={() => {
                      if (
                        confirm('모든 완료된 업로드 기록을 삭제하시겠습니까?')
                      ) {
                        clearCompletedTasksByType('upload')
                      }
                    }}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                    title="모든 업로드 기록 삭제"
                  >
                    전체 삭제
                  </button>
                )}
              </div>
              {uploadTasks.filter(
                (task) =>
                  task.status === 'completed' || task.status === 'failed'
              ).length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500">
                    완료된 업로드가 없습니다
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {uploadTasks
                    .filter(
                      (task) =>
                        task.status === 'completed' || task.status === 'failed'
                    )
                    .map((task) => (
                      <div
                        key={task.id}
                        className={`rounded-lg p-3 border transition-colors ${
                          task.status === 'completed'
                            ? 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
                            : 'bg-red-50 border-red-200'
                        }`}
                        onClick={() => handleUploadClick(task)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {task.filename}
                          </span>
                          <div className="flex items-center">
                            <div
                              className={`w-2 h-2 rounded-full mr-2 ${
                                task.status === 'completed'
                                  ? 'bg-green-500'
                                  : 'bg-red-500'
                              }`}
                            ></div>
                            <span
                              className={`text-xs font-medium ${
                                task.status === 'completed'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {task.status === 'completed' ? '완료' : '실패'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {task.completedAt}
                          </span>
                          {task.status === 'completed' && task.jobId && (
                            <span className="text-xs text-purple-600 font-medium">
                              에디터에서 열기 →
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default DocumentModal
