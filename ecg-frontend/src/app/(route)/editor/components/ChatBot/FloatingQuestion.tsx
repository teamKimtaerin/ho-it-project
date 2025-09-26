'use client'

import React, { useState, useEffect } from 'react'

interface FloatingQuestionProps {
  question: string
  delay: number
  onQuestionClick: (question: string) => void
  isActive: boolean
}

const FloatingQuestion: React.FC<FloatingQuestionProps> = ({
  question,
  delay,
  onQuestionClick,
  isActive,
}) => {
  const [animationClass, setAnimationClass] = useState('')
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (isActive) {
      setShouldRender(true)
      setAnimationClass('')

      // 다음 프레임에서 애니메이션 시작 (브라우저 렌더링 최적화)
      requestAnimationFrame(() => {
        const timer = setTimeout(() => {
          setAnimationClass('animate-float-up-fade')
        }, delay)

        // 3초 대기 후 숨기기
        const hideTimer = setTimeout(
          () => {
            setAnimationClass('animate-float-up-fade-out')

            // fade-out 완료 후 컴포넌트 제거
            setTimeout(() => {
              setShouldRender(false)
            }, 1200) // fade-out 애니메이션 시간과 동일
          },
          delay + 1200 + 3000
        ) // 등장 애니메이션(1.2초) + 대기(3초)

        return () => {
          clearTimeout(timer)
          clearTimeout(hideTimer)
        }
      })
    } else {
      setAnimationClass('')
      setShouldRender(false)
    }
  }, [isActive, delay])

  const handleClick = () => {
    onQuestionClick(question)
  }

  if (!shouldRender) {
    return null
  }

  return (
    <>
      <style jsx>{`
        @keyframes floatUpFadeIn {
          0% {
            transform: translateY(15px) scale(0.95);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes floatUpFadeOut {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-20px) scale(0.95);
            opacity: 0;
          }
        }
        .animate-float-up-fade {
          animation: floatUpFadeIn 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)
            forwards;
          opacity: 0;
          transform: translateY(15px) scale(0.95);
        }
        .animate-float-up-fade-out {
          animation: floatUpFadeOut 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)
            forwards;
        }
      `}</style>
      <div
        className={`
          cursor-pointer mb-3 ${animationClass}
        `}
        style={{
          opacity: animationClass === '' ? 0 : undefined,
          transform:
            animationClass === '' ? 'translateY(15px) scale(0.95)' : undefined,
        }}
        onClick={handleClick}
      >
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg px-4 py-3 hover:from-purple-100 hover:to-purple-200 hover:border-purple-300 hover:shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 group min-h-[50px] flex items-center">
          <p className="text-sm text-purple-700 font-medium group-hover:text-purple-800 break-words leading-relaxed">
            💬 {question}
          </p>
        </div>
      </div>
    </>
  )
}

export default FloatingQuestion
