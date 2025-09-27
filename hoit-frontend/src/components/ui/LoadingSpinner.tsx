'use client'

import React from 'react'
import { clsx } from 'clsx'
import HoitLogo from './HoitLogo'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  showLogo?: boolean
  className?: string
  variant?: 'default' | 'fullscreen'
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message = '로딩 중...',
  showLogo = true,
  className,
  variant = 'default',
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const containerClasses = clsx(
    'flex flex-col items-center justify-center',
    variant === 'fullscreen' &&
      'fixed inset-0 bg-white/80 backdrop-blur-sm z-50',
    className
  )

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-4">
        {showLogo && (
          <div className="mb-2">
            <HoitLogo className={sizeClasses[size]} />
          </div>
        )}

        {/* Spinning animation */}
        <div className="relative">
          <div
            className={clsx(
              'animate-spin rounded-full border-4 border-gray-200 border-t-black',
              sizeClasses[size]
            )}
          ></div>

          {/* Inner dot animation */}
          <div
            className={clsx(
              'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
              'animate-pulse bg-black rounded-full',
              {
                'w-1 h-1': size === 'sm',
                'w-2 h-2': size === 'md',
                'w-3 h-3': size === 'lg',
              }
            )}
          ></div>
        </div>

        {message && (
          <p
            className={clsx(
              'text-gray-600 font-medium text-center max-w-xs',
              textSizeClasses[size]
            )}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

export default LoadingSpinner
