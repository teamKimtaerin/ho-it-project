'use client'

import { useState, useRef, useEffect } from 'react'

interface DemoFrameProps {
  src: string
  title: string
  className?: string
}

/**
 * MotionText Demo iframe 래퍼 컴포넌트
 * 로딩 상태, 에러 처리, 전체 화면 지원 등 포함
 */
export function DemoFrame({ src, title, className = '' }: DemoFrameProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // iframe 로드 완료 처리
  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  // iframe 에러 처리
  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  // 전체 화면 토글
  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  // 새로 고침
  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true)
      setHasError(false)
      iframeRef.current.src = iframeRef.current.src
    }
  }

  // 전체 화면 상태 변경 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative bg-white rounded-lg shadow-md overflow-hidden ${className}`}
    >
      {/* 컨트롤 바 */}
      <div
        className={`bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between ${isFullscreen ? 'hidden' : ''}`}
      >
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
          <span className="text-sm text-gray-600 ml-2">{title}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="새로 고침"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="전체 화면"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* iframe 컨테이너 */}
      <div
        className={`relative ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-12rem)]'}`}
      >
        {/* iframe */}
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          className="w-full h-full border-0"
          onLoad={handleLoad}
          onError={handleError}
          allow="fullscreen; microphone; camera"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
        />

        {/* 로딩 오버레이 */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 bg-white flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">데모 로딩 중...</p>
              <p className="text-sm text-gray-500 mt-1">
                최초 로딩 시 시간이 걸릴 수 있습니다
              </p>
            </div>
          </div>
        )}

        {/* 에러 오버레이 */}
        {hasError && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
            <div className="text-center p-6">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                데모를 로드할 수 없습니다
              </h2>
              <p className="text-gray-600 mb-4">
                데모 서버가 실행되지 않았거나 연결에 문제가 있습니다.
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  다시 시도
                </button>
                <p className="text-sm text-gray-500">
                  또는 터미널에서{' '}
                  <code className="bg-gray-200 px-2 py-1 rounded">
                    pnpm dev
                  </code>{' '}
                  실행
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 전체 화면 종료 버튼 */}
      {isFullscreen && (
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={toggleFullscreen}
            className="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70 transition-colors"
            title="전체 화면 종료"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default DemoFrame
