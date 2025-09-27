'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { LuPlay, LuPause, LuVolumeX, LuVolume2 } from 'react-icons/lu'
import TutorialModal from '@/components/TutorialModal'

const TutorialPage = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedSidebarItem, setSelectedSidebarItem] = useState('글자1')
  const [showTutorialModal, setShowTutorialModal] = useState(false)

  const tutorialSteps = [
    {
      id: 1,
      title: '화자1',
      content: '쉽고 편한 영상 편집기, ViewFi와 함께 해요',
      color: 'bg-blue-500',
      timestamp: '00:00',
    },
    {
      id: 2,
      title: '화자2',
      content: '쉽고 편한 영상 편집기, ViewFi와 함께 해요',
      color: 'bg-green-500',
      timestamp: '00:05',
    },
    {
      id: 3,
      title: '화자1',
      content: '쉽고 편한 영상 편집기, ViewFi와 함께 해요',
      color: 'bg-blue-500',
      timestamp: '00:10',
    },
    {
      id: 4,
      title: '화자1',
      content: '쉽고 편한 영상 편집기, ViewFi와 함께 해요',
      color: 'bg-blue-500',
      timestamp: '00:15',
    },
    {
      id: 5,
      title: '화자3',
      content: '쉽고 편한 영상 편집기, ViewFi와 함께 해요',
      color: 'bg-yellow-500',
      timestamp: '00:20',
    },
  ]

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId)
  }

  const handleSidebarItemClick = (item: string) => {
    setSelectedSidebarItem(item)
  }

  const handleTutorialComplete = () => {
    console.log('Tutorial completed!')
  }

  // 페이지 진입 시 튜토리얼 모달 자동 표시
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial')
    if (!hasSeenTutorial) {
      setShowTutorialModal(true)
    }
  }, [])

  const handleTutorialClose = () => {
    setShowTutorialModal(false)
    localStorage.setItem('hasSeenTutorial', 'true')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-gray-900">Tutorial</h1>
            <nav className="flex space-x-6">
              <button
                onClick={() => setShowTutorialModal(true)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                튜토리얼
              </button>
              <button className="text-gray-600 hover:text-gray-900 transition-colors">
                가이드
              </button>
              <button className="text-gray-600 hover:text-gray-900 transition-colors">
                FAQ
              </button>
            </nav>
          </div>
          <Link
            href="/"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            나가기
          </Link>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Sidebar - Video Player */}
        <div className="w-80 border-r border-gray-200 bg-white">
          {/* Video Player */}
          <div className="p-4">
            <div className="bg-black rounded-lg aspect-video mb-4 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  {isPlaying ? (
                    <LuPause className="w-8 h-8 text-white" />
                  ) : (
                    <LuPlay className="w-8 h-8 text-white ml-1" />
                  )}
                </button>
              </div>

              {/* Video Controls */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">00:00 | 00:17</span>
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-gray-300 transition-colors"
                  >
                    {isMuted ? (
                      <LuVolumeX className="w-5 h-5" />
                    ) : (
                      <LuVolume2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Menu */}
          <div className="px-4 space-y-2">
            <button
              onClick={() => handleSidebarItemClick('글자1')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                selectedSidebarItem === '글자1'
                  ? 'text-gray-900 bg-gray-100'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              글자1
            </button>
            <button
              onClick={() => handleSidebarItemClick('비디오')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                selectedSidebarItem === '비디오'
                  ? 'text-gray-900 bg-gray-100 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              비디오
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-gray-50">
          <div className="p-6">
            {/* Tutorial Steps */}
            <div className="space-y-4">
              {tutorialSteps.map((step) => (
                <div
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  className={`bg-white rounded-xl p-6 border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                    currentStep === step.id
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Step Number */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                        {step.id}
                      </div>
                    </div>

                    {/* Speaker Badge */}
                    <div className="flex-shrink-0">
                      <div
                        className={`${step.color} text-white px-3 py-1 rounded-full text-sm font-medium`}
                      >
                        {step.title}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-4 mb-2">
                        <span className="text-gray-500 text-sm">
                          {step.timestamp}
                        </span>
                        <div className="flex space-x-6 text-sm text-gray-400">
                          <span>편집</span>
                          <span>볼</span>
                          <span>약자</span>
                          <span>폰트</span>
                          <span>정렬</span>
                          <span>폰트크기</span>
                          <span>ViewFi</span>
                          <span>효과</span>
                          <span>배경</span>
                          <span>더</span>
                        </div>
                      </div>
                      <p className="text-gray-900 font-medium">
                        {step.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Info */}
            <div className="mt-8 flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>모든 텍스트 자막 기능에 대해서 익혀 봅니다.</span>
            </div>
          </div>
        </div>

        {/* Right Floating Button */}
        <div className="fixed bottom-8 right-8">
          <button className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-300 transition-colors">
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Tutorial Modal */}
      <TutorialModal
        isOpen={showTutorialModal}
        onClose={handleTutorialClose}
        onComplete={handleTutorialComplete}
      />
    </div>
  )
}

export default TutorialPage
