import { ErrorIcon, InfoIcon } from '@/components/icons'
import {
  cn,
  getDisabledClasses,
  SIZE_CLASSES,
  type ComponentSize,
} from '@/utils'
import React from 'react'

export interface HelpTextProps {
  text: string
  variant?: 'neutral' | 'negative'
  hideIcon?: boolean
  size?: ComponentSize
  isDisabled?: boolean
  className?: string
  id?: string
}

const HelpText: React.FC<HelpTextProps> = ({
  text,
  variant = 'neutral',
  hideIcon = false,
  size = 'medium',
  isDisabled = false,
  className,
  id,
}) => {
  // Typography 크기 클래스 매핑 (기존 SIZE_CLASSES 활용)
  const textSizeMapping = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
    'extra-large': 'text-lg',
  } as const

  // 아이콘 표시 여부 결정
  const shouldShowIcon =
    !hideIcon && (variant === 'negative' || variant === 'neutral')

  // 컨테이너 클래스
  const containerClasses = cn(
    'inline-flex items-start',
    textSizeMapping[size],
    SIZE_CLASSES.gap[size],

    // Variant별 색상
    variant === 'negative' ? 'text-red-600' : 'text-text-secondary',

    // Disabled 상태 (neutral variant만 적용)
    variant === 'neutral' && isDisabled && getDisabledClasses(),

    className
  )

  // 아이콘 클래스
  const iconClasses = cn(
    SIZE_CLASSES.iconClasses[size],
    'flex-shrink-0 mt-0.5',
    variant === 'negative' ? 'text-red-600' : 'text-text-secondary',

    // Disabled 상태일 때 아이콘도 disabled
    variant === 'neutral' && isDisabled && 'opacity-50'
  )

  return (
    <div
      className={containerClasses}
      id={id}
      role={variant === 'negative' ? 'alert' : 'status'}
      aria-live={variant === 'negative' ? 'assertive' : 'polite'}
    >
      {shouldShowIcon && (
        <span className="flex-shrink-0">
          {variant === 'negative' ? (
            <ErrorIcon className={iconClasses} />
          ) : (
            <InfoIcon className={iconClasses} />
          )}
        </span>
      )}
      <span className="leading-relaxed">{text}</span>
    </div>
  )
}

export default HelpText
