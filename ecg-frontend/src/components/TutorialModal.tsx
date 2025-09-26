'use client'

import React, { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'

export interface TutorialModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedSpeaker, setSelectedSpeaker] = useState('B')
  const [showSlideAnimation, setShowSlideAnimation] = useState(false)
  const [styleOptions, setStyleOptions] = useState({
    bold: false,
    italic: true,
    underline: false,
  })

  const tutorialSteps = [
    {
      id: 1,
      title: '자막수정',
      content: '블록을 클릭해서 자막의 오타를 수정해 보세요.',
      illustration:
        '텍스트를 클릭하여 직접 수정하거나\n자동 수정 제안을 사용할 수 있습니다.',
      buttons: [
        {
          label: '자막수정',
          active: true,
          hasError: false,
          speaker: undefined,
          styleType: undefined,
        },
        {
          label: '내가',
          active: false,
          hasError: false,
          speaker: undefined,
          styleType: undefined,
        },
        {
          label: '좋이하는',
          active: false,
          hasError: true,
          speaker: undefined,
          styleType: undefined,
        },
        {
          label: '과일은',
          active: false,
          hasError: false,
          speaker: undefined,
          styleType: undefined,
        },
        {
          label: '복술아이고',
          active: false,
          hasError: true,
          speaker: undefined,
          styleType: undefined,
        },
      ],
    },
    {
      id: 2,
      title: '화자 구분',
      content: '화자 버튼을 클릭해서 누가 말하는지 구분해 보세요.',
      illustration: '화자를 정확히 구분하면\n더 나은 자막을 만들 수 있습니다.',
      buttons: [
        {
          label: '화자A',
          active: false,
          hasError: false,
          speaker: 'A',
          styleType: undefined,
        },
        {
          label: '화자B',
          active: true,
          hasError: false,
          speaker: 'B',
          styleType: undefined,
        },
        {
          label: '화자C',
          active: false,
          hasError: false,
          speaker: 'C',
          styleType: undefined,
        },
      ],
    },
    {
      id: 3,
      title: '타이밍 조정',
      content: '자막의 시작과 끝 시간을 조정해 보세요.',
      illustration: '드래그하여 자막의 타이밍을\n영상과 맞춰보세요.',
      buttons: [],
      showTimingDemo: true,
    },
    {
      id: 4,
      title: '스타일링',
      content: '자막의 폰트와 색상을 변경해 보세요.',
      illustration: '다양한 스타일 옵션으로\n멋진 자막을 만들어보세요.',
      buttons: [
        {
          label: '굵게',
          active: false,
          hasError: false,
          speaker: undefined,
          styleType: 'bold',
        },
        {
          label: '기울임',
          active: true,
          hasError: false,
          speaker: undefined,
          styleType: 'italic',
        },
        {
          label: '밑줄',
          active: false,
          hasError: false,
          speaker: undefined,
          styleType: 'underline',
        },
      ],
    },
    {
      id: 5,
      title: '완료',
      content: '튜토리얼을 완료했습니다! 이제 직접 편집해 보세요.',
      illustration: '축하합니다!\n이제 모든 기능을 사용할 수 있습니다.',
      buttons: [],
    },
  ]

  const currentTutorial = tutorialSteps.find((step) => step.id === currentStep)
  const totalSteps = tutorialSteps.length

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    onComplete?.()
    onClose()
  }

  const handleSkip = () => {
    onClose()
  }

  const handleSpeakerSelect = (speaker: string) => {
    setSelectedSpeaker(speaker)
  }

  const handleStyleToggle = (styleType: string) => {
    setStyleOptions((prev) => ({
      ...prev,
      [styleType]: !prev[styleType as keyof typeof prev],
    }))
  }

  const getSpeakerButtonStyle = (speaker: string) => {
    const isSelected = selectedSpeaker === speaker
    const colors = {
      A: isSelected
        ? 'bg-yellow-400 text-black'
        : 'bg-white text-gray-700 border border-gray-300 hover:bg-yellow-50',
      B: isSelected
        ? 'bg-sky-400 text-white'
        : 'bg-white text-gray-700 border border-gray-300 hover:bg-sky-50',
      C: isSelected
        ? 'bg-lime-400 text-black'
        : 'bg-white text-gray-700 border border-gray-300 hover:bg-lime-50',
    }
    return (
      colors[speaker as keyof typeof colors] ||
      'bg-white text-gray-700 border border-gray-300'
    )
  }

  const getStyleButtonStyle = (styleType: string) => {
    const isActive = styleOptions[styleType as keyof typeof styleOptions]
    return isActive
      ? 'bg-gray-900 text-white'
      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
  }

  const getTextStyle = () => {
    let className = 'text-lg text-gray-800'
    if (styleOptions.bold) className += ' font-bold'
    if (styleOptions.italic) className += ' italic'
    if (styleOptions.underline) className += ' underline'
    return className
  }

  // Animation loop for step 3
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (currentStep === 3) {
      // Start immediately when entering step 3
      setShowSlideAnimation(true)

      // Set up infinite loop
      interval = setInterval(() => {
        setShowSlideAnimation(false)
        setTimeout(() => setShowSlideAnimation(true), 500)
      }, 3000) // Repeat every 3 seconds
    } else {
      setShowSlideAnimation(false)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [currentStep])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-[700px] max-w-[90vw] max-h-[80vh]"
      closeOnBackdropClick={false}
      closeOnEsc={true}
      scrollable={false}
      aria-label="튜토리얼 모달"
    >
      <div className="bg-white rounded-xl p-4 relative">
        {/* Step Counter */}
        <div className="mb-2">
          <span className="text-gray-500 text-sm">
            {currentStep} / {totalSteps}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 mb-3">
          {currentTutorial?.title}
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-6">{currentTutorial?.content}</p>

        {/* Illustration Area */}
        <div className="bg-gray-100 rounded-lg p-4 mb-6 min-h-[280px] flex flex-col items-center justify-center">
          {/* Timing Demo for Step 3 */}
          {currentStep === 3 && (
            <div className="w-full max-w-sm space-y-3 relative overflow-hidden">
              {/* First Clip */}
              <div className="bg-white rounded-lg p-3 border-2 border-gray-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">00:05 - 00:08</span>
                  <span className="text-xs text-gray-500">클립 1</span>
                </div>
                <div
                  className={`bg-purple-100 rounded-md p-2 transition-all duration-1000 ${
                    showSlideAnimation ? 'opacity-30 transform scale-95' : ''
                  }`}
                >
                  <span className="text-sm text-purple-800">
                    안녕하세요, 오늘은
                  </span>
                </div>
              </div>

              {/* Sliding Text Block */}
              {showSlideAnimation && (
                <div className="absolute left-1/2 transform -translate-x-1/2 z-10 animate-slide-down">
                  <div className="bg-purple-100 rounded-md p-2 border-2 border-brand-sub shadow-lg">
                    <span className="text-sm text-purple-800">
                      안녕하세요, 오늘은
                    </span>
                  </div>
                </div>
              )}

              {/* Arrow indicating movement */}
              <div className="flex justify-center py-1">
                <div className="animate-bounce">
                  <svg
                    className="w-5 h-5 text-brand-main"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>
              </div>

              {/* Second Clip */}
              <div className="bg-white rounded-lg p-3 border-2 border-brand-sub shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">00:08 - 00:12</span>
                  <span className="text-xs text-gray-500">클립 2</span>
                </div>
                <div className="space-y-2">
                  <div
                    className={`bg-purple-100 rounded-md p-2 border-2 border-brand-sub border-dashed transition-all duration-500 ${
                      showSlideAnimation
                        ? 'opacity-100 transform scale-100'
                        : 'opacity-0 transform scale-95'
                    }`}
                  >
                    <span className="text-sm text-purple-800">
                      안녕하세요, 오늘은
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-md p-2">
                    <span className="text-sm text-gray-600">좋은 날씨네요</span>
                  </div>
                </div>
              </div>

              <style jsx>{`
                @keyframes slide-down {
                  0% {
                    top: 15px;
                    opacity: 1;
                  }
                  100% {
                    top: 130px;
                    opacity: 0;
                  }
                }
                .animate-slide-down {
                  animation: slide-down 1.5s ease-in-out forwards;
                }
              `}</style>
            </div>
          )}

          {/* Interactive Buttons */}
          {currentTutorial?.buttons && currentTutorial.buttons.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              {currentTutorial.buttons.map((button, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (currentStep === 2 && button.speaker) {
                      handleSpeakerSelect(button.speaker)
                    } else if (currentStep === 4 && button.styleType) {
                      handleStyleToggle(button.styleType)
                    }
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors relative ${
                    currentStep === 2 && button.speaker
                      ? getSpeakerButtonStyle(button.speaker)
                      : currentStep === 4 && button.styleType
                        ? getStyleButtonStyle(button.styleType)
                        : button.active
                          ? 'bg-gray-900 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  } ${(currentStep === 2 && button.speaker) || (currentStep === 4 && button.styleType) ? 'cursor-pointer' : 'cursor-pointer'}`}
                >
                  {button.label}
                  {button.hasError && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-[80%] h-0.5 bg-red-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Illustration Text */}
          {currentStep !== 3 && currentStep !== 4 && (
            <div className="text-center">
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {currentTutorial?.illustration}
              </p>
            </div>
          )}

          {/* Style Demo for Step 4 */}
          {currentStep === 4 && (
            <div className="text-center space-y-4">
              <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-sm">
                <p className={getTextStyle()}>멋진 자막 스타일링 예시</p>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {currentTutorial?.illustration}
              </p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-6 relative">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gray-900 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Step Indicators */}
          <div className="absolute top-1/2 left-0 right-0 flex justify-between transform -translate-y-1/2">
            {Array.from({ length: totalSteps }, (_, index) => (
              <div
                key={index}
                className={`w-4 h-4 rounded-full ${
                  index + 1 <= currentStep ? 'bg-gray-900' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors cursor-pointer"
          >
            건너뛰기
          </button>

          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                onClick={handlePrev}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors cursor-pointer"
              >
                이전
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors cursor-pointer"
            >
              {currentStep === totalSteps ? '완료' : '다음'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default TutorialModal
