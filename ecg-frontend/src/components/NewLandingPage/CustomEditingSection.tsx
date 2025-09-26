'use client'

import React, { useState, useEffect } from 'react'

export interface CustomEditingSectionProps {
  onQuickStartClick?: () => void
}

const CustomEditingSection: React.FC<CustomEditingSectionProps> = ({
  onQuickStartClick,
}) => {
  const [activeSubtitle, setActiveSubtitle] = useState(0)
  const [showTypingAnimation, setShowTypingAnimation] = useState(false)
  const [typedText, setTypedText] = useState('')
  const [currentColorIndex, setCurrentColorIndex] = useState(0)

  const subtitles = [
    { time: '00:00 - 00:03', text: '안녕하세요, 환영합니다!' },
    { time: '00:03 - 00:06', text: '오늘은 좋은 하루입니다.' },
    { time: '00:06 - 00:10', text: '함께 시작해보겠습니다.' },
  ]

  const colors = ['white', 'black', 'blue-500', 'red-500']

  // Animation cycle
  useEffect(() => {
    const interval = setInterval(() => {
      // Step 1: Change active subtitle
      setActiveSubtitle((prev) => (prev + 1) % subtitles.length)

      // Step 2: Show typing animation
      setTimeout(() => {
        setShowTypingAnimation(true)
        setTypedText('')

        // Typing effect
        const targetText = '수정된 자막입니다!'
        let currentIndex = 0

        const typingInterval = setInterval(() => {
          setTypedText(targetText.slice(0, currentIndex + 1))
          currentIndex++

          if (currentIndex >= targetText.length) {
            clearInterval(typingInterval)

            // Hide typing animation after completion
            setTimeout(() => {
              setShowTypingAnimation(false)
            }, 1000)
          }
        }, 100)
      }, 1500)

      // Step 3: Change color
      setTimeout(() => {
        setCurrentColorIndex((prev) => (prev + 1) % colors.length)
      }, 3500)
    }, 5000)

    return () => clearInterval(interval)
  }, [colors.length, subtitles.length])
  return (
    <section className="py-20 px-4 bg-white">
      <div className="container mx-auto text-center max-w-7xl">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-500 mb-6">
            나만의 영상과 나만의 자막
          </h2>
          <p className="text-base text-black max-w-3xl mx-auto leading-relaxed">
            원하는 대로 자막을 세밀하게 조정하고 나만의 스타일로 꾸며보세요.
            <br />
            시간, 위치, 색상, 폰트까지 모든 것을 직접 편집할 수 있어요
          </p>
        </div>

        <div className="mb-12">
          <button
            onClick={onQuickStartClick}
            className="px-8 py-4 text-lg font-semibold bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
          >
            빠른 시작
          </button>
        </div>

        {/* Editor interface mockup - 실제 에디터 스타일로 */}
        <div className="bg-gray-900 rounded-3xl mx-auto max-w-6xl shadow-2xl overflow-hidden">
          {/* Editor Header Tabs */}
          <div className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-600/40">
            <div className="flex items-center px-6 py-2">
              <div className="flex space-x-1">
                <div className="px-3 py-1 bg-slate-600 text-white text-xs rounded-md">
                  홈
                </div>
                <div className="px-3 py-1 text-slate-400 text-xs rounded-md hover:bg-slate-700">
                  편집
                </div>
                <div className="px-3 py-1 text-slate-400 text-xs rounded-md hover:bg-slate-700">
                  자막
                </div>
                <div className="px-3 py-1 text-slate-400 text-xs rounded-md hover:bg-slate-700">
                  서식
                </div>
                <div className="px-3 py-1 text-slate-400 text-xs rounded-md hover:bg-slate-700">
                  삽입
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="text-green-400">✓</span>
                  현재 기기에 저장됨
                </span>
                <span className="text-slate-500">(14:23)</span>
              </div>
            </div>
          </div>

          {/* Editor Main Content */}
          <div className="flex h-96">
            {/* Left Panel - Video Section */}
            <div className="w-80 bg-gray-900 p-4 flex-shrink-0">
              {/* Video Player */}
              <div
                className="bg-black rounded-lg mb-4 relative"
                style={{ aspectRatio: '16/9' }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-3 border-white rounded-full flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[6px] border-y-transparent ml-1"></div>
                  </div>
                </div>
                {/* Subtitle overlay with animation */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                  <div
                    className={`px-3 py-1 bg-black/80 text-sm rounded transition-all duration-500 ${
                      currentColorIndex === 0
                        ? 'text-white'
                        : currentColorIndex === 1
                          ? 'text-white'
                          : currentColorIndex === 2
                            ? 'text-blue-300'
                            : 'text-red-300'
                    }`}
                  >
                    {showTypingAnimation
                      ? typedText
                      : subtitles[activeSubtitle]?.text}
                    {showTypingAnimation && (
                      <span className="animate-pulse">|</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Subtitle Controls */}
              <div className="bg-gray-800 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-gray-300">
                    Subtitle Settings
                  </h3>
                  <button className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                    ON
                  </button>
                </div>
                <div className="mb-2">
                  <label className="text-xs text-gray-400 block mb-1">
                    Size
                  </label>
                  <div className="flex gap-1">
                    <button className="flex-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                      Small
                    </button>
                    <button className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded">
                      Medium
                    </button>
                    <button className="flex-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                      Large
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Position
                  </label>
                  <div className="flex gap-1">
                    <button className="flex-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                      Top
                    </button>
                    <button className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded">
                      Bottom
                    </button>
                  </div>
                </div>
              </div>

              {/* Subtitle Timeline (compressed) */}
              <div className="bg-gray-800 rounded-lg p-2 flex-1 overflow-hidden">
                <h3 className="text-xs font-medium text-gray-300 mb-1">
                  Subtitle Timeline
                </h3>
                <div className="space-y-1 text-xs">
                  {subtitles.slice(0, 3).map((subtitle, index) => (
                    <div
                      key={index}
                      className={`p-1 rounded cursor-pointer transition-all ${
                        activeSubtitle === index
                          ? 'bg-blue-500/20 border border-blue-500/50 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      <div className="text-gray-400 text-xs">
                        {subtitle.time}
                      </div>
                      <div className="truncate">{subtitle.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel - Subtitle Edit List */}
            <div className="flex-1 bg-gray-900 p-4">
              <div className="space-y-2">
                {subtitles.map((subtitle, index) => (
                  <div
                    key={index}
                    className={`bg-gray-800 rounded-lg p-3 transition-all duration-500 relative border-2 ${
                      activeSubtitle === index
                        ? 'border-blue-500 bg-gray-700 shadow-lg transform scale-[1.02]'
                        : 'border-transparent hover:border-gray-600'
                    }`}
                  >
                    {/* Clip header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            activeSubtitle === index
                              ? 'bg-blue-400'
                              : 'bg-gray-500'
                          }`}
                        ></div>
                        <span className="text-xs text-gray-400">
                          클립 {index + 1}
                        </span>
                        <span className="text-xs text-gray-500">
                          {subtitle.time}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-yellow-400 rounded-sm flex items-center justify-center">
                          <span className="text-black text-xs font-bold">
                            A
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Subtitle text */}
                    <div className="relative">
                      <p
                        className={`text-sm text-gray-200 ${
                          activeSubtitle === index ? 'font-medium' : ''
                        }`}
                      >
                        {subtitle.text}
                      </p>

                      {/* Typing animation overlay */}
                      {activeSubtitle === index && showTypingAnimation && (
                        <div className="absolute inset-0 bg-gray-700 bg-opacity-95 rounded flex items-center px-2">
                          <p className="text-sm text-white font-medium">
                            {typedText}
                            <span className="animate-pulse">|</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Word-level editing visualization */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {subtitle.text.split(' ').map((word, wordIndex) => (
                        <span
                          key={wordIndex}
                          className={`px-1 py-0.5 text-xs rounded transition-colors ${
                            activeSubtitle === index && showTypingAnimation
                              ? 'bg-blue-500/30 text-blue-200'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CustomEditingSection
