import {
  calculateProgress,
  cn,
  TRANSITIONS,
  type BaseComponentProps,
} from '@/utils'
import React from 'react'

export interface ProgressCircleProps extends BaseComponentProps {
  variant?: 'default' | 'over-background'
  value?: number
  minValue?: number
  maxValue?: number
  isIndeterminate?: boolean
  id?: string
  children?: React.ReactNode // 써클 중앙에 표시할 내용
}

const PROGRESS_CIRCLE_SIZE_CLASSES = {
  small: {
    container: 'w-12 h-12',
    svg: '48',
    strokeWidth: '4',
    radius: '20',
    center: '24',
    content: 'text-xs',
  },
  medium: {
    container: 'w-16 h-16',
    svg: '64',
    strokeWidth: '4',
    radius: '28',
    center: '32',
    content: 'text-sm',
  },
  large: {
    container: 'w-20 h-20',
    svg: '80',
    strokeWidth: '6',
    radius: '34',
    center: '40',
    content: 'text-base',
  },
} as const

const ProgressCircle: React.FC<ProgressCircleProps> = ({
  variant = 'default',
  value,
  minValue = 0,
  maxValue = 100,
  size = 'medium',
  isIndeterminate = false,
  className,
  id,
  children,
}) => {
  const sizeClasses =
    PROGRESS_CIRCLE_SIZE_CLASSES[
      size as keyof typeof PROGRESS_CIRCLE_SIZE_CLASSES
    ]

  // 진행률 계산 (indeterminate가 아닐 때만)
  const percentage = isIndeterminate
    ? 0
    : calculateProgress(value, minValue, maxValue)

  // SVG circle 계산
  const radius = parseInt(sizeClasses.radius)
  const strokeWidth = parseInt(sizeClasses.strokeWidth)
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  // 컨테이너 클래스
  const containerClasses = cn(
    'relative inline-flex items-center justify-center',
    sizeClasses.container,
    className
  )

  // SVG 트랙 클래스 (배경 원) - Color System 사용
  const trackClasses = cn(
    TRANSITIONS.normal,
    variant === 'over-background'
      ? 'stroke-white opacity-30'
      : 'stroke-gray-medium'
  )

  // SVG 프로그레스 클래스 (진행 원) - Color System 사용
  const progressClasses = cn(TRANSITIONS.slow)

  // SVG stroke 색상 스타일 (CSS 변수 직접 사용)
  const progressStyle =
    variant === 'over-background'
      ? { stroke: 'white' }
      : { stroke: 'var(--color-primary)' }

  // 중앙 콘텐츠 클래스 - Color System 사용
  const contentClasses = cn(
    'absolute inset-0 flex items-center justify-center',
    'font-medium',
    sizeClasses.content,
    variant === 'over-background' ? 'text-white' : 'text-text-primary'
  )

  // Indeterminate 애니메이션을 위한 스타일
  const indeterminateStyle = isIndeterminate
    ? {
        animation: 'spin 2s linear infinite',
        transformOrigin: 'center',
      }
    : {}

  return (
    <>
      {/* Indeterminate 애니메이션을 위한 CSS */}
      {isIndeterminate && (
        <style jsx>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      )}

      <div
        className={containerClasses}
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : value}
        aria-valuemin={isIndeterminate ? undefined : minValue}
        aria-valuemax={isIndeterminate ? undefined : maxValue}
        aria-label={
          isIndeterminate ? 'Loading...' : `Progress: ${percentage.toFixed(0)}%`
        }
        id={id}
      >
        <svg
          className="transform -rotate-90"
          width={sizeClasses.svg}
          height={sizeClasses.svg}
          style={indeterminateStyle}
        >
          {/* 배경 원 (트랙) */}
          <circle
            className={trackClasses}
            strokeWidth={strokeWidth}
            fill="transparent"
            r={normalizedRadius}
            cx={sizeClasses.center}
            cy={sizeClasses.center}
          />

          {/* 프로그레스 원 */}
          <circle
            className={progressClasses}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={
              isIndeterminate ? circumference * 0.75 : strokeDashoffset
            }
            strokeLinecap="round"
            fill="transparent"
            r={normalizedRadius}
            cx={sizeClasses.center}
            cy={sizeClasses.center}
            style={
              isIndeterminate
                ? {
                    strokeDasharray: `${circumference * 0.25} ${circumference * 0.75}`,
                    ...progressStyle,
                  }
                : progressStyle
            }
          />
        </svg>

        {/* 중앙 콘텐츠 */}
        {children && <div className={contentClasses}>{children}</div>}

        {/* 기본 퍼센트 표시 (children이 없고 indeterminate가 아닐 때) */}
        {!children && !isIndeterminate && (
          <div className={contentClasses}>{Math.round(percentage)}%</div>
        )}
      </div>
    </>
  )
}

export default ProgressCircle
