'use client'

import React, { useState, useEffect, useMemo } from 'react'

const AISubtitleSection: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const [extractedText, setExtractedText] = useState('')
  const [waveformProgress, setWaveformProgress] = useState(0)

  const steps = useMemo(
    () => [
      { id: 'analyzing', text: 'AI가 음성을 분석 중...', duration: 2000 },
      { id: 'extracting', text: '자막을 추출하고 있습니다...', duration: 3000 },
      { id: 'processing', text: '텍스트를 처리 중...', duration: 2000 },
      { id: 'complete', text: '자막 추출 완료!', duration: 2000 },
    ],
    []
  )

  const subtitleTexts = useMemo(
    () => [
      '안녕하세요, 오늘은',
      '좋은 날씨네요.',
      '함께 영상을 만들어보아요.',
      '자막이 자동으로 생성됩니다.',
    ],
    []
  )

  // Animation cycle
  useEffect(() => {
    const totalCycle = steps.reduce((sum, step) => sum + step.duration, 0)

    const interval = setInterval(() => {
      setCurrentStep(0)
      setExtractedText('')
      setWaveformProgress(0)

      let accumulatedTime = 0
      steps.forEach((step, index) => {
        setTimeout(() => {
          setCurrentStep(index)
          if (step.id === 'extracting') {
            // Simulate text extraction
            subtitleTexts.forEach((text, textIndex) => {
              setTimeout(() => {
                setExtractedText(
                  (prev) => prev + (textIndex > 0 ? '\n' : '') + text
                )
              }, textIndex * 500)
            })
          }
        }, accumulatedTime)
        accumulatedTime += step.duration
      })
    }, totalCycle + 1000)

    // Waveform progress animation
    const progressInterval = setInterval(() => {
      setWaveformProgress((prev) => (prev >= 100 ? 0 : prev + 2))
    }, 100)

    return () => {
      clearInterval(interval)
      clearInterval(progressInterval)
    }
  }, [steps, subtitleTexts])
  return (
    <>
      {/* Section 1: AI 음성인식으로 만드는 자동 자막 */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto text-center max-w-7xl">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-500 mb-6">
              AI 음성인식으로 만드는 자동 자막
            </h2>
            <p className="text-base text-black max-w-3xl mx-auto leading-relaxed">
              음성 인식으로 만든 자동 자막을 약간만 수정하면 긴 영상도 순식간에
              자막 완성.
              <br />
              자동으로 대본을 인식해서 영상 속 자막으로 넣을 수도 있어요
            </p>
          </div>

          {/* CTA Button below hero */}
          <section className="py-8 text-center bg-white">
            <button className="px-8 py-3 text-base font-bold bg-white text-black border-2 border-black rounded-full hover:bg-black hover:text-white transition-all shadow-md hover:shadow-lg cursor-pointer">
              자동 자막 체험하기
            </button>
          </section>

          {/* AI Subtitle Extraction Simulator */}
          <div className="bg-gray-50 rounded-3xl p-8 mx-auto max-w-4xl border border-gray-200">
            <div className="bg-white border border-gray-300 rounded-3xl overflow-hidden shadow-sm">
              {/* Interface Header */}
              <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">AI 자막 추출</h3>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${currentStep >= 0 ? 'bg-green-400' : 'bg-gray-600'}`}
                  ></div>
                  <div
                    className={`w-2 h-2 rounded-full ${currentStep >= 1 ? 'bg-green-400' : 'bg-gray-600'}`}
                  ></div>
                  <div
                    className={`w-2 h-2 rounded-full ${currentStep >= 2 ? 'bg-green-400' : 'bg-gray-600'}`}
                  ></div>
                  <div
                    className={`w-2 h-2 rounded-full ${currentStep >= 3 ? 'bg-green-400' : 'bg-gray-600'}`}
                  ></div>
                </div>
              </div>

              <div className="flex h-80">
                {/* Left Panel - Video & Waveform */}
                <div className="w-1/2 p-4 bg-gray-100">
                  {/* Video Preview */}
                  <div className="aspect-video bg-gray-900 rounded-lg mb-4 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 border-3 border-white rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[6px] border-y-transparent ml-0.5"></div>
                      </div>
                    </div>
                    {/* Status overlay */}
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                      {steps[currentStep]?.text}
                    </div>
                    {/* Processing indicator */}
                    {currentStep < 3 && (
                      <div className="absolute top-2 right-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>

                  {/* Audio Waveform */}
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-xs">Audio Waveform</span>
                      <span className="text-gray-400 text-xs">
                        {Math.round(waveformProgress)}%
                      </span>
                    </div>
                    <div className="h-12 bg-gray-900 rounded flex items-end space-x-1 p-2 overflow-hidden">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm transition-all duration-300 ${
                            i < (waveformProgress / 100) * 40
                              ? 'bg-blue-400'
                              : 'bg-gray-600'
                          }`}
                          style={{
                            height: `${20 + Math.sin(i * 0.3) * 15 + (i % 3) * 3}px`,
                            animationDelay: `${i * 50}ms`,
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Panel - Extracted Text */}
                <div className="w-1/2 p-4 bg-white border-l border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">
                    추출된 자막
                  </h4>

                  {/* Extracted text area */}
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 h-48 overflow-y-auto">
                    {currentStep < 1 ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-sm">AI 분석 대기 중...</p>
                        </div>
                      </div>
                    ) : extractedText ? (
                      <div className="space-y-2">
                        {extractedText.split('\n').map((line, index) => (
                          <div
                            key={index}
                            className="p-2 bg-blue-50 border border-blue-200 rounded text-sm animate-fade-in"
                            style={{ animationDelay: `${index * 200}ms` }}
                          >
                            <span className="text-gray-500 text-xs">
                              00:{String(index * 3).padStart(2, '0')} - 00:
                              {String((index + 1) * 3).padStart(2, '0')}
                            </span>
                            <p className="text-gray-800 mt-1">{line}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-sm text-gray-600">
                            텍스트 추출 중...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Process status */}
                  <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium">
                        진행 상황
                      </span>
                      <span className="text-gray-400 text-sm">
                        {currentStep + 1} / {steps.length}
                      </span>
                    </div>
                    <div className="mt-2 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${((currentStep + 1) / steps.length) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-gray-300 text-xs mt-2">
                      {steps[currentStep]?.text}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom CSS for fade-in animation */}
          <style jsx>{`
            @keyframes fade-in {
              0% {
                opacity: 0;
                transform: translateY(10px);
              }
              100% {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .animate-fade-in {
              animation: fade-in 0.5s ease-out forwards;
              opacity: 0;
            }
          `}</style>
        </div>
      </section>
    </>
  )
}

export default AISubtitleSection
