'use client'

import { useEffect, useState } from 'react'

/**
 * MotionText Renderer 데모 페이지
 * iframe을 통해 기존 데모(localhost:3000)를 임베딩
 */
export default function MotionTextDemo() {
  const [isLoading, setIsLoading] = useState(true)
  const [isServerRunning, setIsServerRunning] = useState(false)

  // 데모 서버 상태 확인
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch('http://localhost:3001')

        setIsServerRunning(response.ok)
      } catch {
        setIsServerRunning(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkServer()
  }, [])

  // iframe 로드 완료 핸들러
  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">MotionText Demo 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isServerRunning) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md text-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            데모 서버가 실행되지 않음
          </h1>
          <p className="text-gray-600 mb-4">
            MotionText Renderer 데모 서버(localhost:3004)가 실행되지 않았습니다.
          </p>
          <div className="text-sm text-gray-500 bg-gray-100 p-3 rounded">
            <p className="font-mono">pnpm dev</p>
            <p className="mt-1">명령어로 데모 서버를 시작하세요.</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            다시 확인
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              MotionText Renderer Demo
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              동영상 위에 정교한 자막과 애니메이션 효과를 렌더링하는 데모
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">실행 중</span>
          </div>
        </div>
      </div>

      {/* 데모 임베딩 */}
      <div className="flex-1 relative">
        <iframe
          src="http://localhost:3001"
          className="w-full h-full border-0"
          title="MotionText Renderer Demo"
          onLoad={handleIframeLoad}
          allow="fullscreen"
        />

        {/* 로딩 오버레이 */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">데모 로딩 중...</p>
            </div>
          </div>
        )}
      </div>

      {/* 푸터 정보 */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>
            💡 <strong>팁:</strong> AI 자막 편집을 사용하려면 Claude API 키가
            필요합니다.
          </p>
          <p>
            서버: <span className="font-mono">localhost:3000</span>
          </p>
        </div>
      </div>
    </div>
  )
}
