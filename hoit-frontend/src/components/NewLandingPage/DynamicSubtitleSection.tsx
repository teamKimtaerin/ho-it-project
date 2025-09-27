'use client'

import React, { useState, useEffect } from 'react'

export interface DynamicSubtitleSectionProps {
  onApplyDynamicSubtitleClick?: () => void
}

const DynamicSubtitleSection: React.FC<DynamicSubtitleSectionProps> = (
  {
    // onApplyDynamicSubtitleClick,
  }
) => {
  const [selectedAnimation, setSelectedAnimation] = useState('fade')
  const [currentSubtitle, setCurrentSubtitle] = useState(0)
  const [animationKey, setAnimationKey] = useState(0)

  const animations = [
    { id: 'fade', name: 'Fade', description: '부드럽게 나타나는 효과' },
    { id: 'slide', name: 'Slide', description: '슬라이딩 효과' },
    { id: 'bounce', name: 'Bounce', description: '통통 튀는 효과' },
    { id: 'typewriter', name: 'Typewriter', description: '타이핑 효과' },
    { id: 'scale', name: 'Scale', description: '크기 변화 효과' },
  ]

  const subtitleTexts = [
    '안녕하세요, 환영합니다!',
    '동적 자막으로 생동감을 더하세요.',
    '다양한 효과를 체험해보세요.',
  ]

  // 애니메이션 순환
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSubtitle((prev) => (prev + 1) % subtitleTexts.length)
      setAnimationKey((prev) => prev + 1) // 애니메이션 리트리거
    }, 4000)

    return () => clearInterval(interval)
  }, [selectedAnimation, subtitleTexts.length])

  const getAnimationClass = (animationType: string) => {
    const baseClasses = 'inline-block'

    switch (animationType) {
      case 'fade':
        return `${baseClasses} animate-fade-in`
      case 'slide':
        return `${baseClasses} animate-slide-up`
      case 'bounce':
        return `${baseClasses} animate-bounce-in`
      case 'typewriter':
        return `${baseClasses} animate-typewriter`
      case 'scale':
        return `${baseClasses} animate-scale-in`
      default:
        return baseClasses
    }
  }
  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="container mx-auto text-center max-w-7xl">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-500 mb-6">
            생생하고 몰입감있는 동적 자막
          </h2>
          <p className="text-base text-black max-w-3xl mx-auto leading-relaxed">
            다양한 동적 자막 템플릿으로 영상에 생동감을 더하세요.
            <br />
            시각적 효과와 애니메이션으로 더욱 몰입감 있는 콘텐츠를 만들 수
            있어요
          </p>
        </div>

        {/* <section className="py-8 text-center">
          <button
            onClick={onApplyDynamicSubtitleClick}
            className="px-8 py-3 text-base font-bold bg-white text-black border-2 border-black rounded-full hover:bg-black hover:text-white transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            템플릿 적용해보기
          </button>
        </section> */}

        {/* Animation style tabs */}
        <div className="flex justify-center space-x-3 mb-8 flex-wrap gap-2">
          {animations.map((animation) => (
            <button
              key={animation.id}
              onClick={() => {
                setSelectedAnimation(animation.id)
                setAnimationKey((prev) => prev + 1)
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer ${
                selectedAnimation === animation.id
                  ? 'bg-black text-white'
                  : 'bg-white text-black border-2 border-black hover:bg-gray-50'
              }`}
            >
              {animation.name}
            </button>
          ))}
        </div>

        {/* Animation Subtitle Simulator */}
        <div className="bg-white rounded-3xl p-8 mx-auto max-w-4xl mb-8 border border-gray-200 shadow-lg">
          <div className="aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-300 rounded-3xl shadow-sm relative overflow-hidden">
            {/* Background video simulation */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-purple-800/20 animate-pulse"></div>
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-brand-main/10 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            {/* Play button */}
            <div className="absolute top-4 left-4 w-8 h-8 border-2 border-white/50 rounded-full flex items-center justify-center">
              <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-0.5"></div>
            </div>

            {/* Animation description */}
            <div className="absolute top-4 right-4 px-3 py-1 bg-black/70 text-white text-xs rounded-full">
              {animations.find((a) => a.id === selectedAnimation)?.description}
            </div>

            {/* Animated subtitle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-6">
                <div
                  key={`${selectedAnimation}-${animationKey}`}
                  className={`text-white text-2xl font-bold px-6 py-3 bg-black/80 rounded-lg ${getAnimationClass(selectedAnimation)}`}
                  style={{
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  }}
                >
                  {subtitleTexts[currentSubtitle]}
                </div>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {subtitleTexts.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentSubtitle === index ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>

            {/* Animation info panel */}
            <div className="absolute bottom-4 right-4 text-right">
              <div className="text-white/70 text-xs">
                {selectedAnimation.toUpperCase()} 효과
              </div>
              <div className="text-white/50 text-xs">자동 순환 중...</div>
            </div>
          </div>
        </div>

        {/* Custom CSS for animations */}
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
          @keyframes slide-up {
            0% {
              opacity: 0;
              transform: translateY(50px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes bounce-in {
            0% {
              opacity: 0;
              transform: scale(0.5) translateY(-50px);
            }
            60% {
              opacity: 1;
              transform: scale(1.1) translateY(0);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          @keyframes typewriter {
            0% {
              width: 0;
            }
            100% {
              width: 100%;
            }
          }
          @keyframes scale-in {
            0% {
              opacity: 0;
              transform: scale(0.8);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          .animate-fade-in {
            animation: fade-in 1s ease-out;
          }
          .animate-slide-up {
            animation: slide-up 0.8s ease-out;
          }
          .animate-bounce-in {
            animation: bounce-in 1.2s ease-out;
          }
          .animate-typewriter {
            overflow: hidden;
            white-space: nowrap;
            border-right: 2px solid white;
            animation: typewriter 2s steps(40, end);
          }
          .animate-scale-in {
            animation: scale-in 0.6s ease-out;
          }
        `}</style>
      </div>
    </section>
  )
}

export default DynamicSubtitleSection
