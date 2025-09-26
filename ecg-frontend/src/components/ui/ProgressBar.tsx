// TODO : 진행도 임의값 -> 백엔드 요청값으로 변경
import {
  calculateProgress,
  cn,
  SIZE_CLASSES,
  TRANSITIONS,
  type BaseComponentProps,
} from '@/utils'
import React from 'react'

export interface ProgressBarProps extends BaseComponentProps {
  variant?: 'default' | 'over-background'
  label?: string
  value?: number
  minValue?: number
  maxValue?: number
  valueLabel?: string
  width?: number
  isIndeterminate?: boolean
  id?: string
}

// Progress Bar만의 고유한 사이즈 클래스 (공통 클래스는 SIZE_CLASSES 사용)
const PROGRESS_BAR_SPECIFIC_CLASSES = {
  small: { bar: SIZE_CLASSES.progress.small.height },
  medium: { bar: SIZE_CLASSES.progress.medium.height },
  large: { bar: SIZE_CLASSES.progress.large.height },
  'extra-large': { bar: SIZE_CLASSES.progress['extra-large'].height },
} as const

const ProgressBar: React.FC<ProgressBarProps> = ({
  variant = 'default',
  label,
  value,
  minValue = 0,
  maxValue = 100,
  valueLabel,
  width = 2400, // size-2400 기본값
  size = 'medium',
  isIndeterminate = false,
  className,
  id,
}) => {
  const sizeClasses = PROGRESS_BAR_SPECIFIC_CLASSES[size]

  // 진행률 계산 (indeterminate가 아닐 때만)
  const percentage = isIndeterminate
    ? 0
    : calculateProgress(value, minValue, maxValue)

  // 컨테이너 스타일 (width 설정)
  const containerStyle = width ? { width: `${width}px` } : {}

  // 트랙 클래스 (배경)
  const trackClasses = cn(
    'relative w-full rounded-full overflow-hidden',
    sizeClasses.bar,

    // Variant별 배경색
    variant === 'over-background' ? 'bg-white bg-opacity-30' : 'bg-gray-medium'
  )

  // 프로그레스 바 클래스 (진행 부분)
  const progressClasses = cn(
    'h-full rounded-full',
    TRANSITIONS.normal,

    // Variant별 색상
    variant === 'over-background' ? 'bg-white' : 'bg-primary',

    // Indeterminate 애니메이션
    isIndeterminate && 'animate-pulse'
  )

  // 라벨 클래스 (기존 SIZE_CLASSES 활용)
  const labelClasses = cn(
    'font-medium',
    SIZE_CLASSES.typography[size],
    variant === 'over-background' ? 'text-white' : 'text-text-primary'
  )

  // 값 라벨 클래스
  const valueLabelClasses = cn(
    'font-medium',
    SIZE_CLASSES.progress[size].fontSize,
    variant === 'over-background' ? 'text-white' : 'text-text-secondary'
  )

  // Indeterminate 애니메이션을 위한 스타일
  const indeterminateStyle = isIndeterminate
    ? {
        backgroundImage:
          variant === 'over-background'
            ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, var(--color-primary) 50%, transparent 100%)',
        backgroundSize: '50% 100%',
        backgroundRepeat: 'no-repeat',
        animation: 'indeterminate 2s infinite linear',
        width: '100%',
      }
    : {
        // 명시적으로 background 속성들 리셋
        backgroundImage: 'none',
        backgroundSize: 'auto',
        backgroundRepeat: 'repeat',
        animation: 'none',
        width: `${percentage}%`,
      }

  return (
    <>
      {/* Indeterminate 애니메이션을 위한 CSS */}
      {isIndeterminate && (
        <style jsx>{`
          @keyframes indeterminate {
            0% {
              background-position: -50% 0;
            }
            100% {
              background-position: 150% 0;
            }
          }
        `}</style>
      )}

      <div
        className={cn(
          'flex flex-col max-w-48',
          SIZE_CLASSES.gap[size],
          className
        )}
        style={containerStyle}
      >
        {/* 라벨과 값 라벨 */}
        {(label || valueLabel) && (
          <div className="flex justify-between items-center">
            {label && (
              <span className={labelClasses} id={`${id}-label`}>
                {label}
              </span>
            )}
            {valueLabel && !isIndeterminate && (
              <span className={valueLabelClasses}>{valueLabel}</span>
            )}
          </div>
        )}

        {/* 프로그레스 바 */}
        <div
          className={trackClasses}
          role="progressbar"
          aria-valuenow={isIndeterminate ? undefined : value}
          aria-valuemin={isIndeterminate ? undefined : minValue}
          aria-valuemax={isIndeterminate ? undefined : maxValue}
          aria-labelledby={label ? `${id}-label` : undefined}
          aria-label={!label ? 'Progress' : undefined}
          id={id}
        >
          <div className={progressClasses} style={indeterminateStyle} />
        </div>

        {/* 범위 표시 (indeterminate가 아닐 때) */}
        {!isIndeterminate &&
          !valueLabel &&
          (minValue !== 0 || maxValue !== 100) && (
            <div className="flex justify-between">
              <span className={cn(valueLabelClasses, 'text-xs')}>
                {minValue}
              </span>
              <span className={cn(valueLabelClasses, 'text-xs')}>
                {maxValue}
              </span>
            </div>
          )}
      </div>
    </>
  )
}

export default ProgressBar
